import { useEffect, useMemo, useState } from 'react';
import {
  formatFileSize,
  readVideoDuration,
  validateMediaFile,
  VIDEO_MAX_DURATION_SECONDS,
} from '../../utils/complaintMedia.js';

export default function ComplaintUploadField({
  id,
  name,
  label,
  helper,
  accept,
  kind,
  file,
  error,
  onChange,
  onRemove,
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [isCheckingVideo, setIsCheckingVideo] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const selectedMeta = useMemo(() => {
    if (!file) return '';
    return `${file.name} · ${file.type || kind} · ${formatFileSize(file.size)}`;
  }, [file, kind]);

  async function handleChange(event) {
    const input = event.currentTarget;
    const nextFile = input.files?.[0] || null;
    if (!nextFile) {
      onChange(null);
      return;
    }
    let validationError = validateMediaFile(nextFile, kind);
    if (validationError) {
      onChange(null, validationError);
      input.value = '';
      return;
    }

    if (kind === 'video') {
      setIsCheckingVideo(true);
      try {
        const duration = await readVideoDuration(nextFile);
        if (duration > VIDEO_MAX_DURATION_SECONDS) {
          validationError = `Video must be ${VIDEO_MAX_DURATION_SECONDS} seconds or shorter.`;
        }
      } catch {
        validationError = 'Video duration could not be checked. Please choose a playable MP4, MOV, or WEBM file.';
      } finally {
        setIsCheckingVideo(false);
      }
    }

    if (validationError) {
      onChange(null, validationError);
      input.value = '';
      return;
    }

    onChange(nextFile, '');
  }

  return (
    <div className={`upload-card${error ? ' is-invalid' : ''}${file ? ' has-file' : ''}`}>
      <input
        id={id || name}
        name={name}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={isCheckingVideo}
        className="upload-card__input"
      />
      <label htmlFor={id || name} className="upload-card__label">
        <span className="upload-card__title">{label}</span>
        <span className="upload-card__helper">{isCheckingVideo ? 'Checking video duration…' : helper}</span>
        {!file && <span className="upload-card__action">{isCheckingVideo ? 'Checking…' : 'Upload'}</span>}
      </label>

      {file && previewUrl && (
        <div className="upload-card__preview">
          {kind === 'video' ? (
            <video src={previewUrl} controls playsInline preload="metadata" />
          ) : (
            <img src={previewUrl} alt={`${label} preview`} />
          )}
        </div>
      )}

      {file && (
        <div className="upload-card__controls">
          <span>{selectedMeta}</span>
          <button type="button" onClick={onRemove}>
            Remove
          </button>
        </div>
      )}

      {error && <small className="field-error">{error}</small>}
    </div>
  );
}
