import { useEffect, useMemo, useState } from 'react';
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
  uploadDraftMedia,
} from '../services/api.js';
import { IMAGE_ACCEPT, VIDEO_ACCEPT } from '../utils/complaintMedia.js';
import { getTranslation } from '../utils/FileComplaintTranslations.js';

const emptyMedia = { productImage: null, productImage2: null, productImage3: null, billImage: null, productVideo: null };

const SERVICE_KEYWORDS = [
  'hospital', 'clinic', 'healthcare', 'medical', 'health',
  'hotel', 'resort', 'stay', 'inn', 'lodge', 'oyo',
  'flight', 'airline', 'airways', 'indigo', 'spicejet', 'air india', 'vistara', 'train', 'railway', 'irctc',
  'restaurant', 'cafe', 'dine', 'dining', 'food delivery', 'swiggy', 'zomato', 'eats',
  'bank', 'finance', 'banking', 'insurance', 'loan', 'upi', 'paytm', 'phonepe', 'gpay', 'sbi', 'hdfc', 'icici', 'axis',
  'telecom', 'network', 'broadband', 'internet', 'airtel', 'jio', 'vi ', 'bsnl',
  'courier', 'delivery', 'logistics', 'dtdc', 'bluedart', 'delhivery', 'shadowfax', 'fedex',
  'service center', 'repair service', 'coaching', 'academy', 'school', 'college', 'university', 'consultancy',
];

const SERVICE_CATEGORY_SLUGS = [
  'hospital-healthcare', 'flights-trains', 'hotel-travel', 'hotels', 'hospitals', 'flights',
  'services', 'banking-finance', 'telecom-internet', 'restaurants-food',
];

export function isServiceCompany(company) {
  if (!company) return false;
  const name = (company.name || '').toLowerCase();
  const cat = (company.category || company.categoryId || company.category_id || '').toLowerCase();

  if (SERVICE_CATEGORY_SLUGS.some((slug) => cat.includes(slug))) return true;
  if (SERVICE_KEYWORDS.some((kw) => name.includes(kw))) return true;
  return false;
}

export const PRODUCT_CATEGORIES = [
  'Mobiles & Smartphones',
  'Computers & Laptops',
  'TV & Electronics',
  'Fashion & Apparel',
  'Vehicles & Automotive',
  'Home & Kitchen Appliances',
  'Audio & Accessories',
  'Other Products',
];

export const SERVICE_CATEGORIES = [
  'Hospital & Healthcare',
  'Hotel, Resort & Stay',
  'Flights & Trains',
  'Restaurants & Food',
  'Banking & Finance',
  'Telecom & Internet',
  'Vehicle Service & Repair',
  'Appliance Repair & Service',
  'Courier & Delivery',
  'Education & Coaching',
  'Other Professional Services',
];

export const SERVICE_TYPE_OPTIONS = [
  { value: 'Hospital', label: 'Hospital / Clinic / Medical', icon: '🏥', category: 'Hospital & Healthcare' },
  { value: 'Hotel', label: 'Hotel / Resort / Stay', icon: '🏨', category: 'Hotel, Resort & Stay' },
  { value: 'Flight', label: 'Flight / Airline', icon: '✈️', category: 'Flights & Trains' },
  { value: 'Train', label: 'Train / Railway', icon: '🚆', category: 'Flights & Trains' },
  { value: 'Restaurant', label: 'Restaurant / Dining', icon: '🍽️', category: 'Restaurants & Food' },
  { value: 'Food Delivery', label: 'Food Delivery (Swiggy, Zomato, etc.)', icon: '🛵', category: 'Restaurants & Food' },
  { value: 'Vehicle Service', label: 'Vehicle Service / Garage / Repair', icon: '🚗', category: 'Vehicle Service & Repair' },
  { value: 'Bank', label: 'Bank / Loan / Finance / UPI', icon: '🏦', category: 'Banking & Finance' },
  { value: 'Telecom', label: 'Telecom / Mobile Network / ISP', icon: '📞', category: 'Telecom & Internet' },
  { value: 'Appliance Repair', label: 'Appliance Repair / Service Center', icon: '📺', category: 'Appliance Repair & Service' },
  { value: 'Courier / Delivery', label: 'Courier / Parcel Delivery', icon: '📦', category: 'Courier & Delivery' },
  { value: 'Education', label: 'Education / Coaching / College', icon: '🎓', category: 'Education & Coaching' },
  { value: 'Other Services', label: 'Other Professional Services', icon: '🛠️', category: 'Other Professional Services' },
];

