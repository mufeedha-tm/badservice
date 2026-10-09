import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { useAccount } from '../context/AccountContext.jsx';
import {
  getAssetUrl,
  getErrorMessage,
  getMyComplaints,
  loginAccount,
  logoutAccount,
  registerAccount,
  requestDeleteComplaint,
} from '../services/api.js';

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

  // My Complaints & Tracking / Delete Request state
  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintsError, setComplaintsError] = useState('');
  const [viewComplaintModal, setViewComplaintModal] = useState(null);
  const [deleteModalComplaint, setDeleteModalComplaint] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');

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

  async function submitDeleteRequest(e) {
    e.preventDefault();
    if (!deleteModalComplaint) return;
    setDeleteSubmitting(true);
    try {
      await requestDeleteComplaint(deleteModalComplaint.id, deleteReason.trim());
      setMyComplaints((prev) =>
        prev.map((c) =>
          c.id === deleteModalComplaint.id
            ? { ...c, deleteRequested: true, deleteReason: deleteReason.trim() }
            : c
        )
      );
      if (viewComplaintModal?.id === deleteModalComplaint.id) {
        setViewComplaintModal((prev) => ({
          ...prev,
          deleteRequested: true,
          deleteReason: deleteReason.trim(),
        }));
      }
      setDeleteModalComplaint(null);
      setDeleteReason('');
      setDeleteSuccessMsg('Your deletion request has been submitted. An administrator will review and approve it.');
      setTimeout(() => setDeleteSuccessMsg(''), 6000);
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to submit deletion request.'));
    } finally {
      setDeleteSubmitting(false);
    }
  }

  function getStatusBadge(complaintStatus, deleteRequested = false) {
    if (deleteRequested) {
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#ffebee',
            color: '#c62828',
            border: '1px solid #ffcdd2',
          }}
        >
          Deletion Requested
        </span>
      );
    }

    const s = (complaintStatus || 'PENDING').toUpperCase();
    const styles = {
      PENDING: { background: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' },
      APPROVED: { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9' },
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
        {s === 'APPROVED' ? 'APPROVED & LIVE' : s.replace('_', ' ')}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0 }}>My Filed Complaints & Updates</h2>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.88rem', color: '#666' }}>
                    Track status updates, reviews, and manage your filed complaints.
                  </p>
                </div>
                <Link to="/file-complaint" style={{ padding: '0.4rem 0.8rem', background: '#e65100', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                  + File New Complaint
                </Link>
              </div>

              {deleteSuccessMsg && (
                <div style={{ padding: '0.75rem 1rem', background: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #c3e6cb', fontWeight: 500 }}>
                  ✓ {deleteSuccessMsg}
                </div>
              )}

              {loadingComplaints && <p>Loading your complaints...</p>}
              {complaintsError && <p style={{ color: 'red' }}>{complaintsError}</p>}
              {!loadingComplaints && myComplaints.length === 0 && (
                <div style={{ padding: '2rem', background: '#f9f9f9', borderRadius: '6px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 0.5rem 0' }}>You have not filed any complaints yet.</p>
                  <Link to="/file-complaint" style={{ color: '#0066cc', fontWeight: 600 }}>+ File your first complaint</Link>
                </div>
              )}

              {!loadingComplaints && myComplaints.length > 0 && (
                <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', border: '1px solid #eee' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ddd', background: '#f5f5f5' }}>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Complaint</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Company</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Category</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Date</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Status & Review</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myComplaints.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #eee', background: c.deleteRequested ? '#fffaf0' : 'transparent' }}>
                          <td style={{ padding: '0.6rem 0.8rem', maxWidth: '280px' }}>
                            <button
                              type="button"
                              onClick={() => setViewComplaintModal(c)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                color: '#0066cc',
                                fontWeight: 600,
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                              }}
                            >
                              {c.title}
                            </button>
                            {c.model && <small style={{ display: 'block', color: '#666' }}>{c.model}</small>}
                            {c.deleteRequested && (
                              <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 6px', background: '#ffebee', color: '#c62828', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                                ⚠️ Deletion Requested
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: c.type === 'Service' ? '#856404' : '#004085', background: c.type === 'Service' ? '#fff3cd' : '#cce5ff', padding: '1px 5px', borderRadius: '3px', marginRight: '4px' }}>
                              {c.type || 'Product'}
                            </span>
                            <strong>{c.company}</strong>
                            {c.serviceType && <small style={{ display: 'block', color: '#666' }}>Type: {c.serviceType}</small>}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                            {c.category} {c.subcategory && <small style={{ color: '#666' }}>({c.subcategory})</small>}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem', color: '#666' }}>
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent'}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            {getStatusBadge(c.status, c.deleteRequested)}
                            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#666' }}>
                              {c.status === 'PENDING' && '⏳ Awaiting Admin Approval'}
                              {c.status === 'APPROVED' && '✅ Live on BadService.in'}
                              {c.status === 'UNDER_REVIEW' && '🔍 Under Investigation'}
                              {c.status === 'COMPANY_RESPONDED' && '💬 Company Responded'}
                              {c.status === 'RESOLVED' && '🎉 Resolved'}
                              {c.status === 'REJECTED' && '❌ Verification Rejected'}
                            </div>
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => setViewComplaintModal(c)}
                                style={{
                                  padding: '0.25rem 0.55rem',
                                  background: '#232f3e',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                }}
                              >
                                View Updates
                              </button>
                              {['APPROVED', 'COMPANY_RESPONDED', 'RESOLVED'].includes(c.status) && (
                                <Link
                                  to={`/complaints/${encodeURIComponent(c.id)}`}
                                  style={{
                                    padding: '0.25rem 0.55rem',
                                    background: '#0066cc',
                                    color: '#fff',
                                    textDecoration: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                  }}
                                >
                                  Public Page ↗
                                </Link>
                              )}
                              {!c.deleteRequested ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteModalComplaint(c);
                                    setDeleteReason('');
                                  }}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    background: '#fff',
                                    color: '#dc3545',
                                    border: '1px solid #dc3545',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                  }}
                                >
                                  Request Delete
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#dc3545', fontWeight: 600 }}>
                                  Delete Pending
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* USER COMPLAINT STATUS & UPDATES MODAL */}
              {viewComplaintModal && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                  }}
                  onClick={() => setViewComplaintModal(null)}
                >
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: '8px',
                      width: '100%',
                      maxWidth: '750px',
                      maxHeight: '90vh',
                      overflowY: 'auto',
                      padding: '1.5rem',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #eee', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>
                          Complaint ID: {viewComplaintModal.id}
                        </span>
                        <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '1.2rem' }}>
                          {viewComplaintModal.title}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewComplaintModal(null)}
                        style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}
                      >
                        ×
                      </button>
                    </div>

                    {/* Review Status Timeline / Progress */}
                    <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.75rem 0', color: '#232f3e' }}>
                        📊 Review & Status Updates
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#28a745', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>
                          <div>
                            <strong>Complaint Submitted</strong>
                            <small style={{ display: 'block', color: '#666' }}>
                              {viewComplaintModal.createdAt ? new Date(viewComplaintModal.createdAt).toLocaleString() : 'Recent'}
                            </small>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: viewComplaintModal.status !== 'PENDING' ? '#28a745' : '#ffc107', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                            {viewComplaintModal.status !== 'PENDING' ? '✓' : '•'}
                          </span>
                          <div>
                            <strong>Administrative Verification & Moderation</strong>
                            <div style={{ fontSize: '0.82rem', color: viewComplaintModal.status === 'PENDING' ? '#856404' : '#155724' }}>
                              {viewComplaintModal.status === 'PENDING' && '⏳ Under Admin Review: Admin verifies invoice and details before making public.'}
                              {viewComplaintModal.status === 'APPROVED' && '✅ Approved: Verified and published to BadService.in.'}
                              {viewComplaintModal.status === 'UNDER_REVIEW' && '🔍 In Progress: Investigation underway.'}
                              {viewComplaintModal.status === 'COMPANY_RESPONDED' && '💬 Company Responded.'}
                              {viewComplaintModal.status === 'RESOLVED' && '🎉 Resolved.'}
                              {viewComplaintModal.status === 'REJECTED' && '❌ Verification Rejected.'}
                            </div>
                          </div>
                        </div>

                        {viewComplaintModal.deleteRequested && (
                          <div style={{ padding: '0.5rem 0.75rem', background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '4px', color: '#c62828', fontSize: '0.85rem' }}>
                            <strong>⚠️ Deletion Requested:</strong> A deletion request is awaiting administrator approval.
                            {viewComplaintModal.deleteReason && <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>Reason: {viewComplaintModal.deleteReason}</div>}
                          </div>
                        )}

                        {(viewComplaintModal.status === 'REJECTED' || viewComplaintModal.deleteAdminNote) && (
                          <div style={{ padding: '0.75rem 1rem', background: '#fdf2f2', border: '1.5px solid #f87171', borderRadius: '6px', color: '#991b1b', fontSize: '0.85rem' }}>
                            <strong>❌ Rejection / Deletion Reason from Admin:</strong>
                            <div style={{ marginTop: '4px', fontWeight: 600, color: '#7f1d1d' }}>
                              {viewComplaintModal.deleteAdminNote || viewComplaintModal.statusNote || 'Your complaint was rejected by administrator.'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Complaint Particulars */}
                    <div style={{ border: '1px solid #eee', borderRadius: '6px', padding: '1rem', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0' }}>Complaint Details</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <div><strong>Type:</strong> {viewComplaintModal.type || 'Product'}</div>
                        <div><strong>Category:</strong> {viewComplaintModal.category}</div>
                        {viewComplaintModal.serviceType && <div><strong>Service Type:</strong> {viewComplaintModal.serviceType}</div>}
                        <div><strong>Brand / Company:</strong> {viewComplaintModal.company}</div>
                        <div><strong>Model / Details:</strong> {viewComplaintModal.model || 'N/A'}</div>
                        {viewComplaintModal.location && <div><strong>Location:</strong> {viewComplaintModal.location}</div>}
                      </div>
                      <div style={{ marginTop: '0.75rem' }}>
                        <strong>Description:</strong>
                        <p style={{ margin: '0.25rem 0 0 0', whiteSpace: 'pre-wrap', fontSize: '0.88rem', color: '#444' }}>
                          {viewComplaintModal.description}
                        </p>
                      </div>
                    </div>

                    {/* Modal Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {!viewComplaintModal.deleteRequested ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteModalComplaint(viewComplaintModal);
                            setDeleteReason('');
                          }}
                          style={{ padding: '0.4rem 0.8rem', background: '#fff', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Request Complaint Deletion
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: '#dc3545', fontWeight: 600 }}>
                          Deletion Request Submitted
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setViewComplaintModal(null)}
                        style={{ padding: '0.4rem 0.8rem', background: '#232f3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* USER DELETE REQUEST MODAL */}
              {deleteModalComplaint && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                  }}
                  onClick={() => setDeleteModalComplaint(null)}
                >
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: '8px',
                      width: '100%',
                      maxWidth: '480px',
                      padding: '1.5rem',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#d9534f' }}>
                      Request Complaint Deletion
                    </h3>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#555' }}>
                      Submit a deletion request for "<strong>{deleteModalComplaint.title}</strong>". An administrator will review and approve the request before it is permanently removed.
                    </p>

                    <form onSubmit={submitDeleteRequest}>
                      <label style={{ display: 'block', marginBottom: '1rem' }}>
                        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                          Reason for deletion (optional):
                        </span>
                        <textarea
                          rows={3}
                          value={deleteReason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                          placeholder="e.g., Issue resolved with seller, entered wrong details..."
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem', boxSizing: 'border-box' }}
                        />
                      </label>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setDeleteModalComplaint(null)}
                          style={{ padding: '0.45rem 0.9rem', background: '#f8f9fa', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={deleteSubmitting}
                          style={{ padding: '0.45rem 1rem', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          {deleteSubmitting ? 'Submitting…' : 'Submit Deletion Request'}
                        </button>
                      </div>
                    </form>
                  </div>
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