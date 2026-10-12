
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { runSeed } from './db/seed.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import apiRouter from './routes/index.js';
import healthRouter from './routes/healthRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabaseWithRetry(maxAttempts = 3, delayMs = 1500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await runMigrations();
      await runSeed();
      return;
    } catch (err) {
      const isNetworkDrop = err.code === 'ECONNRESET' ||
        err.code === 'PROTOCOL_CONNECTION_LOST' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ENOTFOUND' ||
        err.code === 'EAI_AGAIN';
      if (isNetworkDrop && attempt < maxAttempts) {
        console.warn(`⚠️ Database connection reset during startup (attempt ${attempt}/${maxAttempts}). Reconnecting in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.warn('⚠️ Database migration/seed status:', err.message);
        break;
      }
    }
  }
}

await initializeDatabaseWithRetry();

const configuredOrigins = (env.clientOrigin || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const allowedOrigins = Array.from(new Set([...configuredOrigins, ...defaultOrigins]));

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalized) || !env.production) {
      return callback(null, true);
    }
    const isDomainMatch = allowedOrigins.some((allowed) => {
      try {
        const allowedHost = new URL(allowed).hostname;
        const originHost = new URL(normalized).hostname;
        return originHost === allowedHost || originHost.endsWith(`.${allowedHost}`);
      } catch {
        return false;
      }
    });
    if (isDomainMatch) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Bill photos are served only through the authenticated admin endpoint.
app.use('/uploads/complaints/bills', (_request, response) => response.sendStatus(404));

// Serve public complaint evidence and legacy proof files statically with caching.
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
}));

// Health check at root /health for Render/monitoring
app.use(healthRouter);

// Performance: Lightweight caching headers for public read APIs to accelerate frontend loading
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') {
    if (req.path.startsWith('/categories') || req.path.startsWith('/navigation') || req.path.startsWith('/companies')) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    } else if (req.path.startsWith('/complaints/rankings')) {
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    }
  }
  next();
});

app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);

export default app;