const USER_IDENTITY_KEY = 'badservice_user_identity_session';
const COMPLAINT_DRAFT_KEY = 'badservice_complaint_draft_session';
const COMPLAINT_STEP_KEY = 'badservice_complaint_step_session';
const USER_VERIFIED_OTP_KEY = 'badservice_user_verified_otp_session';
const UPLOADED_MEDIA_KEY = 'badservice_uploaded_media_session';

export default function FileComplaintPage() {
  const navigate = useNavigate();
  const { account } = useAccount();
  const [lang, setLang] = useState(() => localStorage.getItem('badservice_lang') === 'ml' ? 'ml' : 'en');
  const t = (key) => getTranslation(lang, key);
  const [copiedId, setCopiedId] = useState(false);

  // Clear legacy localStorage data so reopening the browser starts with completely empty fields & OTP
  useEffect(() => {
    try {
      localStorage.removeItem('badservice_user_identity');
      localStorage.removeItem('badservice_user_verified_otp');
      localStorage.removeItem('badservice_complaint_step');
      localStorage.removeItem('badservice_complaint_draft');
      localStorage.removeItem('badservice_complaint_uploaded_media');
    } catch {}
  }, []);

  function handleStep1BackAndUnfill() {
    setIdentity({
      fullName: '',
      phone: '',
      email: '',
      city: '',
      pincode: '',
      address: '',
      terms: false,
    });
    setOtpResult(null);
    setErrors({});
    try {
      sessionStorage.removeItem(USER_IDENTITY_KEY);
      sessionStorage.removeItem(USER_VERIFIED_OTP_KEY);
      sessionStorage.removeItem(COMPLAINT_STEP_KEY);
      sessionStorage.removeItem(COMPLAINT_DRAFT_KEY);
      sessionStorage.removeItem(UPLOADED_MEDIA_KEY);
    } catch {}
    navigate(-1);
  }

  const [step, setStep] = useState(() => {
    try {
      const savedStep = sessionStorage.getItem(COMPLAINT_STEP_KEY);
      if (savedStep === '2') return 2;
    } catch {}
    return 1;
  });
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  const productCompanies = useMemo(() => {
    return companies.filter((c) => !isServiceCompany(c));
  }, [companies]);

  const serviceCompanies = useMemo(() => {
    return companies.filter((c) => isServiceCompany(c));
  }, [companies]);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [otpResult, setOtpResult] = useState(() => {
    try {
      const savedOtp = sessionStorage.getItem(USER_VERIFIED_OTP_KEY);
      if (savedOtp) return JSON.parse(savedOtp);
    } catch {}
    return null;
  });

  // Transient Session Identity (stays while website is open, cleared on browser close/reopen)
  const [identity, setIdentity] = useState(() => {
    try {
      const saved = sessionStorage.getItem(USER_IDENTITY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          fullName: parsed.fullName || '',
          phone: parsed.phone || '',
          email: parsed.email || '',
          city: parsed.city || '',
          pincode: parsed.pincode || '',
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
      pincode: '',
      address: '',
      terms: false,
    };
  });

  // Transient Session Complaint Draft (stays while website is open, cleared on browser close/reopen)
  const [form, setForm] = useState(() => {
    try {
      const saved = sessionStorage.getItem(COMPLAINT_DRAFT_KEY);
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

  // Autosave and Loading % State (Points 4 & 5)
  const [uploadProgress, setUploadProgress] = useState({
    productImage: 0,
    productImage2: 0,
    productImage3: 0,
    billImage: 0,
    productVideo: 0,
  });
  const [uploadStatus, setUploadStatus] = useState({
    productImage: 'idle',
    productImage2: 'idle',
    productImage3: 'idle',
    billImage: 'idle',
    productVideo: 'idle',
  });
  const [uploadedMedia, setUploadedMedia] = useState(() => {
    try {
      const saved = sessionStorage.getItem(UPLOADED_MEDIA_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  function handleMediaSelect(kind, file, validationError = '') {
    if (validationError) {
      setErrors((prev) => ({ ...prev, [kind]: validationError }));
      return;
    }
    setErrors((prev) => ({ ...prev, [kind]: '' }));
    setMediaFiles((prev) => ({ ...prev, [kind]: file }));

    if (!file) {
      setUploadedMedia((prev) => {
        const next = { ...prev };
        delete next[kind];
        try { sessionStorage.setItem(UPLOADED_MEDIA_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
      setUploadStatus((prev) => ({ ...prev, [kind]: 'idle' }));
      setUploadProgress((prev) => ({ ...prev, [kind]: 0 }));
      return;
    }

    // Realistic upload progress: scale to 85% during data transfer, 100% on confirmation
    setUploadStatus((prev) => ({ ...prev, [kind]: 'uploading' }));
    setUploadProgress((prev) => ({ ...prev, [kind]: 10 }));

    uploadDraftMedia(file, kind, (percent) => {
      const scaled = Math.min(85, Math.max(10, Math.round(percent * 0.85)));
      setUploadProgress((prev) => ({ ...prev, [kind]: scaled }));
    })
      .then((data) => {
        setUploadedMedia((prev) => {
          const next = { ...prev, [kind]: data };
          try { sessionStorage.setItem(UPLOADED_MEDIA_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
        setUploadStatus((prev) => ({ ...prev, [kind]: 'done' }));
        setUploadProgress((prev) => ({ ...prev, [kind]: 100 }));
      })
      .catch((err) => {
        console.warn('Media upload issue:', err);
        setUploadStatus((prev) => ({ ...prev, [kind]: 'error' }));
      });
  }

  // Persist language
  useEffect(() => {
    localStorage.setItem('badservice_lang', lang);
    window.dispatchEvent(new Event('badservice-language-change'));
  }, [lang]);

  // Persist user identity in sessionStorage for this open browsing session
  useEffect(() => {
    try {
      sessionStorage.setItem(USER_IDENTITY_KEY, JSON.stringify(identity));
    } catch {}
  }, [identity]);

  // Persist complaint draft details in sessionStorage for this open browsing session
  useEffect(() => {
    try {
      sessionStorage.setItem(COMPLAINT_DRAFT_KEY, JSON.stringify(form));
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

  // Requirement 4: Service type and main category are separate, not auto-filled
  function handleServiceTypeChange(event) {
    const nextServiceType = event.target.value;
    setForm((prev) => ({ ...prev, serviceType: nextServiceType }));
    setErrors((prev) => ({ ...prev, serviceType: '' }));
  }

  function handleServiceCategoryChange(event) {
    const nextCategory = event.target.value;
    setForm((prev) => ({ ...prev, category: nextCategory }));
    setErrors((prev) => ({ ...prev, category: '' }));
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
    if (!identity.pincode || !identity.pincode.trim()) {
      nextErrors.pincode = t('errPincode');
    } else if (!/^\d{6}$/.test(identity.pincode.trim().replace(/\s+/g, ''))) {
      nextErrors.pincode = t('errPincodeInv');
    }
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
      if (!form.company.trim()) nextErrors.company = t('errServiceProvider');
      if (!form.model.trim()) nextErrors.model = t('errServiceDetails');
    }
    if (!form.location.trim()) nextErrors.location = t('errLocation');
    if (!form.title.trim()) nextErrors.title = t('errTitleReq');
    else if (form.title.trim().length < 5) nextErrors.title = t('errTitleLen');
    if (!form.description.trim()) nextErrors.description = t('errDescReq');
    else if (form.description.trim().length < 20) nextErrors.description = t('errDescLen');

    // All 3 evidence files are strictly mandatory (either File object or autosaved media)
    if (!mediaFiles.productImage && !uploadedMedia.productImage) nextErrors.productImage = t('errProductImage');
    if (!mediaFiles.billImage && !uploadedMedia.billImage) nextErrors.billImage = t('errBillImage');
    if (!mediaFiles.productVideo && !uploadedMedia.productVideo) nextErrors.productVideo = t('errProductVideo');

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext(event) {
    event.preventDefault();
    if (validateStep1()) {
      setStep(2);
      try {
        sessionStorage.setItem(COMPLAINT_STEP_KEY, '2');
      } catch {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateStep2() || isSubmitting) return;

    // Check if any file is still actively uploading
    const isUploading = Object.values(uploadStatus).some((s) => s === 'uploading');
    if (isUploading) {
      setSubmitError('Please wait a moment while evidence files finish uploading…');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      let complaint;
      // If all 3 media files are already uploaded, submit instantaneously via fast JSON
      if (uploadedMedia.productImage?.url && uploadedMedia.billImage?.url && uploadedMedia.productVideo?.url) {
        const payload = {
          fullName: identity.fullName.trim(),
          email: identity.email.trim(),
          phone: identity.phone.trim(),
          city: identity.city.trim(),
          pincode: identity.pincode.trim(),
          address: identity.address.trim(),
          verificationToken: otpResult.verificationToken,
          verificationMethod: 'phone',
          type: form.type,
          category: form.category.trim(),
          company: form.company.trim(),
          serviceType: form.serviceType.trim(),
          model: form.model.trim(),
          seller: (form.type === 'Service' ? form.company : form.seller).trim(),
          location: form.location.trim(),
          title: form.title.trim(),
          description: form.description.trim(),
          productImageUrl: uploadedMedia.productImage.url,
          productImageName: uploadedMedia.productImage.name,
          productImages: [
            uploadedMedia.productImage ? { url: uploadedMedia.productImage.url, name: uploadedMedia.productImage.name } : null,
            uploadedMedia.productImage2 ? { url: uploadedMedia.productImage2.url, name: uploadedMedia.productImage2.name } : null,
            uploadedMedia.productImage3 ? { url: uploadedMedia.productImage3.url, name: uploadedMedia.productImage3.name } : null,
          ].filter(Boolean),
          billImageUrl: uploadedMedia.billImage.url,
          billImageName: uploadedMedia.billImage.name,
          productVideoUrl: uploadedMedia.productVideo.url,
          productVideoName: uploadedMedia.productVideo.name,
        };
        complaint = await createComplaint(payload);
      } else {
        // Fallback to multipart FormData
        const formData = new FormData();
        formData.append('fullName', identity.fullName.trim());
        formData.append('email', identity.email.trim());
        formData.append('phone', identity.phone.trim());
        formData.append('city', identity.city.trim());
        formData.append('pincode', identity.pincode.trim());
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

        if (uploadedMedia.productImage?.url) {
          formData.append('productImageUrl', uploadedMedia.productImage.url);
          formData.append('productImageName', uploadedMedia.productImage.name);
        } else if (mediaFiles.productImage) {
          formData.append('productImage', mediaFiles.productImage);
        }

        if (uploadedMedia.productImage2?.url) {
          formData.append('productImage2Url', uploadedMedia.productImage2.url);
          formData.append('productImage2Name', uploadedMedia.productImage2.name);
        } else if (mediaFiles.productImage2) {
          formData.append('productImage2', mediaFiles.productImage2);
        }

        if (uploadedMedia.productImage3?.url) {
          formData.append('productImage3Url', uploadedMedia.productImage3.url);
          formData.append('productImage3Name', uploadedMedia.productImage3.name);
        } else if (mediaFiles.productImage3) {
          formData.append('productImage3', mediaFiles.productImage3);
        }

        if (uploadedMedia.billImage?.url) {
          formData.append('billImageUrl', uploadedMedia.billImage.url);
          formData.append('billImageName', uploadedMedia.billImage.name);
        } else if (mediaFiles.billImage) {
          formData.append('billImage', mediaFiles.billImage);
        }

        if (uploadedMedia.productVideo?.url) {
          formData.append('productVideoUrl', uploadedMedia.productVideo.url);
          formData.append('productVideoName', uploadedMedia.productVideo.name);
        } else if (mediaFiles.productVideo) {
          formData.append('productVideo', mediaFiles.productVideo);
        }

        complaint = await createComplaint(formData);
      }

      try {
        sessionStorage.removeItem(COMPLAINT_DRAFT_KEY);
        sessionStorage.removeItem(COMPLAINT_STEP_KEY);
        sessionStorage.removeItem(UPLOADED_MEDIA_KEY);
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

            {/* Requirement 12: Notice that Complaint ID is mandatory for tracking and private to user */}
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1.5px solid #fef08a',
                borderRadius: '12px',
                padding: '16px 18px',
                margin: '18px 0',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.1rem' }}>📌</span>
                <strong style={{ color: '#854d0e', fontSize: '0.95rem' }}>
                  Please Note Down Your Complaint Reference ID
                </strong>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '0.86rem', color: '#713f12', lineHeight: 1.45 }}>
                Your <strong>Complaint Reference ID</strong> or your registered <strong>Mobile Number</strong> is required to track the status and review updates of your complaint. This ID is private and is not displayed publicly to other visitors.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#451a03', fontWeight: 600 }}>Your ID:</span>
                <code
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #fde047',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#9a3412',
                    letterSpacing: '0.5px',
                  }}
                >
                  {submitted.id}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(submitted.id);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2500);
                  }}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#232f3e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {copiedId ? '✓ Copied to Clipboard!' : '📋 Copy Complaint ID'}
                </button>
              </div>
            </div>

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
                      sessionStorage.removeItem(USER_VERIFIED_OTP_KEY);
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
                    sessionStorage.setItem(USER_VERIFIED_OTP_KEY, JSON.stringify(verifiedData));
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

              <div className="complaint-form-grid">
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

                <label className="field">
                  <span>{t('pincode')} *</span>
                  <input
                    name="pincode"
                    value={identity.pincode}
                    maxLength={6}
                    onChange={handleIdentityChange}
                    autoComplete="postal-code"
                    placeholder={t('pincodePlaceholder')}
                    className={errors.pincode ? 'is-invalid' : ''}
                  />
                  {errors.pincode && <small className="field-error">{errors.pincode}</small>}
                </label>
              </div>

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
                onChange={(type) => {
                  setForm((prev) => ({
                    ...prev,
                    type,
                    category: '',
                    serviceType: '',
                    company: '',
                    model: '',
                  }));
                  setErrors((prev) => ({
                    ...prev,
                    category: '',
                    serviceType: '',
                    company: '',
                    model: '',
                  }));
                }}
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
                        {PRODUCT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      {errors.category && <small className="field-error">{errors.category}</small>}
                    </label>

                    <CompanySelector
                      companies={productCompanies}
                      value={form.company}
                      onChange={(company) => {
                        setForm((prev) => ({ ...prev, company }));
                        setErrors((prev) => ({ ...prev, company: '' }));
                      }}
                      error={errors.company}
                      label={`${t('company')} *`}
                      placeholder={companiesLoading ? t('loadingCompanies') : t('companySearchPlaceholder')}
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
                      <span>{t('category')} *</span>
                      <select
                        name="category"
                        value={form.category}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({ ...prev, category: val, serviceType: val }));
                          setErrors((prev) => ({ ...prev, category: '', serviceType: '' }));
                        }}
                        className={errors.category ? 'is-invalid' : ''}
                      >
                        <option value="">{t('selectCategory')}</option>
                        {SERVICE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      {errors.category && <small className="field-error">{errors.category}</small>}
                    </label>

                    <CompanySelector
                      companies={serviceCompanies}
                      value={form.company}
                      onChange={(company) => {
                        setForm((prev) => ({ ...prev, company }));
                        setErrors((prev) => ({ ...prev, company: '' }));
                      }}
                      error={errors.company}
                      label={`${t('serviceProviderName')} *`}
                      placeholder={companiesLoading ? t('loadingCompanies') : t('serviceProviderPlaceholder')}
                      loadingLabel={t('loadingCompanies')}
                      loading={companiesLoading}
                    />
                  </div>

                  <div className="complaint-form-grid">
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
                  </div>

                  <div className="complaint-form-grid">
                    <label className="field field--full">
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

              {/* MANDATORY EVIDENCE SECTION WITH AUTOSAVE & PROGRESS % */}
              <div className="evidence-section">
                <div className="evidence-section__header">
                  <h3>{t('requiredEvidence')}</h3>
                  <p>{t('evidenceNotice')} — <strong>⚡ Files autosave instantly as you select them for ultra-fast complaint submission!</strong></p>
                </div>

                <div className="evidence-upload-grid">
                  {/* 1. Product / Service Photo (Primary - Mandatory) */}
                  <ComplaintUploadField
                    id="productImage"
                    name="productImage"
                    label={form.type === 'Service' ? t('servicePhoto') : t('productPhoto')}
                    helper={t('photoLimits')}
                    accept={IMAGE_ACCEPT}
                    kind="image"
                    file={mediaFiles.productImage}
                    error={errors.productImage}
                    uploadProgress={uploadProgress.productImage}
                    uploadStatus={uploadStatus.productImage}
                    isAutosaved={Boolean(uploadedMedia.productImage)}
                    onChange={(file, err) => handleMediaSelect('productImage', file, err)}
                    onRemove={() => handleMediaSelect('productImage', null)}
                  />

                  {/* 1b. Additional Photo 2 (Optional) */}
                  <ComplaintUploadField
                    id="productImage2"
                    name="productImage2"
                    label={t('productPhoto2')}
                    helper="Optional extra photo (up to 3 total)"
                    accept={IMAGE_ACCEPT}
                    kind="image"
                    file={mediaFiles.productImage2}
                    error={errors.productImage2}
                    uploadProgress={uploadProgress.productImage2}
                    uploadStatus={uploadStatus.productImage2}
                    isAutosaved={Boolean(uploadedMedia.productImage2)}
                    onChange={(file, err) => handleMediaSelect('productImage2', file, err)}
                    onRemove={() => handleMediaSelect('productImage2', null)}
                  />

                  {/* 1c. Additional Photo 3 (Optional) */}
                  <ComplaintUploadField
                    id="productImage3"
                    name="productImage3"
                    label={t('productPhoto3')}
                    helper="Optional extra photo (up to 3 total)"
                    accept={IMAGE_ACCEPT}
                    kind="image"
                    file={mediaFiles.productImage3}
                    error={errors.productImage3}
                    uploadProgress={uploadProgress.productImage3}
                    uploadStatus={uploadStatus.productImage3}
                    isAutosaved={Boolean(uploadedMedia.productImage3)}
                    onChange={(file, err) => handleMediaSelect('productImage3', file, err)}
                    onRemove={() => handleMediaSelect('productImage3', null)}
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
                    uploadProgress={uploadProgress.billImage}
                    uploadStatus={uploadStatus.billImage}
                    isAutosaved={Boolean(uploadedMedia.billImage)}
                    onChange={(file, err) => handleMediaSelect('billImage', file, err)}
                    onRemove={() => handleMediaSelect('billImage', null)}
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
                    uploadProgress={uploadProgress.productVideo}
                    uploadStatus={uploadStatus.productVideo}
                    isAutosaved={Boolean(uploadedMedia.productVideo)}
                    onChange={(file, err) => handleMediaSelect('productVideo', file, err)}
                    onRemove={() => handleMediaSelect('productVideo', null)}
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
                      sessionStorage.setItem(COMPLAINT_STEP_KEY, '1');
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
      </div>
    </MainLayout>
  );
}
