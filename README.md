# Access-And-Refresh-Tokens

NodeJS authentication project using access and refresh tokens - fully Typescript supported.

## Installation

Install all project dependencies

```bash
npm install
```

Create ormconfig.json file and fill it according to your DB settings

```
{
  "type": "",
  "host": "",
  "port": ,
  "username": "",
  "password": "",
  "database": "",
  "entities": ["src/entity/*.ts"],
  "logging": false,
  "synchronize": true
}
```

Runs the app (PORT = 8000):

```
npm start
```
