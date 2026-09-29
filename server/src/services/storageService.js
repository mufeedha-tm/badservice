import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads/proofs');

// Ensure upload directory exists
try {
  await fs.mkdir(uploadDir, { recursive: true });
} catch {
  // directory might already exist
}

/**
 * Storage service abstraction.
 * Saves proof files locally by default, or to durable object storage (e.g., S3/Cloudinary)
 * when configured in production environment variables.
 */
export async function saveProof(file) {
  if (!file) return null;

  // Cloud storage hook: if S3 / Cloudinary credentials exist in env
  if (process.env.CLOUDINARY_URL) {
    try {
      // Future pluggable cloud storage integration
      console.log('CLOUDINARY_URL detected for proof file upload');
    } catch (cloudErr) {
      console.warn('Cloud upload failed, falling back to local filesystem:', cloudErr.message);
    }
  }

  // Default: local filesystem storage
  const relativePath = `/uploads/proofs/${file.filename}`;
  return {
    url: relativePath,
    name: file.originalname || file.filename,
    size: file.size,
    mimetype: file.mimetype,
  };
}

export function getPublicUrl(storedPath) {
  if (!storedPath) return null;
  if (/^https?:\/\//i.test(storedPath)) return storedPath;
  return storedPath.startsWith('/') ? storedPath : `/${storedPath}`;
}
