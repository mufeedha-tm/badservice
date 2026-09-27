import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { createComplaint, getCategories, getCompanies } from '../services/api.js';

export default function FileComplaintPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [optionsStatus, setOptionsStatus] = useState('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    company: '',
    category: '',
    description: '',
    location: '',
  });

  useEffect(() => {
    let isCurrent = true;

    getCategories()
      .then((results) => {
        if (isCurrent) {
          setCategories(results);
          setOptionsStatus('ready');
        }
      })
      .catch(() => {
        if (isCurrent) setOptionsStatus('error');
      });

    getCompanies()
      .then((results) => {
        if (isCurrent) setCompanies(results);
      })
      .catch(() => {
        if (isCurrent) setCompanies([]);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const complaint = await createComplaint({
        ...form,
        title: form.title.trim(),
        company: form.company.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
      });
      navigate(`/complaints/${encodeURIComponent(complaint.id)}`);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to submit this complaint. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <section className="file-complaint-page" aria-labelledby="file-complaint-title">
        <p className="file-complaint-page__eyebrow">BadService.in</p>
        <h1 id="file-complaint-title">File a Complaint</h1>
        {optionsStatus === 'loading' && <p role="status">Loading form options...</p>}
        {optionsStatus === 'error' && <p className="complaint-form__error" role="alert">Unable to load categories. Please try again later.</p>}
        {error && <p className="complaint-form__error" role="alert">{error}</p>}
        {optionsStatus === 'ready' && (
          <form className="complaint-form" onSubmit={handleSubmit}>
            <div className="complaint-form__field">
              <label htmlFor="complaint-title">Complaint title</label>
              <input
                id="complaint-title"
                name="title"
                value={form.title}
                onChange={handleChange}
                maxLength={160}
                required
              />
            </div>
            <div className="complaint-form__row">
              <div className="complaint-form__field">
                <label htmlFor="complaint-company">Company</label>
                <input
                  id="complaint-company"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  list="complaint-company-options"
                  maxLength={120}
                  required
                />
                <datalist id="complaint-company-options">
                  {companies.map((company) => (
                    <option key={company.id} value={company.name} />
                  ))}
                </datalist>
              </div>
              <div className="complaint-form__field">
                <label htmlFor="complaint-category">Category</label>
                <select
                  id="complaint-category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="complaint-form__field">
              <label htmlFor="complaint-description">Description</label>
              <textarea
                id="complaint-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                maxLength={5000}
                rows={6}
                required
              />
            </div>
            <div className="complaint-form__field">
              <label htmlFor="complaint-location">Location <span>(optional)</span></label>
              <input
                id="complaint-location"
                name="location"
                value={form.location}
                onChange={handleChange}
                maxLength={120}
              />
            </div>
            <button className="complaint-form__submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </form>
        )}
      </section>
    </MainLayout>
  );
}