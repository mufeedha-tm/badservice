import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ComplaintGrid from '../components/complaints/ComplaintGrid.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { getCompany, getErrorMessage } from '../services/api.js';
import { getShowcaseImage } from '../utils/showcaseImages.js';

export default function CompanyPage() {
  const { id } = useParams();
  const [result, setResult] = useState({ status: 'loading', company: null, error: '' });

  useEffect(() => {
    let isCurrent = true;
    getCompany(id)
      .then((company) => isCurrent && setResult({ status: 'success', company, error: '' }))
      .catch((error) => isCurrent && setResult({ status: error.response?.status === 404 ? 'not-found' : 'error', company: null, error: getErrorMessage(error, 'Unable to load this company.') }));
    return () => { isCurrent = false; };
  }, [id]);

  const complaints = result.company?.recentComplaints || [];
  const category = result.company?.category || result.company?.categoryName || 'Computers';

  return (
    <MainLayout>
      <section className="company-page-modern" aria-labelledby="company-page-title">
        {result.status === 'loading' && <Skeleton className="skeleton-card" lines={5} />}
        {result.status === 'error' && <p className="notice notice--error" role="alert">{result.error}</p>}
        {result.status === 'not-found' && <div className="company-directory-empty"><h2>Company not found.</h2><Link to="/companies">Back to companies</Link></div>}
        {result.company && (
          <>
            <header className="company-page-modern__hero">
              <div><span className="home-section__eyebrow">Company complaint record</span><h1 id="company-page-title">{result.company.name}</h1><p>{result.company.complaintCount || 0} {(result.company.complaintCount || 0) === 1 ? 'complaint' : 'complaints'} currently on record. Review the evidence and complaint history before making a decision.</p><Link className="home-primary" to="/file-complaint">File a Complaint</Link></div>
              <img src={getShowcaseImage(category)} alt={`${result.company.name} category`} />
            </header>
            <section className="home-section company-page-modern__complaints"><div className="home-section__heading"><div><span className="home-section__eyebrow">Recent reports</span><h2>Complaints about {result.company.name}</h2></div></div>{complaints.length ? <ComplaintGrid complaints={complaints} /> : <EmptyState title="No complaints have been submitted for this company yet." message="If you had a problem with this brand, you can file a public complaint with evidence." />}</section>
          </>
        )}
        <Link className="company-page__back" to="/companies">← Back to companies</Link>
      </section>
    </MainLayout>
  );
}
