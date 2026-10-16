import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import pool from '../config/database.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirectories = [
  path.resolve(__dirname, '../../uploads/proofs'),
  path.resolve(__dirname, '../../uploads/complaints/product-images'),
  path.resolve(__dirname, '../../uploads/complaints/bills'),
  path.resolve(__dirname, '../../uploads/complaints/product-videos'),
];

async function emptyDirectory(directory) {
  await fs.mkdir(directory, { recursive: true });
  const entries = await fs.readdir(directory, { withFileTypes: true });
  await Promise.all(entries.map((entry) => fs.rm(path.join(directory, entry.name), { recursive: true, force: true })));
  return entries.length;
}

function addCloudinaryAsset(assets, value, fallback = {}) {
  if (!value || typeof value !== 'string') return;

  try {
    const url = new URL(value);
    if (url.hostname !== 'res.cloudinary.com') return;

    const parts = url.pathname.split('/').filter(Boolean);
    const resourceIndex = parts.findIndex((part) => ['image', 'video', 'raw'].includes(part));
    if (resourceIndex === -1) return;

    const resourceType = parts[resourceIndex] || fallback.resourceType || 'image';
    const deliveryType = parts[resourceIndex + 1] || fallback.deliveryType || 'upload';
    const publicParts = parts.slice(resourceIndex + 2).filter((part) => !/^s--[^/]+--$/.test(part) && !/^v\d+$/.test(part));
    if (publicParts.length === 0) return;

    publicParts[publicParts.length - 1] = publicParts.at(-1).replace(/\.[^.]+$/, '');
    assets.set(`${resourceType}:${deliveryType}:${publicParts.join('/')}`, {
      publicId: publicParts.join('/'),
      resourceType,
      deliveryType,
    });
  } catch {
    // A local upload URL does not need Cloudinary cleanup.
  }
}

function collectCloudinaryAssets(complaints) {
  const assets = new Map();

  for (const complaint of complaints) {
    addCloudinaryAsset(assets, complaint.product_image_url, { resourceType: 'image', deliveryType: 'upload' });
    addCloudinaryAsset(assets, complaint.bill_image_url, { resourceType: 'image', deliveryType: 'authenticated' });
    addCloudinaryAsset(assets, complaint.product_video_url, { resourceType: 'video', deliveryType: 'upload' });

    if (complaint.bill_image_public_id) {
      assets.set(`image:authenticated:${complaint.bill_image_public_id}`, {
        publicId: complaint.bill_image_public_id,
        resourceType: 'image',
        deliveryType: 'authenticated',
      });
    }

    try {
      const productImages = JSON.parse(complaint.product_images || '[]');
      for (const image of productImages) {
        addCloudinaryAsset(assets, typeof image === 'string' ? image : image?.url, {
          resourceType: 'image',
          deliveryType: 'upload',
        });
      }
    } catch {
      // Ignore malformed optional image metadata; the complaint row still clears.
    }
  }

  return [...assets.values()];
}

function addLocalUploadFile(files, value) {
  if (!value || typeof value !== 'string') return;

  try {
    const pathname = new URL(value, 'http://localhost').pathname;
    if (!pathname.startsWith('/uploads/')) return;

    const filePath = path.resolve(__dirname, '../..', `.${decodeURIComponent(pathname)}`);
    const uploadsRoot = path.resolve(__dirname, '../../uploads');
    if (filePath.startsWith(`${uploadsRoot}${path.sep}`)) files.add(filePath);
  } catch {
    // Ignore malformed optional media metadata; the complaint row still clears.
  }
}

function collectLocalUploadFiles(complaints) {
  const files = new Set();

  for (const complaint of complaints) {
    addLocalUploadFile(files, complaint.product_image_url);
    addLocalUploadFile(files, complaint.bill_image_url);
    addLocalUploadFile(files, complaint.product_video_url);

    try {
      const productImages = JSON.parse(complaint.product_images || '[]');
      for (const image of productImages) {
        addLocalUploadFile(files, typeof image === 'string' ? image : image?.url);
      }
    } catch {
      // Ignore malformed optional image metadata; the complaint row still clears.
    }
  }

  return [...files];
}

async function removeCloudinaryAssets(assets) {
  if (assets.length === 0) return { removed: 0, skipped: 0 };

  const cloudName = env.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY;
  const apiSecret = env.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return { removed: 0, skipped: assets.length };
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  const results = await Promise.allSettled(assets.map((asset) => cloudinary.uploader.destroy(asset.publicId, {
    resource_type: asset.resourceType,
    type: asset.deliveryType,
    invalidate: true,
  })));

  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length > 0) {
    throw new Error(`Could not remove ${failed.length} Cloudinary complaint-media asset(s).`);
  }
  return { removed: assets.length, skipped: 0 };
}

export async function clearComplaints({ complaintIds = null } = {}) {
  if (complaintIds !== null && (!Array.isArray(complaintIds) || complaintIds.length === 0)) {
    throw new Error('complaintIds must be a non-empty array when supplied.');
  }

  const connection = await pool.getConnection();
  let complaintCount = 0;
  let commentCount = 0;
  let cloudinaryAssets = [];
  let localUploadFiles = [];
  const placeholders = complaintIds?.map(() => '?').join(', ') || '';
  const whereClause = complaintIds ? ` WHERE id IN (${placeholders})` : '';

  try {
    await connection.beginTransaction();
    const [[complaints]] = await connection.query(`SELECT COUNT(*) AS total FROM complaints${whereClause}`, complaintIds || []);
    const [comments] = complaintIds
      ? await connection.query(`SELECT COUNT(*) AS total FROM comments WHERE complaint_id IN (${placeholders})`, complaintIds)
      : await connection.query('SELECT COUNT(*) AS total FROM comments');
    const [complaintMedia] = await connection.query(`
      SELECT product_image_url, product_images, bill_image_url, bill_image_public_id, product_video_url
      FROM complaints${whereClause}
    `, complaintIds || []);
    complaintCount = Number(complaints.total);
    commentCount = Number(comments[0].total);
    cloudinaryAssets = collectCloudinaryAssets(complaintMedia);
    localUploadFiles = collectLocalUploadFiles(complaintMedia);

    // The comments foreign key is ON DELETE CASCADE, so this clears every
    // complaint and its discussion without affecting users or reference data.
    await connection.query(`DELETE FROM complaints${whereClause}`, complaintIds || []);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const localFileCount = complaintIds
    ? (await Promise.all(localUploadFiles.map((filePath) => fs.rm(filePath, { force: true })))).length
    : (await Promise.all(uploadDirectories.map(emptyDirectory))).reduce((total, count) => total + count, 0);
  const cloudinaryResult = await removeCloudinaryAssets(cloudinaryAssets);
  console.log(`Cleared ${complaintCount} complaints, ${commentCount} comments, and ${localFileCount} local complaint-media files.`);
  if (cloudinaryResult.removed > 0) {
    console.log(`Removed ${cloudinaryResult.removed} Cloudinary complaint-media asset(s).`);
  } else if (cloudinaryResult.skipped > 0) {
    console.warn(`Cloudinary credentials are not configured locally; ${cloudinaryResult.skipped} remote complaint-media asset(s) need removal in the deployment environment.`);
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('src/db/clearComplaints.js')) {
  clearComplaints()
    .then(() => pool.end())
    .catch(async (error) => {
      console.error('Complaint cleanup failed:', error.message);
      await pool.end();
      process.exitCode = 1;
    });
}
