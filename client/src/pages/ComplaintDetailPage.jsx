import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ComplaintBadge from '../components/complaints/ComplaintBadge.jsx';
import ComplaintMeta from '../components/complaints/ComplaintMeta.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import { getAssetUrl, getComplaint } from '../services/api.js';

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

  function getStatusBadge(status) {
    const s = (status || 'PENDING').toUpperCase();
    const colors = {
      PENDING: { bg: '#fff3cd', text: '#856404' },
      UNDER_REVIEW: { bg: '#cce5ff', text: '#004085' },
      COMPANY_RESPONDED: { bg: '#e2e3e5', text: '#383d41' },
      RESOLVED: { bg: '#d4edda', text: '#155724' },
      REJECTED: { bg: '#f8d7da', text: '#721c24' },
    };
    const c = colors[s] || colors.PENDING;
    return (
      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: c.bg, color: c.text, fontWeight: 600, fontSize: '0.8rem' }}>
        {s.replace('_', ' ')}
      </span>
    );
  }

  return (
    <MainLayout>
      <section className="complaint-detail" aria-labelledby="complaint-detail-title">
        {result.status === 'loading' && <p role="status">Loading complaint...</p>}
        {result.status === 'error' && <p role="alert">Unable to load this complaint.</p>}
        {result.status === 'not-found' && <p role="status">Complaint not found.</p>}
        {result.complaint && (
          <article>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              {result.complaint.badge && <ComplaintBadge badge={result.complaint.badge} />}
              {getStatusBadge(result.complaint.status)}
            </div>

            <h1 id="complaint-detail-title">{result.complaint.title}</h1>
            <ComplaintMeta items={result.complaint.metadata} />
            {result.complaint.description && (
              <p className="complaint-detail__description">{result.complaint.description}</p>
            )}

            <dl className="complaint-detail__facts">
              <div>
                <dt>Company</dt>
                <dd>
                  <Link to={`/companies/${encodeURIComponent(result.complaint.companyId || result.complaint.company)}`} style={{ color: '#0066cc' }}>
                    {result.complaint.company}
                  </Link>
                </dd>
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
              {result.complaint.location && (
                <div>
                  <dt>Location</dt>
                  <dd>{result.complaint.location}</dd>
                </div>
              )}
              <div>
                <dt>Status</dt>
                <dd>{result.complaint.status || 'PENDING'}</dd>
              </div>
            </dl>

            {result.complaint.proofUrl && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Attached Proof / Documentation</h3>
                <a
                  href={getAssetUrl(result.complaint.proofUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#0066cc', fontWeight: 600, fontSize: '0.9rem' }}
                >
                  📎 Open Proof Document ({result.complaint.proofName || 'View attached file'}) &rarr;
                </a>
              </div>
            )}
          </article>
        )}
        <div style={{ marginTop: '2rem' }}>
          <Link className="complaint-detail__back" to="/complaints">
            &larr; Back to all complaints
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}