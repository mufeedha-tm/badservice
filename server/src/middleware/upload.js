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
]);
const allowedImageExts = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedVideoExts = new Set(['.mp4', '.mov', '.webm']);

function makeComplaintFileFilter() {
  return function fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();

    if (file.fieldname === 'productImage' || file.fieldname === 'billImage') {
      const isMimeValid = imageMimeTypes.has(file.mimetype);
      const isExtValid = allowedImageExts.has(ext);

      if (!isMimeValid && !isExtValid) {
        return cb(new ApiError(400, 'Photos must be JPG, JPEG, PNG, or WEBP.', 'INVALID_FILE_TYPE'));
      }
      return cb(null, true);
    }

    if (file.fieldname === 'productVideo') {
      const isMimeValid = videoMimeTypes.has(file.mimetype);
      const isExtValid = allowedVideoExts.has(ext);

      if (!isMimeValid && !isExtValid) {
        return cb(new ApiError(400, 'Video must be MP4, MOV, or WEBM.', 'INVALID_FILE_TYPE'));
      }
      return cb(null, true);
    }

    // Default reject
    cb(new ApiError(400, `Unexpected upload field: ${file.fieldname}`, 'INVALID_UPLOAD_FIELD'));
  };
}

export const uploadComplaintMedia = multer({
  storage: multer.diskStorage({
    destination(_req, file, cb) {
      cb(null, getComplaintUploadFolder(file.fieldname));
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      // Generate randomized filename to protect privacy
      const uniqueSuffix = `${Date.now()}-${randomBytes(12).toString('hex')}${ext}`;
      cb(null, uniqueSuffix);
    },
  }),
  fileFilter: makeComplaintFileFilter(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max
  },
});

export const uploadProof = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, uploadsDir);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueSuffix = `${Date.now()}-${randomBytes(12).toString('hex')}${ext}`;
      cb(null, uniqueSuffix);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
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
