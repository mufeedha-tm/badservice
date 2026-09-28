# BadService.in foundation

The project contains two independent applications:

- `client/`: React, Vite, React Router, and Axios
- `server/`: Express REST API

## Architecture

Business data flows through the application as:

React frontend
-> Node.js and Express API
-> MySQL database

The React client communicates with the Express API and never connects directly to MySQL.

## Run locally

In separate terminals, run `npm run dev` from `server/` and `npm run dev` from `client/`.
The client calls the API through `/api` and Vite proxies those requests to the server on port 5000.

To point the client at a different API, set `VITE_API_BASE_URL` in `client/.env` (for example, `http://localhost:5000/api`).
Configure the server with the variables in `server/.env.example`, including its MySQL connection settings.

## Data storage

MySQL stores users, sessions, complaints, categories, and companies. Normal registration, login/session handling, complaint creation, complaint search, category listing, and company listing use the Express API and MySQL.

`server/src/data/navigation.json` remains intentionally static application configuration for navigation and department display content.

The other JSON files in `server/src/data/`, together with the retained JSON and in-memory repositories, are migration backups. They are not used by active business-data API paths.

Passwords are stored as scrypt hashes, and session tokens are stored as hashes; the browser receives an HTTP-only session cookie.

Authentication endpoints are `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout`.
Use HTTPS in production; production session cookies require HTTPS. Production configuration should explicitly set `NODE_ENV=production`, `CLIENT_ORIGIN` to the frontend origin, and the production MySQL connection variables. Set `VITE_API_BASE_URL` when building the deployed client.
