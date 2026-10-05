# BadService.in — Production Consumer Complaint Platform

A modern, trustworthy consumer complaint and resolution platform built with **React** (frontend) and **Node.js/Express** (backend), using **MySQL** as the production source of truth.

---

## 🏗️ Architecture

- **Frontend (`client/`)**: React 19, Vite, React Router v6, Axios, Plain CSS. Hosted on **Hostinger**.
- **Backend (`server/`)**: Express REST API, MySQL2 connection pool with utf8mb4 encoding, Google Gmail API OAuth2 email delivery, Scrypt password hashing, HttpOnly session cookies, Multer with storage abstraction (Local/Cloudinary). Hosted on **Render**.
- **Email OTP Provider**: Google Gmail API (`googleapis`) for secure 6-digit email verification with 60-second cooldown and cryptographic tokens.
- **Database**: MySQL 8.0 on Hostinger Cloud with connection pooling, foreign keys, and indexes.

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Node.js (v18+)
- MySQL Database

### 2. Backend Setup
```bash
cd "new prjct/server"
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials and Gmail API OAuth2 credentials

# Run database migrations and seed data (both are idempotent)
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

The backend starts on port `5000` (or `process.env.PORT`).

### 3. Frontend Setup
```bash
cd "new prjct/client"
npm install
npm run dev
```

The client starts at `http://localhost:5173` and proxies `/api` calls to the backend.

---

## 📧 Gmail API OAuth2 Email OTP Configuration

OTP emails are sent through the Gmail API using the OAuth2 refresh token. In Google Cloud Console, enable the Gmail API and create OAuth2 credentials. Grant the `https://www.googleapis.com/auth/gmail.send` scope and generate a refresh token for the Gmail account that will send mail. Configure the matching redirect URI in both Google Cloud and the application. The sender address must belong to the authorized Gmail account.

Set these variables in the backend environment (Render for production). Never commit or expose the client secret or refresh token:

```env
GMAIL_CLIENT_ID=your_google_oauth_client_id
GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
GMAIL_REDIRECT_URI=your_registered_oauth_redirect_uri
GMAIL_REFRESH_TOKEN=your_google_oauth_refresh_token
GMAIL_SENDER_EMAIL=your_authorized_gmail_address
OTP_SECRET=your_cryptographically_random_secret_here
OTP_TTL_SECONDS=600
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5
```

After deploying the backend, request an OTP on the File Complaint page or via `POST /api/otp/send`. The API response never includes the OTP.

---

## 📝 File Complaint & Evidence Upload System

The File Complaint flow is a guided two-step form matching the reference design:

### Step 1: Your Details & In-Form Authentication
- **Existing User Recognition**: If already logged in, automatically displays `✓ Signed in as [Name]` with an option to switch accounts. Pre-fills contact details. Does not force the user to re-register.
- **In-Form Switcher**: If logged out, provides a compact `[Sign In] [Create Account]` tab switch inside the card. Authenticating preserves all current form inputs and auto-fills account data without page redirects.
- **Email Verification**: User enters their email address and clicks **Send OTP**.
  - A 60-second cooldown timer starts.
  - User submits the 6-digit code.
  - Upon verification, an encrypted single-use `verificationToken` (valid 30 minutes) is issued and bound to the email.
  - The complaint record stores `email_verified = 1` and `phone_verified = 0`.

### Step 2: Complaint Details & Mandatory Evidence
- **Product vs. Service Dynamic Toggle**:
  - Switching toggles between product fields (Category, Brand, Product/Model, Seller/Shop) and service fields (Category, Service Provider, Service Details/Purpose).
- **Mandatory 3 Evidence Uploads**:
  Every complaint must supply all three files:
  1. **Product / Service Photo**: JPG, JPEG, PNG, or WEBP (up to 10MB).
  2. **Bill / Purchase Proof / Receipt**: JPG, JPEG, PNG, or WEBP (up to 10MB).
  3. **Product / Service Video**: MP4, MOV, or WEBM (up to 15MB).
- **Privacy & Security**:
  - Uploaded files are assigned random UUID/hash filenames on disk to prevent personal data leaks.
  - Binary magic byte headers are strictly validated on the server (`upload.js`) to reject disguised executables, AVIs, or GIFs.

---

## 🛡️ Authentication & Authorization Security

- **Roles**:
  - `USER`: Can file complaints, submit company requests, view personal complaints under `/complaints/my`, and edit profile.
  - `ADMIN`: Has full access to `/admin` to approve/reject company requests, manage complaints, and view platform metrics.
- **Default Admin Account**:
  - `mufeedha059@gmail.com` is configured with the `ADMIN` role.
- **Security Protections**:
  - Passwords hashed using Node.js `scrypt` with unique 16-byte random salts.
  - HttpOnly cookies (`badservice_session`) with `SameSite=Lax` (or `None; Secure` in production).
  - Role-based middleware (`requireRole('ADMIN')`) guarantees standard users receive `403 Forbidden` on admin endpoints.

---

## 🌐 Production Deployment

### Render (Backend API)
- **Runtime**: Node.js
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health` (also available at `/api/health`)
- **Host Binding**: `0.0.0.0` (via `PORT` environment variable)
- **Required Environment Variables**:
  ```env
  PORT=5000
  NODE_ENV=production
  PRODUCTION=true
  CLIENT_ORIGIN=https://badservice.in
  DB_HOST=your-mysql-host
  DB_PORT=3306
  DB_USER=your-mysql-user
  DB_PASSWORD=your-mysql-password
  DB_NAME=your-mysql-database
  GMAIL_CLIENT_ID=your_google_oauth_client_id
  GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
  GMAIL_REDIRECT_URI=your_registered_oauth_redirect_uri
  GMAIL_REFRESH_TOKEN=your_google_oauth_refresh_token
  GMAIL_SENDER_EMAIL=your_authorized_gmail_address
  OTP_METHOD=email
  OTP_TTL_SECONDS=600
  OTP_RESEND_COOLDOWN_SECONDS=60
  OTP_MAX_ATTEMPTS=5
  SESSION_SECRET=your_secure_session_secret
  # Optional Cloudinary Storage (recommended for Render's ephemeral disk):
  CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
  ```

### Hostinger (Frontend)
- **Build Command**: `npm run build`
- **Publish Directory**: `client/dist`
- **Environment Variable**: `VITE_API_BASE_URL=https://your-render-service.onrender.com/api`
- **SPA Routing**: The Vite build automatically bundles `client/public/.htaccess` into `dist/`. Keep `.htaccess` in your Hostinger `public_html` root to ensure client-side React routes reload seamlessly without 404 errors.

---

## 🧪 Automated Production Test Suite

Run the full automated test suite against the backend API and database:
```bash
cd "new prjct/server"
node test_audit.js
```
The audit suite validates:
- Health check endpoints
- Navigation & catalog consistency
- Category hierarchy (Two Wheeler vs Cars isolation)
- Email OTP generation, 60s cooldown rate limiting, code verification, single-use token invalidation
- In-form user registration and authentication
- 403 Forbidden checks on admin routes for normal users
- Company addition requests and admin approval workflow
- 401 rejection for complaints without verification tokens
- 400 rejection for complaints missing mandatory evidence files
- Successful complaint creation with 3 valid evidence files
- Truth in verification (`email_verified = 1`, `phone_verified = 0`)
- Single-use token consumption preventing replay attacks
- User complaint privacy isolation (User B cannot view User A's complaints)
- Admin status updates and automatic cleanup of test data
