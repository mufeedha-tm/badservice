import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ComplaintGrid from '../components/complaints/ComplaintGrid.jsx';
import ComplaintMediaGallery from '../components/complaints/ComplaintMediaGallery.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { getCompany, getErrorMessage } from '../services/api.js';

export default function CompanyPage() {
  const { id } = useParams();
  const [result, setResult] = useState({ status: 'loading', company: null, error: '' });

  useEffect(() => {
    let isCurrent = true;
    getCompany(id)
      .then((company) => {
        if (isCurrent) setResult({ status: 'success', company, error: '' });
      })
      .catch((error) => {
        if (!isCurrent) return;
        setResult({
          status: error.response?.status === 404 ? 'not-found' : 'error',
          company: null,
          error: getErrorMessage(error, 'Unable to load this company.'),
        });
      });
    return () => {
      isCurrent = false;
    };
  }, [id]);

  const complaints = result.company?.recentComplaints || [];
  const featured = complaints.find((item) => item.productImageUrl || item.productVideoUrl || item.billImageUrl);

  return (
    <MainLayout>
      <section className="company-page" aria-labelledby="company-page-title">
        {result.status === 'loading' && <Skeleton className="skeleton-card" lines={5} />}
        {result.status === 'error' && <p className="form-banner form-banner--error" role="alert">{result.error}</p>}
        {result.status === 'not-found' && <p role="status">Company not found.</p>}
        {result.company && (
          <>
            <h1 id="company-page-title">{result.company.name} Complaints</h1>
            <p className="company-page__count">
              {result.company.complaintCount || 0} {(result.company.complaintCount || 0) === 1 ? 'complaint' : 'complaints'} on record
            </p>
            {featured && <ComplaintMediaGallery complaint={featured} />}
            {complaints.length ? (
              <ComplaintGrid complaints={complaints} />
            ) : (
              <EmptyState
                title="No complaints have been submitted for this company yet."
                message="If you had a problem with this brand, you can file a public complaint with evidence."
              />
            )}
          </>
        )}
        <Link className="company-page__back" to="/companies">Back to companies</Link>
      </section>
    </MainLayout>
  );
}
