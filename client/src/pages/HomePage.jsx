import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ComplaintMediaGallery from '../components/complaints/ComplaintMediaGallery.jsx';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { getCategories, getComplaintRankings, getComplaints, getErrorMessage } from '../services/api.js';
import { collectComplaintMedia, getComplaintMedia } from '../utils/complaintMedia.js';

const popularSearches = ['HP', 'Samsung', 'Maruti Suzuki', 'Apollo Hospital', 'OYO', 'IndiGo'];
const categoryIcons = {
  Mobiles: '📱',
  Computers: '💻',
  'TV & Electronics': '📺',
  Fashion: '👗',
  'Hospital & Healthcare': '🏥',
  'Vehicles & Automotive': '🚗',
  'Hotel & Travel': '🏨',
  'Restaurants & Food': '🍔',
  'Flights & Trains': '✈️',
  Banking: '🏦',
  Telecom: '📞',
};

export default function HomePage() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rankings, setRankings] = useState({ companies: [], products: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [heroQuery, setHeroQuery] = useState('');
  const [heroCategory, setHeroCategory] = useState('');

  useEffect(() => {
    let isCurrent = true;
    Promise.all([getComplaints(), getCategories(), getComplaintRankings()])
      .then(([complaintData, categoryData, rankingData]) => {
        if (!isCurrent) return;
        setComplaints(Array.isArray(complaintData) ? complaintData : []);
        setCategories((categoryData || []).filter((cat) => !cat.parentId));
        setRankings(rankingData || { companies: [], products: [], categories: [] });
        setLoading(false);
      })
      .catch((err) => {
        if (!isCurrent) return;
        setError(getErrorMessage(err, 'Unable to load complaints. Please try again.'));
        setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const evidenceSlides = useMemo(() => collectComplaintMedia(complaints).slice(0, 12), [complaints]);
  const latestComplaints = useMemo(() => complaints.slice(0, 6), [complaints]);
  const categoryCounts = useMemo(() => {
    const map = new Map((rankings.categories || []).map((item) => [item.name, item]));
    return categories.map((category) => {
      const ranked = map.get(category.name);
      const related = complaints.filter((complaint) => complaint.category === category.name);
      const topCompany = related[0]?.company || '';
      return {
        ...category,
        count: ranked?.count || related.length,
        topCompany,
      };
    });
  }, [categories, rankings.categories, complaints]);

  function goToSearch(filters) {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.company) params.set('company', filters.company);
    navigate(`/complaints${params.size ? `?${params}` : ''}`);
  }

  function handleHeroSearch(event) {
    event.preventDefault();
    goToSearch({ q: heroQuery.trim(), category: heroCategory });
  }

  return (
    <MainLayout onSearch={goToSearch}>
      <div className="homepage-shell">
        <section className="homepage-hero">
          <div className="homepage-hero__content">
            <span className="eyebrow">Real complaints. Real evidence. Better decisions.</span>
            <h1>
              CHECK BEFORE YOU BUY.<br />
              CHECK BEFORE YOU BOOK.<br />
              CHECK BEFORE YOU TRUST.
            </h1>
            <p className="homepage-hero__subtitle">
              See what customers are complaining about before you buy a product, book a service, or visit a business.
            </p>

            <form className="hero-search" onSubmit={handleHeroSearch}>
              <label className="visually-hidden" htmlFor="hero-category">All Categories</label>
              <select id="hero-category" value={heroCategory} onChange={(event) => setHeroCategory(event.target.value)}>
                <option value="">All Categories</option>
                {categories.map((categoryItem) => (
                  <option key={categoryItem.id || categoryItem.slug} value={categoryItem.name}>{categoryItem.name}</option>
                ))}
              </select>
              <label className="visually-hidden" htmlFor="hero-query">Search brands, products and services</label>
              <input
                id="hero-query"
                type="search"
                value={heroQuery}
                onChange={(event) => setHeroQuery(event.target.value)}
                placeholder="Search brands, products & services..."
              />
              <button type="submit">SEARCH</button>
            </form>

            <div className="popular-searches" aria-label="Popular searches">
              {popularSearches.map((search) => (
                <button key={search} type="button" className="popular-searches__tag" onClick={() => goToSearch({ q: search })}>
                  {search}
                </button>
              ))}
            </div>
          </div>

          <div className="homepage-feature-card">
            <MediaCarousel items={evidenceSlides} alt="Real customer evidence" autoPlay />
            <div className="feature-card__body">
              <span className="complaint-pill">Real Customer Evidence</span>
              <h3>Photos, bills and videos from actual complaints</h3>
              <p>See what customers experienced before you spend.</p>
              <Link to="/complaints">Browse complaints</Link>
            </div>
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <div className="section-heading__title-wrap">
              <span className="section-icon" aria-hidden="true">🔥</span>
              <div>
                <h2>Most Complained Products &amp; Companies</h2>
                <p>Ranked from live complaint counts, not estimates.</p>
              </div>
            </div>
          </div>
          {loading && <div className="skeleton-grid">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="skeleton-card" />)}</div>}
          {error && <p className="form-banner form-banner--error" role="alert">{error}</p>}
          {!loading && !rankings.companies.length && (
            <EmptyState title="No complaints found" message="Be the first to file a public complaint with evidence." />
          )}
          {!loading && rankings.companies.length > 0 && (
            <div className="ranked-grid">
              {rankings.companies.map((brand, index) => (
                <article className={`rank-card${index === 0 ? ' rank-card--featured' : ''}`} key={brand.id}>
                  <div className="rank-card__number">#{index + 1}</div>
                  <div className="rank-card__media">
                    <MediaCarousel items={getComplaintMedia(brand.latestComplaint)} alt={brand.name} compact />
                  </div>
                  <div className="rank-card__body">
                    <h3>{brand.name}</h3>
                    <p className="rank-card__category">{brand.category || 'General'}</p>
                    <div className="rank-card__meta">
                      <strong>{brand.count}</strong>
                      <span>{brand.count === 1 ? 'Complaint' : 'Complaints'}</span>
                    </div>
                    <Link to={`/complaints?company=${encodeURIComponent(brand.name)}`}>View Complaints</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="content-section">
          <div className="section-heading">
            <div className="section-heading__title-wrap">
              <span className="section-icon" aria-hidden="true">🏆</span>
              <div>
                <h2>Most Complained Brands</h2>
                <p>Browse complaints by company, brand and category.</p>
              </div>
            </div>
          </div>
          {rankings.companies.length ? (
            <div className="brand-grid">
              {rankings.companies.slice(0, 6).map((brand, index) => (
                <div className="brand-card" key={`brand-${brand.id}`}>
                  <div className="brand-card__rank">#{index + 1}</div>
                  <div className="brand-card__logo" aria-hidden="true">{brand.name.slice(0, 2).toUpperCase()}</div>
                  <div className="brand-card__name">{brand.name}</div>
                  <div className="brand-card__count">{brand.count} {brand.count === 1 ? 'complaint' : 'complaints'}</div>
                  <Link to={`/companies/${encodeURIComponent(brand.id)}`}>View Complaints</Link>
                </div>
              ))}
            </div>
          ) : (
            !loading && <EmptyState title="No brands ranked yet" message="Company rankings appear after complaints are submitted." actionTo="/companies" actionLabel="Browse companies" />
          )}
        </section>

        <section className="content-section">
          <div className="section-heading">
            <div className="section-heading__title-wrap">
              <span className="section-icon" aria-hidden="true">📚</span>
              <div>
                <h2>Browse by Category</h2>
              </div>
            </div>
          </div>
          <div className="category-grid">
            {categoryCounts.map((categoryItem) => (
              <Link
                key={categoryItem.id || categoryItem.slug}
                className="category-card"
                to={`/categories/${encodeURIComponent(categoryItem.slug || categoryItem.id)}`}
              >
                <span className="category-card__icon" aria-hidden="true">{categoryIcons[categoryItem.name] || '🔎'}</span>
                <span className="category-card__name">{categoryItem.name}</span>
                <span className="category-card__count">{categoryItem.count} {categoryItem.count === 1 ? 'complaint' : 'complaints'}</span>
                {categoryItem.topCompany && <span className="category-card__meta">Top: {categoryItem.topCompany}</span>}
                <span className="category-card__link">View complaints</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <div className="section-heading__title-wrap">
              <span className="section-icon" aria-hidden="true">🕒</span>
              <div>
                <h2>Latest Complaints</h2>
              </div>
            </div>
          </div>
          {latestComplaints.length ? (
            <div className="complaint-list-grid">
              {latestComplaints.map((complaint) => (
                <article className="mini-complaint-card" key={complaint.id}>
                  <div className="mini-complaint-card__media">
                    <MediaCarousel items={getComplaintMedia(complaint)} alt={complaint.title} compact />
                  </div>
                  <div className="mini-complaint-card__body">
                    <div className="mini-complaint-card__row">
                      <span className="brand-pill">{complaint.company}</span>
                      <span className="complaint-category">{complaint.category}</span>
                    </div>
                    <h3>{complaint.title}</h3>
                    <p className="mini-complaint-card__meta">{complaint.location || 'Location not provided'} · {complaint.createdAtLabel}</p>
                    <Link to={`/complaints/${encodeURIComponent(complaint.id)}`}>View Complaint</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            !loading && <EmptyState title="No complaints found" message="New complaints will appear here as soon as they are filed." />
          )}
        </section>

        <section className="content-section">
          <div className="section-heading">
            <div className="section-heading__title-wrap">
              <span className="section-icon" aria-hidden="true">🎥</span>
              <div>
                <h2>Real Customer Evidence</h2>
                <p>Product photos, bills and videos submitted with complaints.</p>
              </div>
            </div>
          </div>
          {evidenceSlides.length ? (
            <ComplaintMediaGallery complaint={complaints.find((item) => getComplaintMedia(item).length) || complaints[0]} autoPlay />
          ) : (
            !loading && <EmptyState title="No evidence uploaded yet" message="Evidence galleries appear when complaints include photos or video." />
          )}
        </section>

        <section className="content-section content-section--cta">
          <div className="cta-banner">
            <div>
              <span className="eyebrow eyebrow--dark">Before you buy or book</span>
              <h2>Check real complaints before you commit.</h2>
            </div>
            <Link className="primary-cta" to="/file-complaint">🔥 File a Complaint</Link>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
