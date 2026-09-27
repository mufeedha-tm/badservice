import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { getCompanies } from '../services/api.js';

export default function CompanyDirectoryPage() {
  const [result, setResult] = useState({ status: 'loading', companies: [] });

  useEffect(() => {
    let isCurrent = true;

    getCompanies()
      .then((companies) => {
        if (isCurrent) {
          setResult({ status: companies.length ? 'success' : 'empty', companies });
        }
      })
      .catch(() => {
        if (isCurrent) setResult({ status: 'error', companies: [] });
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <MainLayout>
      <section className="company-directory" aria-labelledby="company-directory-title">
        <h1 id="company-directory-title">Browse Companies</h1>
        {result.status === 'loading' && <p role="status">Loading companies...</p>}
        {result.status === 'error' && <p role="alert">Unable to load companies.</p>}
        {result.status === 'empty' && <p role="status">No companies are listed yet.</p>}
        {result.status === 'success' && (
          <ul className="company-directory__grid">
            {result.companies.map((company) => (
              <li key={company.id}>
                <Link className="company-directory__link" to={`/companies/${encodeURIComponent(company.id)}`}>
                  {company.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </MainLayout>
  );
}