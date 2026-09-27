import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ComplaintBadge from '../components/complaints/ComplaintBadge.jsx';
import ComplaintMeta from '../components/complaints/ComplaintMeta.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import { getComplaint } from '../services/api.js';

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const [result, setResult] = useState({ status: 'loading', complaint: null });

  useEffect(() => {
    let isCurrent = true;

    getComplaint(id)
      .then((complaint) => {
        if (isCurrent) setResult({ status: 'success', complaint });
      })
      .catch((error) => {
        if (isCurrent) {
          setResult({
            status: error.response?.status === 404 ? 'not-found' : 'error',
            complaint: null,
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [id]);

  return (
    <MainLayout>
      <section className="complaint-detail" aria-labelledby="complaint-detail-title">
        {result.status === 'loading' && <p role="status">Loading complaint...</p>}
        {result.status === 'error' && <p role="alert">Unable to load this complaint.</p>}
        {result.status === 'not-found' && <p role="status">Complaint not found.</p>}
        {result.complaint && (
          <article>
            {result.complaint.badge && <ComplaintBadge badge={result.complaint.badge} />}
            <h1 id="complaint-detail-title">{result.complaint.title}</h1>
            <ComplaintMeta items={result.complaint.metadata} />
            {result.complaint.description && (
              <p className="complaint-detail__description">{result.complaint.description}</p>
            )}
            <dl className="complaint-detail__facts">
              <div>
                <dt>Company</dt>
                <dd>{result.complaint.company}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{result.complaint.category}</dd>
              </div>
              {result.complaint.subcategory && (
                <div>
                  <dt>Subcategory</dt>
                  <dd>{result.complaint.subcategory}</dd>
                </div>
              )}
            </dl>
          </article>
        )}
        <Link className="complaint-detail__back" to="/complaints">
          Back to all complaints
        </Link>
      </section>
    </MainLayout>
  );
}