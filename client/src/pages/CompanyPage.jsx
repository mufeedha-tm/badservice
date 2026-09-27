import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ComplaintGrid from '../components/complaints/ComplaintGrid.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import { getCompanies, searchComplaints } from '../services/api.js';

export default function CompanyPage() {
  const { id } = useParams();
  const [result, setResult] = useState({ status: 'loading', company: null, complaints: [] });

  useEffect(() => {
    let isCurrent = true;

    getCompanies()
      .then((companies) => {
        const company = companies.find((entry) => entry.id === id);
        if (!company) {
          if (isCurrent) setResult({ status: 'not-found', company: null, complaints: [] });
          return null;
        }

        return searchComplaints({ company: company.name }).then((complaints) => {
          if (isCurrent) {
            setResult({
              status: complaints.length ? 'success' : 'empty',
              company,
              complaints,
            });
          }
        });
      })
      .catch(() => {
        if (isCurrent) setResult({ status: 'error', company: null, complaints: [] });
      });

    return () => {
      isCurrent = false;
    };
  }, [id]);

  return (
    <MainLayout>
      <section className="company-page" aria-labelledby="company-page-title">
        {result.status === 'loading' && <p role="status">Loading company...</p>}
        {result.status === 'error' && <p role="alert">Unable to load this company.</p>}
        {result.status === 'not-found' && <p role="status">Company not found.</p>}
        {result.company && <h1 id="company-page-title">{result.company.name} Complaints</h1>}
        {result.status === 'empty' && <p role="status">No complaints for this company yet.</p>}
        {result.status === 'success' && <ComplaintGrid complaints={result.complaints} />}
        <Link className="company-page__back" to="/companies">Back to companies</Link>
      </section>
    </MainLayout>
  );
}