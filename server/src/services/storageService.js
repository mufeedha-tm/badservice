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
    // Directory may already exist
  }
}

/**
 * Saves an uploaded file, either to Cloudinary (if configured) or locally.
 * Generates sanitized safe names to prevent leaking personal information from original filenames.
 */
export async function saveProof(file, category = 'legacy') {
  if (!file) return null;

  // Cloudinary object storage integration (preferred for Render ephemeral disks)
  const cloudinaryUrl = env.cloudinaryUrl || process.env.CLOUDINARY_URL;
  const cloudName = env.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY;
  const apiSecret = env.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET;

  if (cloudinaryUrl || (cloudName && apiKey && apiSecret)) {
    try {
      const cloudResult = await uploadToCloudinary(file, category);
      if (cloudResult?.secure_url) {
        return {
          url: cloudResult.secure_url,
          name: getSafeFileName(file, category),
          size: file.size,
          mimetype: file.mimetype,
          publicId: cloudResult.public_id,
        };
      }
    } catch (cloudErr) {
      console.warn('Cloudinary upload fallback to local storage:', cloudErr.message);
    }
  }

  // Local storage fallback
  const ext = path.extname(file.filename || file.originalname || '').toLowerCase();
  const safeName = getSafeFileName(file, category);

  const relativePath = category === 'legacy'
    ? `/uploads/proofs/${file.filename}`
    : `/uploads/complaints/${
        category === 'productImage' ? 'product-images' : category === 'billImage' ? 'bills' : 'product-videos'
      }/${file.filename}`;

  return {
    url: relativePath,
    name: safeName,
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

function getSafeFileName(file, category) {
  const ext = path.extname(file.filename || file.originalname || '').toLowerCase();
  if (category === 'billImage') return `purchase-proof${ext}`;
  if (category === 'productImage') return `product-photo${ext}`;
  if (category === 'productVideo') return `product-video${ext}`;
  return `evidence${ext}`;
}

async function uploadToCloudinary(file, category) {
  const cloudName = env.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY;
  const apiSecret = env.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return null;

  const resourceType = category === 'productVideo' ? 'video' : 'image';
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `badservice/${category}`;

  const { createHash } = await import('node:crypto');
  const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash('sha1').update(signatureString).digest('hex');

  const fileBuffer = await fs.readFile(file.path);
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: file.mimetype }), file.filename);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${errorText}`);
  }

  return await res.json();
}
