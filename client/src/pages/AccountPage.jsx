import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { useAccount } from '../context/AccountContext.jsx';
import { getAssetUrl, getErrorMessage, getMyComplaints, loginAccount, logoutAccount, registerAccount } from '../services/api.js';

export default function AccountPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const redirect = searchParams.get('redirect');
  const requestedMode = searchParams.get('mode');

  const { account, setAccount, status } = useAccount();
  const [mode, setMode] = useState(requestedMode === 'register' ? 'register' : 'login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // My Complaints state
  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintsError, setComplaintsError] = useState('');

  useEffect(() => {
    if (account) {
      setLoadingComplaints(true);
      setComplaintsError('');
      getMyComplaints()
        .then((data) => {
          setMyComplaints(data || []);
        })
        .catch(() => {
          setComplaintsError('Could not load your complaints.');
        })
        .finally(() => {
          setLoadingComplaints(false);
        });
    }
  }, [account]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    const val = type === 'checkbox' ? checked : value;
    setForm((current) => ({ ...current, [name]: val }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setError('');
  }

  function validate() {
    const errors = {};

    if (mode === 'register') {
      const name = form.name.trim();
      if (!name) {
        errors.name = 'Full Name is required.';
      } else if (name.length < 2) {
        errors.name = 'Full Name must be at least 2 characters.';
      } else if (name.length > 80) {
        errors.name = 'Full Name cannot exceed 80 characters.';
      }

      const phoneClean = form.phone.trim().replace(/[\s\-\(\)]/g, '');
      if (!phoneClean) {
        errors.phone = 'Phone number is required.';
      } else if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(phoneClean)) {
        errors.phone = 'Please enter a valid 10-digit Indian phone number.';
      }

      if (!form.termsAccepted) {
        errors.termsAccepted = 'You must accept the Terms & Conditions to register.';
      }

      if (!form.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password.';
      } else if (form.password !== form.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    }

    const email = form.email.trim();
    if (!email) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!form.password) {
      errors.password = 'Password is required.';
    } else if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const signedInAccount = mode === 'register'
        ? await registerAccount({
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            password: form.password,
            confirmPassword: form.confirmPassword,
            termsAccepted: form.termsAccepted,
          })
        : await loginAccount({
            email: form.email.trim().toLowerCase(),
            password: form.password,
          });

      setAccount(signedInAccount);
      setForm({ name: '', email: '', phone: '', password: '', confirmPassword: '', termsAccepted: false });
      setFieldErrors({});

      if (redirect) {
        navigate(redirect);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to sign in. Please check your credentials.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setError('');
    setIsSubmitting(true);
    try {
      await logoutAccount();
      setAccount(null);
      setMode('login');
      setMyComplaints([]);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to sign out. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusBadge(complaintStatus) {
    const s = (complaintStatus || 'PENDING').toUpperCase();
    const styles = {
      PENDING: { background: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' },
      UNDER_REVIEW: { background: '#cce5ff', color: '#004085', border: '1px solid #b8daff' },
      COMPANY_RESPONDED: { background: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' },
      RESOLVED: { background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
      REJECTED: { background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' },
    };

    const currentStyle = styles[s] || styles.PENDING;
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 600,
          ...currentStyle,
        }}
      >
        {s.replace('_', ' ')}
      </span>
    );
  }

  return (
    <MainLayout>
      <section className="account-page" aria-labelledby="account-page-title">
        <p className="account-page__eyebrow">BadService.in</p>
        {status === 'loading' && <p role="status">Checking your account...</p>}

        {status === 'ready' && account && (
          <div className="account-page__signed-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 id="account-page-title" style={{ margin: 0 }}>Welcome, {account.name}</h1>
                <p style={{ margin: '0.35rem 0' }}>
                  Signed in as <strong>{account.email}</strong>
                  {account.phone && <> &bull; Phone: <strong>{account.phone}</strong></>}
                  {' '}&bull; Role:{' '}
                  <span style={{ fontWeight: 600, color: account.role === 'ADMIN' ? '#d9534f' : '#0066cc' }}>
                    {account.role || 'USER'}
                  </span>
                </p>
              </div>

              {account.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    background: '#232f3e',
                    color: '#fff',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  ⚙️ Admin Dashboard
                </Link>
              )}
            </div>

            {error && <p className="account-form__error" role="alert">{error}</p>}

            <div className="account-page__actions" style={{ margin: '1.5rem 0' }}>
              <Link className="account-page__primary-link" to="/complaints">Browse complaints</Link>
              <Link to="/file-complaint">File a complaint</Link>
              <button type="button" onClick={handleLogout} disabled={isSubmitting}>
                {isSubmitting ? 'Signing out...' : 'Sign out'}
              </button>
            </div>

            {/* My Complaints Section */}
            <div style={{ marginTop: '2rem', borderTop: '1px solid #e0e0e0', paddingTop: '1.5rem' }}>
              <h2>My Filed Complaints</h2>
              {loadingComplaints && <p>Loading your complaints...</p>}
              {complaintsError && <p style={{ color: 'red' }}>{complaintsError}</p>}
              {!loadingComplaints && myComplaints.length === 0 && (
                <div style={{ padding: '1.5rem', background: '#f9f9f9', borderRadius: '6px', textAlign: 'center' }}>
                  <p>You have not filed any complaints yet.</p>
                  <Link to="/file-complaint" style={{ color: '#0066cc', fontWeight: 600 }}>+ File your first complaint</Link>
                </div>
              )}

              {!loadingComplaints && myComplaints.length > 0 && (
                <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ddd', background: '#f5f5f5' }}>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Complaint</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Company</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Category</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Date</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Status</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Proof</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myComplaints.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '0.6rem 0.8rem', fontWeight: 500 }}>
                            <Link to={`/complaints/${encodeURIComponent(c.id)}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                              {c.title}
                            </Link>
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>{c.company}</td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            {c.category} {c.subcategory && <small style={{ color: '#666' }}>({c.subcategory})</small>}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem', color: '#666' }}>
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent'}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>{getStatusBadge(c.status)}</td>
                          <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                            {c.proofUrl ? (
                              <a href={getAssetUrl(c.proofUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc' }}>
                                View Proof
                              </a>
                            ) : (
                              <span style={{ color: '#999' }}>None</span>
                            )}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            <Link to={`/complaints/${encodeURIComponent(c.id)}`} style={{ fontSize: '0.85rem', color: '#0066cc' }}>
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'ready' && !account && (
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <h1 id="account-page-title">{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
            <p className="account-page__intro">
              {mode === 'login' ? 'Access your BadService.in account to view or file complaints.' : 'Create an account to track and verify your complaints.'}
            </p>

            {redirect && (
              <div style={{ padding: '0.75rem', background: '#e8f4fd', border: '1px solid #b6d4fe', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem', color: '#084298' }}>
                ℹ️ Please sign in or register to proceed to <strong>{redirect.replace('/', '')}</strong>.
              </div>
            )}

            {error && <p className="account-form__error" role="alert">{error}</p>}

            <form className="account-form" onSubmit={handleSubmit} noValidate>
              {mode === 'register' && (
                <>
                  <div className="account-form__field">
                    <label htmlFor="account-name">Full Name <span style={{ color: 'red' }}>*</span></label>
                    <input
                      id="account-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      maxLength={80}
                      value={form.name}
                      onChange={handleChange}
                      placeholder="name@gmail.com"
                      required
                    />
                    {fieldErrors.name && <span style={{ color: '#d9534f', fontSize: '0.8rem', marginTop: '0.2rem' }}>{fieldErrors.name}</span>}
                  </div>

                  <div className="account-form__field">
                    <label htmlFor="account-phone">Mobile Number <span style={{ color: 'red' }}>*</span></label>
                    <input
                      id="account-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={15}
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      required
                    />
                    {fieldErrors.phone && <span style={{ color: '#d9534f', fontSize: '0.8rem', marginTop: '0.2rem' }}>{fieldErrors.phone}</span>}
                  </div>
                </>
              )}

              <div className="account-form__field">
                <label htmlFor="account-email">Email Address <span style={{ color: 'red' }}>*</span></label>
                <input
                  id="account-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  required
                />
                {fieldErrors.email && <span style={{ color: '#d9534f', fontSize: '0.8rem', marginTop: '0.2rem' }}>{fieldErrors.email}</span>}
              </div>

              <div className="account-form__field">
                <label htmlFor="account-password">Password <span style={{ color: 'red' }}>*</span></label>
                <input
                  id="account-password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={8}
                  maxLength={128}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  required
                />
                {fieldErrors.password && <span style={{ color: '#d9534f', fontSize: '0.8rem', marginTop: '0.2rem' }}>{fieldErrors.password}</span>}
              </div>

              {mode === 'register' && (
                <>
                  <div className="account-form__field">
                    <label htmlFor="account-confirm-password">Confirm Password <span style={{ color: 'red' }}>*</span></label>
                    <input
                      id="account-confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      required
                    />
                    {fieldErrors.confirmPassword && <span style={{ color: '#d9534f', fontSize: '0.8rem', marginTop: '0.2rem' }}>{fieldErrors.confirmPassword}</span>}
                  </div>

                  <div style={{ marginTop: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <input
                      id="account-terms"
                      name="termsAccepted"
                      type="checkbox"
                      checked={form.termsAccepted}
                      onChange={handleChange}
                      style={{ marginTop: '0.25rem', width: 'auto' }}
                      required
                    />
                    <label htmlFor="account-terms" style={{ fontSize: '0.85rem', color: '#555', cursor: 'pointer' }}>
                      I agree to the <Link to="/help" target="_blank" style={{ color: '#0066cc' }}>Terms &amp; Conditions</Link> and certify that any complaints I submit represent truthful factual experiences.
                    </label>
                  </div>
                  {fieldErrors.termsAccepted && <p style={{ color: '#d9534f', fontSize: '0.8rem', margin: '-0.5rem 0 1rem 0' }}>{fieldErrors.termsAccepted}</p>}
                </>
              )}

              <button className="account-form__submit" type="submit" disabled={isSubmitting} style={{ width: '100%', marginTop: '0.5rem' }}>
                {isSubmitting
                  ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                  : (mode === 'login' ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="account-page__switch" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              {mode === 'login' ? (
                <p>
                  New to BadService.in?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(''); setFieldErrors({}); }}
                    style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Create your account
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); setFieldErrors({}); }}
                    style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </MainLayout>
  );
}