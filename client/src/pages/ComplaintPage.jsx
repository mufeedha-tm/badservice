import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ComplaintGrid from '../components/complaints/ComplaintGrid.jsx';
import ProductRankingCarousel from '../components/complaints/ProductRankingCarousel.jsx';
import ComplaintToolbar from '../components/complaints/ComplaintToolbar.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { getComplaints, searchComplaints } from '../services/api.js';

const trustPoints = [
  { number: '01', title: 'Real complaints', text: 'Consumer-submitted records, not product advertisements.' },
  { number: '02', title: 'Useful evidence', text: 'Photos, bills and short customer videos where available.' },
  { number: '03', title: 'Before you buy', text: 'Spot repeated problems before spending your money.' },
];

export default function ComplaintPage({ search, title = 'All Complaints' }) {
  const [status, setStatus] = useState('loading');
  const [complaints, setComplaints] = useState([]);
  const isAllComplaints = title === 'All Complaints' && !Object.values(search || {}).some(Boolean);

  useEffect(() => {
    let isCurrent = true;
    setStatus('loading');

    const request = search ? searchComplaints(search) : getComplaints();

    request
      .then((results) => {
        if (!isCurrent) return;
        setComplaints(results);
        setStatus(results.length > 0 ? 'success' : 'empty');
      })
      .catch(() => {
        if (isCurrent) setStatus('error');
      });

    return () => {
      isCurrent = false;
    };
  }, [search?.q, search?.category, search?.company, search?.period, search?.sort, search?.status]);

  return (
    <div className={isAllComplaints ? 'home-modern' : undefined}>
      {isAllComplaints && <ProductRankingCarousel />}
      {isAllComplaints && (
        <section className="home-consumer-hero">
          <div className="home-consumer-hero__copy">
            <h1>Know the problem<br />before you buy.</h1>
            <p>BadService.in turns real customer complaints into a simple consumer signal — so you can check brands, products and services before spending your money.</p>
            <div className="home-hero-actions">
              <a className="home-primary" href="#all-complaints-results">Explore complaints</a>
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
      )}

      <section
        className="complaint-page"
        id={isAllComplaints ? 'all-complaints-results' : undefined}
        aria-labelledby="complaint-page-title"
      >
        <h1 className="visually-hidden" id="complaint-page-title">
          {title}
        </h1>
        <ComplaintToolbar search={search} resultCount={complaints.length} title={title} />
        {status === 'loading' && <Skeleton className="skeleton-card" lines={4} />}
        {status === 'error' && (
          <p className="form-banner form-banner--error" role="alert">
            Unable to load complaints. Please try again.
          </p>
        )}
        {status === 'empty' && (
          <EmptyState
            title="No complaints found"
            message="Try another search, or file a complaint with evidence."
          />
        )}
        {status === 'success' && <ComplaintGrid complaints={complaints} />}
      </section>
    </div>
  );
}
