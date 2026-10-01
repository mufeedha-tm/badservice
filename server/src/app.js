import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import apiRouter from './routes/index.js';
import healthRouter from './routes/healthRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: [env.clientOrigin, "http://localhost:5173"], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded proof files statically
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check at root /health for Render/monitoring
app.use(healthRouter);

app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);

export default app;