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
  uploadProgress = null,
  uploadStatus = 'idle', // 'idle' | 'uploading' | 'done' | 'error'
  isAutosaved = false,
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
    return `${file.name} · ${formatFileSize(file.size)}`;
  }, [file]);

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
        await readVideoDuration(nextFile);
      } catch {
        // Video duration read is optional; server auto-trims and compresses
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

      {/* Progress Bar & Status Indicator */}
      {uploadStatus === 'uploading' && (
        <div style={{ marginTop: '8px', padding: '0 4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#e65100', marginBottom: '4px' }}>
            <span>⏳ Uploading evidence…</span>
            <span>{uploadProgress < 100 ? `${uploadProgress || 0}%` : 'Processing…'}</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${uploadProgress || 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ff9800, #e65100)',
                transition: 'width 0.25s ease',
              }}
            />
          </div>
        </div>
      )}

      {isAutosaved && uploadStatus === 'done' && (
        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#2e7d32', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>✓</span> <span>Evidence verified & attached</span>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#c62828', fontWeight: 600 }}>
          ⚠️ Upload issue: will retry on submit
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
