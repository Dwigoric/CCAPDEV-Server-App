# Compact Donuts - Server
This is the server for the Compact Donuts project.
It is a REST API that provides access to the database.

## Setup
Before you can run the server, you need to install the dependencies.
```bash
npm install
```

## Running the server
To run the server, you need to run the following command:
```bash
npm start
```

## Configuration
All configuration is done through environment variables.
You can set these variables in a `.env` file in the root of the project.
Alternatively, you can set them in your shell.
### Port
You can change the port the server runs on by setting the `PORT` environment variable.
The default port is `3000`.

### Database
This variable is **required** to be set. You can change the database the server connects to
by setting the `MONGODB_URI` environment variable.
This variable should contain a MongoDB connection string.

## API
The API is accessible through the root of the server.
### Example
If the server is running on `localhost:3000`,
you can access the API by sending a request to `http://localhost:3000`.
```bash
curl http://localhost:3000
```
