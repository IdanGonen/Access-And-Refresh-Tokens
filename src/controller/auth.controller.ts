import { Request, Response } from "express";
import { getRepository, MoreThanOrEqual } from "typeorm";
import bcryptjs from "bcryptjs";
import { sign, verify } from "jsonwebtoken";
import { User } from "../entity/user.entity";
import { Token } from "../entity/token.entity";
export const Register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const user = await getRepository(User).save({
    name,
    email,
    password: await bcryptjs.hash(password, 12),
  });

  res.send(user);
};

export const Login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await getRepository(User).findOneBy({ email });

  if (!user) {
    return res.status(400).send({ message: "Email not found" });
  }

  //* Compare the user's hashed password stored in the DB to the one we got in the req body
  if (!(await bcryptjs.compare(password, user.password))) {
    return res.status(400).send({ message: "Wrong Password" });
  }

  const refreshToken = sign(
    {
      id: user.id,
    },
    "refresh_secret",
    { expiresIn: "1w" }
  );

  //* Store the refresh token we created as a cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, //7 days
  });

  const expired_at = new Date();
  expired_at.setDate(expired_at.getDate() + 7);

  //* Store the refresh token we created in the DB following the right columns
  await getRepository(Token).save({
    user_id: user.id,
    token: refreshToken,
    expired_at,
  });

  //* Create access token and send it back to the client
  const token = sign(
    {
      id: user.id,
    },
    "access_secret",
    { expiresIn: "30s" }
  );

  res.send({ token });
};

export const AuthenticatedUser = async (req: Request, res: Response) => {
  try {
    /*
     * split the req.header(Authorization) by " " - [0] is the Bearer, [1] is the access token;
     * Example: req.header(Authorization) : Bearer 4.3m_N_Cc7wJTPWm8obsDjyZGJhk => [0] = Bearer, [1] = 4.3m_N_Cc7wJTPWm8obsDjyZGJhk
     */
    const accessToken = req.header("Authorization")?.split(" ")[1] || "";

    const payload: any = verify(accessToken, "access_secret");

    if (!payload) {
      return res.status(401).send({
        message: "Unauthenticated",
      });
    }

    const user = await getRepository(User).findOneBy(payload.id);

    if (!user) {
      return res.status(401).send({
        message: "Unauthenticated",
      });
    }

    //* Send the authenticated user data except the his password
    const { password, ...data } = user;

    res.send(data);
  } catch (error) {
    return res.status(401).send({
      message: "Unauthenticated",
    });
  }
};

export const Refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies["refreshToken"];

    const payload: any = verify(refreshToken, "refresh_secret");

    console.log(payload);

    if (!payload) {
      return res.status(401).send({
        message: "Unauthenticated",
      });
    }

    const dbToken = await getRepository(Token).findOneBy({
      user_id: payload.id,
      expired_at: MoreThanOrEqual(new Date()),
    });

    if (!dbToken) {
      return res.status(401).send({
        message: "Unauthenticated",
      });
    }

    const token = sign(
      {
        id: payload.id,
      },
      "access_secret",
      { expiresIn: "30s" }
    );

    res.send({ token });
  } catch (error) {
    return res.status(401).send({
      message: "Unauthenticated",
    });
  }
};

export const Logout = async (req: Request, res: Response) => {
  //* Get the refresh token, delete it from the DB and from the cookies when you logout
  const refreshToken = req.cookies["refreshToken"];

  await getRepository(Token).delete({ token: refreshToken });

  res.cookie("refreshToken", "", { maxAge: 0 });

  res.send({
    message: "Logout succeeded",
  });
};
