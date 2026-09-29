import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { useAccount } from '../context/AccountContext.jsx';
import { createComplaint, getCategories, getCompanies, getErrorMessage, submitCompanyRequest } from '../services/api.js';

export default function FileComplaintPage() {
  const navigate = useNavigate();
  const { account, status: accountStatus } = useAccount();

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [optionsStatus, setOptionsStatus] = useState('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stepErrors, setStepErrors] = useState({});

  // Complainant Details (Step 1)
  const [complainant, setComplainant] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    termsAccepted: true,
  });

  // Complaint Details (Step 2)
  const [form, setForm] = useState({
    type: 'Product', // 'Product' or 'Service'
    category: '',
    subcategory: '',
    company: '',
    model: '',
    seller: '',
    location: '',
    title: '',
    description: '',
  });

  const [proofFile, setProofFile] = useState(null);

  // Inline Company Request
  const [showRequestCompany, setShowRequestCompany] = useState(false);
  const [requestForm, setRequestForm] = useState({ companyName: '', categoryId: '', description: '' });
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState('');
  const [requestError, setRequestError] = useState('');

  // Prefill complainant info when account loads
  useEffect(() => {
    if (account) {
      setComplainant((prev) => ({
        ...prev,
        name: account.name || prev.name,
        email: account.email || prev.email,
        phone: account.phone || prev.phone,
      }));
    }
  }, [account]);

  useEffect(() => {
    let isCurrent = true;

    getCategories()
      .then((results) => {
        if (isCurrent) {
          setCategories(results || []);
          setOptionsStatus('ready');
        }
      })
      .catch(() => {
        if (isCurrent) setOptionsStatus('error');
      });

    getCompanies()
      .then((results) => {
        if (isCurrent) setCompanies(results || []);
      })
      .catch(() => {
        if (isCurrent) setCompanies([]);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  function handleComplainantChange(e) {
    const { name, value } = e.target;
    setComplainant((prev) => ({ ...prev, [name]: value }));
    setStepErrors((prev) => ({ ...prev, [name]: '' }));
    setError('');
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setStepErrors((prev) => ({ ...prev, [name]: '' }));
    setError('');
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setProofFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Proof file must be 10MB or smaller.');
      event.target.value = '';
      setProofFile(null);
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setError('Proof file must be a JPEG, PNG, WEBP, GIF, or PDF.');
      event.target.value = '';
      setProofFile(null);
      return;
    }

    setError('');
    setProofFile(file);
  }

  function handleRemoveFile() {
    setProofFile(null);
    const fileInput = document.getElementById('complaint-proof');
    if (fileInput) fileInput.value = '';
  }

  function validateStep1() {
    const errors = {};
    if (!complainant.name.trim()) {
      errors.name = 'Full Name is required.';
    }
    const phoneClean = complainant.phone.trim().replace(/[\s\-\(\)]/g, '');
    if (!phoneClean) {
      errors.phone = 'Phone number is required.';
    } else if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(phoneClean)) {
      errors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    if (!complainant.city.trim()) {
      errors.city = 'City / Place is required.';
    }

    if (!complainant.termsAccepted) {
      errors.termsAccepted = 'You must accept the terms & conditions to proceed.';
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNextStep(e) {
    e.preventDefault();
    if (validateStep1()) {
      // Sync location if not set
      if (complainant.city && !form.location) {
        setForm((prev) => ({ ...prev, location: complainant.city.trim() }));
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function validateStep2() {
    const errors = {};
    if (!form.company.trim()) errors.company = 'Company / Brand is required.';
    if (!form.category.trim()) errors.category = 'Category is required.';
    if (!form.title.trim()) {
      errors.title = 'Complaint title is required.';
    } else if (form.title.trim().length < 5) {
      errors.title = 'Title must be at least 5 characters.';
    }
    if (!form.description.trim()) {
      errors.description = 'Complaint details are required.';
    } else if (form.description.trim().length < 20) {
      errors.description = 'Please provide detailed facts (at least 20 characters).';
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!validateStep2()) return;

    if (!account) {
      setError('You must sign in to file a complaint.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('company', form.company.trim());
      formData.append('category', form.category.trim());

      // Format subcategory with product type
      let subcat = form.subcategory.trim();
      formData.append('subcategory', subcat);

      // Build rich description preserving product model and seller information
      let richDescription = form.description.trim();
      const metaLines = [];
      metaLines.push(`Type: ${form.type}`);
      if (form.model.trim()) metaLines.push(`Model / Product: ${form.model.trim()}`);
      if (form.seller.trim()) metaLines.push(`Seller / Dealer: ${form.seller.trim()}`);
      if (metaLines.length > 0) {
        richDescription = `[${metaLines.join(' | ')}]\n\n${richDescription}`;
      }
      formData.append('description', richDescription);

      const loc = form.location.trim() || complainant.city.trim();
      if (loc) formData.append('location', loc);

      if (proofFile) formData.append('proof', proofFile);

      const complaint = await createComplaint(formData);
      navigate(`/complaints/${encodeURIComponent(complaint.id)}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to submit this complaint. Please verify your details.'));
      setIsSubmitting(false);
    }
  }

  async function handleCompanyRequestSubmit(e) {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');

    if (!requestForm.companyName.trim()) {
      setRequestError('Company name is required.');
      return;
    }
    if (!requestForm.categoryId) {
      setRequestError('Please select a category for this company.');
      return;
    }

    setRequestSubmitting(true);
    try {
      await submitCompanyRequest({
        companyName: requestForm.companyName.trim(),
        categoryId: requestForm.categoryId,
        description: requestForm.description.trim(),
      });
      setRequestSuccess(`Request for '${requestForm.companyName.trim()}' submitted! An administrator will review and approve it.`);
      // Autofill into the company input
      setForm((prev) => ({ ...prev, company: requestForm.companyName.trim() }));
      setRequestForm({ companyName: '', categoryId: '', description: '' });
    } catch (err) {
      setRequestError(getErrorMessage(err, 'Failed to submit company request.'));
    } finally {
      setRequestSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <section className="file-complaint-page" aria-labelledby="file-complaint-title" style={{ maxWidth: '780px', margin: '0 auto', padding: '1rem' }}>
        <p className="file-complaint-page__eyebrow">BadService.in</p>
        <h1 id="file-complaint-title" style={{ marginBottom: '0.5rem' }}>File a Complaint</h1>
        <p style={{ color: '#555', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          File a verified consumer complaint to get public visibility and hold companies accountable.
        </p>

        {accountStatus === 'loading' && <p role="status">Checking account session...</p>}

        {accountStatus === 'ready' && !account && (
          <div className="account-form" style={{ marginTop: '1.5rem', textAlign: 'center', background: '#fff', padding: '2.5rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>Sign In Required</h2>
            <p style={{ margin: '0 0 1.5rem 0', color: '#555', fontSize: '0.95rem', lineHeight: '1.5' }}>
              To ensure verified authentic consumer complaints and prevent spam, you must be signed in to submit a complaint.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link className="account-page__primary-link" to="/account?redirect=/file-complaint" style={{ padding: '0.65rem 1.5rem', background: '#e47911', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontWeight: 600 }}>
                Sign In / Register
              </Link>
            </div>
          </div>
        )}

        {accountStatus === 'ready' && account && (
          <>
            {/* Step Progress Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', background: '#fff', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: step === 1 ? '#e47911' : '#28a745', color: '#fff',
                  fontWeight: 700, fontSize: '0.9rem'
                }}>
                  {step > 1 ? '✓' : '1'}
                </span>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem', color: step === 1 ? '#111' : '#555' }}>Step 1: Your Details</strong>
                  <span style={{ fontSize: '0.75rem', color: '#777' }}>Identity &amp; contact</span>
                </div>
              </div>

              <div style={{ width: '40px', height: '2px', background: step > 1 ? '#28a745' : '#cbd5e1', margin: '0 1rem' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: step === 2 ? '#e47911' : '#cbd5e1', color: '#fff',
                  fontWeight: 700, fontSize: '0.9rem'
                }}>
                  2
                </span>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem', color: step === 2 ? '#111' : '#777' }}>Step 2: Complaint Details</strong>
                  <span style={{ fontSize: '0.75rem', color: '#777' }}>Issue, company &amp; proof</span>
                </div>
              </div>
            </div>

            {error && <p className="complaint-form__error" role="alert" style={{ marginBottom: '1.25rem' }}>{error}</p>}

            {/* STEP 1: YOUR DETAILS */}
            {step === 1 && (
              <form onSubmit={handleNextStep} noValidate style={{ background: '#fff', padding: '1.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#111' }}>Step 1: Complainant Information</h2>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem' }}>
                  Your verified account profile is used to ensure authentic consumer reviews.
                </p>

                <div className="complaint-form__field">
                  <label htmlFor="complainant-name">Full Name <span style={{ color: 'red' }}>*</span></label>
                  <input
                    id="complainant-name"
                    name="name"
                    value={complainant.name}
                    onChange={handleComplainantChange}
                    maxLength={80}
                    placeholder="Your legal name"
                    required
                  />
                  {stepErrors.name && <span style={{ color: '#d9534f', fontSize: '0.8rem' }}>{stepErrors.name}</span>}
                </div>

                <div className="complaint-form__row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div className="complaint-form__field">
                    <label htmlFor="complainant-email">Email Address <span style={{ color: 'red' }}>*</span></label>
                    <input
                      id="complainant-email"
                      name="email"
                      value={complainant.email}
                      readOnly
                      style={{ background: '#f5f7fa', cursor: 'not-allowed' }}
                    />
                    <small style={{ color: '#666', fontSize: '0.75rem' }}>Verified via account</small>
                  </div>

                  <div className="complaint-form__field">
                    <label htmlFor="complainant-phone">Mobile Number <span style={{ color: 'red' }}>*</span></label>
                    <input
                      id="complainant-phone"
                      name="phone"
                      type="tel"
                      value={complainant.phone}
                      onChange={handleComplainantChange}
                      maxLength={15}
                      placeholder="10-digit mobile number"
                      required
                    />
                    {stepErrors.phone && <span style={{ color: '#d9534f', fontSize: '0.8rem' }}>{stepErrors.phone}</span>}
                  </div>
                </div>

                <div className="complaint-form__field" style={{ marginTop: '0.5rem' }}>
                  <label htmlFor="complainant-city">City / Place <span style={{ color: 'red' }}>*</span></label>
                  <input
                    id="complainant-city"
                    name="city"
                    value={complainant.city}
                    onChange={handleComplainantChange}
                    maxLength={100}
                    placeholder="Your place/ city"
                    required
                  />
                  {stepErrors.city && <span style={{ color: '#d9534f', fontSize: '0.8rem' }}>{stepErrors.city}</span>}
                </div>

                <div className="complaint-form__field" style={{ marginTop: '0.5rem' }}>
                  <label htmlFor="complainant-address">Full Address <span>(optional)</span></label>
                  <textarea
                    id="complainant-address"
                    name="address"
                    value={complainant.address}
                    onChange={handleComplainantChange}
                    maxLength={255}
                    rows={2}
                    placeholder="House/flat number, street, area, pincode"
                  />
                </div>

                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <input
                    id="complainant-terms"
                    name="termsAccepted"
                    type="checkbox"
                    checked={complainant.termsAccepted}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setComplainant((prev) => ({ ...prev, termsAccepted: checked }));
                      setStepErrors((prev) => ({ ...prev, termsAccepted: '' }));
                    }}
                    style={{ marginTop: '0.25rem', width: 'auto' }}
                    required
                  />
                  <label htmlFor="complainant-terms" style={{ fontSize: '0.85rem', color: '#555', cursor: 'pointer' }}>
                    I agree to the <Link to="/help" target="_blank" style={{ color: '#0066cc' }}>Terms &amp; Conditions</Link> and certify that my complainant information is accurate.
                  </label>
                </div>
                {stepErrors.termsAccepted && <p style={{ color: '#d9534f', fontSize: '0.8rem', margin: '0.25rem 0' }}>{stepErrors.termsAccepted}</p>}

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="account-form__submit"
                    style={{ padding: '0.65rem 1.75rem', background: '#e47911', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}
                  >
                    Continue to Complaint Details &rarr;
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: COMPLAINT DETAILS */}
            {step === 2 && (
              <form onSubmit={handleSubmit} noValidate style={{ background: '#fff', padding: '1.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#111' }}>Step 2: Complaint Information</h2>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem' }}>
                  Provide complete facts about the product, service, and incident.
                </p>

                {/* Product / Service Selector */}
                <div className="complaint-form__field">
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Type of Complaint <span style={{ color: 'red' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      padding: '0.75rem 1rem', borderRadius: '6px',
                      border: form.type === 'Product' ? '2px solid #e47911' : '1px solid #cbd5e1',
                      background: form.type === 'Product' ? '#fff8f0' : '#fff',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
                      color: form.type === 'Product' ? '#b12704' : '#333'
                    }}>
                      <input
                        type="radio"
                        name="type"
                        value="Product"
                        checked={form.type === 'Product'}
                        onChange={handleFormChange}
                        style={{ display: 'none' }}
                      />
                      <span>🛒 Product</span>
                    </label>

                    <label style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      padding: '0.75rem 1rem', borderRadius: '6px',
                      border: form.type === 'Service' ? '2px solid #e47911' : '1px solid #cbd5e1',
                      background: form.type === 'Service' ? '#fff8f0' : '#fff',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
                      color: form.type === 'Service' ? '#b12704' : '#333'
                    }}>
                      <input
                        type="radio"
                        name="type"
                        value="Service"
                        checked={form.type === 'Service'}
                        onChange={handleFormChange}
                        style={{ display: 'none' }}
                      />
                      <span>🛠 Service</span>
                    </label>
                  </div>
                </div>

                <div className="complaint-form__row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  {/* Category Selection */}
                  <div className="complaint-form__field">
                    <label htmlFor="complaint-category">Category <span style={{ color: 'red' }}>*</span></label>
                    <select
                      id="complaint-category"
                      name="category"
                      value={form.category}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => {
                        const name = typeof cat === 'object' ? cat.name : cat;
                        const key = typeof cat === 'object' ? (cat.id || cat.slug || cat.name) : cat;
                        return <option key={key} value={name}>{name}</option>;
                      })}
                    </select>
                    {stepErrors.category && <span style={{ color: '#d9534f', fontSize: '0.8rem' }}>{stepErrors.category}</span>}
                  </div>

                  {/* Company Selection */}
                  <div className="complaint-form__field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label htmlFor="complaint-company">Company / Brand <span style={{ color: 'red' }}>*</span></label>
                      <button
                        type="button"
                        onClick={() => setShowRequestCompany(!showRequestCompany)}
                        style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
                      >
                        {showRequestCompany ? 'Close request form' : "+ Can't find company?"}
                      </button>
                    </div>
                    <input
                      id="complaint-company"
                      name="company"
                      value={form.company}
                      onChange={handleFormChange}
                      list="complaint-company-options"
                      maxLength={120}
                      placeholder="Type or select company name"
                      required
                    />
                    <datalist id="complaint-company-options">
                      {companies.map((company) => (
                        <option key={company.id} value={company.name} />
                      ))}
                    </datalist>
                    {stepErrors.company && <span style={{ color: '#d9534f', fontSize: '0.8rem' }}>{stepErrors.company}</span>}
                  </div>
                </div>

                {/* Inline Company Request Drawer */}
                {showRequestCompany && (
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '6px', margin: '1rem 0' }}>
                    <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem', color: '#111' }}>Request to Add a New Company</h3>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', color: '#555' }}>
                      If your brand is not in the directory, submit a request. An admin will review and verify it.
                    </p>
                    {requestSuccess && <p style={{ color: 'green', fontSize: '0.85rem' }}>{requestSuccess}</p>}
                    {requestError && <p style={{ color: 'red', fontSize: '0.85rem' }}>{requestError}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        placeholder="Company or Brand Name"
                        value={requestForm.companyName}
                        onChange={(e) => setRequestForm({ ...requestForm, companyName: e.target.value })}
                        maxLength={120}
                      />
                      <select
                        value={requestForm.categoryId}
                        onChange={(e) => setRequestForm({ ...requestForm, categoryId: e.target.value })}
                      >
                        <option value="">Select category for brand</option>
                        {categories.map((cat) => {
                          const id = typeof cat === 'object' ? (cat.id || cat.slug || cat.name) : cat;
                          const name = typeof cat === 'object' ? cat.name : cat;
                          return <option key={id} value={id}>{name}</option>;
                        })}
                      </select>
                    </div>
                    <textarea
                      placeholder="Optional company website, city, or notes"
                      rows={2}
                      value={requestForm.description}
                      onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                      style={{ width: '100%', marginBottom: '0.5rem' }}
                    />
                    <button
                      type="button"
                      disabled={requestSubmitting}
                      onClick={handleCompanyRequestSubmit}
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', background: '#232f3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {requestSubmitting ? 'Submitting...' : 'Submit Brand Request'}
                    </button>
                  </div>
                )}

                <div className="complaint-form__row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div className="complaint-form__field">
                    <label htmlFor="complaint-model">Product / Model <span>(optional)</span></label>
                    <input
                      id="complaint-model"
                      name="model"
                      value={form.model}
                      onChange={handleFormChange}
                      placeholder="Your product name or model number"
                      maxLength={100}
                    />
                  </div>

                  <div className="complaint-form__field">
                    <label htmlFor="complaint-seller">Seller / Shop / Service Dealer <span>(optional)</span></label>
                    <input
                      id="complaint-seller"
                      name="seller"
                      value={form.seller}
                      onChange={handleFormChange}
                      placeholder="e.g. Authorized Service Center, Dealer"
                      maxLength={120}
                    />
                  </div>
                </div>

                <div className="complaint-form__row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div className="complaint-form__field">
                    <label htmlFor="complaint-subcategory">Subcategory <span>(optional)</span></label>
                    <input
                      id="complaint-subcategory"
                      name="subcategory"
                      value={form.subcategory}
                      onChange={handleFormChange}
                      placeholder="e.g. Two Wheeler, Laptop, Warranty"
                      maxLength={100}
                    />
                  </div>

                  <div className="complaint-form__field">
                    <label htmlFor="complaint-location">Incident Location / City <span>(optional)</span></label>
                    <input
                      id="complaint-location"
                      name="location"
                      value={form.location}
                      onChange={handleFormChange}
                      placeholder="e.g. Bangalore, Mumbai"
                      maxLength={120}
                    />
                  </div>
                </div>

                {/* Complaint Title */}
                <div className="complaint-form__field" style={{ marginTop: '1rem' }}>
                  <label htmlFor="complaint-title">Complaint Title <span style={{ color: 'red' }}>*</span></label>
                  <input
                    id="complaint-title"
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    maxLength={160}
                    placeholder="Brief summary of your grievance (e.g. Defective battery replaced with counterfeit part)"
                    required
                  />
                  {stepErrors.title && <span style={{ color: '#d9534f', fontSize: '0.8rem' }}>{stepErrors.title}</span>}
                </div>

                {/* Description */}
                <div className="complaint-form__field" style={{ marginTop: '1rem' }}>
                  <label htmlFor="complaint-description">Full Complaint Details <span style={{ color: 'red' }}>*</span></label>
                  <textarea
                    id="complaint-description"
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    maxLength={5000}
                    placeholder="State the facts clearly: date of purchase/incident, order/reference number, what went wrong, and the resolution you are seeking..."
                    rows={6}
                    required
                  />
                  {stepErrors.description && <span style={{ color: '#d9534f', fontSize: '0.8rem' }}>{stepErrors.description}</span>}
                </div>

                {/* Proof File Upload */}
                <div className="complaint-form__field" style={{ marginTop: '1rem' }}>
                  <label htmlFor="complaint-proof">
                    Upload Proof / Invoice / Screenshot <span>(optional, max 10MB)</span>
                  </label>
                  <input
                    id="complaint-proof"
                    name="proof"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    onChange={handleFileChange}
                  />

                  {proofFile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', background: '#f8fafc', padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0', width: 'fit-content' }}>
                      <span style={{ fontSize: '0.85rem', color: '#333' }}>
                        📎 <strong>{proofFile.name}</strong> ({(proofFile.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        style={{ background: 'none', border: 'none', color: '#d9534f', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Remove file
                      </button>
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={{ padding: '0.6rem 1.25rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem', cursor: 'pointer' }}
                  >
                    &larr; Back to Complainant Details
                  </button>

                  <button
                    type="submit"
                    className="account-form__submit"
                    disabled={isSubmitting}
                    style={{ padding: '0.65rem 1.75rem', background: '#e47911', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}
                  >
                    {isSubmitting ? 'Submitting Complaint...' : 'Submit Verified Complaint'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </section>
    </MainLayout>
  );
}