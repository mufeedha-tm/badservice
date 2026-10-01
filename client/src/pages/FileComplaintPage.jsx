import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { useAccount } from '../context/AccountContext.jsx';
import { createComplaint, getCategories, getCompanies, getErrorMessage, submitCompanyRequest } from '../services/api.js';
import { getTranslation } from '../utils/FileComplaintTranslations.js';

// Premium Toast Component
const Toast = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = {
    success: '#d4edda',
    error: '#f8d7da',
    warning: '#fff3cd',
    info: '#d1ecf1'
  }[type] || '#fff';

  const color = {
    success: '#155724',
    error: '#721c24',
    warning: '#856404',
    info: '#0c5460'
  }[type] || '#333';

  const icon = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }[type] || '';

  return (
    <div style={{
      position: 'fixed', top: '20px', right: '20px',
      background: bg, color, padding: '12px 20px',
      borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex', alignItems: 'center', gap: '12px',
      zIndex: 9999, minWidth: '280px', maxWidth: '400px',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: '500' }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color, padding: 0 }}>&times;</button>
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default function FileComplaintPage() {
  const navigate = useNavigate();
  const { account, status: accountStatus } = useAccount();

  const [lang, setLang] = useState(() => localStorage.getItem('badservice_lang') || 'en');
  const t = useCallback((key) => getTranslation(lang, key), [lang]);

  const handleLangChange = (e) => {
    const newLang = e.target.value;
    setLang(newLang);
    localStorage.setItem('badservice_lang', newLang);
  };

  const [toast, setToast] = useState(null);
  const showToast = (type, message) => setToast({ type, message });
  const closeToast = () => setToast(null);

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [optionsStatus, setOptionsStatus] = useState('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepErrors, setStepErrors] = useState({});

  // Complainant Details (Step 1)
  const [complainant, setComplainant] = useState({
    name: '', email: '', phone: '', city: '', address: '', termsAccepted: true,
  });

  // Complaint Details (Step 2)
  const [form, setForm] = useState({
    type: 'Product', category: '', subcategory: '', company: '', model: '', seller: '', location: '', title: '', description: '',
  });

  const [proofFile, setProofFile] = useState(null);

  // Inline Company Request
  const [showRequestCompany, setShowRequestCompany] = useState(false);
  const [requestForm, setRequestForm] = useState({ companyName: '', categoryId: '', description: '' });
  const [requestSubmitting, setRequestSubmitting] = useState(false);

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
    getCategories().then((results) => {
      if (isCurrent) { setCategories(results || []); setOptionsStatus('ready'); }
    }).catch(() => {
      if (isCurrent) { setOptionsStatus('error'); showToast('error', t('toastError')); }
    });

    getCompanies().then((results) => {
      if (isCurrent) setCompanies(results || []);
    }).catch(() => {
      if (isCurrent) setCompanies([]);
    });

    return () => { isCurrent = false; };
  }, [t]);

  function handleComplainantChange(e) {
    const { name, value } = e.target;
    setComplainant((prev) => ({ ...prev, [name]: value }));
    setStepErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setStepErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) { setProofFile(null); return; }

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', t('errSize'));
      event.target.value = '';
      setProofFile(null);
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      showToast('error', t('errType'));
      event.target.value = '';
      setProofFile(null);
      return;
    }
    setProofFile(file);
  }

  function handleRemoveFile() {
    setProofFile(null);
    const fileInput = document.getElementById('complaint-proof');
    if (fileInput) fileInput.value = '';
  }

  function validateStep1() {
    const errors = {};
    if (!complainant.name.trim()) errors.name = t('errName');
    
    const phoneClean = complainant.phone.trim().replace(/[\s\-\(\)]/g, '');
    if (!phoneClean) {
      errors.phone = t('errPhoneReq');
    } else if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(phoneClean)) {
      errors.phone = t('errPhoneInv');
    }

    if (!complainant.city.trim()) errors.city = t('errCity');
    if (!complainant.termsAccepted) errors.termsAccepted = t('errTerms');

    setStepErrors(errors);
    if (Object.keys(errors).length > 0) {
      showToast('error', Object.values(errors)[0]);
      return false;
    }
    return true;
  }

  function handleNextStep(e) {
    e.preventDefault();
    if (validateStep1()) {
      if (complainant.city && !form.location) {
        setForm((prev) => ({ ...prev, location: complainant.city.trim() }));
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function validateStep2() {
    const errors = {};
    if (!form.company.trim()) errors.company = t('errCompany');
    if (!form.category.trim()) errors.category = t('errCategory');
    if (!form.title.trim()) {
      errors.title = t('errTitleReq');
    } else if (form.title.trim().length < 5) {
      errors.title = t('errTitleLen');
    }
    if (!form.description.trim()) {
      errors.description = t('errDescReq');
    } else if (form.description.trim().length < 20) {
      errors.description = t('errDescLen');
    }

    setStepErrors(errors);
    if (Object.keys(errors).length > 0) {
      showToast('error', Object.values(errors)[0]);
      return false;
    }
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateStep2()) return;
    if (!account) { showToast('error', t('errSignIn')); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('company', form.company.trim());
      formData.append('category', form.category.trim());
      formData.append('subcategory', form.subcategory.trim());

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
      showToast('success', t('toastSuccess'));
      navigate(`/complaints/${encodeURIComponent(complaint.id)}`);
    } catch (err) {
      showToast('error', getErrorMessage(err, t('toastError')));
      setIsSubmitting(false);
    }
  }

  async function handleCompanyRequestSubmit(e) {
    e.preventDefault();
    if (!requestForm.companyName.trim()) { showToast('error', t('errCompanyReqName')); return; }
    if (!requestForm.categoryId) { showToast('error', t('errCompanyReqCat')); return; }

    setRequestSubmitting(true);
    try {
      await submitCompanyRequest({
        companyName: requestForm.companyName.trim(),
        categoryId: requestForm.categoryId,
        description: requestForm.description.trim(),
      });
      const msg = t('reqSuccess').replace('{0}', requestForm.companyName.trim());
      showToast('success', msg);
      setForm((prev) => ({ ...prev, company: requestForm.companyName.trim() }));
      setRequestForm({ companyName: '', categoryId: '', description: '' });
      setShowRequestCompany(false);
    } catch (err) {
      showToast('error', getErrorMessage(err, t('toastError')));
    } finally {
      setRequestSubmitting(false);
    }
  }

  const inputStyles = {
    display: 'block', width: '100%', padding: '10px 12px', fontSize: '1rem',
    border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff',
    transition: 'border-color 0.2s, box-shadow 0.2s', marginTop: '6px',
    boxSizing: 'border-box', outline: 'none'
  };

  const labelStyles = { fontSize: '0.9rem', fontWeight: '600', color: '#334155' };
  const errorStyles = { color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' };

  return (
    <MainLayout>
      {toast && <Toast type={toast.type} message={toast.message} onClose={closeToast} />}
      <section style={{ maxWidth: '840px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <p style={{ margin: 0, color: '#0f52ba', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>BadService.in</p>
            <h1 style={{ margin: '0.5rem 0', fontSize: '2.2rem', color: '#0f172a', fontWeight: '800' }}>{t('title')}</h1>
            <p style={{ margin: 0, color: '#475569', fontSize: '1.05rem', maxWidth: '600px', lineHeight: '1.5' }}>
              {t('description')}
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '1.1rem' }} aria-hidden="true">🌐</span>
            <select aria-label={t('lang')} value={lang} onChange={handleLangChange} style={{ border: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: '600', color: '#334155', cursor: 'pointer', outline: 'none' }}>
              <option value="en">English</option>
              <option value="ml">മലയാളം</option>
              <option value="hi">हिन्दी</option>
            </select>
          </div>
        </div>

        {accountStatus === 'loading' && <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>{t('checkSession')}</div>}

        {accountStatus === 'ready' && !account && (
          <div style={{ textAlign: 'center', background: '#fff', padding: '3rem 2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '1rem' }}>{t('signInRequired')}</h2>
            <p style={{ color: '#475569', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem', lineHeight: '1.6' }}>
              {t('signInDesc')}
            </p>
            <Link to="/account?redirect=/file-complaint" style={{ display: 'inline-block', padding: '0.75rem 2rem', background: '#e47911', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', transition: 'background 0.2s' }}>
              {t('signInBtn')}
            </Link>
          </div>
        )}

        {accountStatus === 'ready' && account && (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
            {/* PROGRESS STEPPER */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ flex: 1, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRight: '1px solid #e2e8f0', opacity: step === 1 ? 1 : 0.6, cursor: step === 2 ? 'pointer' : 'default' }} onClick={() => step === 2 && setStep(1)}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: step === 1 ? '#0f52ba' : '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {step > 1 ? '✓' : '1'}
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{t('step1')}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('step1Sub')}</div>
                </div>
              </div>
              <div style={{ flex: 1, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', opacity: step === 2 ? 1 : 0.5 }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: step === 2 ? '#0f52ba' : '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  2
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{t('step2')}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('step2Sub')}</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '2rem' }}>
              {/* STEP 1: YOUR DETAILS */}
              {step === 1 && (
                <form onSubmit={handleNextStep} noValidate>
                  <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '0.5rem' }}>{t('step1Heading')}</h2>
                    <p style={{ color: '#64748b', margin: 0 }}>{t('step1Desc')}</p>
                  </div>

                  <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                      <label htmlFor="complainant-name" style={labelStyles}>{t('fullName')} <span style={{ color: '#ef4444' }}>*</span></label>
                      <input id="complainant-name" name="name" value={complainant.name} onChange={handleComplainantChange} maxLength={80} style={{ ...inputStyles, borderColor: stepErrors.name ? '#ef4444' : '#cbd5e1' }} required />
                      {stepErrors.name && <span style={errorStyles}>{stepErrors.name}</span>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      <div>
                        <label htmlFor="complainant-email" style={labelStyles}>{t('email')} <span style={{ color: '#ef4444' }}>*</span></label>
                        <input id="complainant-email" name="email" value={complainant.email} readOnly style={{ ...inputStyles, background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} />
                        <span style={{ fontSize: '0.8rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontWeight: '600' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                          {t('verifiedAcc')}
                        </span>
                      </div>

                      <div>
                        <label htmlFor="complainant-phone" style={labelStyles}>{t('mobile')} <span style={{ color: '#ef4444' }}>*</span></label>
                        <input id="complainant-phone" name="phone" type="tel" value={complainant.phone} onChange={handleComplainantChange} maxLength={15} style={{ ...inputStyles, borderColor: stepErrors.phone ? '#ef4444' : '#cbd5e1' }} required />
                        {stepErrors.phone && <span style={errorStyles}>{stepErrors.phone}</span>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="complainant-city" style={labelStyles}>{t('city')} <span style={{ color: '#ef4444' }}>*</span></label>
                      <input id="complainant-city" name="city" value={complainant.city} onChange={handleComplainantChange} maxLength={100} style={{ ...inputStyles, borderColor: stepErrors.city ? '#ef4444' : '#cbd5e1' }} required />
                      {stepErrors.city && <span style={errorStyles}>{stepErrors.city}</span>}
                    </div>

                    <div>
                      <label htmlFor="complainant-address" style={labelStyles}>{t('address')} <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{t('addressOptional')}</span></label>
                      <textarea id="complainant-address" name="address" value={complainant.address} onChange={handleComplainantChange} maxLength={255} rows={2} placeholder={t('addressPlaceholder')} style={{ ...inputStyles, resize: 'vertical' }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: `1px solid ${stepErrors.termsAccepted ? '#fca5a5' : '#e2e8f0'}` }}>
                      <input id="complainant-terms" name="termsAccepted" type="checkbox" checked={complainant.termsAccepted} onChange={(e) => { setComplainant((prev) => ({ ...prev, termsAccepted: e.target.checked })); setStepErrors((prev) => ({ ...prev, termsAccepted: '' })); }} style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#0f52ba', cursor: 'pointer' }} required />
                      <label htmlFor="complainant-terms" style={{ fontSize: '0.95rem', color: '#334155', cursor: 'pointer', lineHeight: '1.5' }}>
                        {t('terms1')} <Link to="/help" target="_blank" style={{ color: '#0f52ba', fontWeight: '600' }}>{t('terms2')}</Link>{t('terms3')}
                      </label>
                    </div>
                    {stepErrors.termsAccepted && <span style={errorStyles}>{stepErrors.termsAccepted}</span>}

                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" style={{ padding: '0.85rem 2rem', background: '#e47911', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(228,121,17,0.2)' }}>
                        {t('continueBtn')}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* STEP 2: COMPLAINT DETAILS */}
              {step === 2 && (
                <form onSubmit={handleSubmit} noValidate>
                  <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '0.5rem' }}>{t('step2Heading')}</h2>
                    <p style={{ color: '#64748b', margin: 0 }}>{t('step2Desc')}</p>
                  </div>

                  <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {/* Product / Service Selector */}
                    <div>
                      <label style={labelStyles}>{t('typeOfComplaint')} <span style={{ color: '#ef4444' }}>*</span></label>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '8px' }}>
                        <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: form.type === 'Product' ? '2px solid #0f52ba' : '1px solid #cbd5e1', background: form.type === 'Product' ? '#eff6ff' : '#fff', cursor: 'pointer', fontWeight: '600', color: form.type === 'Product' ? '#1e3a8a' : '#475569', transition: 'all 0.2s' }}>
                          <input type="radio" name="type" value="Product" checked={form.type === 'Product'} onChange={handleFormChange} style={{ display: 'none' }} />
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                          {t('product')}
                        </label>
                        <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: form.type === 'Service' ? '2px solid #0f52ba' : '1px solid #cbd5e1', background: form.type === 'Service' ? '#eff6ff' : '#fff', cursor: 'pointer', fontWeight: '600', color: form.type === 'Service' ? '#1e3a8a' : '#475569', transition: 'all 0.2s' }}>
                          <input type="radio" name="type" value="Service" checked={form.type === 'Service'} onChange={handleFormChange} style={{ display: 'none' }} />
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                          {t('service')}
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      <div>
                        <label htmlFor="complaint-category" style={labelStyles}>{t('category')} <span style={{ color: '#ef4444' }}>*</span></label>
                        <select id="complaint-category" name="category" value={form.category} onChange={handleFormChange} style={{ ...inputStyles, borderColor: stepErrors.category ? '#ef4444' : '#cbd5e1' }} required>
                          <option value="">{t('selectCategory')}</option>
                          {categories.map((cat) => {
                            const name = typeof cat === 'object' ? cat.name : cat;
                            const key = typeof cat === 'object' ? (cat.id || cat.slug || cat.name) : cat;
                            return <option key={key} value={name}>{name}</option>;
                          })}
                        </select>
                        {stepErrors.category && <span style={errorStyles}>{stepErrors.category}</span>}
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label htmlFor="complaint-company" style={labelStyles}>{t('company')} <span style={{ color: '#ef4444' }}>*</span></label>
                          <button type="button" onClick={() => setShowRequestCompany(!showRequestCompany)} style={{ background: 'none', border: 'none', color: '#0f52ba', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', padding: 0 }}>
                            {showRequestCompany ? t('closeRequestForm') : t('cantFindCompany')}
                          </button>
                        </div>
                        <input id="complaint-company" name="company" value={form.company} onChange={handleFormChange} list="complaint-company-options" maxLength={120} placeholder={t('typeCompany')} style={{ ...inputStyles, borderColor: stepErrors.company ? '#ef4444' : '#cbd5e1' }} required />
                        <datalist id="complaint-company-options">
                          {companies.map((company) => (
                            <option key={company.id} value={company.name} />
                          ))}
                        </datalist>
                        {stepErrors.company && <span style={errorStyles}>{stepErrors.company}</span>}
                      </div>
                    </div>

                    {showRequestCompany && (
                      <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '1.5rem', borderRadius: '8px', position: 'relative' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#0f172a' }}>{t('requestCompanyHeading')}</h3>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#64748b' }}>{t('requestCompanyDesc')}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                          <input placeholder={t('companyNamePlaceholder')} value={requestForm.companyName} onChange={(e) => setRequestForm({ ...requestForm, companyName: e.target.value })} maxLength={120} style={inputStyles} />
                          <select value={requestForm.categoryId} onChange={(e) => setRequestForm({ ...requestForm, categoryId: e.target.value })} style={inputStyles}>
                            <option value="">{t('selectCatForBrand')}</option>
                            {categories.map((cat) => {
                              const id = typeof cat === 'object' ? (cat.id || cat.slug || cat.name) : cat;
                              const name = typeof cat === 'object' ? cat.name : cat;
                              return <option key={id} value={id}>{name}</option>;
                            })}
                          </select>
                        </div>
                        <textarea placeholder={t('companyNotesPlaceholder')} rows={2} value={requestForm.description} onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} style={{ ...inputStyles, marginBottom: '1rem', resize: 'vertical' }} />
                        <button type="button" disabled={requestSubmitting} onClick={handleCompanyRequestSubmit} style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                          {requestSubmitting ? t('submitting') : t('submitBrandReq')}
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      <div>
                        <label htmlFor="complaint-model" style={labelStyles}>{t('productModel')} <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{t('addressOptional')}</span></label>
                        <input id="complaint-model" name="model" value={form.model} onChange={handleFormChange} placeholder={t('modelPlaceholder')} maxLength={100} style={inputStyles} />
                      </div>
                      <div>
                        <label htmlFor="complaint-seller" style={labelStyles}>{t('seller')} <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{t('addressOptional')}</span></label>
                        <input id="complaint-seller" name="seller" value={form.seller} onChange={handleFormChange} placeholder={t('sellerPlaceholder')} maxLength={120} style={inputStyles} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      <div>
                        <label htmlFor="complaint-subcategory" style={labelStyles}>{t('subcategory')} <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{t('addressOptional')}</span></label>
                        <input id="complaint-subcategory" name="subcategory" value={form.subcategory} onChange={handleFormChange} placeholder={t('subcatPlaceholder')} maxLength={100} style={inputStyles} />
                      </div>
                      <div>
                        <label htmlFor="complaint-location" style={labelStyles}>{t('incidentLocation')} <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{t('addressOptional')}</span></label>
                        <input id="complaint-location" name="location" value={form.location} onChange={handleFormChange} placeholder={t('locationPlaceholder')} maxLength={120} style={inputStyles} />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="complaint-title" style={labelStyles}>{t('complaintTitle')} <span style={{ color: '#ef4444' }}>*</span></label>
                      <input id="complaint-title" name="title" value={form.title} onChange={handleFormChange} maxLength={160} placeholder={t('titlePlaceholder')} style={{ ...inputStyles, borderColor: stepErrors.title ? '#ef4444' : '#cbd5e1' }} required />
                      {stepErrors.title && <span style={errorStyles}>{stepErrors.title}</span>}
                    </div>

                    <div>
                      <label htmlFor="complaint-description" style={labelStyles}>{t('fullDetails')} <span style={{ color: '#ef4444' }}>*</span></label>
                      <textarea id="complaint-description" name="description" value={form.description} onChange={handleFormChange} maxLength={5000} placeholder={t('detailsPlaceholder')} rows={6} style={{ ...inputStyles, resize: 'vertical', borderColor: stepErrors.description ? '#ef4444' : '#cbd5e1' }} required />
                      {stepErrors.description && <span style={errorStyles}>{stepErrors.description}</span>}
                    </div>

                    <div>
                      <label htmlFor="complaint-proof" style={labelStyles}>
                        {t('uploadProof')} <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{t('proofOptional')}</span>
                      </label>
                      
                      <div style={{ marginTop: '8px', border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '2rem', textAlign: 'center', background: '#f8fafc', transition: 'border-color 0.2s', position: 'relative' }}>
                        <input id="complaint-proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={handleFileChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
                        <div style={{ pointerEvents: 'none' }}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                          <p style={{ margin: 0, color: '#334155', fontWeight: '600' }}>Drag &amp; drop or Browse</p>
                          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>JPG / PNG / WEBP / GIF / PDF</p>
                        </div>
                      </div>

                      {proofFile && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', background: '#eff6ff', padding: '10px 16px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                            <span style={{ fontSize: '0.9rem', color: '#1e3a8a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              <strong>{proofFile.name}</strong> ({(proofFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button type="button" onClick={handleRemoveFile} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500', padding: '4px 8px' }}>
                            {t('removeFile')}
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', gap: '1rem', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ padding: '0.75rem 1.5rem', background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '500', transition: 'background 0.2s' }}>
                        {t('backBtn')}
                      </button>

                      <button type="submit" disabled={isSubmitting} style={{ padding: '0.85rem 2rem', background: '#e47911', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(228,121,17,0.2)' }}>
                        {isSubmitting ? t('submittingComplaint') : t('submitBtn')}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </section>
    </MainLayout>
  );
}