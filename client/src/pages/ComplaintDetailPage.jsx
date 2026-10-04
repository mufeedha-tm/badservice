import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ComplaintBadge from '../components/complaints/ComplaintBadge.jsx';
import ComplaintMediaGallery from '../components/complaints/ComplaintMediaGallery.jsx';
import ComplaintMeta from '../components/complaints/ComplaintMeta.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { getComplaint, getErrorMessage } from '../services/api.js';

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const [result, setResult] = useState({ status: 'loading', complaint: null, error: '' });

  useEffect(() => {
    let isCurrent = true;
    setResult({ status: 'loading', complaint: null, error: '' });
    getComplaint(id)
      .then((complaint) => {
        if (isCurrent) setResult({ status: 'success', complaint, error: '' });
      })
      .catch((error) => {
        if (isCurrent) {
          setResult({
            status: error.response?.status === 404 ? 'not-found' : 'error',
            complaint: null,
            error: getErrorMessage(error, 'Unable to load this complaint.'),
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
        {result.status === 'loading' && <Skeleton className="skeleton-card" lines={6} />}
        {result.status === 'error' && <p className="form-banner form-banner--error" role="alert">{result.error}</p>}
        {result.status === 'not-found' && <p role="status">Complaint not found.</p>}
        {result.complaint && (
          <article>
            <div className="complaint-detail__topline">
              {result.complaint.badge && <ComplaintBadge badge={result.complaint.badge} />}
              <span className={`status-chip status-chip--${(result.complaint.status || 'PENDING').toLowerCase()}`}>
                {(result.complaint.status || 'PENDING').replace('_', ' ')}
              </span>
            </div>
            <h1 id="complaint-detail-title">{result.complaint.title}</h1>
            <ComplaintMeta items={result.complaint.metadata} />
            <ComplaintMediaGallery complaint={result.complaint} />
            {result.complaint.description && (
              <p className="complaint-detail__description">{result.complaint.description}</p>
            )}
            <dl className="complaint-detail__facts">
              <div>
                <dt>Company</dt>
                <dd>
                  <Link to={`/companies/${encodeURIComponent(result.complaint.companyId || result.complaint.company)}`}>
                    {result.complaint.company}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{result.complaint.category}</dd>
              </div>
              {result.complaint.model && (
                <div>
                  <dt>Product / Model</dt>
                  <dd>{result.complaint.model}</dd>
                </div>
              )}
              {result.complaint.seller && (
                <div>
                  <dt>Seller / Shop</dt>
                  <dd>{result.complaint.seller}</dd>
                </div>
              )}
              {result.complaint.location && (
                <div>
                  <dt>Location</dt>
                  <dd>{result.complaint.location}</dd>
                </div>
              )}
              {result.complaint.complainantCity && (
                <div>
                  <dt>Filed from</dt>
                  <dd>{result.complaint.complainantCity}</dd>
                </div>
              )}
            </dl>
          </article>
        )}
        <div className="complaint-detail__nav">
          <Link className="complaint-detail__back" to="/complaints">← Back to all complaints</Link>
        </div>
      </section>
    </MainLayout>
  );
}
