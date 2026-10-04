import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CompanySelector from '../components/complaints/CompanySelector.jsx';
import ComplaintTypeSelector from '../components/complaints/ComplaintTypeSelector.jsx';
import ComplaintUploadField from '../components/complaints/ComplaintUploadField.jsx';
import OtpVerification from '../components/complaints/OtpVerification.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import { createComplaint, getCategories, getCompanies, getErrorMessage } from '../services/api.js';
import { IMAGE_ACCEPT, VIDEO_ACCEPT } from '../utils/complaintMedia.js';
import { getTranslation } from '../utils/FileComplaintTranslations.js';

const emptyMedia = { productImage: null, billImage: null, productVideo: null };

export default function FileComplaintPage() {
  const [lang, setLang] = useState(() => localStorage.getItem('badservice_lang') || 'en');
  const t = (key) => getTranslation(lang, key);

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [otpResult, setOtpResult] = useState(null);
  const [identity, setIdentity] = useState({
    fullName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    terms: false,
  });
  const [form, setForm] = useState({
    type: 'Product',
    category: '',
    company: '',
    model: '',
    seller: '',
    location: '',
    title: '',
    description: '',
  });
  const [mediaFiles, setMediaFiles] = useState(emptyMedia);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  useEffect(() => {
    localStorage.setItem('badservice_lang', lang);
  }, [lang]);

  useEffect(() => {
    let current = true;
    Promise.all([getCategories(), getCompanies()])
      .then(([categoryData, companyData]) => {
        if (!current) return;
        setCategories((categoryData || []).filter((cat) => !cat.parentId));
        setCompanies(Array.isArray(companyData) ? companyData : []);
      })
      .catch(() => {
        if (current) {
          setCategories([]);
          setCompanies([]);
        }
      });
    return () => {
      current = false;
    };
  }, []);

  function handleIdentityChange(event) {
    const { name, value, type, checked } = event.target;
    setIdentity((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validateStep1() {
    const nextErrors = {};
    if (!identity.fullName.trim() || identity.fullName.trim().length < 2) nextErrors.fullName = t('errName');
    if (!identity.phone.trim()) nextErrors.phone = t('errPhoneReq');
    else if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(identity.phone.trim().replace(/[\s\-()]/g, ''))) nextErrors.phone = t('errPhoneInv');
    if (!otpResult?.verified) nextErrors.otp = t('errOtp');
    if (!identity.email.trim()) nextErrors.email = t('errEmail');
    if (!identity.city.trim()) nextErrors.city = t('errCity');
    if (!identity.address.trim()) nextErrors.address = t('errAddress');
    if (!identity.terms) nextErrors.terms = t('errTerms');
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep2() {
    const nextErrors = {};
    if (!form.category.trim()) nextErrors.category = t('errCategory');
    if (!form.company.trim()) nextErrors.company = t('errCompany');
    if (!form.model.trim()) nextErrors.model = t('errModel');
    if (!form.seller.trim()) nextErrors.seller = t('errSeller');
    if (!form.location.trim()) nextErrors.location = t('errLocation');
    if (!form.title.trim()) nextErrors.title = t('errTitleReq');
    else if (form.title.trim().length < 5) nextErrors.title = t('errTitleLen');
    if (!form.description.trim()) nextErrors.description = t('errDescReq');
    else if (form.description.trim().length < 20) nextErrors.description = t('errDescLen');
    if (!mediaFiles.productImage) nextErrors.productImage = t('errProductImage');
    if (!mediaFiles.billImage) nextErrors.billImage = t('errBillImage');
    if (!mediaFiles.productVideo) nextErrors.productVideo = t('errProductVideo');
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext(event) {
    event.preventDefault();
    if (validateStep1()) setStep(2);
  }

  function openAddCompany(name = form.company) {
    setNewCompanyName(name.trim());
    setAddCompanyOpen(true);
  }

  function confirmAddCompany(event) {
    event.preventDefault();
    const name = newCompanyName.trim();
    if (name.length < 2) return;
    setForm((prev) => ({ ...prev, company: name }));
    setCompanies((prev) => prev.some((item) => item.name.toLowerCase() === name.toLowerCase()) ? prev : [{ id: `new-${Date.now()}`, name, status: 'PENDING' }, ...prev]);
    setErrors((prev) => ({ ...prev, company: '' }));
    setAddCompanyOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateStep2() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const formData = new FormData();
      formData.append('fullName', identity.fullName.trim());
      formData.append('phone', identity.phone.trim());
      formData.append('email', identity.email.trim());
      formData.append('city', identity.city.trim());
      formData.append('address', identity.address.trim());
      formData.append('verificationToken', otpResult.verificationToken);
      formData.append('type', form.type);
      formData.append('category', form.category.trim());
      formData.append('company', form.company.trim());
      formData.append('model', form.model.trim());
      formData.append('seller', form.seller.trim());
      formData.append('location', form.location.trim());
      formData.append('title', form.title.trim());
      formData.append('description', form.description.trim());
      formData.append('productImage', mediaFiles.productImage);
      formData.append('billImage', mediaFiles.billImage);
      formData.append('productVideo', mediaFiles.productVideo);

      const complaint = await createComplaint(formData);
      setSubmitted(complaint);
    } catch (error) {
      setSubmitError(getErrorMessage(error, t('errSubmit')));
    } finally {
      setIsSubmitting(false);
    }
  }

  const parentCategories = categories.length ? categories : [];

  if (submitted) {
    return (
      <MainLayout>
        <div className="complaint-form-shell">
          <div className="success-card">
            <p className="success-card__eyebrow">BadService.in</p>
            <h1>Complaint Submitted Successfully</h1>
            <p>{submitted.status === 'PENDING' ? 'Your complaint has been submitted and is pending review.' : 'Your complaint has been submitted successfully with the evidence you uploaded.'}</p>
            <p className="success-card__id">Complaint reference: <strong>{submitted.id}</strong></p>
            <div className="success-card__actions">
              <Link className="primary-cta" to={`/complaints/${encodeURIComponent(submitted.id)}`}>View Complaint</Link>
              <Link className="ghost-cta" to="/">Back to Home</Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="complaint-form-shell">
        <div className="complaint-form-header">
          <div>
            <h1><span className="complaint-title-icon" aria-hidden="true">+</span> {t('title')}</h1>
            <p className="complaint-form-header__subtitle">{t('description')}</p>
          </div>
          <label className="lang-select">
            <span>{t('lang')}</span>
            <select value={lang} onChange={(event) => setLang(event.target.value)} aria-label={t('lang')}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="ml">മലയാളം</option>
            </select>
          </label>
        </div>

        <div className={`progress-banner${step === 2 || otpResult?.verified ? ' is-verified' : ''}`}>
          {step === 1
            ? (otpResult?.verified ? t('step1Verified') : t('step1Progress'))
            : t('step2Verified')}
          {otpResult?.verified && <span> · {otpResult.phone}</span>}
        </div>

        {step === 1 && (
          <form className="complaint-form-card" onSubmit={handleNext} noValidate>
            <label className="field">
              <span>{t('fullName')} *</span>
              <input name="fullName" value={identity.fullName} onChange={handleIdentityChange} autoComplete="name" className={errors.fullName ? 'is-invalid' : ''} />
              {errors.fullName && <small className="field-error">{errors.fullName}</small>}
            </label>

            <OtpVerification
              phone={identity.phone}
              email={identity.email}
              onPhoneChange={(value) => {
                setIdentity((prev) => ({ ...prev, phone: value }));
                setOtpResult(null);
                setErrors((prev) => ({ ...prev, phone: '', otp: '' }));
              }}
              onEmailChange={(value) => {
                setIdentity((prev) => ({ ...prev, email: value }));
                setOtpResult(null);
                setErrors((prev) => ({ ...prev, email: '', otp: '' }));
              }}
              verified={Boolean(otpResult?.verified)}
              onVerified={setOtpResult}
              t={t}
              error={errors.phone || errors.otp}
            />

            <label className="field">
              <span>{t('city')} *</span>
              <input name="city" value={identity.city} onChange={handleIdentityChange} autoComplete="address-level2" className={errors.city ? 'is-invalid' : ''} />
              {errors.city && <small className="field-error">{errors.city}</small>}
            </label>

            <label className="field field--full">
              <span>{t('address')} *</span>
              <textarea name="address" rows={3} value={identity.address} onChange={handleIdentityChange} placeholder={t('addressPlaceholder')} className={errors.address ? 'is-invalid' : ''} />
              {errors.address && <small className="field-error">{errors.address}</small>}
            </label>

            <label className="terms-check">
              <input type="checkbox" name="terms" checked={identity.terms} onChange={handleIdentityChange} />
              <span>{t('terms1')}<Link to="/help">{t('terms2')}</Link>{t('terms3')}</span>
            </label>
            {errors.terms && <small className="field-error">{errors.terms}</small>}

            <div className="complaint-form-actions">
              <button type="submit" className="submit-button">{t('continueBtn')}</button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="complaint-form-card" onSubmit={handleSubmit} noValidate>
            <ComplaintTypeSelector
              value={form.type}
              onChange={(type) => setForm((prev) => ({ ...prev, type }))}
              heading={t('typeOfComplaint')}
              productLabel={t('product')}
              serviceLabel={t('service')}
            />

            <div className="complaint-form-grid">
              <label className="field">
                <span>{t('category')} *</span>
                <select name="category" value={form.category} onChange={handleFieldChange} className={errors.category ? 'is-invalid' : ''}>
                  <option value="">{t('selectCategory')}</option>
                  {parentCategories.map((cat) => (
                    <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                {errors.category && <small className="field-error">{errors.category}</small>}
              </label>

              <CompanySelector
                companies={companies}
                value={form.company}
                onChange={(company) => {
                  setForm((prev) => ({ ...prev, company }));
                  setErrors((prev) => ({ ...prev, company: '' }));
                }}
                error={errors.company}
                label={`${t('company')} *`}
                placeholder={t('typeCompany')}
                onAddCompany={openAddCompany}
              />
            </div>

            <div className="complaint-form-grid">
              <label className="field">
                <span>{t('productModel')} *</span>
                <input name="model" value={form.model} onChange={handleFieldChange} placeholder={t('modelPlaceholder')} className={errors.model ? 'is-invalid' : ''} />
                {errors.model && <small className="field-error">{errors.model}</small>}
              </label>
              <label className="field">
                <span>{t('seller')} *</span>
                <input name="seller" value={form.seller} onChange={handleFieldChange} placeholder={t('sellerPlaceholder')} className={errors.seller ? 'is-invalid' : ''} />
                {errors.seller && <small className="field-error">{errors.seller}</small>}
              </label>
            </div>

            <label className="field">
              <span>{t('incidentLocation')} *</span>
              <input name="location" value={form.location} onChange={handleFieldChange} placeholder={t('locationPlaceholder')} className={errors.location ? 'is-invalid' : ''} />
              <small className="field-hint">{t('locationHint')}</small>
              {errors.location && <small className="field-error">{errors.location}</small>}
            </label>

            <label className="field">
              <span>{t('complaintTitle')} *</span>
              <input name="title" value={form.title} onChange={handleFieldChange} placeholder={t('titlePlaceholder')} className={errors.title ? 'is-invalid' : ''} />
              {errors.title && <small className="field-error">{errors.title}</small>}
            </label>

            <label className="field field--full">
              <span>{t('fullDetails')} *</span>
              <textarea name="description" rows={6} value={form.description} onChange={handleFieldChange} placeholder={t('detailsPlaceholder')} className={errors.description ? 'is-invalid' : ''} />
              {errors.description && <small className="field-error">{errors.description}</small>}
            </label>

            <div className="complaint-form-section">
              <h2 className="complaint-form-label">{t('requiredEvidence')}</h2>
              <div className="upload-grid">
                <ComplaintUploadField
                  name="productImage"
                  kind="image"
                  accept={IMAGE_ACCEPT}
                  label={form.type === 'Service' ? t('servicePhoto') : t('productPhoto')}
                  helper="JPG / JPEG / PNG / WEBP · max 10MB"
                  file={mediaFiles.productImage}
                  error={errors.productImage}
                  onChange={(file, error) => {
                    setMediaFiles((prev) => ({ ...prev, productImage: error ? null : file }));
                    setErrors((prev) => ({ ...prev, productImage: error || '' }));
                  }}
                  onRemove={() => setMediaFiles((prev) => ({ ...prev, productImage: null }))}
                />
                <ComplaintUploadField
                  name="billImage"
                  kind="image"
                  accept={IMAGE_ACCEPT}
                  label={t('billPhoto')}
                  helper="JPG / JPEG / PNG / WEBP · max 10MB"
                  file={mediaFiles.billImage}
                  error={errors.billImage}
                  onChange={(file, error) => {
                    setMediaFiles((prev) => ({ ...prev, billImage: error ? null : file }));
                    setErrors((prev) => ({ ...prev, billImage: error || '' }));
                  }}
                  onRemove={() => setMediaFiles((prev) => ({ ...prev, billImage: null }))}
                />
                <ComplaintUploadField
                  name="productVideo"
                  kind="video"
                  accept={VIDEO_ACCEPT}
                  label={form.type === 'Service' ? t('serviceVideo') : t('productVideo')}
                  helper="MP4 / WEBM / MOV · max 25MB"
                  file={mediaFiles.productVideo}
                  error={errors.productVideo}
                  onChange={(file, error) => {
                    setMediaFiles((prev) => ({ ...prev, productVideo: error ? null : file }));
                    setErrors((prev) => ({ ...prev, productVideo: error || '' }));
                  }}
                  onRemove={() => setMediaFiles((prev) => ({ ...prev, productVideo: null }))}
                />
              </div>
            </div>

            {submitError && <p className="form-banner form-banner--error" role="alert">{submitError}</p>}

            <div className="complaint-form-actions complaint-form-actions--split">
              <button type="button" className="ghost-cta" onClick={() => setStep(1)}>{t('backBtn')}</button>
              <button type="submit" className="submit-button" disabled={isSubmitting}>
                {isSubmitting ? t('submittingComplaint') : t('submitBtn')}
              </button>
            </div>
          </form>
        )}

        {addCompanyOpen && (
          <div className="modal-backdrop" role="presentation" onMouseDown={() => setAddCompanyOpen(false)}>
            <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="add-company-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className="modal-card__header"><div><span className="home-section__eyebrow">Company directory</span><h2 id="add-company-title">Add a company</h2></div><button type="button" className="modal-card__close" aria-label="Close" onClick={() => setAddCompanyOpen(false)}>×</button></div>
              <p className="modal-card__text">Can’t find the brand or company? Enter its name and continue. The company will be added to the complaint record for administrator review.</p>
              <form onSubmit={confirmAddCompany}>
                <label className="field"><span>Company / Brand Name *</span><input autoFocus value={newCompanyName} onChange={(event) => setNewCompanyName(event.target.value)} placeholder="Enter company or brand name" /></label>
                <div className="modal-card__actions"><button type="button" className="ghost-cta" onClick={() => setAddCompanyOpen(false)}>Cancel</button><button type="submit" className="submit-button" disabled={newCompanyName.trim().length < 2}>Add Company</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
