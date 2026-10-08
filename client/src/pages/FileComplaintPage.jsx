import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CompanySelector from '../components/complaints/CompanySelector.jsx';
import ComplaintTypeSelector from '../components/complaints/ComplaintTypeSelector.jsx';
import ComplaintUploadField from '../components/complaints/ComplaintUploadField.jsx';
import LocationAutocomplete from '../components/complaints/LocationAutocomplete.jsx';
import OtpVerification from '../components/complaints/OtpVerification.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import { useAccount } from '../context/AccountContext.jsx';
import {
  createComplaint,
  getCategories,
  getCompanies,
  getErrorMessage,
  submitCompanyRequest,
} from '../services/api.js';
import { IMAGE_ACCEPT, VIDEO_ACCEPT } from '../utils/complaintMedia.js';
import { getTranslation } from '../utils/FileComplaintTranslations.js';

const emptyMedia = { productImage: null, billImage: null, productVideo: null };

export const SERVICE_TYPE_OPTIONS = [
  { value: 'Hospital', label: 'Hospital / Clinic / Medical', icon: '🏥', category: 'Hospital & Healthcare' },
  { value: 'Hotel', label: 'Hotel / Resort / Stay', icon: '🏨', category: 'Hotel & Travel' },
  { value: 'Flight', label: 'Flight / Airline', icon: '✈️', category: 'Flights & Trains' },
  { value: 'Train', label: 'Train / Railway', icon: '🚆', category: 'Flights & Trains' },
  { value: 'Restaurant', label: 'Restaurant / Dining', icon: '🍽️', category: 'Restaurants & Food' },
  { value: 'Food Delivery', label: 'Food Delivery', icon: '🛵', category: 'Restaurants & Food' },
  { value: 'Vehicle Service', label: 'Vehicle Service / Garage / Repair', icon: '🚗', category: 'Vehicles & Automotive' },
  { value: 'Bank', label: 'Bank / Loan / Finance', icon: '🏦', category: 'Banking' },
  { value: 'Telecom', label: 'Telecom / Mobile Network / ISP', icon: '📞', category: 'Telecom' },
  { value: 'Appliance Repair', label: 'Appliance Repair / Service Center', icon: '📺', category: 'TV & Electronics' },
  { value: 'Courier / Delivery', label: 'Courier / Parcel Delivery', icon: '📦', category: 'Hotel & Travel' },
  { value: 'Education', label: 'Education / Coaching / College', icon: '🎓', category: 'Hospital & Healthcare' },
  { value: 'Other Services', label: 'Other Professional Services', icon: '🛠️', category: 'TV & Electronics' },
];

const USER_IDENTITY_KEY = 'badservice_user_identity';
const COMPLAINT_DRAFT_KEY = 'badservice_complaint_draft';
const COMPLAINT_STEP_KEY = 'badservice_complaint_step';
const USER_VERIFIED_OTP_KEY = 'badservice_user_verified_otp';

