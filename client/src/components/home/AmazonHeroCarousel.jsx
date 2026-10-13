import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAssetUrl, getComplaintRankings, getComplaints } from '../../services/api.js';
import { getShowcaseImage } from '../../utils/showcaseImages.js';
import { getCompanyLogo, getCompanyCategoryIcon } from '../../utils/companyLogos.js';
import ComplaintCommentsModal from '../complaints/ComplaintCommentsModal.jsx';

export default function AmazonHeroCarousel({ compact = false, rankings: propRankings = null }) {
  const [items, setItems] = useState([]);
  const [liveComplaints, setLiveComplaints] = useState([]);
  const [activeVideoModal, setActiveVideoModal] = useState(null);
  const [activeCommentsItem, setActiveCommentsItem] = useState(null);
  const [speedLevel, setSpeedLevel] = useState('normal'); // 'slow', 'normal', 'fast'

  // Fetch real approved live complaints for Row 1
  useEffect(() => {
    let isCurrent = true;
    // The marquee only displays sixteen records; do not download the full public
    // archive just to render its first row.
    getComplaints({ limit: 16 })
      .then((data) => {
        if (!isCurrent) return;
        if (Array.isArray(data) && data.length > 0) {
          setLiveComplaints(data.slice(0, 16));
        }
      })
      .catch(() => {});
    return () => { isCurrent = false; };
  }, []);

  // Populate cards using ranked complaints, avoiding redundant heavy API fetches
  useEffect(() => {
    let isCurrent = true;

    const populateFromRankings = (rankingsData) => {
      const dynamicCards = [];
      const seenKeys = new Set();
      const productsList = rankingsData?.products || [];

      productsList.forEach((prod) => {
        const comp = prod.latestComplaint;
        const prodName = prod.name || comp?.productName || comp?.serviceName || comp?.model || comp?.title || 'Product';
        const companyName = prod.company || comp?.company || 'Company';
        const key = `${companyName}-${prodName}`.toLowerCase();
        const count = Number(prod.count) || 1;

        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const imageList = Array.isArray(comp?.productImages) && comp.productImages.length > 0
            ? comp.productImages.map((img) => (typeof img === 'string' ? getAssetUrl(img) : getAssetUrl(img.url)))
            : (comp?.productImageUrl ? [getAssetUrl(comp.productImageUrl)] : [getShowcaseImage(prod.category)]);

          const itemType = comp?.type || (comp?.category && ['Hospital & Healthcare', 'Flights & Trains', 'Hotel & Travel', 'Banking', 'Restaurants & Food', 'Telecom'].includes(comp.category) ? 'Service' : 'Product');
          dynamicCards.push({
            id: `real-${comp?.id || prodName}`,
            complaintId: comp?.id || null,
            rank: dynamicCards.length + 1,
            tag: count > 1
              ? `🔥 ${count} CONSUMER REPORTS`
              : '🚨 VERIFIED USER EVIDENCE',
            count,
            type: itemType,
            company: companyName,
            productName: prodName,
            category: prod.category || comp?.category || 'Product',
            categoryIcon: itemType === 'Service' ? '🛠️' : '📦',
            defectTitle: comp?.title || `${prodName} Defect Report`,
            summary: comp?.description ? comp.description.slice(0, 110) + '...' : 'Verified consumer evidence record.',
            imageUrl: imageList[0],
            images: imageList,
            videoUrl: comp?.productVideoUrl ? getAssetUrl(comp.productVideoUrl) : null,
            hasVideo: Boolean(comp?.productVideoUrl),
            warningBadge: comp?.badgeLabel || comp?.location || 'Verified Customer Evidence',
            link: comp?.id ? `/complaints/${comp.id}` : `/complaints?q=${encodeURIComponent(prodName)}`,
            colorTheme: comp?.productVideoUrl ? '#dc2626' : '#c45500',
          });
        }
      });

      setItems(dynamicCards.slice(0, 12));
    };

    if (propRankings?.products?.length) {
      populateFromRankings(propRankings);
    } else {
      getComplaintRankings()
        .then((rankingsData) => {
          if (isCurrent && rankingsData) {
            populateFromRankings(rankingsData);
          }
        })
        .catch(() => {});
    }

    return () => {
      isCurrent = false;
    };
  }, [propRankings]);

  // Row 1: Live complaints feed (transformed into hero cards)
  const row1LiveCards = useMemo(() => {
    return liveComplaints.map((c, idx) => {
      const imageList = Array.isArray(c.productImages) && c.productImages.length > 0
        ? c.productImages.map((img) => (typeof img === 'string' ? getAssetUrl(img) : getAssetUrl(img.url)))
        : (c.productImageUrl ? [getAssetUrl(c.productImageUrl)] : [getShowcaseImage(c.category)]);

      const cat = (c.category || '').toLowerCase();
      const comp = (c.company || '').toLowerCase();
      const isService = cat.includes('hospital') || cat.includes('health') || cat.includes('flight') ||
        cat.includes('hotel') || cat.includes('travel') || cat.includes('restaurant') ||
        cat.includes('bank') || cat.includes('finance') || cat.includes('telecom') ||
        cat.includes('courier') || cat.includes('delivery') || comp.includes('hospital') ||
        comp.includes('apollo') || comp.includes('indigo') || comp.includes('oyo');

      const itemType = isService ? 'Service' : (c.type || 'Product');
      return {
        id: `live-${c.id}`,
        complaintId: c.id,
        rank: idx + 1,
        tag: '🚨 LIVE COMPLAINT',
        count: c.similarComplaintCount || 1,
        type: itemType,
        company: c.company || 'Company',
        productName: c.model || c.productName || c.title,
        category: c.category || (isService ? 'Hospital & Healthcare' : 'Product'),
        categoryIcon: itemType === 'Service' ? '🛠️' : '📦',
        defectTitle: c.title,
        summary: c.description ? c.description.slice(0, 110) + '...' : 'Verified consumer complaint record.',
        imageUrl: imageList[0],
        images: imageList,
        videoUrl: c.productVideoUrl ? getAssetUrl(c.productVideoUrl) : null,
        hasVideo: Boolean(c.productVideoUrl),
        warningBadge: c.location || 'Verified Complaint',
        link: `/complaints/${c.id}`,
        colorTheme: '#dc2626',
      };
    });
  }, [liveComplaints]);

  // Seamless marquee lists repeated only if needed to fill viewport
  const row1MarqueeList = useMemo(() => {
    if (row1LiveCards.length === 0) return [];
    if (row1LiveCards.length < 6) {
      const times = Math.ceil(6 / row1LiveCards.length);
      const arr = [];
      for (let i = 0; i < times; i++) arr.push(...row1LiveCards);
      return arr;
    }
    return row1LiveCards;
  }, [row1LiveCards]);

  const row2MarqueeList = useMemo(() => {
    if (items.length === 0) return [];
    if (items.length < 6) {
      const times = Math.ceil(6 / items.length);
      const arr = [];
      for (let i = 0; i < times; i++) arr.push(...items);
      return arr;
    }
    return items;
  }, [items]);

  // Normal, consistent, smooth speed for nonstop continuous marquee
  const speedSeconds = 32;

  function renderHeroCard(item, keyPrefix = '') {
    const preload = keyPrefix === 'orig1-0' || keyPrefix === 'orig1-1';
    return (
      <HeroCard
        key={`${keyPrefix}-${item.id}`}
        item={item}
        preload={preload}
        onVideoClick={(videoItem) => setActiveVideoModal(videoItem)}
        onCommentsClick={(commentsItem) => setActiveCommentsItem(commentsItem)}
      />
    );
  }

  return (
    <section
      className={`amazon-multi-banner${compact ? ' amazon-multi-banner--compact' : ''}`}
      aria-label="Most Complained Products and Services"
    >
      {/* Top Banner Header */}
      <div className="amazon-multi-banner__header">
        <div className="amazon-multi-banner__title-group">
          <span className="amazon-multi-banner__live-badge">
            <span className="live-dot" /> LIVE CONSUMER WATCH
          </span>
          <h2 className="amazon-multi-banner__title">
            🔥 CONSUMER COMPLAINT HEADQUARTERS
          </h2>
          <p className="amazon-multi-banner__subtitle">
            Real-time live complaints and most complained-about products, brands, and services with verified photos &amp; evidence videos.
          </p>
        </div>
      </div>

      <div className="amazon-two-row-grid">
        {/* ROW 1: LIVE COMPLAINTS (Endlessly moving non-stopping horizontal carousel) */}
        <div className="hero-carousel-row-section">
          <div className="hero-carousel-row-header">
            <div className="hero-carousel-row-title-wrap">
              <h3 className="hero-carousel-row-title">
                <span>🔴</span> LIVE COMPLAINTS
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Endlessly streaming verified consumer reports
              </span>
            </div>
            <Link to="/complaints/live" className="amazon-multi-banner__explore-btn">
              View All Live Complaints →
            </Link>
          </div>

          {row1LiveCards.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', margin: '0.5rem 0' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>No Live Complaints Yet</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Real-time consumer complaints will appear here immediately once filed.</div>
            </div>
          ) : (
            <div
              className="hero-marquee-viewport"
              style={{ '--hero-speed': `${speedSeconds}s` }}
            >
              <div className="hero-marquee-track hero-marquee-track--left">
                {row1MarqueeList.map((c, idx) => renderHeroCard(c, `orig1-${idx}`))}
                {row1MarqueeList.map((c, idx) => renderHeroCard(c, `dup1-${idx}`))}
              </div>
            </div>
          )}
        </div>

        {/* ROW 2: MOST COMPLAINED PRODUCTS/SERVICES */}
        <div className="hero-carousel-row-section">
          <div className="hero-carousel-row-header">
            <div className="hero-carousel-row-title-wrap">
              <h3 className="hero-carousel-row-title">
                <span>🔥</span> MOST COMPLAINED PRODUCTS &amp; SERVICES
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Ranked highest report frequencies with verified customer evidence
              </span>
            </div>
            <Link to="/complaints?sort=most-complained" className="amazon-multi-banner__explore-btn">
              View Most Complained →
            </Link>
          </div>

          {items.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', margin: '0.5rem 0' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>📊</div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>No Ranked Complaints Yet</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Most complained products and services will rank automatically as consumers file grievances.</div>
            </div>
          ) : (
            <div
              className="hero-marquee-viewport"
              style={{ '--hero-speed': `${Math.round(speedSeconds * 1.15)}s` }}
            >
              <div className="hero-marquee-track hero-marquee-track--right">
                {row2MarqueeList.map((c, idx) => renderHeroCard(c, `orig2-${idx}`))}
                {row2MarqueeList.map((c, idx) => renderHeroCard(c, `dup2-${idx}`))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Real Video Evidence */}
      {activeVideoModal && (
        <div
          className="evidence-video-modal-backdrop"
          onClick={() => setActiveVideoModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Customer Video Evidence"
        >
          <div
            className="evidence-video-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="evidence-video-modal__header">
              <div>
                <span className="video-modal-eyebrow">📹 REAL CONSUMER VIDEO EVIDENCE</span>
                <h3>{activeVideoModal.company} — {activeVideoModal.productName}</h3>
                <p>{activeVideoModal.defectTitle}</p>
              </div>
              <button
                type="button"
                className="evidence-video-modal__close"
                onClick={() => setActiveVideoModal(null)}
                aria-label="Close video player"
              >
                ✕
              </button>
            </div>

            <div className="evidence-video-modal__player">
              <video
                src={activeVideoModal.videoUrl}
                controls
                autoPlay
                playsInline
                className="video-element"
              >
                Your browser does not support HTML5 video.
              </video>
            </div>

            <div className="evidence-video-modal__footer">
              <p className="video-notice">
                ⚠️ Consumer-uploaded real video evidence. Bill &amp; sensitive receipts are kept confidential for admin inspection only.
              </p>
              <Link
                to={activeVideoModal.link}
                className="modal-action-btn"
                onClick={() => setActiveVideoModal(null)}
              >
                Inspect All Complaints &amp; Records →
              </Link>
            </div>
          </div>
        </div>
      )}
      {/* Modal for Hero Card Comments */}
      {activeCommentsItem && (
        <ComplaintCommentsModal
          complaintId={
            activeCommentsItem.complaintId ||
            (typeof activeCommentsItem.id === 'string'
              ? activeCommentsItem.id.replace(/^(live|real|row1)-/, '')
              : activeCommentsItem.id)
          }
          complaintTitle={activeCommentsItem.productName || activeCommentsItem.defectTitle}
          companyName={activeCommentsItem.company}
          isOpen={Boolean(activeCommentsItem)}
          onClose={() => setActiveCommentsItem(null)}
        />
      )}
    </section>
  );
}

