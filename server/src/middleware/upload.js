import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
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
]);
const videoMimeTypes = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
]);
const allowedImageExts = new Set(['.jpg', '.jpeg', '.png', '.webp']);
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
      allowLegacyProof ? 'PDF, JPG, PNG, WEBP' : '',
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

export async function assertRealMediaFile(file, kind) {
  if (!file?.path) throw new ApiError(400, 'Uploaded media is invalid.', 'INVALID_FILE');
  const header = await readFile(file.path, { encoding: null }).then((buffer) => buffer.subarray(0, 32));
  const starts = (...bytes) => bytes.every((value, index) => header[index] === value);
  const isJpeg = starts(0xff, 0xd8, 0xff);
  const isPng = starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  const isWebp = starts(0x52, 0x49, 0x46, 0x46) && header.slice(8, 12).toString() === 'WEBP';
  const isMp4Family = header.slice(4, 8).toString() === 'ftyp';
  const isWebm = starts(0x1a, 0x45, 0xdf, 0xa3);
  if (kind === 'image' && !(isJpeg || isPng || isWebp)) {
    throw new ApiError(400, 'The uploaded image is not a valid JPG, PNG, or WEBP file.', 'INVALID_MEDIA_CONTENT');
  }
  if (kind === 'video' && !(isMp4Family || isWebm)) {
    throw new ApiError(400, 'The uploaded video is not a valid MP4, MOV, or WEBM file.', 'INVALID_MEDIA_CONTENT');
  }
}
