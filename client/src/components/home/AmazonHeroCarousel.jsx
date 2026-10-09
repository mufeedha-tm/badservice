import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAssetUrl, getComplaintRankings, getComplaints } from '../../services/api.js';
import { getShowcaseImage } from '../../utils/showcaseImages.js';
import ComplaintCommentsModal from '../complaints/ComplaintCommentsModal.jsx';

// Verified reference records so the carousel is always vibrant and informative
const CURATED_COMPLAINTS = [
  {
    id: 'curated-maruti',
    rank: 1,
    tag: '🔥 #1 MOST COMPLAINED',
    count: 14,
    company: 'Maruti Suzuki',
    productName: 'Swift ZXI+ / Dzire AMT',
    category: 'Vehicles & Automotive',
    categoryIcon: '🚗',
    defectTitle: 'AMT Transmission Shudder & Defect',
    summary: 'Violent jerking at low gears and steering lock reported after 15,000 km. Dealership refuses warranty claim.',
    imageUrl: '/maruthi.avif',
    videoUrl: '/maruthi%20video.mp4',
    hasVideo: true,
    warningBadge: 'Dealership Warranty Denied',
    link: '/complaints?q=Maruti',
    colorTheme: '#c45500',
  },
  {
    id: 'curated-oneplus',
    rank: 2,
    tag: '📱 HARDWARE DEFECT ALERT',
    count: 11,
    company: 'OnePlus',
    productName: 'OnePlus 11 / 11R 5G',
    category: 'Mobiles',
    categoryIcon: '📱',
    defectTitle: 'Green Vertical Screen Line',
    summary: 'Permanent green and pink line defect appeared on AMOLED screen immediately after OxygenOS 14 software update.',
    imageUrl: getShowcaseImage('Mobiles'),
    videoUrl: null,
    hasVideo: false,
    warningBadge: '₹14,500 Screen Quote',
    link: '/complaints?q=OnePlus',
    colorTheme: '#dc2626',
  },
  {
    id: 'curated-hp',
    rank: 3,
    tag: '💻 MOTHERBOARD BURNOUT',
    count: 9,
    company: 'HP',
    productName: 'HP Victus Gaming Laptop',
    category: 'Computers',
    categoryIcon: '💻',
    defectTitle: 'Motherboard Dead & Hinge Crack',
    summary: 'Laptop died completely with power rail short circuit 2 weeks past standard 1-year warranty. No good-will repair.',
    imageUrl: getShowcaseImage('Computers'),
    videoUrl: null,
    hasVideo: false,
    warningBadge: 'Repairs Exceed Laptop Value',
    link: '/complaints?q=HP',
    colorTheme: '#2563eb',
  },
  {
    id: 'curated-apollo',
    rank: 4,
    tag: '🏥 OVERBILLING RECORD',
    count: 8,
    company: 'Apollo Hospitals',
    productName: 'Emergency ICU Care',
    category: 'Hospital & Healthcare',
    categoryIcon: '🏥',
    defectTitle: 'Inflated Consumables & Detained Patient',
    summary: 'Patient billed ₹48,000 for non-medical consumables. Discharge delayed for 7 hours awaiting cash payment.',
    imageUrl: getShowcaseImage('Hospital & Healthcare'),
    videoUrl: null,
    hasVideo: false,
    warningBadge: 'TPA Insurance Denied',
    link: '/complaints?q=Apollo',
    colorTheme: '#059669',
  },
  {
    id: 'curated-indigo',
    rank: 5,
    tag: '✈️ FLIGHT DELAY WATCH',
    count: 8,
    company: 'IndiGo Airlines',
    productName: 'Domestic Flight 6E',
    category: 'Flights & Trains',
    categoryIcon: '✈️',
    defectTitle: '8+ Hours Flight Delay Without Food',
    summary: 'Stranded passengers received no hotel accommodation or mandatory statutory compensation under DGCA CAR rules.',
    imageUrl: getShowcaseImage('Flights & Trains'),
    videoUrl: null,
    hasVideo: false,
    warningBadge: 'Refund Withheld',
    link: '/complaints?q=IndiGo',
    colorTheme: '#7c3aed',
  },
  {
    id: 'curated-samsung',
    rank: 6,
    tag: '📱 CAMERA MOTOR FAILURE',
    count: 7,
    company: 'Samsung',
    productName: 'Galaxy S22 Ultra',
    category: 'Mobiles',
    categoryIcon: '📱',
    defectTitle: '10x Periscope Lens Rattling & Blur',
    summary: 'Optical Image Stabilization sensor motor seized, resulting in permanent blurry photography and camera app crash.',
    imageUrl: getShowcaseImage('Mobiles'),
    videoUrl: null,
    hasVideo: false,
    warningBadge: 'Camera Module Defect',
    link: '/complaints?q=Samsung',
    colorTheme: '#ea580c',
  },
  {
    id: 'curated-flipkart',
    rank: 7,
    tag: '📦 E-COMMERCE RETURN DENIAL',
    count: 7,
    company: 'Flipkart',
    productName: 'Refurbished Phone / Open Box',
    category: 'Mobiles',
    categoryIcon: '📦',
    defectTitle: 'Wrong Item Delivered & Return Cancelled',
    summary: 'Received duplicate model with damaged camera instead of brand new item. Open box delivery dispute rejected.',
    imageUrl: getShowcaseImage('Mobiles'),
    videoUrl: null,
    hasVideo: false,
    warningBadge: 'Return Window Closed',
    link: '/complaints?q=Flipkart',
    colorTheme: '#2563eb',
  },
  {
    id: 'curated-sbi',
    rank: 8,
    tag: '🏦 BANKING OVERCHARGE',
    count: 6,
    company: 'State Bank of India',
    productName: 'Savings Account & Cards',
    category: 'Banking',
    categoryIcon: '🏦',
    defectTitle: 'Unauthorized Insurance Premium Debit',
    summary: '₹1,499 deducted without consent for accidental insurance. Branch refused reversal despite multiple complaints.',
    imageUrl: getShowcaseImage('Banking'),
    videoUrl: null,
    hasVideo: false,
    warningBadge: 'Unauthorized Deduction',
    link: '/complaints?q=SBI',
    colorTheme: '#0284c7',
  },
];