function HeroCard({ item, preload = false, onVideoClick, onCommentsClick }) {
  const images = Array.isArray(item.images) && item.images.length > 0
    ? item.images
    : [item.imageUrl];

  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // Auto-rotating photo carousel for multi-image complaints
  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % images.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [images]);

  return (
    <article
      className="amazon-multi-card"
      style={{ '--card-accent': item.colorTheme }}
    >
      {/* Card Top Pill */}
      <div className="amazon-multi-card__top">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="amazon-multi-card__rank-tag">
            {item.tag || `#${item.rank} MOST COMPLAINED`}
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: item.type === 'Service' ? '#fef3c7' : '#e0e7ff',
              color: item.type === 'Service' ? '#92400e' : '#3730a3',
              border: item.type === 'Service' ? '1px solid #fde68a' : '1px solid #c7d2fe',
            }}
          >
            {item.type === 'Service' ? 'SERVICE' : 'PRODUCT'}
          </span>
        </div>
        <span className="amazon-multi-card__count-badge">
          🔥 {item.count} {item.count === 1 ? 'Report' : 'Reports'}
        </span>
      </div>

      {/* Company & Product Header with Matching Icon */}
      {(() => {
        const catIcon = getCompanyCategoryIcon(item.company, item.category);
        return (
          <div className="amazon-multi-card__titles" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: catIcon.bg || (item.type === 'Service' ? '#fff7ed' : '#eff6ff'),
                border: `1px solid ${catIcon.border || '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                padding: '4px',
                overflow: 'hidden',
              }}
            >
              {catIcon.svg ? (
                <img
                  src={catIcon.svg}
                  alt={`${item.company} icon`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '1.2rem' }}>{catIcon.emoji}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className="amazon-multi-card__company">{item.company}</h3>
              <h4 className="amazon-multi-card__product" title={item.productName}>
                {item.productName}
              </h4>
            </div>
          </div>
        );
      })()}

      {/* Media Viewport: Real Photo or Video (Bills never shown) */}
      <div className="amazon-multi-card__media-wrap">
        <img
          src={images[currentImgIndex] || item.imageUrl}
          alt={`${item.company} ${item.productName} evidence`}
          className="amazon-multi-card__img"
          loading={preload ? 'eager' : 'lazy'}
          fetchPriority={preload ? 'high' : 'auto'}
          onError={(e) => {
            e.currentTarget.src = getShowcaseImage(item.category);
          }}
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
              }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '6px',
                transform: 'translateY(-50%)',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(15, 23, 42, 0.75)',
                color: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                cursor: 'pointer',
                zIndex: 4,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentImgIndex((prev) => (prev + 1) % images.length);
              }}
              style={{
                position: 'absolute',
                top: '50%',
                right: '6px',
                transform: 'translateY(-50%)',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(15, 23, 42, 0.75)',
                color: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                cursor: 'pointer',
                zIndex: 4,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
              aria-label="Next photo"
            >
              ›
            </button>
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '4px',
                zIndex: 4,
                background: 'rgba(0,0,0,0.5)',
                padding: '3px 6px',
                borderRadius: '12px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImgIndex(dotIdx);
                  }}
                  style={{
                    width: dotIdx === currentImgIndex ? '16px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: dotIdx === currentImgIndex ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  aria-label={`Photo ${dotIdx + 1}`}
                />
              ))}
            </div>
            <span
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.65)',
                color: '#fff',
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                zIndex: 3,
              }}
            >
              📷 {currentImgIndex + 1}/{images.length}
            </span>
          </>
        )}

        {/* If card has user-submitted evidence video */}
        {item.hasVideo && (
          <button
            type="button"
            className="amazon-multi-card__video-trigger"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onVideoClick(item);
            }}
            aria-label={`Watch real complaint video for ${item.productName}`}
          >
            <span className="video-play-icon">▶</span>
            <span className="video-play-text">Real Video (30s)</span>
          </button>
        )}

        {/* Category Pill Tag */}
        <span className="amazon-multi-card__cat-tag">
          {item.categoryIcon || '📦'} {item.category}
        </span>
      </div>

      {/* Defect Highlight & Warning */}
      <div className="amazon-multi-card__info">
        <p className="amazon-multi-card__defect" title={item.defectTitle}>
          ⚠️ <strong>{item.defectTitle}</strong>
        </p>
        <p className="amazon-multi-card__summary">{item.summary}</p>
      </div>

      {/* Card Footer with Warning Tag and Direct Link */}
      <div className="amazon-multi-card__footer">
        <span className="amazon-multi-card__warning-badge">
          {item.warningBadge}
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCommentsClick(item);
            }}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#1e293b',
              cursor: 'pointer',
            }}
            title="Open discussion and comments"
          >
            💬 Comments
          </button>
          <Link
            to={item.link}
            className="amazon-multi-card__action-btn"
            style={{ flex: 1, textAlign: 'center' }}
            aria-label={`Inspect ${item.productName} complaints`}
          >
            Inspect →
          </Link>
        </div>
      </div>
    </article>
  );
}
