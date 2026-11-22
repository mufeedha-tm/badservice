import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AmazonHeroCarousel from '../components/home/AmazonHeroCarousel.jsx';
import ComplaintGrid from '../components/complaints/ComplaintGrid.jsx';
import ComplaintToolbar from '../components/complaints/ComplaintToolbar.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { getComplaints, searchComplaints } from '../services/api.js';

const trustPoints = [
  { number: '01', title: 'Real complaints', text: 'Consumer-submitted records, not product advertisements.' },
  { number: '02', title: 'Useful evidence', text: 'Photos, bills and short customer videos where available.' },
  { number: '03', title: 'Before you buy', text: 'Spot repeated problems before spending your money.' },
];
const PAGE_SIZE = 12;

export default function ComplaintPage({ search, title = 'All Complaints' }) {
  const [status, setStatus] = useState('loading');
  const [complaints, setComplaints] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const isAllComplaints = title === 'All Complaints' && !Object.values(search || {}).some(Boolean);
  const pageCount = Math.max(1, Math.ceil(complaints.length / PAGE_SIZE));
  const visibleComplaints = useMemo(
    () => complaints.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [complaints, currentPage],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search?.q, search?.category, search?.company, search?.period, search?.date, search?.sort, search?.status]);

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
      {isAllComplaints && <AmazonHeroCarousel compact />}

      <section
        className="complaint-page"
        id={isAllComplaints ? 'all-complaints-results' : undefined}
        aria-labelledby="complaint-page-title"
      >
        <h1 className="visually-hidden" id="complaint-page-title">
          {title}
        </h1>
        <ComplaintToolbar
          search={search}
          resultCount={complaints.length}
          title={title}
          showFilters={title === 'All Complaints' || title === 'Search complaints'}
        />
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
        {status === 'success' && <ComplaintGrid complaints={visibleComplaints} />}
        {status === 'success' && pageCount > 1 && (
          <nav className="complaint-pagination" aria-label="Complaint results pages">
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
              Previous
            </button>
            <span aria-live="polite">Page {currentPage} of {pageCount}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage >= pageCount}>
              Next
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
