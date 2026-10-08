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
            {result.complaint.status === 'PENDING' && (
              <div style={{ padding: '0.75rem 1rem', background: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                ⏳ <strong>Pending Admin Review:</strong> This complaint is currently under review with all uploaded evidence. Once approved by an administrator, it will become publicly searchable on the website.
              </div>
            )}
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
                <dt>{result.complaint.type === 'Service' ? 'Service Provider' : 'Company'}</dt>
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
              {result.complaint.serviceType && (
                <div>
                  <dt>Service Type</dt>
                  <dd>{result.complaint.serviceType}</dd>
                </div>
              )}
              {result.complaint.model && (
                <div>
                  <dt>{result.complaint.type === 'Service' ? 'Purpose / Service Details' : 'Product / Model'}</dt>
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
