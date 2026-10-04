import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseUploadsDir = path.resolve(__dirname, '../../uploads');
export const uploadsDir = path.resolve(baseUploadsDir, 'proofs');

const complaintDirs = {
  productImage: path.resolve(baseUploadsDir, 'complaints/product-images'),
  billImage: path.resolve(baseUploadsDir, 'complaints/bills'),
  productVideo: path.resolve(baseUploadsDir, 'complaints/product-videos'),
  legacy: uploadsDir,
};

for (const dir of Object.values(complaintDirs)) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const imageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const videoMimeTypes = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
]);
const allowedImageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const allowedVideoExts = new Set(['.mp4', '.mov', '.webm', '.avi']);

function buildStorageForFolder(folder) {
  return multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, folder);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueSuffix = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
      cb(null, uniqueSuffix);
    },
  });
}

function makeFileFilter({ allowImages = false, allowVideos = false, allowLegacyProof = false } = {}) {
  return function fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeAllowed =
      (allowImages && imageMimeTypes.has(file.mimetype)) ||
      (allowVideos && videoMimeTypes.has(file.mimetype)) ||
      (allowLegacyProof && (file.mimetype === 'application/pdf' || allowedImageExts.has(ext) || allowedVideoExts.has(ext)));
    const extAllowed =
      (allowImages && allowedImageExts.has(ext)) ||
      (allowVideos && allowedVideoExts.has(ext)) ||
      (allowLegacyProof && (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'].includes(ext) || allowedVideoExts.has(ext)));

    if (mimeAllowed || extAllowed) {
      cb(null, true);
      return;
    }

    const allowedText = [
      allowImages ? 'JPG, JPEG, PNG, WEBP' : '',
      allowVideos ? 'MP4, MOV, WEBM' : '',
      allowLegacyProof ? 'PDF, JPG, PNG, WEBP, GIF' : '',
    ].filter(Boolean).join(', ');

    cb(new ApiError(400, `Invalid file type. Allowed types: ${allowedText || 'images and videos'}.`, 'INVALID_FILE_TYPE'));
  };
}

export const uploadProof = multer({
  storage: buildStorageForFolder(uploadsDir),
  fileFilter: makeFileFilter({ allowImages: true, allowLegacyProof: true }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export const uploadComplaintMedia = multer({
  storage: multer.diskStorage({
    destination(_req, file, cb) {
      cb(null, getComplaintUploadFolder(file.fieldname));
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueSuffix = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
      cb(null, uniqueSuffix);
    },
  }),
  fileFilter: makeFileFilter({ allowImages: true, allowVideos: true }),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

export function getComplaintUploadFolder(fieldName) {
  if (fieldName === 'productImage') return complaintDirs.productImage;
  if (fieldName === 'billImage') return complaintDirs.billImage;
  if (fieldName === 'productVideo') return complaintDirs.productVideo;
  return complaintDirs.legacy;
}
