import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { getCategories, getCompanies, getComplaintRankings, getErrorMessage } from '../services/api.js';
import { getShowcaseImage } from '../utils/showcaseImages.js';
import { getCompanyLogo, getCompanyCategoryIcon } from '../utils/companyLogos.js';

const directoryCategories = ['Computers', 'Mobiles', 'Vehicles & Automotive', 'Hospital & Healthcare', 'Hotel & Travel', 'Flights & Trains', 'Restaurants & Food', 'Banking'];

export default function CompanyDirectoryPage() {
  const [result, setResult] = useState({ status: 'loading', companies: [], rankings: { companies: [] } });
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [rankingError, setRankingError] = useState('');
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    let isCurrent = true;
    getCompanies()
      .then((companies) => {
        if (!isCurrent) return;
        setResult((current) => ({
          ...current,
          status: companies.length ? 'success' : 'empty',
          companies,
        }));
      })
      .catch((error) => isCurrent && setResult((current) => ({
        ...current,
        status: 'error',
        error: getErrorMessage(error, 'Unable to load companies right now.'),
      })));
    getComplaintRankings()
      .then((rankings) => isCurrent && setResult((current) => ({
        ...current,
        rankings: rankings || { companies: [] },
      })))
      .catch((error) => isCurrent && setRankingError(getErrorMessage(error, 'Unable to load complaint counts.')));
    getCategories()
      .then((categoryData) => isCurrent && setCategories(
        Array.isArray(categoryData) ? categoryData.filter((item) => !item.parentId) : [],
      ))
      .catch((error) => isCurrent && setCategoryError(getErrorMessage(error, 'Unable to load company categories.')));
    return () => { isCurrent = false; };
  }, []);

  const counts = useMemo(() => new Map((result.rankings?.companies || []).map((item) => [String(item.id || item.name), item.count || 0])), [result.rankings]);
  const filteredCompanies = result.companies.filter((company) => company.name.toLowerCase().includes(search.toLowerCase()));


  return (
    <MainLayout>
      <section className="company-directory-modern" aria-labelledby="company-directory-title">
        <header className="company-directory-hero">
          <div>
            <span className="home-section__eyebrow">Company directory</span>
            <h1 id="company-directory-title">Check a company before you buy, book or visit.</h1>
            <p>Browse brands and service providers with complaint records on BadService. Open a company to see its complaint history and submitted evidence.</p>
            <div className="company-directory-actions"><div className="company-directory-search"><input aria-label="Search companies" placeholder="Search company or brand..." value={search} onChange={(e) => setSearch(e.target.value)} /><span>{filteredCompanies.length} shown</span></div></div>
          </div>
          <div className="company-directory-hero__image"><img src={getShowcaseImage('Computers')} alt="Consumer products" /></div>
        </header>

        {result.status === 'loading' && <p role="status">Loading companies...</p>}
        {result.status === 'error' && <p className="notice notice--error" role="alert">{result.error}</p>}
        {rankingError && <p className="notice notice--error" role="alert">{rankingError}</p>}
        {categoryError && <p className="notice notice--error" role="alert">{categoryError}</p>}
        {result.status === 'empty' && <p role="status">No companies are listed yet.</p>}
        {result.status === 'success' && filteredCompanies.length === 0 && <div className="company-directory-empty"><h2>No company matches “{search}”.</h2><p>You can still file a complaint and enter the company name while reporting the issue.</p><Link className="home-primary" to="/file-complaint">File a Complaint</Link></div>}

        {result.status === 'success' && filteredCompanies.length > 0 && (
          <div className="company-directory-modern__grid">
            {filteredCompanies.map((company, index) => {
              const category = company.category || company.categoryName || directoryCategories[index % directoryCategories.length];
              const count = counts.get(String(company.id)) ?? counts.get(String(company.name)) ?? company.complaintCount ?? 0;
              const categoryIcon = getCompanyCategoryIcon(company.name, category);

              return (
                <Link className="company-directory-modern__card" key={company.id || company.name} to={`/companies/${encodeURIComponent(company.id)}`}>
                  <div
                    className="company-directory-modern__media"
                    style={{
                      background: categoryIcon.bg || '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px 16px',
                      position: 'relative',
                      borderBottom: `2px solid ${categoryIcon.border || '#e2e8f0'}`,
                    }}
                  >
                    {categoryIcon.svg ? (
                      <img
                        src={categoryIcon.svg}
                        alt={`${company.name} icon`}
                        loading="eager"
                        decoding="async"
                        style={{ width: '68px', height: '68px', objectFit: 'contain' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '68px',
                          height: '68px',
                          borderRadius: '16px',
                          background: categoryIcon.bg,
                          border: `2px solid ${categoryIcon.border}`,
                          color: categoryIcon.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2.4rem',
                        }}
                      >
                        {categoryIcon.emoji}
                      </div>
                    )}
                    <span style={{ position: 'absolute', bottom: '8px', right: '8px' }}>
                      {count} {count === 1 ? 'complaint' : 'complaints'}
                    </span>
                  </div>
                  <div className="company-directory-modern__body">
                    <span>{category}</span>
                    <h2>{company.name}</h2>
                    <p>View verified complaints, product/service reports and customer evidence.</p>
                    <b>View company →</b>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

      </section>
    </MainLayout>
  );
}
