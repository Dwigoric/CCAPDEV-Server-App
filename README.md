# Compact Donuts - Server
This is the server for the Compact Donuts project.
It is a REST API that provides access to the database.

## Setup
Before you can run the server, you need to install the dependencies.
```bash
npm install
```

## Setup Configuration
Duplicate the `.env.example` file and rename it to `.env`.
The `.env` file contains environment variables that are used by the server.

Duplicate the `src/config.example.js` file and rename it to `src/config.js`.
The `src/config.js` file contains configuration that is used by the server.
You can use this to configure your app's MongoDB connection and other settings.

## Running the server
To run the server, you need to run the following command:
```bash
npm start
```

## Configuration
All configuration is done through environment variables.
You can set these variables in a `.env` file in the root of the project.
Alternatively, you can set them in your shell.
### JWT Secret
You can change the JWT secret by setting the `JWT_SECRET` environment variable.
This variable is **required** to be set.
The secret should be a random string of characters.
This will be used to sign the JWTs.

### Port
You can change the port the server runs on by setting the `PORT` environment variable.
The default port is `3000`.

### CORS Origin
You can change the CORS origin by setting the `FRONTEND_URL` environment variable.
The default CORS origin is `http://localhost:5173`.
Change the value to Vue's given URL when running the frontend in development,
i.e., `http://localhost:5173`.

### Database
This variable is **highly recommended** to be set. You can change the database the server connects to
by setting the `MONGODB_URI` environment variable.
This variable should contain a MongoDB connection string.

#### The config file's mongodb.name property
The `src/config.js` file contains a `mongodb.name` property.
This property is used to specify the name of the database.
If the `.env` file's `MONGODB_URI` variable contains a database name,
the `mongodb.name` property will be prioritized.
If the `.env` file's `MONGODB_URI` variable does not contain a database name,
the `mongodb.name` property will be used as the database name.
If the `mongodb.name` property is not set,
and the `.env` file's `MONGODB_URI` variable does not contain a database name,
the database name will be set to `test`.

## API
The API is accessible through the root of the server.
### Example
If the server is running on `localhost:3000`,
you can access the API by sending a request to `http://localhost:3000`.
```bash
curl http://localhost:3000
```
