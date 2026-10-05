import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EvidenceCarousel from '../media/EvidenceCarousel.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import { getComplaintRankings, getErrorMessage } from '../../services/api.js';

export default function ProductRankingCarousel() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);
  const rankedProducts = useMemo(
    () => [...products].sort((a, b) => Number(b.count) - Number(a.count)),
    [products],
  );

  useEffect(() => {
    let current = true;
    getComplaintRankings()
      .then((rankings) => {
        if (!current) return;
        const result = rankings?.products || [];
        setProducts(result);
        setStatus(result.length ? 'success' : 'empty');
      })
      .catch((requestError) => {
        if (!current) return;
        setError(getErrorMessage(requestError, 'We could not load product rankings.'));
        setStatus('error');
      });

    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!track || paused || reduceMotion.matches || rankedProducts.length < 2) return undefined;

    const timerId = window.setInterval(() => {
      const firstCard = track.firstElementChild;
      if (!firstCard) return;
      const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
      const step = firstCard.getBoundingClientRect().width + gap;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - step / 2;
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step, behavior: 'smooth' });
    }, 4000);

    return () => window.clearInterval(timerId);
  }, [paused, rankedProducts.length]);

  const scrollByCard = (direction) => {
    const track = trackRef.current;
    const firstCard = track?.firstElementChild;
    if (!track || !firstCard) return;
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * (firstCard.getBoundingClientRect().width + gap),
      behavior: 'smooth',
    });
  };

  return (
    <section className="complaint-ranking" aria-labelledby="complaint-ranking-title">
      <div className="complaint-ranking__heading">
        <div>
          <span className="home-section__eyebrow">Most complained</span>
          <h2 id="complaint-ranking-title">Products with the most complaints</h2>
          <p>Ranked by the number of complaints received.</p>
        </div>
        {status === 'success' && rankedProducts.length > 1 && (
          <div className="complaint-ranking__controls">
            <button type="button" onClick={() => scrollByCard(-1)} aria-label="Previous products">‹</button>
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? 'Play product carousel' : 'Pause product carousel'}
            >
              {paused ? 'Play' : 'Pause'}
            </button>
            <button type="button" onClick={() => scrollByCard(1)} aria-label="Next products">›</button>
          </div>
        )}
      </div>
      {status === 'loading' && (
        <div className="complaint-ranking__loading">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="skeleton-card" />)}
        </div>
      )}
      {status === 'error' && <p className="form-banner form-banner--error" role="alert">{error}</p>}
      {status === 'empty' && (
        <EmptyState title="No product rankings yet" message="Product rankings will appear when complaint data is available." />
      )}
      {status === 'success' && (
        <div className="complaint-ranking__track" ref={trackRef} aria-label="Most complained products">
          {rankedProducts.map((product, index) => (
            <article className="product-rank-card complaint-ranking__card" key={`${product.companyId || product.company}-${product.name}`}>
              <div className="product-rank-card__top">
                <span>#{index + 1}</span>
                <span>{product.count} {product.count === 1 ? 'complaint' : 'complaints'}</span>
              </div>
              <EvidenceCarousel
                complaint={product.latestComplaint}
                category={product.category}
                productName={product.name}
                compact
              />
              <div className="product-rank-card__body">
                <span>{product.category || 'Product'}</span>
                <h3>{product.name}</h3>
                <p>{product.company}</p>
                <Link to={`/complaints?q=${encodeURIComponent(product.name)}`}>See complaints →</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
