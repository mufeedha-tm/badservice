# BadService.in foundation

The project contains two independent applications:

- `client/`: React, Vite, React Router, and Axios
- `server/`: Express REST API

## Run locally

In separate terminals, run `npm run dev` from `server/` and `npm run dev` from `client/`.
The client calls the API through `/api` and Vite proxies those requests to the server on port 5000.

To point the client at a different API, set `VITE_API_BASE_URL` in `client/.env` (for example, `http://localhost:5000/api`).
The server supports `PORT` and `CLIENT_ORIGIN`; see `server/.env.example`.

## JSON data

The server reads complaint records, categories, companies, navigation/department content, accounts, and sessions from JSON files in `server/src/data/`.
`POST /api/complaints` and account registration update their respective JSON files. Passwords are stored as scrypt hashes, and session tokens are stored as hashes; the browser receives an HTTP-only session cookie.

Authentication endpoints are `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout`.
Use HTTPS in production; production session cookies require HTTPS. Set `CLIENT_ORIGIN` to the frontend origin and set `VITE_API_BASE_URL` when building the deployed client.

JSON storage is intended for this single-process development phase. Use a persistent, writable filesystem for deployment. Concurrent multi-instance writes are not coordinated; replace these repositories with a database before scaling the API horizontally.