export default function FileComplaintPage() {
  const navigate = useNavigate();
  const { account } = useAccount();
  const [lang, setLang] = useState(() => localStorage.getItem('badservice_lang') === 'ml' ? 'ml' : 'en');
  const t = (key) => getTranslation(lang, key);

  function handleStep1BackAndUnfill() {
    // Un-fill all form details in Step 1
    setIdentity({
      fullName: '',
      phone: '',
      email: '',
      city: '',
      address: '',
      terms: false,
    });
    setOtpResult(null);
    setErrors({});
    try {
      localStorage.removeItem(USER_IDENTITY_KEY);
      localStorage.removeItem(USER_VERIFIED_OTP_KEY);
      localStorage.removeItem(COMPLAINT_STEP_KEY);
      localStorage.removeItem(COMPLAINT_DRAFT_KEY);
    } catch {}
    navigate(-1);
  }

  const [step, setStep] = useState(() => {
    try {
      const savedStep = localStorage.getItem(COMPLAINT_STEP_KEY);
      if (savedStep === '2') return 2;
    } catch {}
    return 1;
  });
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [otpResult, setOtpResult] = useState(() => {
    try {
      const savedOtp = localStorage.getItem(USER_VERIFIED_OTP_KEY);
      if (savedOtp) return JSON.parse(savedOtp);
    } catch {}
    return null;
  });

  // Persistent User Identity (saved permanently so user never has to re-type on any visit)
  const [identity, setIdentity] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_IDENTITY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          fullName: parsed.fullName || '',
          phone: parsed.phone || '',
          email: parsed.email || '',
          city: parsed.city || '',
          address: parsed.address || '',
          terms: Boolean(parsed.terms),
        };
      }
    } catch {}
    return {
      fullName: '',
      phone: '',
      email: '',
      city: '',
      address: '',
      terms: false,
    };
  });

  // Persistent Complaint Form Draft (preserved when user navigates to other pages and returns)
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(COMPLAINT_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          type: parsed.type || 'Product',
          category: parsed.category || '',
          serviceType: parsed.serviceType || '',
          company: parsed.company || '',
          model: parsed.model || '',
          seller: parsed.seller || '',
          location: parsed.location || '',
          title: parsed.title || '',
          description: parsed.description || '',
        };
      }
    } catch {}
    return {
      type: 'Product',
      category: '',
      serviceType: '',
      company: '',
      model: '',
      seller: '',
      location: '',
      title: '',
      description: '',
    };
  });

  const [mediaFiles, setMediaFiles] = useState(emptyMedia);

  // Company request modal / inline state
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [reqCompanyName, setReqCompanyName] = useState('');
  const [reqCategoryId, setReqCategoryId] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqSuccess, setReqSuccess] = useState('');
  const [reqError, setReqError] = useState('');

  // Persist language
  useEffect(() => {
    localStorage.setItem('badservice_lang', lang);
    window.dispatchEvent(new Event('badservice-language-change'));
  }, [lang]);

  // Persist user identity permanently so it is always filled when entering this page
  useEffect(() => {
    try {
      localStorage.setItem(USER_IDENTITY_KEY, JSON.stringify(identity));
    } catch {}
  }, [identity]);

  // Persist complaint draft details so if user navigates to other pages, details remain
  useEffect(() => {
    try {
      localStorage.setItem(COMPLAINT_DRAFT_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  // If user is already logged in, automatically populate identity details
  useEffect(() => {
    if (account) {
      setIdentity((prev) => ({
        ...prev,
        fullName: prev.fullName || account.name || '',
        email: prev.email || account.email || '',
        phone: prev.phone || account.phone || '',
      }));
    }
  }, [account]);

  // Load categories and companies
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
      })
      .finally(() => current && setCompaniesLoading(false));
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

  function handleServiceTypeChange(event) {
    const nextServiceType = event.target.value;
    const match = SERVICE_TYPE_OPTIONS.find((opt) => opt.value === nextServiceType);
    setForm((prev) => {
      let nextCategory = prev.category;
      if (match?.category) {
        const found = categories.find(
          (c) => c.name.toLowerCase() === match.category.toLowerCase()
        );
        nextCategory = found ? found.name : match.category;
      }
      return { ...prev, serviceType: nextServiceType, category: nextCategory };
    });
    setErrors((prev) => ({ ...prev, serviceType: '', category: '' }));
  }

  function handleServiceCategoryChange(event) {
    const nextCategory = event.target.value;
    setForm((prev) => {
      let nextServiceType = prev.serviceType;
      const matches = SERVICE_TYPE_OPTIONS.filter(
        (opt) => opt.category.toLowerCase() === nextCategory.toLowerCase()
      );
      if (matches.length > 0) {
        const isCurrentMatch = matches.some((opt) => opt.value === prev.serviceType);
        if (!isCurrentMatch) {
          nextServiceType = matches[0].value;
        }
      }
      return { ...prev, category: nextCategory, serviceType: nextServiceType };
    });
    setErrors((prev) => ({ ...prev, category: '', serviceType: '' }));
  }

  function validateStep1() {
    const nextErrors = {};
    if (!identity.fullName.trim() || identity.fullName.trim().length < 2) nextErrors.fullName = t('errName');
    if (identity.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(identity.email.trim())) {
      nextErrors.email = t('errEmail');
    }
    const isPhoneVerified = Boolean(
      otpResult?.verified && (!otpResult?.phone || otpResult.phone === identity.phone.trim())
    );
    if (!isPhoneVerified) nextErrors.otp = t('errOtp');
    if (!identity.phone.trim()) nextErrors.phone = t('errPhoneReq');
    else if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(identity.phone.trim().replace(/[\s\-()]/g, ''))) nextErrors.phone = t('errPhoneInv');
    if (!identity.city.trim()) nextErrors.city = t('errCity');
    if (!identity.address.trim()) nextErrors.address = t('errAddress');
    if (!identity.terms) nextErrors.terms = t('errTerms');
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep2() {
    const nextErrors = {};
    if (!form.category.trim()) nextErrors.category = t('errCategory');
    if (form.type === 'Product') {
      if (!form.company.trim()) nextErrors.company = t('errCompany');
      if (!form.model.trim()) nextErrors.model = t('errModel');
      if (!form.seller.trim()) nextErrors.seller = t('errSeller');
    } else {
      if (!form.serviceType.trim()) nextErrors.serviceType = t('errServiceType');
      if (!form.company.trim()) nextErrors.company = t('errServiceProvider');
      if (!form.model.trim()) nextErrors.model = t('errServiceDetails');
    }
    if (!form.location.trim()) nextErrors.location = t('errLocation');
    if (!form.title.trim()) nextErrors.title = t('errTitleReq');
    else if (form.title.trim().length < 5) nextErrors.title = t('errTitleLen');
    if (!form.description.trim()) nextErrors.description = t('errDescReq');
    else if (form.description.trim().length < 20) nextErrors.description = t('errDescLen');

    // All 3 evidence files are strictly mandatory
    if (!mediaFiles.productImage) nextErrors.productImage = t('errProductImage');
    if (!mediaFiles.billImage) nextErrors.billImage = t('errBillImage');
    if (!mediaFiles.productVideo) nextErrors.productVideo = t('errProductVideo');

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext(event) {
    event.preventDefault();
    if (validateStep1()) {
      setStep(2);
      try {
        localStorage.setItem(COMPLAINT_STEP_KEY, '2');
      } catch {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleCompanyRequestSubmit(e) {
    e.preventDefault();
    if (!reqCompanyName.trim()) {
      setReqError(t('errCompanyNameRequired'));
      return;
    }
    setReqSubmitting(true);
    setReqError('');
    try {
      await submitCompanyRequest({
        companyName: reqCompanyName.trim(),
        categoryId: reqCategoryId || 'others',
        description: reqDescription.trim(),
      });
      setReqSuccess(`${t('companyRequestSubmittedPrefix')}${reqCompanyName.trim()}${t('companyRequestSubmittedSuffix')}`);
      setForm((prev) => ({ ...prev, company: reqCompanyName.trim() }));
      setTimeout(() => {
        setAddCompanyOpen(false);
        setReqSuccess('');
      }, 2000);
    } catch (err) {
      setReqError(getErrorMessage(err, 'Failed to submit company request.'));
    } finally {
      setReqSubmitting(false);
    }
  }

  function openCompanyRequest(companyName = '') {
    setReqCompanyName(companyName);
    setReqCategoryId(categories.find((category) => category.name === form.category)?.id || '');
    setReqDescription('');
    setReqError('');
    setReqSuccess('');
    setAddCompanyOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateStep2() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const formData = new FormData();
      formData.append('fullName', identity.fullName.trim());
      formData.append('email', identity.email.trim());
      formData.append('phone', identity.phone.trim());
      formData.append('city', identity.city.trim());
      formData.append('address', identity.address.trim());
      formData.append('verificationToken', otpResult.verificationToken);
      formData.append('verificationMethod', 'phone');
      formData.append('type', form.type);
      formData.append('category', form.category.trim());
      formData.append('company', form.company.trim());
      formData.append('serviceType', form.serviceType.trim());
      formData.append('model', form.model.trim());
      formData.append('seller', (form.type === 'Service' ? form.company : form.seller).trim());
      formData.append('location', form.location.trim());
      formData.append('title', form.title.trim());
      formData.append('description', form.description.trim());
      formData.append('productImage', mediaFiles.productImage);
      formData.append('billImage', mediaFiles.billImage);
      formData.append('productVideo', mediaFiles.productVideo);

      const complaint = await createComplaint(formData);
      try {
        localStorage.removeItem(COMPLAINT_DRAFT_KEY);
        localStorage.removeItem(COMPLAINT_STEP_KEY);
      } catch {}
      setStep(1);
      setSubmitted(complaint);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (error) {
      setSubmitError(getErrorMessage(error, t('errSubmit')));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <MainLayout>
        <div className="complaint-form-shell">
          <div className="success-card">
            <p className="success-card__eyebrow">BadService.in</p>
            <h1>✓ {t('complaintSubmitted')}</h1>
            <p>{t('complaintReceived')}</p>
            <p className="success-card__id">{t('complaintId')}: <strong>{submitted.id}</strong></p>
            <div className="success-card__actions">
              {['APPROVED', 'COMPANY_RESPONDED', 'RESOLVED'].includes(submitted.status) ? (
                <Link className="primary-cta" to={`/complaints/${encodeURIComponent(submitted.id)}`}>
                  {t('viewComplaint')}
                </Link>
              ) : (
                <span className="ghost-cta">{t('awaitingApproval')}</span>
              )}
              <Link className="ghost-cta" to="/">
                {t('backHome')}
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="complaint-form-shell complaint-form-shell--reference">
        {/* Top Centered Header Matching Screenshot 262 & 238 */}
        <div className="complaint-form-header">
          <div className="complaint-form-header__main">
            <h1>
              <span className="complaint-title-fire" aria-hidden="true">🔥</span> {t('title')}
            </h1>
            <p className="complaint-form-header__subtitle">{t('description')}</p>
          </div>
          <div className="complaint-form-header__lang">
            <label className="lang-select">
              <span>{t('lang')}</span>
              <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('lang')}>
                <option value="en">English</option>
                <option value="ml">മലയാളം</option>
              </select>
            </label>
          </div>
        </div>

        {/* Step Banner */}
        <div className={`progress-banner${step === 2 || otpResult?.verified ? ' is-verified' : ''}`}>
          {step === 1 ? (
            otpResult?.verified ? (
              <span>{t('step1Verified')} · {identity.phone}</span>
            ) : (
              <span>{t('step1Progress')}</span>
            )
          ) : (
            <span>{t('step2Verified')} {identity.phone ? `✓ (${identity.phone})` : '✓'}</span>
          )}
        </div>

        {/* STEP 1: YOUR DETAILS & PHONE VERIFICATION */}
        {step === 1 && (
          <div className="complaint-form-card complaint-form-card--step-one">
            {/* Step 1 Fields */}
            <form className="complaint-step-one-form" onSubmit={handleNext} noValidate>
              <label className="field">
                <span>{t('fullName')} *</span>
                <input
                  name="fullName"
                  value={identity.fullName}
                  onChange={handleIdentityChange}
                  autoComplete="name"
                  placeholder={t('fullNamePlaceholder')}
                  className={errors.fullName ? 'is-invalid' : ''}
                />
                {errors.fullName && <small className="field-error">{errors.fullName}</small>}
              </label>

              {/* Phone Number + Send OTP + Enter OTP + Verify */}
              <OtpVerification
                phone={identity.phone}
                onPhoneChange={(val) => {
                  setIdentity((prev) => ({ ...prev, phone: val }));
                  if (otpResult?.phone && otpResult.phone !== val.trim()) {
                    setOtpResult(null);
                    try {
                      localStorage.removeItem(USER_VERIFIED_OTP_KEY);
                    } catch {}
                  }
                  setErrors((prev) => ({ ...prev, phone: '', otp: '' }));
                }}
                verified={Boolean(
                  otpResult?.verified && (!otpResult?.phone || otpResult.phone === identity.phone?.trim())
                )}
                onVerified={(res) => {
                  const verifiedData = { ...res, verified: true, phone: identity.phone.trim() };
                  setOtpResult(verifiedData);
                  try {
                    localStorage.setItem(USER_VERIFIED_OTP_KEY, JSON.stringify(verifiedData));
                  } catch {}
                  setErrors((prev) => ({ ...prev, otp: '' }));
                }}
                t={t}
                error={errors.phone || errors.otp}
              />

              <label className="field">
                <span>{t('email')}</span>
                <input
                  name="email"
                  type="email"
                  value={identity.email}
                  onChange={handleIdentityChange}
                  autoComplete="email"
                  placeholder={t('emailPlaceholder')}
                  className={errors.email ? 'is-invalid' : ''}
                />
                {errors.email && <small className="field-error">{errors.email}</small>}
              </label>

              <label className="field">
                <span>{t('city')} *</span>
                <input
                  name="city"
                  value={identity.city}
                  onChange={handleIdentityChange}
                  autoComplete="address-level2"
                  placeholder={t('cityPlaceholder')}
                  className={errors.city ? 'is-invalid' : ''}
                />
                {errors.city && <small className="field-error">{errors.city}</small>}
              </label>

              <label className="field field--full">
                <span>{t('address')} *</span>
                <textarea
                  name="address"
                  rows={3}
                  value={identity.address}
                  onChange={handleIdentityChange}
                  placeholder={t('addressPlaceholder')}
                  className={errors.address ? 'is-invalid' : ''}
                />
                {errors.address && <small className="field-error">{errors.address}</small>}
              </label>

              <label className="terms-check">
                <input
                  type="checkbox"
                  name="terms"
                  checked={identity.terms}
                  onChange={handleIdentityChange}
                />
                <span>
                  {t('terms1')}
                  <Link to="/terms" target="_blank">{t('terms2')}</Link>
                </span>
              </label>
              {errors.terms && <small className="field-error">{errors.terms}</small>}

              <div className="complaint-form-actions complaint-form-actions--split">
                <button
                  type="button"
                  className="submit-button submit-button--ghost"
                  onClick={handleStep1BackAndUnfill}
                >
                  {t('backBtn')}
                </button>
                <button type="submit" className="submit-button submit-button--orange">
                  {t('continueBtn')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: COMPLAINT DETAILS & MANDATORY EVIDENCE */}
        {step === 2 && (
          <div className="complaint-form-card complaint-form-card--step-two">
            <form onSubmit={handleSubmit} noValidate>
              <ComplaintTypeSelector
                value={form.type}
                onChange={(type) => setForm((prev) => ({ ...prev, type }))}
                heading={t('typeOfComplaint')}
                productLabel={t('product')}
                serviceLabel={t('service')}
              />

              {form.type === 'Product' ? (
                <>
                  <div className="complaint-form-grid">
                    <label className="field">
                      <span>{t('category')} *</span>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleFieldChange}
                        className={errors.category ? 'is-invalid' : ''}
                      >
                        <option value="">{t('selectCategory')}</option>
                        {categories.map((cat) => (
                          <option key={cat.id || cat.name} value={cat.name}>
                            {cat.name}
                          </option>
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
                      placeholder={companiesLoading ? t('loadingCompanies') : t('companySearchPlaceholder')}
                      onAddCompany={openCompanyRequest}
                      showAddCompanyButton
                      addCompanyLabel={t('addCompany')}
                      addCompanyOptionLabel={(companyName) => `${t('addCompany')} “${companyName}”`}
                      loadingLabel={t('loadingCompanies')}
                      loading={companiesLoading}
                    />
                  </div>

                  <div className="complaint-form-grid">
                    <label className="field">
                      <span>{t('productModel')} *</span>
                      <input
                        name="model"
                        value={form.model}
                        onChange={handleFieldChange}
                        placeholder={t('modelPlaceholder')}
                        className={errors.model ? 'is-invalid' : ''}
                      />
                      {errors.model && <small className="field-error">{errors.model}</small>}
                    </label>

                    <label className="field">
                      <span>{t('seller')} *</span>
                      <input
                        name="seller"
                        value={form.seller}
                        onChange={handleFieldChange}
                        placeholder={t('sellerPlaceholder')}
                        className={errors.seller ? 'is-invalid' : ''}
                      />
                      {errors.seller && <small className="field-error">{errors.seller}</small>}
                    </label>
                  </div>

                  <div className="complaint-form-grid">
                    <LocationAutocomplete
                      label={`${t('incidentLocation')} *`}
                      value={form.location}
                      onChange={(location) => {
                        setForm((prev) => ({ ...prev, location }));
                        setErrors((prev) => ({ ...prev, location: '' }));
                      }}
                      placeholder={t('locationPlaceholder')}
                      error={errors.location}
                    />

                    <label className="field">
                      <span>{t('complaintTitle')} *</span>
                      <input
                        name="title"
                        value={form.title}
                        onChange={handleFieldChange}
                        placeholder={t('titlePlaceholder')}
                        className={errors.title ? 'is-invalid' : ''}
                      />
                      {errors.title && <small className="field-error">{errors.title}</small>}
                    </label>
                  </div>

                  <label className="field field--full">
                    <span>{t('fullDetails')} *</span>
                    <textarea
                      name="description"
                      rows={4}
                      value={form.description}
                      onChange={handleFieldChange}
                      placeholder={t('detailsPlaceholder')}
                      className={errors.description ? 'is-invalid' : ''}
                    />
                    {errors.description && <small className="field-error">{errors.description}</small>}
                  </label>
                </>
              ) : (
                <>
                  <div className="complaint-form-grid">
                    <label className="field">
                      <span>{t('serviceType')} *</span>
                      <select
                        name="serviceType"
                        value={form.serviceType}
                        onChange={handleServiceTypeChange}
                        className={errors.serviceType ? 'is-invalid' : ''}
                      >
                        <option value="">{t('selectServiceType')}</option>
                        {form.category && SERVICE_TYPE_OPTIONS.some((opt) => opt.category.toLowerCase() === form.category.toLowerCase()) && (
                          <optgroup label={`Recommended for ${form.category}`}>
                            {SERVICE_TYPE_OPTIONS.filter((opt) => opt.category.toLowerCase() === form.category.toLowerCase()).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.icon} {opt.label}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label={form.category ? 'Other Service Types' : 'All Service Types'}>
                          {SERVICE_TYPE_OPTIONS.filter((opt) => !form.category || opt.category.toLowerCase() !== form.category.toLowerCase()).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.icon} {opt.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      {errors.serviceType && <small className="field-error">{errors.serviceType}</small>}
                    </label>

                    <label className="field">
                      <span>{t('category')} *</span>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleServiceCategoryChange}
                        className={errors.category ? 'is-invalid' : ''}
                      >
                        <option value="">{t('selectCategory')}</option>
                        {categories.map((cat) => (
                          <option key={cat.id || cat.name} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      {errors.category && <small className="field-error">{errors.category}</small>}
                    </label>
                  </div>

                  <div className="complaint-form-grid">
                    <CompanySelector
                      companies={companies}
                      value={form.company}
                      onChange={(company) => {
                        setForm((prev) => ({ ...prev, company }));
                        setErrors((prev) => ({ ...prev, company: '' }));
                      }}
                      error={errors.company}
                      label={`${t('serviceProviderName')} *`}
                      placeholder={companiesLoading ? t('loadingCompanies') : t('serviceProviderPlaceholder')}
                      onAddCompany={openCompanyRequest}
                      showAddCompanyButton
                      addCompanyLabel="+ Add Service Provider"
                      addCompanyOptionLabel={(name) => `+ Add Service Provider “${name}”`}
                      loadingLabel={t('loadingCompanies')}
                      loading={companiesLoading}
                    />

                    <label className="field">
                      <span>{t('serviceDetails')} *</span>
                      <input
                        name="model"
                        value={form.model}
                        onChange={handleFieldChange}
                        placeholder={t('serviceDetailsPlaceholder')}
                        className={errors.model ? 'is-invalid' : ''}
                      />
                      {errors.model && <small className="field-error">{errors.model}</small>}
                    </label>
                  </div>

                  <div className="complaint-form-grid">
                    <LocationAutocomplete
                      label={`${t('incidentLocation')} *`}
                      value={form.location}
                      onChange={(location) => {
                        setForm((prev) => ({ ...prev, location }));
                        setErrors((prev) => ({ ...prev, location: '' }));
                      }}
                      placeholder={t('locationPlaceholder')}
                      error={errors.location}
                    />

                    <label className="field">
                      <span>{t('complaintTitle')} *</span>
                      <input
                        name="title"
                        value={form.title}
                        onChange={handleFieldChange}
                        placeholder={t('titlePlaceholder')}
                        className={errors.title ? 'is-invalid' : ''}
                      />
                      {errors.title && <small className="field-error">{errors.title}</small>}
                    </label>
                  </div>

                  <label className="field field--full">
                    <span>{t('fullDetails')} *</span>
                    <textarea
                      name="description"
                      rows={4}
                      value={form.description}
                      onChange={handleFieldChange}
                      placeholder={t('detailsPlaceholder')}
                      className={errors.description ? 'is-invalid' : ''}
                    />
                    {errors.description && <small className="field-error">{errors.description}</small>}
                  </label>
                </>
              )}

              {/* MANDATORY EVIDENCE SECTION */}
              <div className="evidence-section">
                <div className="evidence-section__header">
                  <h3>{t('requiredEvidence')}</h3>
                  <p>{t('evidenceNotice')}</p>
                </div>

                <div className="evidence-upload-grid">
                  {/* 1. Product / Service Photo */}
                  <ComplaintUploadField
                    id="productImage"
                    name="productImage"
                    label={form.type === 'Service' ? t('servicePhoto') : t('productPhoto')}
                    helper={t('photoLimits')}
                    accept={IMAGE_ACCEPT}
                    kind="image"
                    file={mediaFiles.productImage}
                    error={errors.productImage}
                    onChange={(file, err) => {
                      setMediaFiles((prev) => ({ ...prev, productImage: file }));
                      setErrors((prev) => ({ ...prev, productImage: err || '' }));
                    }}
                    onRemove={() => setMediaFiles((prev) => ({ ...prev, productImage: null }))}
                  />

                  {/* 2. Bill / Purchase Proof */}
                  <ComplaintUploadField
                    id="billImage"
                    name="billImage"
                    label={t('billProof')}
                    helper={t('billLimits')}
                    accept={IMAGE_ACCEPT}
                    kind="image"
                    file={mediaFiles.billImage}
                    error={errors.billImage}
                    onChange={(file, err) => {
                      setMediaFiles((prev) => ({ ...prev, billImage: file }));
                      setErrors((prev) => ({ ...prev, billImage: err || '' }));
                    }}
                    onRemove={() => setMediaFiles((prev) => ({ ...prev, billImage: null }))}
                  />

                  {/* 3. Product / Service Video */}
                  <ComplaintUploadField
                    id="productVideo"
                    name="productVideo"
                    label={form.type === 'Service' ? t('serviceVideo') : t('productVideo')}
                    helper={t('videoLimits')}
                    accept={VIDEO_ACCEPT}
                    kind="video"
                    file={mediaFiles.productVideo}
                    error={errors.productVideo}
                    onChange={(file, err) => {
                      setMediaFiles((prev) => ({ ...prev, productVideo: file }));
                      setErrors((prev) => ({ ...prev, productVideo: err || '' }));
                    }}
                    onRemove={() => setMediaFiles((prev) => ({ ...prev, productVideo: null }))}
                  />
                </div>
              </div>

              {submitError && (
                <div className="complaint-submit-error" role="alert">
                  {submitError}
                </div>
              )}

              <div className="complaint-form-actions complaint-form-actions--split">
                <button
                  type="button"
                  className="submit-button submit-button--ghost"
                  onClick={() => {
                    setStep(1);
                    try {
                      localStorage.setItem(COMPLAINT_STEP_KEY, '1');
                    } catch {}
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  {t('backBtn')}
                </button>
                <button
                  type="submit"
                  className="submit-button submit-button--orange"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('submittingComplaint') : t('submitBtn')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Request to Add a New Company */}
        {addCompanyOpen && (
          <div className="modal-backdrop" onClick={() => setAddCompanyOpen(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{t('requestCompanyHeading')}</h2>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setAddCompanyOpen(false)}
                  aria-label={t('closeDialog')}
                >
                  ×
                </button>
              </div>
              <p className="modal-description">{t('requestCompanyDesc')}</p>

              <form onSubmit={handleCompanyRequestSubmit} className="modal-form">
                <label className="field">
                  <span>{t('companyNamePlaceholder')} *</span>
                  <input
                    type="text"
                    value={reqCompanyName}
                    onChange={(e) => setReqCompanyName(e.target.value)}
                    placeholder={t('companySearchPlaceholder')}
                    required
                  />
                </label>

                <label className="field">
                  <span>{t('selectCatForBrand')}</span>
                  <select
                    value={reqCategoryId}
                    onChange={(e) => setReqCategoryId(e.target.value)}
                  >
                    <option value="">{t('selectCategory')}</option>
                    {categories.map((c) => (
                      <option key={c.id || c.name} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>{t('companyNotesPlaceholder')}</span>
                  <textarea
                    rows={2}
                    value={reqDescription}
                    onChange={(e) => setReqDescription(e.target.value)}
                    placeholder={t('companyNotesInputPlaceholder')}
                  />
                </label>

                {reqError && <small className="field-error">{reqError}</small>}
                {reqSuccess && <small className="field-hint" style={{ color: '#16a34a' }}>{reqSuccess}</small>}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="ghost-cta"
                    onClick={() => setAddCompanyOpen(false)}
                  >
                    {t('closeRequestForm')}
                  </button>
                  <button
                    type="submit"
                    className="primary-cta"
                    disabled={reqSubmitting}
                  >
                    {reqSubmitting ? t('submittingRequest') : t('submitBrandReq')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
