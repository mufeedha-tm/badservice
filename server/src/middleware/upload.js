import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const uploadsDir = path.resolve(__dirname, '../../uploads/proofs');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueSuffix);
  },
});

const allowedMimes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const allowedExts = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
]);

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.has(file.mimetype) || allowedExts.has(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only JPG, PNG, WEBP, GIF, and PDF files are allowed.', 'INVALID_FILE_TYPE'));
  }
}

export const uploadProof = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
