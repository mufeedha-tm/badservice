import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { getCompanies } from '../services/api.js';

export default function CompanyDirectoryPage() {
  const [result, setResult] = useState({ status: 'loading', companies: [] });
  const [search, setSearch] = useState('');

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

  const filteredCompanies = result.companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <section className="company-directory" aria-labelledby="company-directory-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 id="company-directory-title" style={{ margin: 0 }}>Browse Companies</h1>
            <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
              Find complaints and resolution stats by brand
            </p>
          </div>
          <Link
            to="/file-complaint"
            style={{
              padding: '0.5rem 1rem',
              background: '#0066cc',
              color: '#fff',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            + Request / Add Company
          </Link>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <input
            placeholder="Search company or brand name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '0.5rem 0.75rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '0.95rem',
            }}
          />
        </div>

        {result.status === 'loading' && <p role="status">Loading companies...</p>}
        {result.status === 'error' && <p role="alert">Unable to load companies.</p>}
        {result.status === 'empty' && <p role="status">No companies are listed yet.</p>}
        {result.status === 'success' && filteredCompanies.length === 0 && (
          <div style={{ padding: '2rem', background: '#f9f9f9', borderRadius: '6px', textAlign: 'center' }}>
            <p>No companies match &quot;{search}&quot;.</p>
            <Link to="/file-complaint" style={{ color: '#0066cc', fontWeight: 600 }}>
              + Can&apos;t find your company? Submit a request to add it!
            </Link>
          </div>
        )}

        {result.status === 'success' && filteredCompanies.length > 0 && (
          <ul className="company-directory__grid">
            {filteredCompanies.map((company) => (
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