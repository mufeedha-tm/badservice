import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AmazonHeroCarousel from '../components/home/AmazonHeroCarousel.jsx';
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
    label: 'Maruti reference video',
    referenceNotice: 'Public reference · not complaint evidence',
    maxDurationSeconds: 15,
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
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    let current = true;
    getCategories()
      .then((categoryData) => {
        if (current) setCategories((categoryData || []).filter((item) => !item.parentId));
      })
      .catch((err) => current && setCategoryError(getErrorMessage(err, 'We could not load categories.')));
    getComplaintRankings()
      .then((rankingData) => {
        if (current) setRankings(rankingData || { companies: [], products: [], categories: [] });
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
        {/* Amazon-Style Auto-Moving Hero Deals / Highlights Carousel */}
        <AmazonHeroCarousel rankings={rankings} />

        {/* Amazon-Style 4-Quadrant Cards Grid */}
        <section className="amazon-card-grid" aria-label="Most Complained Highlights">
          {/* Box 1: Most Complained Tech & Mobiles */}
          <article className="amazon-box-card">
            <h3 className="amazon-box-card__title">Most Complained Products</h3>
            <div className="amazon-box-card__quad">
              {(topProducts.slice(0, 4).length > 0 ? topProducts.slice(0, 4) : [
                { name: 'Maruti Suzuki', count: 12, category: 'Vehicles & Automotive' },
                { name: 'Smartphones', count: 8, category: 'Mobiles' },
                { name: 'Laptops', count: 6, category: 'Computers' },
                { name: 'Smart TV', count: 5, category: 'TV & Electronics' },
              ]).map((prod) => (
                <Link
                  key={prod.name}
                  to={`/complaints?q=${encodeURIComponent(prod.name)}`}
                  className="amazon-quad-item"
                >
                  <div className="amazon-quad-item__thumb">
                    <img src={getShowcaseImage(prod.category || 'Mobiles')} alt={prod.name} loading="lazy" />
                  </div>
                  <span className="amazon-quad-item__name">{prod.name}</span>
                  <span className="amazon-quad-item__count">{prod.count} complaints</span>
                </Link>
              ))}
            </div>
            <Link to="/complaints?sort=most-complained" className="amazon-box-card__link">
              See all product complaints →
            </Link>
          </article>

          {/* Box 2: Most Complained Services */}
          <article className="amazon-box-card">
            <h3 className="amazon-box-card__title">Services with High Complaints</h3>
            <div className="amazon-box-card__quad">
              {[
                { name: 'Hospitals', category: 'Hospital & Healthcare', icon: '🏥' },
                { name: 'Hotels & Stays', category: 'Hotel & Travel', icon: '🏨' },
                { name: 'Airlines / Flights', category: 'Flights & Trains', icon: '✈️' },
                { name: 'Banking / Loans', category: 'Banking', icon: '🏦' },
              ].map((svc) => (
                <Link
                  key={svc.name}
                  to={`/complaints?category=${encodeURIComponent(svc.category)}`}
                  className="amazon-quad-item"
                >
                  <div className="amazon-quad-item__thumb">
                    <img src={getShowcaseImage(svc.category)} alt={svc.name} loading="lazy" />
                  </div>
                  <span className="amazon-quad-item__name">{svc.name}</span>
                  <span className="amazon-quad-item__count">
                    {categoryMap.get(svc.category) || 0} complaints
                  </span>
                </Link>
              ))}
            </div>
            <Link to="/complaints?category=Hospital%20%26%20Healthcare" className="amazon-box-card__link">
              See all service complaints →
            </Link>
          </article>

          {/* Box 3: Top Reported Brands */}
          <article className="amazon-box-card">
            <h3 className="amazon-box-card__title">Top Reported Brands</h3>
            <div className="amazon-box-card__quad">
              {(rankings.companies?.slice(0, 4).length > 0 ? rankings.companies.slice(0, 4) : [
                { name: 'Maruti Suzuki', count: 12 },
                { name: 'Samsung', count: 7 },
                { name: 'Flipkart', count: 5 },
                { name: 'Airtel', count: 4 },
              ]).map((comp) => (
                <Link
                  key={comp.name}
                  to={`/complaints?company=${encodeURIComponent(comp.name)}`}
                  className="amazon-quad-item"
                >
                  <div className="amazon-quad-item__thumb">
                    <img src={getShowcaseImage('TV & Electronics')} alt={comp.name} loading="lazy" />
                  </div>
                  <span className="amazon-quad-item__name">{comp.name}</span>
                  <span className="amazon-quad-item__count">{comp.count} complaints</span>
                </Link>
              ))}
            </div>
            <Link to="/companies" className="amazon-box-card__link">
              Compare all brands →
            </Link>
          </article>

          {/* Box 4: Top Categories */}
          <article className="amazon-box-card">
            <h3 className="amazon-box-card__title">High-Alert Categories</h3>
            <div className="amazon-box-card__quad">
              {categories.slice(0, 4).map((cat) => (
                <Link
                  key={cat.id || cat.name}
                  to={`/categories/${encodeURIComponent(cat.slug || cat.id || cat.name)}`}
                  className="amazon-quad-item"
                >
                  <div className="amazon-quad-item__thumb">
                    <img src={getShowcaseImage(cat.name)} alt={cat.name} loading="lazy" />
                  </div>
                  <span className="amazon-quad-item__name">{cat.name}</span>
                  <span className="amazon-quad-item__count">
                    {categoryMap.get(cat.name) || 0} complaints
                  </span>
                </Link>
              ))}
            </div>
            <Link to="/complaints" className="amazon-box-card__link">
              Browse all categories →
            </Link>
          </article>
        </section>

        {/* SECTION: DETAILED PRODUCT RANKINGS WITH EVIDENCE CAROUSELS */}
        <section className="home-section home-section--ranking">
          <div className="home-section__heading">
            <div>
              <span className="home-section__eyebrow">🔥 Most Complained Rankings</span>
              <h2>Products & Services with Verified Evidence</h2>
              <p>Real photos and customer videos submitted by affected consumers. (Purchase bills are private and reserved for admin review).</p>
            </div>
            <Link to="/complaints?sort=most-complained">View all rankings →</Link>
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
                        alt="Maruti photo and video reference media"
                        compact
                        autoPlay
                      />
                      <p className="product-rank-card__media-credit">
                        Photo and video shown are public reference media, not complaint evidence. Bills and sensitive proofs are kept private and accessible only to admins.
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
          {categoryError && <div className="notice notice--error" role="alert">{categoryError}</div>}
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
