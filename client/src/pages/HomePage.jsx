import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EvidenceCarousel from '../components/media/EvidenceCarousel.jsx';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { getCategories, getComplaintRankings, getErrorMessage, searchComplaints } from '../services/api.js';
import { getComplaintMedia } from '../utils/complaintMedia.js';
import { getShowcaseImage } from '../utils/showcaseImages.js';

const trustPoints = [
  { number: '01', title: 'Real complaints', text: 'Consumer-submitted records, not product advertisements.' },
  { number: '02', title: 'Useful evidence', text: 'Photos, bills and short customer videos where available.' },
  { number: '03', title: 'Before you buy', text: 'Spot repeated problems before spending your money.' },
];

const marutiReferenceMedia = [
  {
    id: 'maruti-public-photo',
    type: 'image',
    url: '/maruthi.avif',
    label: 'Maruti photo',
    referenceNotice: 'Public reference · not complaint evidence',
  },
  {
    id: 'maruti-public-video',
    type: 'video',
    url: '/maruthi%20video.mp4',
    label: 'Maruti reference video · max 15 seconds',
    referenceNotice: 'Public reference · not complaint evidence',
    maxDurationSeconds: 15,
  },
  {
    id: 'maruti-sample-invoice',
    type: 'image',
    url: '/bill%20maruthi%20suzuki.png',
    label: 'Maruti invoice reference',
    referenceNotice: 'Invoice reference · not complaint evidence',
  },
];

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [rankings, setRankings] = useState({ companies: [], products: [], categories: [] });
  const [todayComplaint, setTodayComplaint] = useState(null);
  const [todayComplaintImageFailed, setTodayComplaintImageFailed] = useState(false);
  const [todayComplaintPreviewError, setTodayComplaintPreviewError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    Promise.all([getCategories(), getComplaintRankings()])
      .then(([categoryData, rankingData]) => {
        if (!current) return;
        setCategories((categoryData || []).filter((item) => !item.parentId));
        setRankings(rankingData || { companies: [], products: [], categories: [] });
      })
      .catch((err) => current && setError(getErrorMessage(err, 'We could not load the latest complaint data.')))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    searchComplaints({ period: 'today', sort: 'latest' })
      .then((complaints) => {
        if (current) {
          setTodayComplaint(complaints?.[0] || null);
          setTodayComplaintPreviewError('');
        }
      })
      .catch((error) => {
        if (current) {
          setTodayComplaint(null);
          setTodayComplaintPreviewError(getErrorMessage(error, 'Could not load today’s complaint preview.'));
        }
      });
    return () => { current = false; };
  }, []);

  const topProducts = useMemo(() => (rankings.products || []).slice(0, 6), [rankings.products]);
  const categoryMap = useMemo(() => new Map((rankings.categories || []).map((item) => [item.name, item.count])), [rankings.categories]);
  const todayComplaintImage = useMemo(
    () => getComplaintMedia(todayComplaint).find((item) => item.type === 'image')?.url,
    [todayComplaint],
  );
  const todayComplaintFallbackImage = getShowcaseImage(todayComplaint?.category || 'Mobiles');

  useEffect(() => {
    setTodayComplaintImageFailed(false);
  }, [todayComplaintImage]);

  return (
    <MainLayout>
      <div className="home-modern">
        <section className="home-consumer-hero">
          <div className="home-consumer-hero__copy">
            <span className="home-section__eyebrow">01 · Consumer watch</span>
            <h1>Know the problem<br />before you buy.</h1>
            <p>BadService.in turns real customer complaints into a simple consumer signal — so you can check brands, products and services before spending your money.</p>
            <div className="home-hero-actions">
              <Link className="home-primary" to="/complaints">Explore complaints</Link>
              <Link className="home-hero-secondary" to="/file-complaint">File a complaint</Link>
            </div>
          </div>
          <div className="home-consumer-hero__points">
            {trustPoints.map((item) => (
              <div className="home-trust-row" key={item.number}>
                <span>{item.number}</span>
                <div><strong>{item.title}</strong><p>{item.text}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section home-section--ranking">
          <div className="home-section__heading">
            <div><span className="home-section__eyebrow">02 · Most complained</span><h2>Products people are complaining about most</h2><p>Live rankings from complaint records. Open a card to inspect the underlying complaints.</p></div>
            <Link to="/complaints?sort=most-complained">View all</Link>
          </div>
          {error && <div className="notice notice--error" role="alert">{error}</div>}
          {loading && <div className="simple-grid simple-grid--products">{[1, 2, 3, 4].map((n) => <Skeleton key={n} className="skeleton-card" />)}</div>}
          {!loading && !topProducts.length && <EmptyState title="No product rankings yet" message="Product rankings will appear when complaint data is available." />}
          {!loading && topProducts.length > 0 && (
            <div className="product-ranking-grid product-ranking-grid--equal">
              {topProducts.map((product, index) => (
                <article className="product-rank-card" key={`${product.companyId || product.company}-${product.name}`}>
                  <div className="product-rank-card__top"><span>#{index + 1}</span><span>{product.count} {product.count === 1 ? 'complaint' : 'complaints'}</span></div>
                  {product.company?.toLowerCase().includes('maruti') && product.name?.toLowerCase().includes('maruti') ? (
                    <>
                      <MediaCarousel
                        items={marutiReferenceMedia}
                        alt="Maruti photo, video, and invoice from the public client assets; reference only"
                        compact
                        autoPlay
                      />
                      <p className="product-rank-card__media-credit">
                        Photo, video, and invoice use the files supplied in the client public folder. They are reference media, not evidence submitted with a customer complaint. Video uploads in File Complaint are required and limited to 15 seconds.
                      </p>
                    </>
                  ) : product.latestComplaint ? (
                    <EvidenceCarousel complaint={product.latestComplaint} category={product.category} productName={product.name} compact autoPlay />
                  ) : (
                    <div className="product-rank-card__media-placeholder"><span>Evidence unavailable</span><small>No customer media has been submitted yet.</small></div>
                  )}
                  <div className="product-rank-card__body"><span>{product.category || 'Product'}</span><h3>{product.name}</h3><p>{product.company}</p><Link to={`/complaints?q=${encodeURIComponent(product.name)}`}>See complaints →</Link></div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="home-real-value">
          <div><span className="home-section__eyebrow">03 · Use the record</span><h2>One place to check what consumers are actually experiencing.</h2><p>Search the complaint database, compare companies, inspect evidence and report your own experience when something goes wrong.</p></div>
          <div className="home-value-grid">
            <Link to="/complaints">
              <img src={getShowcaseImage('Computers')} alt="" loading="lazy" />
              <strong>Browse complaints</strong>
              <span>Read recent and historical complaint records.</span>
            </Link>
            <Link to="/companies">
              <img src={getShowcaseImage('Banking')} alt="" loading="lazy" />
              <strong>Compare companies</strong>
              <span>See complaint activity around brands and providers.</span>
            </Link>
            <Link to="/complaints/today">
              <img
                src={todayComplaintImage && !todayComplaintImageFailed ? todayComplaintImage : todayComplaintFallbackImage}
                alt={todayComplaintImage && todayComplaint?.title ? `Evidence for ${todayComplaint.title}` : ''}
                loading="lazy"
                onError={() => {
                  if (todayComplaintImage && !todayComplaintImageFailed) {
                    setTodayComplaintImageFailed(true);
                  }
                }}
              />
              <strong>Today&apos;s complaints</strong>
              <span>See what people reported today.</span>
              {todayComplaintPreviewError && (
                <small className="home-value-grid__preview-error" role="status">
                  {todayComplaintPreviewError}
                </small>
              )}
            </Link>
          </div>
        </section>

        <section className="home-section">
          <div className="home-section__heading"><div><span className="home-section__eyebrow">04 · Browse by category</span><h2>Check the category that matters to you</h2><p>Start with a product or service area and explore the real complaint record.</p></div><Link to="/complaints">All complaints</Link></div>
          <div className="category-modern-grid">
            {categories.slice(0, 8).map((item) => (
              <Link className="category-modern-card" key={item.id || item.name} to={`/categories/${encodeURIComponent(item.slug || item.id || item.name)}`}>
                <div className="category-modern-card__image"><img src={getShowcaseImage(item.name)} alt="" loading="lazy" /></div>
                <div><strong>{item.name}</strong><small>{categoryMap.get(item.name) || 0} complaints</small></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-bottom-cta"><div><span>Have a genuine problem?</span><h2>File it clearly. Help the next consumer.</h2><p>Use the guided complaint form and attach useful evidence where available.</p></div><Link className="home-primary" to="/file-complaint">＋ File a Complaint</Link></section>
      </div>
    </MainLayout>
  );
}
