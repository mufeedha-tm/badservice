# BadService.in

BadService.in is a consumer complaint website for submitting product and service complaints, browsing approved complaints, and managing submissions through an administrator dashboard.

## Current website features

- A React single-page website with complaint, company, category, search, account, terms and conditions, and administrator pages.
- A two-step complaint form with phone-number OTP verification. Email is optional for filing a complaint.
- Product and service complaint forms with location suggestions and required photo, purchase proof, and video uploads.
- Complaints start as `PENDING`. Only approved complaints are shown in public complaint lists, search results, rankings, and detail pages.
- Public complaint pages show the product or service photo and video. Purchase proof is private and accessible through an authenticated admin-only endpoint.
- An administrator dashboard for reviewing complaints, approving or rejecting them, updating approved complaint statuses, managing company requests, and viewing platform information.

## Technology

- **Frontend (`client/`)**: React 19, Vite, React Router, Axios, and CSS.
- **Backend (`server/`)**: Node.js ES modules, Express, MySQL, Multer, FFmpeg, and optional Cloudinary storage.
- **Database**: MySQL.
- **Authentication**: Server-side sessions using an HttpOnly session cookie; admin routes require an authenticated administrator account.

## Run locally

### Prerequisites

- Node.js 18 or later
- MySQL

### Backend

```bash
cd server
npm install
```

Copy `server/.env.example` to `server/.env` and configure the database connection and secure secrets. Then run:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

The API listens on port `5000` by default, or the port specified by `PORT`.

### Frontend

In another terminal:

```bash
cd client
npm install
npm run dev
```

Vite serves the site at `http://localhost:5173`. Set `VITE_API_BASE_URL` if the API is not available at the configured `/api` path.

## Phone OTP

The complaint form verifies the phone number, not email. In non-production environments, the backend generates a test OTP and returns it to the client for display in the demo alert. This is for development/testing only; it does not send an SMS.

Phone OTP delivery is deliberately unavailable when `NODE_ENV=production` until an SMS provider is configured. Before enabling production complaint submissions, connect an SMS provider in the backend OTP service and do not expose production OTP codes in API responses or alerts.

Email OTP support remains in the backend for compatibility with the existing email OTP API. Gmail API OAuth credentials are needed only if that email-based flow is used; email is not required by the phone-verified complaint form.

Configure OTP behavior with:

```env
OTP_SECRET=replace-with-a-long-random-secret
OTP_TTL_SECONDS=600
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5
```

If email OTP is needed, configure the Gmail API OAuth credentials in `server/.env`:

```env
GMAIL_CLIENT_ID=your_google_oauth_client_id
GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
GMAIL_REDIRECT_URI=your_registered_oauth_redirect_uri
GMAIL_REFRESH_TOKEN=your_google_oauth_refresh_token
GMAIL_SENDER_EMAIL=your_authorized_gmail_address
```

Never commit database passwords, session secrets, OTP secrets, or provider credentials.

## Complaint submissions and uploads

The complaint form collects contact details and complaint information, including product/service type, company or provider, category, model or service details, seller/provider, location, title, and description. Required evidence:

| Upload | Accepted types | Limit |
|---|---|---:|
| Product/service photo | JPG, JPEG, PNG, WEBP | 10 MB |
| Bill or purchase proof | JPG, JPEG, PNG, WEBP | 10 MB |
| Product/service video | MP4, MOV, WEBM | Maximum 30 seconds; original up to 1 GB |

Videos at or below 15 MB are stored unchanged. Videos larger than 15 MB are automatically compressed by the backend with FFmpeg to 15 MB or less before storage. Compression scales large frames to at most 1280×720 and re-encodes video/audio to MP4. The compressed file is the one saved and referenced by the complaint. An upload can still fail if it cannot be reduced below the final size limit.

Multer must allow the original video (up to 1 GB) to reach the compression service; the final stored video is limited to 15 MB. The server validates uploaded media content and enforces the 30-second duration limit in addition to checking the filename and MIME type.

## Moderation and evidence privacy

- A new complaint is saved with the `PENDING` status and is not publicly listed.
- An administrator must set its status to `APPROVED` before it appears publicly. `COMPANY_RESPONDED` and `RESOLVED` are public statuses for complaints that have passed approval.
- Public responses omit complainant contact details, purchase proof URLs, and legacy proof URLs.
- Bill images are not served by the public static upload path. Admins retrieve them through the authenticated admin complaint bill endpoint.
- Local uploads are stored under `server/uploads/complaints/`. Cloudinary can be configured for persistent storage; bill images use authenticated Cloudinary delivery.

## Admin access

Admin access is managed through the backend authentication and role system. Configure the admin account according to the existing authentication setup and keep admin credentials and session secrets private. Admin APIs are protected by authentication and role checks.

## Deployment notes

### Backend

Deploy the `server/` application with:

- Install command: `npm install`
- Start command: `npm start`
- Health check: `/health` (also available at `/api/health`)
- Environment variables: `NODE_ENV`, `PORT`, `CLIENT_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SESSION_SECRET`, and `OTP_SECRET`.
- Install/run the FFmpeg binary provided by the `ffmpeg-static` dependency in the deployment environment.
- Configure a real SMS provider before setting production phone OTP live.

For persistent media on an ephemeral server filesystem, configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` (or `CLOUDINARY_URL`). Verify that authenticated assets can be delivered using the configured Cloudinary account.

### Frontend

Build the client with:

```bash
cd client
npm install
npm run build
```

Deploy the contents of `client/dist` and set `VITE_API_BASE_URL` to the deployed API base URL, for example `https://your-api.example.com/api`. Configure the host to serve the SPA entry point for client-side routes such as `/terms` and complaint details.

## Checks

Build the frontend:

```bash
cd client
npm run build
```

Run the backend audit script:

```bash
cd server
npm test
```

The audit script uses the configured database and may exercise external email delivery. Run it against a test database and test credentials, not production data.
