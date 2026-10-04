import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { getCategories, getCompanies, getComplaintRankings, getErrorMessage, submitCompanyRequest } from '../services/api.js';
import { getShowcaseImage } from '../utils/showcaseImages.js';

const directoryCategories = ['Computers', 'Mobiles', 'Vehicles & Automotive', 'Hospital & Healthcare', 'Hotel & Travel', 'Flights & Trains', 'Restaurants & Food', 'Banking'];

export default function CompanyDirectoryPage() {
  const [result, setResult] = useState({ status: 'loading', companies: [], rankings: { companies: [] } });
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', categoryId: '', description: '' });
  const [addState, setAddState] = useState({ loading: false, message: '', error: '' });

  useEffect(() => {
    let isCurrent = true;
    Promise.all([getCompanies(), getComplaintRankings(), getCategories()])
      .then(([companies, rankings, categoryData]) => {
        if (!isCurrent) return;
        setCategories(Array.isArray(categoryData) ? categoryData.filter((item) => !item.parentId) : []);
        setResult({ status: companies.length ? 'success' : 'empty', companies, rankings: rankings || { companies: [] } });
      })
      .catch((error) => isCurrent && setResult({ status: 'error', companies: [], rankings: { companies: [] }, error: getErrorMessage(error, 'Unable to load companies right now.') }));
    return () => { isCurrent = false; };
  }, []);

  const counts = useMemo(() => new Map((result.rankings?.companies || []).map((item) => [String(item.id || item.name), item.count || 0])), [result.rankings]);
  const filteredCompanies = result.companies.filter((company) => company.name.toLowerCase().includes(search.toLowerCase()));

  async function handleAddCompany(event) {
    event.preventDefault();
    const name = newCompany.name.trim();
    if (name.length < 2 || !newCompany.categoryId) {
      setAddState({ loading: false, message: '', error: 'Company name and category are required.' });
      return;
    }
    setAddState({ loading: true, message: '', error: '' });
    try {
      await submitCompanyRequest({ companyName: name, categoryId: newCompany.categoryId, description: newCompany.description.trim() });
      setAddState({ loading: false, message: `“${name}” has been submitted for administrator review.`, error: '' });
      setNewCompany({ name: '', categoryId: '', description: '' });
    } catch (error) {
      setAddState({ loading: false, message: '', error: getErrorMessage(error, 'Unable to submit the company request.') });
    }
  }

  return (
    <MainLayout>
      <section className="company-directory-modern" aria-labelledby="company-directory-title">
        <header className="company-directory-hero">
          <div>
            <span className="home-section__eyebrow">Company directory</span>
            <h1 id="company-directory-title">Check a company before you buy, book or visit.</h1>
            <p>Browse brands and service providers with complaint records on BadService. Open a company to see its complaint history and submitted evidence.</p>
            <div className="company-directory-actions"><div className="company-directory-search"><input aria-label="Search companies" placeholder="Search company or brand..." value={search} onChange={(e) => setSearch(e.target.value)} /><span>{filteredCompanies.length} shown</span></div><button type="button" className="home-primary company-directory-add" onClick={() => { setAddState({ loading: false, message: '', error: '' }); setAddOpen(true); }}>+ Add Company</button></div>
          </div>
          <div className="company-directory-hero__image"><img src={getShowcaseImage('Computers')} alt="Consumer products" /></div>
        </header>

        {result.status === 'loading' && <p role="status">Loading companies...</p>}
        {result.status === 'error' && <p className="notice notice--error" role="alert">{result.error}</p>}
        {result.status === 'empty' && <p role="status">No companies are listed yet.</p>}
        {result.status === 'success' && filteredCompanies.length === 0 && <div className="company-directory-empty"><h2>No company matches “{search}”.</h2><p>You can still file a complaint and enter the company name while reporting the issue.</p><Link className="home-primary" to="/file-complaint">File a Complaint</Link></div>}

        {result.status === 'success' && filteredCompanies.length > 0 && (
          <div className="company-directory-modern__grid">
            {filteredCompanies.map((company, index) => {
              const category = company.category || company.categoryName || directoryCategories[index % directoryCategories.length];
              const count = counts.get(String(company.id)) ?? counts.get(String(company.name)) ?? company.complaintCount ?? 0;
              return <Link className="company-directory-modern__card" key={company.id || company.name} to={`/companies/${encodeURIComponent(company.id)}`}>
                <div className="company-directory-modern__media"><img src={getShowcaseImage(category)} alt="" loading="lazy" /><span>{count} {count === 1 ? 'complaint' : 'complaints'}</span></div>
                <div className="company-directory-modern__body"><span>{category}</span><h2>{company.name}</h2><p>View complaint record, product evidence and recent reports.</p><b>View company →</b></div>
              </Link>;
            })}
          </div>
        )}

        {addOpen && (
          <div className="modal-backdrop" role="presentation" onMouseDown={() => setAddOpen(false)}>
            <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="directory-add-company-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className="modal-card__header"><div><span className="home-section__eyebrow">Company directory</span><h2 id="directory-add-company-title">Add a company</h2></div><button type="button" className="modal-card__close" aria-label="Close" onClick={() => setAddOpen(false)}>×</button></div>
              <p className="modal-card__text">Can’t find a company or brand? Submit it for review and it can be added to the public directory after verification.</p>
              {addState.message && <p className="form-banner form-banner--success" role="status">{addState.message}</p>}
              {addState.error && <p className="form-banner form-banner--error" role="alert">{addState.error}</p>}
              <form onSubmit={handleAddCompany}>
                <label className="field"><span>Company / Brand Name *</span><input autoFocus value={newCompany.name} onChange={(event) => setNewCompany((prev) => ({ ...prev, name: event.target.value }))} placeholder="Enter company or brand name" /></label>
                <label className="field"><span>Category *</span><select value={newCompany.categoryId} onChange={(event) => setNewCompany((prev) => ({ ...prev, categoryId: event.target.value }))}><option value="">Select category</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></label>
                <label className="field"><span>Notes <small>(optional)</small></span><textarea rows={3} value={newCompany.description} onChange={(event) => setNewCompany((prev) => ({ ...prev, description: event.target.value }))} placeholder="Website, city or any useful verification details" /></label>
                <div className="modal-card__actions"><button type="button" className="ghost-cta" onClick={() => setAddOpen(false)}>Close</button><button type="submit" className="submit-button" disabled={addState.loading}>{addState.loading ? 'Submitting…' : 'Submit Company'}</button></div>
              </form>
            </div>
          </div>
        )}
      </section>
    </MainLayout>
  );
}
