import { useEffect, useState } from 'react';
import ComplaintGrid from '../components/complaints/ComplaintGrid.jsx';
import ComplaintToolbar from '../components/complaints/ComplaintToolbar.jsx';
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
  }, [search?.q, search?.category, search?.company, search?.period, search?.sort]);

  return (
    <section className="complaint-page" aria-labelledby="complaint-page-title">
      <h1 className="visually-hidden" id="complaint-page-title">
        {title}
      </h1>
      <ComplaintToolbar search={search} resultCount={complaints.length} title={title} />
      {status === 'loading' && (
        <p className="complaint-list-state" role="status">
          Loading complaints...
        </p>
      )}
      {status === 'error' && (
        <p className="complaint-list-state complaint-list-state--error" role="alert">
          Unable to load complaints. Please try again later.
        </p>
      )}
      {status === 'empty' && (
        <p className="complaint-list-state" role="status">
          No complaints found.
        </p>
      )}
      {status === 'success' && <ComplaintGrid complaints={complaints} />}
    </section>
  );
}