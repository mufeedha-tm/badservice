import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EvidenceCarousel from '../components/media/EvidenceCarousel.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { getCategories, getComplaintRankings, getErrorMessage } from '../services/api.js';
import { getShowcaseImage } from '../utils/showcaseImages.js';

const rotatingStories = [
  { title: 'See the evidence, not just the headline.', text: 'Product photos, purchase proof and customer videos make complaints easier to understand.', action: 'Read complaints', href: '/complaints', image: 'Computers' },
  { title: 'Compare before you spend.', text: 'Check complaint patterns across products, brands and service categories in one place.', action: 'Browse companies', href: '/companies', image: 'Vehicles & Automotive' },
  { title: 'Report the problem properly.', text: 'A clear complaint with supporting evidence gives other consumers useful information.', action: 'File a complaint', href: '/file-complaint', image: 'Hospital & Healthcare' },
  { title: 'Know what people are reporting.', text: 'Explore current complaints by category and understand the issues consumers are facing.', action: 'Explore categories', href: '/complaints', image: 'Hotel & Travel' },
];

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [rankings, setRankings] = useState({ companies: [], products: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const storyIndex = 0;

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

  const topProducts = useMemo(() => (rankings.products || []).slice(0, 4), [rankings.products]);
  const categoryMap = useMemo(() => new Map((rankings.categories || []).map((item) => [item.name, item.count])), [rankings.categories]);
  const story = rotatingStories[storyIndex];



  return (
    <MainLayout>
      <div className="home-modern">
        <section className="home-section home-section--ranking">
          <div className="home-section__heading"><div><span className="home-section__eyebrow">01 · Consumer watch</span><h2>Products people are complaining about most</h2><p>Complaint rankings, shown from #1 downward. Every card keeps the same media size.</p></div><Link to="/complaints?sort=most-complained">View all</Link></div>
          {error && <div className="notice notice--error" role="alert">{error}</div>}
          {loading && <div className="simple-grid simple-grid--products">{[1, 2, 3, 4].map((n) => <Skeleton key={n} className="skeleton-card" />)}</div>}
          {!loading && !topProducts.length && <EmptyState title="No product rankings yet" message="Product rankings will appear when complaint data is available." />}
          {!loading && topProducts.length > 0 && (
            <div className="product-ranking-grid product-ranking-grid--equal">
              {topProducts.map((product, index) => (
                <article className="product-rank-card" key={`${product.companyId || product.company}-${product.name}`}>
                  <div className="product-rank-card__top"><span>#{index + 1}</span><span>{product.count} {product.count === 1 ? 'complaint' : 'complaints'}</span></div>
                 {product.latestComplaint ? (
  <EvidenceCarousel
    complaint={product.latestComplaint}
    category={product.category}
    productName={product.name}
    compact
    autoPlay
  />
) : (
  <div className="product-rank-card__media-placeholder">
    <span>Product showcase</span>
    <small>Customer evidence not available</small>
  </div>
)}
                  <div className="product-rank-card__body"><span>{product.category || 'Product'}</span><h3>{product.name}</h3><p>{product.company}</p><Link to={`/complaints?q=${encodeURIComponent(product.name)}`}>See complaints →</Link></div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="home-story-card">
          <div className="home-story-card__media"><img src={getShowcaseImage(story.image)} alt="" /></div>
          <div className="home-story-card__body"><span className="home-section__eyebrow">02 · Good to know</span><h2>{story.title}</h2><p>{story.text}</p><Link className="home-story-card__action" to={story.href}>{story.action} →</Link></div>
        </section>

        <section className="home-section">
          <div className="home-section__heading"><div><span className="home-section__eyebrow">03 · Explore</span><h2>Choose what you want to check</h2><p>Browse the complaint record by the type of product or service.</p></div><Link to="/complaints">All complaints</Link></div>
          <div className="category-modern-grid">
            {categories.slice(0, 8).map((item) => (
              <Link className="category-modern-card" key={item.id || item.name} to={`/categories/${encodeURIComponent(item.slug || item.id || item.name)}`}>
                <div className="category-modern-card__image"><img src={getShowcaseImage(item.name)} alt="" loading="lazy" /></div>
                <div><strong>{item.name}</strong><small>{categoryMap.get(item.name) || 0} complaints</small></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-bottom-cta"><div><span>Ready to report a genuine problem?</span><h2>File the complaint with evidence.</h2><p>One clear complaint can help another consumer make a better decision.</p></div><Link className="home-primary" to="/file-complaint">＋ File a Complaint</Link></section>
      </div>
    </MainLayout>
  );
}
