import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const legacyUploadDir = path.resolve(__dirname, '../../uploads/proofs');
const complaintUploadDirs = {
  productImage: path.resolve(__dirname, '../../uploads/complaints/product-images'),
  billImage: path.resolve(__dirname, '../../uploads/complaints/bills'),
  productVideo: path.resolve(__dirname, '../../uploads/complaints/product-videos'),
};

for (const dir of Object.values(complaintUploadDirs)) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // directory might already exist
  }
}

export async function saveProof(file, category = 'legacy') {
  if (!file) return null;

  const destinationMap = {
    productImage: complaintUploadDirs.productImage,
    billImage: complaintUploadDirs.billImage,
    productVideo: complaintUploadDirs.productVideo,
    legacy: legacyUploadDir,
  };

  const destinationDir = destinationMap[category] || legacyUploadDir;
  const relativePath = category === 'legacy'
    ? `/uploads/proofs/${file.filename}`
    : `/uploads/complaints/${
        category === 'productImage' ? 'product-images' : category === 'billImage' ? 'bills' : 'product-videos'
      }/${file.filename}`;

  return {
    url: relativePath,
    name: file.originalname || file.filename,
    size: file.size,
    mimetype: file.mimetype,
  };
}

export async function saveComplaintMedia(file, mediaType) {
  return saveProof(file, mediaType || 'legacy');
}

export function getPublicUrl(storedPath) {
  if (!storedPath) return null;
  if (/^https?:\/\//i.test(storedPath)) return storedPath;
  return storedPath.startsWith('/') ? storedPath : `/${storedPath}`;
}
