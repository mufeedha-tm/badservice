import { useEffect, useRef, useState } from 'react';

function normalizeItems(items) {
  return (items || [])
    .map((item, index) => {
      if (!item) return null;
      if (typeof item === 'string') {
        const isVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(item) || /\/product-videos\//i.test(item);
        return { id: `${item}-${index}`, url: item, type: isVideo ? 'video' : 'image', label: isVideo ? 'Video' : 'Image' };
      }
      if (item.type === 'placeholder') {
        return {
          id: item.id || `${item.label || 'placeholder'}-${index}`,
          url: '',
          type: 'placeholder',
          label: item.label || 'Evidence',
          title: item.placeholderTitle || item.label || 'Evidence',
          placeholderText: item.placeholderText || 'Evidence will appear here when available.',
        };
      }
      if (!item.url) return null;
      return {
        id: item.id || `${item.url}-${index}`,
        url: item.url,
        type: item.type || (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(item.url) ? 'video' : 'image'),
        label: item.label || '',
        title: item.title || '',
        company: item.company || '',
      };
    })
    .filter(Boolean);
}

export default function MediaCarousel({
  items = [],
  alt = 'Complaint media',
  autoPlay = false,
  compact = false,
}) {
  const mediaItems = normalizeItems(items);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState({});
  const videoRefs = useRef({});

  useEffect(() => {
    setActiveIndex((current) => (mediaItems.length ? current % mediaItems.length : 0));
  }, [mediaItems.length]);

  useEffect(() => {
    mediaItems.forEach((item, index) => {
      if (item.type !== 'video') return;
      const node = videoRefs.current[item.id];
      if (!node) return;
      if (index !== activeIndex) {
        node.pause();
      }
    });
  }, [activeIndex, mediaItems]);

  useEffect(() => {
    if (!autoPlay || paused || mediaItems.length <= 1) return undefined;
    const active = mediaItems[activeIndex];
    if (active?.type === 'video') return undefined;
    const timerId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % mediaItems.length);
    }, 5000);
    return () => window.clearInterval(timerId);
  }, [autoPlay, paused, mediaItems, activeIndex]);

  if (!mediaItems.length) {
    return (
      <div className={`media-placeholder${compact ? ' media-placeholder--compact' : ''}`} aria-label="No media available">
        <span aria-hidden="true">📷</span>
        <small>No media</small>
      </div>
    );
  }

  const goTo = (index) => setActiveIndex(index);
  const goToNext = () => setActiveIndex((current) => (current + 1) % mediaItems.length);
  const goToPrevious = () => setActiveIndex((current) => (current - 1 + mediaItems.length) % mediaItems.length);

  return (
    <div className={`media-carousel${compact ? ' media-carousel--compact' : ''}`} aria-roledescription="carousel" aria-label={alt}>
      <div className="media-carousel__viewport">
        {mediaItems.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={item.id}
              className={`media-carousel__slide${isActive ? ' is-active' : ''}`}
              hidden={!isActive}
            >
              {item.type === 'placeholder' ? (
                <div className="media-carousel__placeholder">
                  <span className="media-carousel__placeholder-icon" aria-hidden="true">{item.label === 'Product video' ? '▶' : '▣'}</span>
                  <strong>{item.title}</strong>
                  <small>{item.placeholderText}</small>
                </div>
              ) : item.type === 'video' ? (
                <video
                  ref={(node) => {
                    if (node) videoRefs.current[item.id] = node;
                    else delete videoRefs.current[item.id];
                  }}
                  className="media-carousel__media"
                  controls
                  playsInline
                  muted
                  preload="metadata"
                  onPlay={() => setPaused(true)}
                >
                  <source src={item.url} />
                </video>
              ) : failed[item.id] ? (
                <div className="media-placeholder">
                  <span aria-hidden="true">📷</span>
                  <small>Media unavailable</small>
                </div>
              ) : (
                <img
                  className="media-carousel__media"
                  src={item.url}
                  alt={item.label || alt}
                  onError={() => setFailed((prev) => ({ ...prev, [item.id]: true }))}
                />
              )}
            </div>
          );
        })}

        {mediaItems.length > 1 && (
          <>
            <button type="button" className="media-carousel__arrow media-carousel__arrow--prev" onClick={goToPrevious} aria-label="Previous media">
              ‹
            </button>
            <button type="button" className="media-carousel__arrow media-carousel__arrow--next" onClick={goToNext} aria-label="Next media">
              ›
            </button>
            <div className="media-carousel__dots" role="tablist" aria-label="Carousel navigation">
              {mediaItems.map((item, index) => (
                <button
                  key={`${item.id}-dot`}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  className={`media-carousel__dot${index === activeIndex ? ' is-active' : ''}`}
                  aria-label={`Show ${item.label || `slide ${index + 1}`}`}
                  onClick={() => goTo(index)}
                />
              ))}
            </div>
            {autoPlay && (
              <button
                type="button"
                className="media-carousel__pause"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? 'Play carousel' : 'Pause carousel'}
              >
                {paused ? 'Play' : 'Pause'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