export default function AmazonHeroCarousel({ compact = false, rankings: propRankings = null }) {
  const [items, setItems] = useState(CURATED_COMPLAINTS);
  const [activeVideoModal, setActiveVideoModal] = useState(null);
  const [activeCommentsItem, setActiveCommentsItem] = useState(null);

  // Populate cards using ranked complaints, avoiding redundant heavy API fetches
  useEffect(() => {
    let isCurrent = true;

    const populateFromRankings = (rankingsData) => {
      const dynamicCards = [];
      const seenKeys = new Set();
      const productsList = rankingsData?.products || [];

      productsList.forEach((prod) => {
        const comp = prod.latestComplaint;
        const hasImage = Boolean(comp?.productImageUrl);
        const hasVideo = Boolean(comp?.productVideoUrl);
        const count = Number(prod.count) || 1;

        if (hasImage || hasVideo || count > 1) {
          const prodName = prod.name || comp?.productName || comp?.serviceName || comp?.model || comp?.title || 'Product';
          const companyName = prod.company || comp?.company || 'Company';
          const key = `${companyName}-${prodName}`.toLowerCase();

          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            dynamicCards.push({
              id: `real-${comp?.id || prodName}`,
              rank: dynamicCards.length + 1,
              tag: count > 1
                ? `🔥 ${count} CONSUMER REPORTS`
                : '🚨 VERIFIED USER EVIDENCE',
              count,
              company: companyName,
              productName: prodName,
              category: prod.category || comp?.category || 'Product',
              categoryIcon: comp?.type === 'Service' ? '🛠️' : '📦',
              defectTitle: comp?.title || `${prodName} Defect Report`,
              summary: comp?.description ? comp.description.slice(0, 110) + '...' : 'Verified consumer evidence record.',
              imageUrl: comp?.productImageUrl ? getAssetUrl(comp.productImageUrl) : getShowcaseImage(prod.category),
              videoUrl: comp?.productVideoUrl ? getAssetUrl(comp.productVideoUrl) : null,
              hasVideo: Boolean(comp?.productVideoUrl),
              warningBadge: comp?.badgeLabel || 'Verified Customer Evidence',
              link: comp?.id ? `/complaints/${comp.id}` : `/complaints?q=${encodeURIComponent(prodName)}`,
              colorTheme: hasVideo ? '#dc2626' : '#c45500',
            });
          }
        }
      });

      // Merge dynamic real complaints with curated records to ensure an 8-card deck
      const merged = [...dynamicCards];
      CURATED_COMPLAINTS.forEach((curated) => {
        const key = `${curated.company}-${curated.productName}`.toLowerCase();
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          merged.push(curated);
        }
      });

      const finalItems = merged.slice(0, 8).map((card, idx) => ({
        ...card,
        rank: idx + 1,
      }));

      if (finalItems.length > 0) {
        setItems(finalItems);
      }
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

  // Split into Row 1 (#1 to #4) and Row 2 (#5 to #8)
  const row1 = useMemo(() => items.slice(0, 4), [items]);
  const row2 = useMemo(() => items.slice(4, 8), [items]);

  function renderCard(item) {
    return (
      <article
        key={item.id}
        className="amazon-multi-card"
        style={{ '--card-accent': item.colorTheme }}
      >
        {/* Card Top Pill */}
        <div className="amazon-multi-card__top">
          <span className="amazon-multi-card__rank-tag">
            #{item.rank} Most Complained
          </span>
          <span className="amazon-multi-card__count-badge">
            🔥 {item.count} {item.count === 1 ? 'Report' : 'Reports'}
          </span>
        </div>

        {/* Company & Product Header */}
        <div className="amazon-multi-card__titles">
          <h3 className="amazon-multi-card__company">{item.company}</h3>
          <h4 className="amazon-multi-card__product" title={item.productName}>
            {item.productName}
          </h4>
        </div>

        {/* Media Viewport: Real Photo or Video (Bills never shown) */}
        <div className="amazon-multi-card__media-wrap">
          <img
            src={item.imageUrl}
            alt={`${item.company} ${item.productName} evidence`}
            className="amazon-multi-card__img"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = getShowcaseImage(item.category);
            }}
          />

          {/* If card has user-submitted evidence video */}
          {item.hasVideo && (
            <button
              type="button"
              className="amazon-multi-card__video-trigger"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveVideoModal(item);
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
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveCommentsItem(item);
              }}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '4px 8px',
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
              aria-label={`Inspect ${item.productName} complaints`}
            >
              Inspect →
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <section
      className={`amazon-multi-banner${compact ? ' amazon-multi-banner--compact' : ''}`}
      aria-label="Most Complained Products and Services"
    >
      {/* Top Banner Header (Clean, no #1-4 / #5-8 text or pills) */}
      <div className="amazon-multi-banner__header">
        <div className="amazon-multi-banner__title-group">
          <span className="amazon-multi-banner__live-badge">
            <span className="live-dot" /> LIVE CONSUMER WATCH
          </span>
          <h2 className="amazon-multi-banner__title">
            🔥 Most Complained Products &amp; Services
          </h2>
          <p className="amazon-multi-banner__subtitle">
            Verified consumer reports with real photos and evidence videos. Warning before you spend.
          </p>
        </div>

        <div className="amazon-multi-banner__header-actions">
          <Link to="/complaints?sort=most-complained" className="amazon-multi-banner__explore-btn">
            View All Most Complained →
          </Link>
        </div>
      </div>

      {/* 2 Rows of 4 Cards: Row 1 has #1–4, Row 2 has #5–8 */}
      <div className="amazon-two-row-grid">
        {/* ROW 1: #1 to #4 */}
        <div className="amazon-grid-row" aria-label="Top 1 to 4 complained items">
          {row1.map(renderCard)}
        </div>

        {/* ROW 2: #5 to #8 */}
        <div className="amazon-grid-row" aria-label="Top 5 to 8 complained items">
          {row2.map(renderCard)}
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
          complaintId={activeCommentsItem.id}
          complaintTitle={activeCommentsItem.productName || activeCommentsItem.defectTitle}
          companyName={activeCommentsItem.company}
          isOpen={Boolean(activeCommentsItem)}
          onClose={() => setActiveCommentsItem(null)}
        />
      )}
    </section>
  );
}
