import { useEffect, useState } from 'react';
import ComplaintGrid from '../components/complaints/ComplaintGrid.jsx';
import ComplaintToolbar from '../components/complaints/ComplaintToolbar.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { getComplaints, searchComplaints } from '../services/api.js';

export default function ComplaintPage({ search, title = 'All Complaints' }) {
  const [status, setStatus] = useState('loading');
  const [complaints, setComplaints] = useState([]);

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
    <section className="complaint-page" aria-labelledby="complaint-page-title">
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
  );
}
