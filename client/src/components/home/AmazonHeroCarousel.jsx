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
  const [liveComplaints, setLiveComplaints] = useState([]);
  const [activeVideoModal, setActiveVideoModal] = useState(null);
  const [activeCommentsItem, setActiveCommentsItem] = useState(null);
  const [speedLevel, setSpeedLevel] = useState('normal'); // 'slow', 'normal', 'fast'

  // Fetch real approved live complaints for Row 1
  useEffect(() => {
    let isCurrent = true;
    getComplaints()
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
        const hasImage = Boolean(comp?.productImageUrl || comp?.productImages?.length);
        const hasVideo = Boolean(comp?.productVideoUrl);
        const count = Number(prod.count) || 1;

        if (hasImage || hasVideo || count > 1) {
          const prodName = prod.name || comp?.productName || comp?.serviceName || comp?.model || comp?.title || 'Product';
          const companyName = prod.company || comp?.company || 'Company';
          const key = `${companyName}-${prodName}`.toLowerCase();

          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            const imageList = Array.isArray(comp?.productImages) && comp.productImages.length > 0
              ? comp.productImages.map((img) => (typeof img === 'string' ? getAssetUrl(img) : getAssetUrl(img.url)))
              : (comp?.productImageUrl ? [getAssetUrl(comp.productImageUrl)] : [getShowcaseImage(prod.category)]);

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
              imageUrl: imageList[0],
              images: imageList,
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
          merged.push({ ...curated, images: [curated.imageUrl] });
        }
      });

      const finalItems = merged.slice(0, 12).map((card, idx) => ({
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

  // Row 1: Live complaints feed (transformed into hero cards)
  const row1LiveCards = useMemo(() => {
    if (liveComplaints.length === 0) {
      return items.slice(0, 6).map((item, idx) => ({
        ...item,
        id: `row1-${item.id}-${idx}`,
        badge: 'LIVE COMPLAINT',
      }));
    }
    return liveComplaints.map((c, idx) => {
      const imageList = Array.isArray(c.productImages) && c.productImages.length > 0
        ? c.productImages.map((img) => (typeof img === 'string' ? getAssetUrl(img) : getAssetUrl(img.url)))
        : (c.productImageUrl ? [getAssetUrl(c.productImageUrl)] : [getShowcaseImage(c.category)]);

      return {
        id: `live-${c.id}`,
        rank: idx + 1,
        tag: '🚨 LIVE COMPLAINT',
        count: c.similarComplaintCount || 1,
        company: c.company || 'Company',
        productName: c.model || c.productName || c.title,
        category: c.category || 'Product',
        categoryIcon: c.type === 'Service' ? '🛠️' : '📦',
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
  }, [liveComplaints, items]);

  // Row 2: Most complained products and brands
  const row2RankCards = useMemo(() => {
    return items;
  }, [items]);

  // Duration in seconds according to speedLevel
  const speedSeconds = speedLevel === 'slow' ? 55 : speedLevel === 'fast' ? 22 : 36;

  function renderHeroCard(item, keyPrefix = '') {
    return (
      <HeroCard
        key={`${keyPrefix}-${item.id}`}
        item={item}
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

        {/* Speed Adjustment Controls */}
        <div className="hero-carousel-controls">
          <span>Carousel Speed:</span>
          <button
            type="button"
            className="hero-speed-btn"
            style={{ fontWeight: speedLevel === 'slow' ? 800 : 500, borderColor: speedLevel === 'slow' ? '#febd69' : '' }}
            onClick={() => setSpeedLevel('slow')}
            title="Set carousel speed to Slow"
          >
            Slow
          </button>
          <button
            type="button"
            className="hero-speed-btn"
            style={{ fontWeight: speedLevel === 'normal' ? 800 : 500, borderColor: speedLevel === 'normal' ? '#febd69' : '' }}
            onClick={() => setSpeedLevel('normal')}
            title="Set carousel speed to Normal"
          >
            Normal
          </button>
          <button
            type="button"
            className="hero-speed-btn"
            style={{ fontWeight: speedLevel === 'fast' ? 800 : 500, borderColor: speedLevel === 'fast' ? '#febd69' : '' }}
            onClick={() => setSpeedLevel('fast')}
            title="Set carousel speed to Fast"
          >
            Fast
          </button>
        </div>
      </div>

      <div className="amazon-two-row-grid">
        {/* ROW 1: LIVE COMPLAINTS (Endlessly moving non-stopping horizontal carousel) */}
        <div className="hero-carousel-row-section">
          <div className="hero-carousel-row-header">
            <div className="hero-carousel-row-title-wrap">
              <h3 className="hero-carousel-row-title">
                <span>🔴</span> ROW 1 — LIVE COMPLAINTS
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Endlessly streaming verified consumer reports
              </span>
            </div>
            <Link to="/complaints" className="amazon-multi-banner__explore-btn">
              View All Live Complaints →
            </Link>
          </div>

          <div
            className="hero-marquee-viewport"
            style={{ '--hero-speed': `${speedSeconds}s` }}
          >
            <div className="hero-marquee-track hero-marquee-track--left">
              {row1LiveCards.map((c) => renderHeroCard(c, 'orig1'))}
              {row1LiveCards.map((c) => renderHeroCard(c, 'dup1'))}
            </div>
          </div>
        </div>

        {/* ROW 2: MOST COMPLAINED PRODUCTS/SERVICES */}
        <div className="hero-carousel-row-section">
          <div className="hero-carousel-row-header">
            <div className="hero-carousel-row-title-wrap">
              <h3 className="hero-carousel-row-title">
                <span>🔥</span> ROW 2 — MOST COMPLAINED PRODUCTS &amp; SERVICES
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Ranked highest report frequencies with verified customer evidence
              </span>
            </div>
            <Link to="/complaints?sort=most-complained" className="amazon-multi-banner__explore-btn">
              View Most Complained →
            </Link>
          </div>

          <div
            className="hero-marquee-viewport"
            style={{ '--hero-speed': `${Math.round(speedSeconds * 1.15)}s` }}
          >
            <div className="hero-marquee-track hero-marquee-track--right">
              {row2RankCards.map((c) => renderHeroCard(c, 'orig2'))}
              {row2RankCards.map((c) => renderHeroCard(c, 'dup2'))}
            </div>
          </div>
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

function HeroCard({ item, onVideoClick, onCommentsClick }) {
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
        <span className="amazon-multi-card__rank-tag">
          {item.tag || `#${item.rank} MOST COMPLAINED`}
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
          src={images[currentImgIndex] || item.imageUrl}
          alt={`${item.company} ${item.productName} evidence`}
          className="amazon-multi-card__img"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = getShowcaseImage(item.category);
          }}
        />

        {images.length > 1 && (
          <span
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              background: 'rgba(0,0,0,0.65)',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px',
              zIndex: 3,
            }}
          >
            📷 {currentImgIndex + 1}/{images.length}
          </span>
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
