import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AmazonHeroCarousel from '../components/home/AmazonHeroCarousel.jsx';
import EvidenceCarousel from '../components/media/EvidenceCarousel.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import { getCategories, getComplaintRankings, getErrorMessage, searchComplaints } from '../services/api.js';
import { getShowcaseImage } from '../utils/showcaseImages.js';
import { getCompanyLogo, getCompanyCategoryIcon } from '../utils/companyLogos.js';

const DEFAULT_CATEGORIES = [
  { id: 'automotive', name: 'Vehicles & Automotive', slug: 'automotive' },
  { id: 'mobiles', name: 'Mobiles', slug: 'mobiles' },
  { id: 'electronics', name: 'TV & Electronics', slug: 'electronics' },
  { id: 'computers', name: 'Computers', slug: 'computers' },
  { id: 'healthcare', name: 'Hospital & Healthcare', slug: 'healthcare' },
  { id: 'banking', name: 'Banking', slug: 'banking' },
  { id: 'travel', name: 'Hotel & Travel', slug: 'travel' },
  { id: 'flights', name: 'Flights & Trains', slug: 'flights' },
];

const DEFAULT_RANKINGS = {
  companies: [],
  products: [],
  categories: [],
};

export default function HomePage() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [rankings, setRankings] = useState(DEFAULT_RANKINGS);
  const [todayComplaint, setTodayComplaint] = useState(null);
  const [todayComplaintPreviewError, setTodayComplaintPreviewError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [featuredCategoryStart, setFeaturedCategoryStart] = useState(0);
  const [categoriesPaused, setCategoriesPaused] = useState(false);

  useEffect(() => {
    let current = true;
    getCategories()
      .then((categoryData) => {
        if (current && Array.isArray(categoryData) && categoryData.length > 0) {
          setCategories(categoryData.filter((item) => !item.parentId));
        }
      })
      .catch((err) => current && setCategoryError(getErrorMessage(err, 'We could not load categories.')));
    getComplaintRankings()
      .then((rankingData) => {
        if (current && rankingData) {
          setRankings(rankingData);
        }
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
  const featuredRankings = useMemo(() => topProducts.slice(0, 3), [topProducts]);
  const highestProductCount = useMemo(() => Math.max(1, ...featuredRankings.map((item) => Number(item.count) || 0)), [featuredRankings]);
  const categoryMap = useMemo(() => new Map((rankings.categories || []).map((item) => [item.name, item.count])), [rankings.categories]);
  const featuredCategories = useMemo(() => {
    if (!categories.length) return [];
    return Array.from({ length: Math.min(4, categories.length) }, (_, offset) => categories[(featuredCategoryStart + offset) % categories.length]);
  }, [categories, featuredCategoryStart]);
  const trendingItems = useMemo(() => [
    ...(rankings.products || []).slice(0, 2).map((item) => ({ label: item.name, count: item.count, type: 'Product' })),
    ...(rankings.companies || []).slice(0, 2).map((item) => ({ label: item.name, count: item.count, type: 'Brand' })),
  ].filter((item) => Number(item.count) > 0).slice(0, 4), [rankings.products, rankings.companies]);

  useEffect(() => {
    if (categoriesPaused || categories.length < 2) return undefined;
    const timer = window.setInterval(() => setFeaturedCategoryStart((value) => (value + 1) % categories.length), 6000);
    return () => window.clearInterval(timer);
  }, [categoriesPaused, categories.length]);

  useEffect(() => {
    const sections = document.querySelectorAll('.home-reveal');
    if (!('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <MainLayout>
      <div className="home-modern">
        {/* Amazon-Style Auto-Moving Hero Deals / Highlights Carousel */}
        <AmazonHeroCarousel rankings={rankings} />

        {/* Amazon-Style 4-Quadrant Cards Grid */}
        <section className="amazon-card-grid" aria-label="Most Complained Highlights">
          <header className="home-insights-heading">
            <span><b aria-hidden="true">▥</b> Complaint Insights</span>
            <h2>Explore <em>Complaint</em> Trends</h2>
            <p>Discover what people are complaining about most</p>
          </header>
          {/* Box 1: Most Complained Tech & Mobiles */}
          <article className="amazon-box-card amazon-box-card--products">
            <div className="amazon-box-card__header"><span className="amazon-box-card__symbol" aria-hidden="true">▣</span><h3 className="amazon-box-card__title">Most Complained Products</h3><Link aria-label="See all product complaints" to="/complaints?sort=most-complained">→</Link></div>
            {topProducts.length === 0 && loading ? (
              <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }} role="status">
                Loading complaint rankings…
              </div>
            ) : topProducts.length === 0 ? (
              <div className="home-highlight-empty">
                <span className="home-highlight-empty__art" aria-hidden="true"><svg viewBox="0 0 160 120"><path d="M34 38h14l12 48h57l13-35H55"/><circle cx="70" cy="101" r="7"/><circle cx="111" cy="101" r="7"/><path d="M71 25h25M83 13v24M120 19l-6 6m12 1h-9"/><path d="M75 56h25M87.5 43v26"/></svg></span><strong>No product complaints recorded yet.</strong>
              </div>
            ) : (
              <div className="amazon-box-card__quad">
                {topProducts.slice(0, 4).map((prod) => (
                  <Link
                    key={prod.name}
                    to={`/complaints?q=${encodeURIComponent(prod.name)}`}
                    className="amazon-quad-item"
                  >
                    <div className="amazon-quad-item__thumb">
                      <img src={getShowcaseImage(prod.category || 'Mobiles')} alt={prod.name} loading="lazy" />
                    </div>
                    <span className="amazon-quad-item__name">{prod.name}</span>
                    <span className="amazon-quad-item__count">{prod.count} {prod.count === 1 ? 'complaint' : 'complaints'}</span>
                  </Link>
                ))}
              </div>
            )}
            <Link to="/complaints?sort=most-complained" className="amazon-box-card__link">
              See all product complaints
            </Link>
          </article>

          {/* Box 2: Most Complained Services */}
          <article className="amazon-box-card amazon-box-card--services">
            <div className="amazon-box-card__header"><span className="amazon-box-card__symbol" aria-hidden="true">⚙</span><h3 className="amazon-box-card__title">Services with High Complaints</h3><Link aria-label="See all service complaints" to="/complaints?category=Hospital%20%26%20Healthcare">→</Link></div>
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
              See all service complaints
            </Link>
          </article>

          {/* Box 3: Top Reported Brands */}
          <article className="amazon-box-card amazon-box-card--brands">
            <div className="amazon-box-card__header"><span className="amazon-box-card__symbol" aria-hidden="true">★</span><h3 className="amazon-box-card__title">Top Reported Brands</h3><Link aria-label="Compare all brands" to="/companies">→</Link></div>
            {(rankings.companies || []).length === 0 && loading ? (
              <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }} role="status">
                Loading company reports…
              </div>
            ) : (rankings.companies || []).length === 0 ? (
              <div className="home-highlight-empty">
                <span className="home-highlight-empty__art home-highlight-empty__art--medal" aria-hidden="true"><svg viewBox="0 0 160 140"><path d="m54 88-13 43 30-14 19 20 11-45M107 88l13 43-30-14-19 20-11-45"/><circle cx="80" cy="58" r="39"/><path d="m80 32 8 17 19 3-14 13 4 19-17-9-17 9 4-19-14-13 19-3z"/></svg></span><strong>No brand complaints recorded yet.</strong>
              </div>
            ) : (
              <div className="amazon-box-card__quad">
                {rankings.companies.slice(0, 4).map((comp) => {
                  const categoryIcon = getCompanyCategoryIcon(comp.name, comp.category);
                  return (
                    <Link
                      key={comp.name}
                      to={`/complaints?company=${encodeURIComponent(comp.name)}`}
                      className="amazon-quad-item"
                    >
                      <div className="amazon-quad-item__thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: categoryIcon.bg || '#f8fafc' }}>
                        {categoryIcon.svg ? (
                          <img
                            src={categoryIcon.svg}
                            alt={`${comp.name} icon`}
                            loading="eager"
                            decoding="async"
                            style={{ width: '42px', height: '42px', objectFit: 'contain' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.5rem',
                            }}
                          >
                            {categoryIcon.emoji}
                          </div>
                        )}
                      </div>
                      <span className="amazon-quad-item__name">{comp.name}</span>
                      <span className="amazon-quad-item__count">{comp.count} {comp.count === 1 ? 'complaint' : 'complaints'}</span>
                    </Link>
                  );
                })}
              </div>
            )}
            <Link to="/companies" className="amazon-box-card__link">
              Compare all brands
            </Link>
          </article>

          {/* Box 4: Top Categories */}
          <article className="amazon-box-card amazon-box-card--categories" onMouseEnter={() => setCategoriesPaused(true)} onMouseLeave={() => setCategoriesPaused(false)} onFocus={() => setCategoriesPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setCategoriesPaused(false); }}>
            <div className="amazon-box-card__header"><span className="amazon-box-card__symbol" aria-hidden="true">▦</span><h3 className="amazon-box-card__title">High-Alert Categories</h3><Link aria-label="Browse all categories" to="/complaints">→</Link></div>
            {categories.length > 4 && <div className="home-category-controls" aria-label="Featured category controls">
              <button type="button" aria-label="Previous featured categories" onClick={() => setFeaturedCategoryStart((value) => (value - 1 + categories.length) % categories.length)}>‹</button>
              <span>{(featuredCategoryStart % categories.length) + 1} / {categories.length}</span>
              <button type="button" aria-label="Next featured categories" onClick={() => setFeaturedCategoryStart((value) => (value + 1) % categories.length)}>›</button>
            </div>}
            <div className="amazon-box-card__quad">
              {featuredCategories.map((cat) => (
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
              Browse all categories
            </Link>
          </article>
        </section>

        {trendingItems.length > 0 && (
          <section className="home-trending-strip" aria-label="Trending complaint reports">
            <span className="home-trending-strip__label"><i aria-hidden="true" /> Trending reports</span>
            <div className="home-trending-strip__items">{trendingItems.map((item) => <Link key={`${item.type}-${item.label}`} to={item.type === 'Product' ? `/complaints?q=${encodeURIComponent(item.label)}` : `/complaints?company=${encodeURIComponent(item.label)}`}><span>{item.type}</span><strong>{item.label}</strong><small>{item.count} {item.count === 1 ? 'report' : 'reports'}</small></Link>)}</div>
          </section>
        )}

        {/* SECTION: DETAILED PRODUCT RANKINGS WITH EVIDENCE CAROUSELS */}
        <section className="home-ranking-showcase home-reveal" aria-labelledby="home-ranking-title">
          <div className="home-ranking-showcase__intro">
            <span className="home-section__eyebrow"><b aria-hidden="true">✓</b> Consumer-submitted evidence</span>
            <h2 id="home-ranking-title">Products &amp; services with consumer evidence</h2>
            <p>Explore complaint rankings with photos and videos shared by consumers.</p>
            <Link className="home-ranking-showcase__button" to="/complaints?sort=most-complained">View all rankings <span aria-hidden="true">→</span></Link>
          </div>
          {error && <div className="notice notice--error" role="alert">{error}</div>}
          <div className="home-ranking-showcase__list">
            {loading && <div className="home-ranking-loading" role="status">Loading complaint rankings…</div>}
            {!loading && !featuredRankings.length && <div className="home-ranking-empty"><span aria-hidden="true">⌕</span><strong>No complaint rankings yet</strong><small>Ranked products will appear when consumer reports are available.</small><Link to="/file-complaint">File a complaint <span aria-hidden="true">→</span></Link></div>}
            {!loading && featuredRankings.map((product, index) => (
              <Link className="home-ranking-row" key={`${product.companyId || product.company}-${product.name}`} to={`/complaints?q=${encodeURIComponent(product.name)}`}>
                <span className={`home-ranking-row__number home-ranking-row__number--${index + 1}`}>{index + 1}</span>
                <span className="home-ranking-row__details"><strong>{product.name}</strong><small>{product.count} {product.count === 1 ? 'complaint' : 'complaints'}</small><i><b style={{ width: `${Math.max(8, (Number(product.count) || 0) / highestProductCount * 100)}%` }} /></i></span>
              </Link>
            ))}
          </div>
          <div className="home-ranking-showcase__evidence">
            {!loading && featuredRankings[0] ? (
              <EvidenceCarousel
                complaint={featuredRankings[0].latestComplaint || { company: featuredRankings[0].company, category: featuredRankings[0].category, productName: featuredRankings[0].name }}
                category={featuredRankings[0].category}
                productName={featuredRankings[0].name}
                compact
                autoPlay
              />
            ) : <div className="home-ranking-shield" aria-hidden="true"><svg viewBox="0 0 120 140"><path d="M60 8 105 25v37c0 30-17 53-45 69C32 115 15 92 15 62V25z"/><path d="m39 67 14 14 29-32"/></svg></div>}
          </div>
        </section>

        <section className="home-real-value home-reveal">
          <div className="home-real-value__art" aria-hidden="true"><span><i /></span><b /><b /></div>
          <div className="home-real-value__copy"><span className="home-section__eyebrow">Explore more</span><h2>One place to check what consumers are actually experiencing.</h2><p>Search the complaint database, compare companies, inspect evidence and report your own experience.</p><span className="home-real-value__trust"><b aria-hidden="true">✓</b> Real reports. Clearer decisions.</span></div>
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
              <div className="home-value-grid__calendar" aria-hidden="true">
                <div className="home-calendar-illustration">
                  <span className="home-calendar-illustration__top">TODAY</span>
                  <strong>{new Date().getDate()}</strong>
                  <small>{todayComplaint?.title ? 'LATEST REPORT' : 'COMPLAINT LOG'}</small>
                  <i /><i /><i />
                </div>
              </div>
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

        <section className="home-section home-section--categories home-reveal">
          <div className="home-category-section__intro"><span className="home-section__eyebrow"><b aria-hidden="true">✓</b> Browse categories</span><h2>Check the category that matters to you</h2><p>Explore complaints by category and find what matters most to you.</p><Link to="/complaints">Browse all categories <span aria-hidden="true">→</span></Link></div>
          {categoryError && <div className="notice notice--error" role="alert">{categoryError}</div>}
          <div className="category-modern-grid">
            {categories.slice(0, 8).map((item) => (
              <Link className="category-modern-card" key={item.id || item.name} to={`/categories/${encodeURIComponent(item.slug || item.id || item.name)}`}>
                <div className="category-modern-card__image"><img src={getShowcaseImage(item.name)} alt="" loading="lazy" /></div>
                <div className="home-category-modern-card__copy"><strong>{item.name}</strong><small>{categoryMap.get(item.name) || 0} complaints</small></div>
                <span className="home-category-modern-card__arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-bottom-cta home-reveal">
          <div className="home-bottom-cta__art" aria-hidden="true"><svg viewBox="0 0 120 130"><path d="M60 7 106 24v39c0 28-17 50-46 64C31 113 14 91 14 63V24z"/><path d="m39 64 14 14 29-32"/></svg></div>
          <div className="home-bottom-cta__copy">
            <span>Make your experience count</span>
            <h2>File it clearly. Help the next consumer.</h2>
            <p>Share what happened and help others make informed choices.</p>
            <small>Submit a clear account and supporting evidence where available.</small>
          </div>
          <div className="home-bottom-cta__actions">
            <Link className="home-primary" to="/file-complaint">＋ File a Complaint <span aria-hidden="true">→</span></Link>
            <Link className="home-secondary" to="/track">Track Status &amp; Updates <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
