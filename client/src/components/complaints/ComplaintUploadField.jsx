import { useEffect, useMemo, useState } from 'react';
import { formatFileSize, validateMediaFile } from '../../utils/complaintMedia.js';

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

  function handleChange(event) {
    const nextFile = event.target.files?.[0] || null;
    if (!nextFile) {
      onChange(null);
      return;
    }
    const validationError = validateMediaFile(nextFile, kind);
    onChange(nextFile, validationError);
    if (validationError) {
      event.target.value = '';
    }
  }

  return (
    <div className={`upload-card${error ? ' is-invalid' : ''}${file ? ' has-file' : ''}`}>
      <input
        id={id || name}
        name={name}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="upload-card__input"
      />
      <label htmlFor={id || name} className="upload-card__label">
        <span className="upload-card__title">{label}</span>
        <span className="upload-card__helper">{helper}</span>
        {!file && <span className="upload-card__action">Upload</span>}
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
