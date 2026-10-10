import { getAssetUrl } from '../services/api.js';

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
export const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 15 * 1024 * 1024;
export const VIDEO_MAX_ORIGINAL_BYTES = 1024 * 1024 * 1024;
export const VIDEO_MAX_DURATION_SECONDS = 30;

export function isVideoUrl(url = '') {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || /\/product-videos\//i.test(url);
}

export function isImageUrl(url = '') {
  return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url);
}

export function getComplaintMedia(complaint, includeBill = false) {
  if (!complaint) return [];

  const items = [];

  // 1. Multiple product/service photos or single photo
  if (Array.isArray(complaint.productImages) && complaint.productImages.length > 0) {
    complaint.productImages.forEach((img, idx) => {
      const url = typeof img === 'string' ? img : img?.url;
      if (url) {
        items.push({
          id: `${complaint.id}-product-image-${idx}`,
          kind: 'product',
          type: 'image',
          url: getAssetUrl(url),
          label: complaint.type === 'Service' ? `Service photo ${idx + 1}` : `Product photo ${idx + 1}`,
        });
      }
    });
  } else if (complaint.productImageUrl) {
    items.push({
      id: `${complaint.id}-product-image`,
      kind: 'product',
      type: 'image',
      url: getAssetUrl(complaint.productImageUrl),
      label: complaint.type === 'Service' ? 'Service photo' : 'Product photo',
    });
  }

  // 2. Product/Service Video
  if (complaint.productVideoUrl) {
    items.push({
      id: `${complaint.id}-product-video`,
      kind: 'video',
      type: 'video',
      url: getAssetUrl(complaint.productVideoUrl),
      label: complaint.type === 'Service' ? 'Service video' : 'Product video',
    });
  }

  // 3. Bill / Purchase Proof (included where authorized or admin)
  if (includeBill && complaint.billImageUrl) {
    items.push({
      id: `${complaint.id}-bill-image`,
      kind: 'bill',
      type: 'image',
      url: getAssetUrl(complaint.billImageUrl),
      label: 'Purchase bill proof',
    });
  }

  return items;
}

export function collectComplaintMedia(complaints = []) {
  const slides = [];
  complaints.forEach((complaint) => {
    getComplaintMedia(complaint).forEach((item) => {
      slides.push({
        ...item,
        complaintId: complaint.id,
        company: complaint.company,
        title: complaint.title,
      });
    });
  });
  return slides;
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateMediaFile(file, kind) {
  if (!file) return 'Please choose a file.';
  const name = file.name || '';
  if (kind === 'video') {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(file.type) && !/\.(mp4|mov|webm)$/i.test(name)) {
      return 'Video must be MP4, MOV, or WEBM.';
    }
    if (file.size > VIDEO_MAX_ORIGINAL_BYTES) return 'Video must be 1GB or smaller.';
    return '';
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type) && !/\.(jpg|jpeg|png|webp)$/i.test(name)) {
    return 'Image must be JPG, JPEG, PNG, or WEBP.';
  }
  if (file.size > IMAGE_MAX_BYTES) return 'Image must be 10MB or smaller.';
  return '';
}

export function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    let timeoutId;
    let settled = false;
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (Number.isFinite(duration) && duration > 0) {
        finish(resolve, duration);
      } else {
        finish(reject, new Error('Video duration is unavailable.'));
      }
    };
    video.onerror = () => {
      finish(reject, new Error('Video duration could not be read.'));
    };
    timeoutId = window.setTimeout(
      () => finish(reject, new Error('Video duration check timed out.')),
      10000,
    );
    video.src = objectUrl;
  });
}
