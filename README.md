# BadService.in — Production Complaint Platform

A full-stack public complaint and resolution platform built with **React** (frontend) and **Node.js/Express** (backend), using **MySQL** as the production source of truth.

---

## 🏗️ Architecture

- **Frontend (`client/`)**: React 18, Vite, React Router v6, Axios, Plain CSS. Hosted on **Hostinger**.
- **Backend (`server/`)**: Express REST API, MySQL2 connection pool, Scrypt password hashing, HttpOnly session cookies, Multer with storage abstraction. Hosted on **Render**.
- **Database**: MySQL 8.0 on Hostinger Cloud with connection pooling, foreign keys, utf8mb4 encoding, and indexes.

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Node.js (v18+)
- MySQL Database

### 2. Backend Setup
```bash
cd server
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials

# Run database migrations and seed data (both are idempotent)
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

The backend starts on port `5000` (or `process.env.PORT`).

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

The client will start at `http://localhost:5173` and proxy `/api` calls to the backend.

---

## 🗄️ Database Management

- **Run Migrations**: `npm run db:migrate` (inside `server/`)
  - Ensures `users`, `categories`, `companies`, `complaints`, `company_requests`, and `sessions` tables exist with correct columns, keys, and indexes.
  - Idempotent and safe to run multiple times.
- **Run Seeding**: `npm run db:seed` (inside `server/`)
  - Populates standard parent and child categories, initial approved companies, legacy complaints, and the default administrator account.

---

## 🔑 Authentication & Authorization

- **Roles**:
  - `USER`: Regular authenticated user. Can submit complaints, upload proof documents, submit company requests, view "My Complaints", and update profile.
  - `ADMIN`: Administrator. Can access the React **Admin Dashboard** (`/admin`), manage users (enable/disable, promote/demote), approve/reject company requests, change complaint statuses, add companies directly, and delete spam complaints.
- **Default Admin Account**:
  - 
 `mufeedha059@gmail.com` is granted the `ADMIN` role upon migration*.
- **Security**:
  - Passwords hashed using Node `scrypt` with unique 16-byte random salts.
  - Sessions stored in MySQL and validated using SHA-256 token hashes.
  - Session cookie: `HttpOnly; SameSite=Lax` (or `None; Secure` in production with HTTPS).
  - Server-side role enforcement via `requireAuth` and `requireRole('ADMIN')` middleware.

---

## 🏢 Company Request & Approval Flow

1. Normal users cannot directly create publicly active companies.
2. If a company is not listed, an authenticated user submits a request via:
   `POST /api/company-requests` (status initially `PENDING`).
3. The requested company is hidden from public catalogs while pending.
4. Administrators review pending requests in the Admin Dashboard (`/admin` -> Company Requests tab).
5. Upon Admin **Approval**:
   - The company is created in MySQL `companies` table with `status = 'ACTIVE'` and category association.
   - The request status is set to `APPROVED` with `reviewed_by` and `reviewed_at`.
   - The company immediately becomes publicly selectable.
6. Upon Admin **Rejection**:
   - The request status is set to `REJECTED`. The company is not created.

---

## 📂 Proof Storage Abstraction

- Handled by `server/src/services/storageService.js`.
- By default, stores files safely in `server/uploads/proofs/` served statically at `/uploads/proofs/...`.
- Supports cloud object storage (e.g. Cloudinary / S3) via environment variables (`CLOUDINARY_URL`).

---

## 🌐 Production Deployment

### Render (Backend API)
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`
- **Required Environment Variables**:
  - `PORT`: (Render injects automatically)
  - `NODE_ENV`: `production`
  - `PRODUCTION`: `true`
  - `CLIENT_ORIGIN`: `https://your-hostinger-domain.com`
  - `DB_HOST`: Your MySQL host
  - `DB_PORT`: `3306`
  - `DB_USER`: Your MySQL username
  - `DB_PASSWORD`: Your MySQL password
  - `DB_NAME`: Your MySQL database name

### Hostinger (Frontend)
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Environment Variable**: `VITE_API_BASE_URL=https://your-render-app.onrender.com/api`
- The Vite build copies `client/public/.htaccess` into `dist/`. Keep this file when uploading the build so direct links and page refreshes use the React app's route handling.