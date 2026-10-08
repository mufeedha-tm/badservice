import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ComplaintBadge from '../components/complaints/ComplaintBadge.jsx';
import ComplaintMediaGallery from '../components/complaints/ComplaintMediaGallery.jsx';
import ComplaintMeta from '../components/complaints/ComplaintMeta.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { useAccount } from '../context/AccountContext.jsx';
import {
  cancelDeleteComplaint,
  deleteAdminComplaint,
  deleteComment,
  getComments,
  getComplaint,
  getErrorMessage,
  postComment,
  requestDeleteComplaint,
} from '../services/api.js';

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useAccount();
  const isAdmin = account && account.role === 'ADMIN';

  const [result, setResult] = useState({ status: 'loading', complaint: null, error: '' });
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminActionMessage, setAdminActionMessage] = useState('');

  // Deletion Request Modal & State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReasonCategory, setDeleteReasonCategory] = useState('Company resolved my issue');
  const [deleteCustomReason, setDeleteCustomReason] = useState('');
  const [deleteContact, setDeleteContact] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  // Comments State
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentAuthorName, setCommentAuthorName] = useState('');
  const [commentAuthorEmail, setCommentAuthorEmail] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState('');

  useEffect(() => {
    let isCurrent = true;
    setResult({ status: 'loading', complaint: null, error: '' });

    getComplaint(id)
      .then((complaint) => {
        if (isCurrent) {
          setResult({ status: 'success', complaint, error: '' });
          // Pre-populate comment author if logged in
          if (account?.name) setCommentAuthorName(account.name);
          if (account?.email) setCommentAuthorEmail(account.email);
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setResult({
            status: error.response?.status === 404 ? 'not-found' : 'error',
            complaint: null,
            error: getErrorMessage(error, 'Unable to load this complaint.'),
          });
        }
      });

    loadComments();

    return () => {
      isCurrent = false;
    };
  }, [id, account]);

  function loadComments() {
    setCommentsLoading(true);
    getComments(id)
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }

  // Admin Quick Remove
  async function handleAdminRemove() {
    if (!window.confirm('Admin Confirmation: Remove this approved complaint from the website?\n\nNote: The complaint will be safely stored in the database archive, not permanently lost.')) {
      return;
    }
    setAdminActionLoading(true);
    try {
      await deleteAdminComplaint(id, 'Admin direct removal from website');
      setAdminActionMessage('✓ Complaint removed from website & archived in database.');
      setTimeout(() => navigate('/complaints'), 1500);
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to remove complaint.'));
      setAdminActionLoading(false);
    }
  }

  // User Deletion Request
  async function handleSubmitDeleteRequest(e) {
    e.preventDefault();
    setDeleteSubmitting(true);
    setDeleteMessage('');
    const fullReason = `${deleteReasonCategory}${deleteCustomReason.trim() ? ` - ${deleteCustomReason.trim()}` : ''}`;
    try {
      await requestDeleteComplaint(id, fullReason, deleteContact.trim());
      setResult((prev) => ({
        ...prev,
        complaint: prev.complaint
          ? { ...prev.complaint, deleteRequested: true, deleteReason: fullReason }
          : null,
      }));
      setDeleteModalOpen(false);
      setDeleteMessage('✓ Your deletion request has been submitted to the admin team for review.');
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to submit deletion request.'));
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleCancelDeleteRequest() {
    if (!window.confirm('Cancel your pending deletion request?')) return;
    try {
      await cancelDeleteComplaint(id);
      setResult((prev) => ({
        ...prev,
        complaint: prev.complaint
          ? { ...prev.complaint, deleteRequested: false, deleteReason: null }
          : null,
      }));
      setDeleteMessage('✓ Deletion request cancelled.');
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to cancel deletion request.'));
    }
  }

  // Comments Submission
  async function handlePostComment(e) {
    e.preventDefault();
    if (!commentBody.trim()) {
      setCommentError('Please write a comment message.');
      return;
    }
    if (!commentAuthorName.trim()) {
      setCommentError('Please enter your name.');
      return;
    }
    setCommentSubmitting(true);
    setCommentError('');
    setCommentSuccess('');

    try {
      const newComment = await postComment(id, {
        authorName: commentAuthorName.trim(),
        authorEmail: commentAuthorEmail.trim() || undefined,
        body: commentBody.trim(),
      });
      setComments((prev) => [...prev, newComment]);
      setCommentBody('');
      setCommentSuccess('✓ Comment posted successfully!');
      setTimeout(() => setCommentSuccess(''), 4000);
    } catch (err) {
      setCommentError(getErrorMessage(err, 'Failed to post comment.'));
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to delete comment.'));
    }
  }

  const complaint = result.complaint;

  // Timeline step active calculation
  const isApproved = complaint && ['APPROVED', 'COMPANY_RESPONDED', 'RESOLVED'].includes(complaint.status);
  const isCompanyResponded = complaint && ['COMPANY_RESPONDED', 'RESOLVED'].includes(complaint.status);
  const isResolved = complaint && complaint.status === 'RESOLVED';

  return (
    <MainLayout>
      <section className="complaint-detail" aria-labelledby="complaint-detail-title">
        {result.status === 'loading' && <Skeleton className="skeleton-card" lines={6} />}
        {result.status === 'error' && <p className="form-banner form-banner--error" role="alert">{result.error}</p>}
        {result.status === 'not-found' && <p role="status">Complaint not found.</p>}

        {complaint && (
          <article>
            {/* Admin Message Banner */}
            {adminActionMessage && (
              <div style={{ padding: '0.8rem 1rem', background: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', borderRadius: '6px', marginBottom: '1rem', fontWeight: 600 }}>
                {adminActionMessage}
              </div>
            )}

            {/* Admin Direct Removal Button (Point 1) */}
            {isAdmin && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff3cd', border: '1px solid #ffeeba', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#856404', fontWeight: 600 }}>
                  🛡️ <strong>Admin Controls:</strong> You are viewing this page as an Administrator.
                </span>
                <button
                  type="button"
                  onClick={handleAdminRemove}
                  disabled={adminActionLoading}
                  style={{
                    padding: '6px 14px',
                    background: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  {adminActionLoading ? 'Removing…' : '🗑️ Remove Complaint (Admin Direct)'}
                </button>
              </div>
            )}

            {/* Pending Admin Notice */}
            {complaint.status === 'PENDING' && (
              <div style={{ padding: '0.75rem 1rem', background: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                ⏳ <strong>Pending Admin Review:</strong> This complaint is currently under review with all uploaded evidence. Once approved by an administrator, it will become publicly searchable on the website.
              </div>
            )}

            {/* Topline & Status Chip */}
            <div className="complaint-detail__topline">
              {complaint.badge && <ComplaintBadge badge={complaint.badge} />}
              <span className={`status-chip status-chip--${(complaint.status || 'PENDING').toLowerCase()}`}>
                {(complaint.status || 'PENDING').replace('_', ' ')}
              </span>
            </div>

            <h1 id="complaint-detail-title">{complaint.title}</h1>
            <ComplaintMeta items={complaint.metadata} />

            {/* Real-time Status Tracker & Timeline (Point 2) */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', margin: '1.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📍</span> Complaint Status & Tracking
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Reference ID: <strong style={{ color: '#0f172a' }}>{complaint.id}</strong>
                </span>
              </div>

              {/* 4-Stage Progress Tracker */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', margin: '1rem 0' }}>
                <div style={{ textAlign: 'center', padding: '8px', borderRadius: '6px', background: '#e2f9e5', border: '1px solid #a6e9b4' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>✓</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1b5e20' }}>1. Filed</div>
                  <div style={{ fontSize: '0.68rem', color: '#388e3c' }}>Evidence Saved</div>
                </div>

                <div style={{ textAlign: 'center', padding: '8px', borderRadius: '6px', background: isApproved ? '#e2f9e5' : '#fff8e1', border: isApproved ? '1px solid #a6e9b4' : '1px solid #ffe082' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{isApproved ? '✓' : '⏳'}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isApproved ? '#1b5e20' : '#b78103' }}>2. Admin Review</div>
                  <div style={{ fontSize: '0.68rem', color: isApproved ? '#388e3c' : '#795548' }}>{isApproved ? 'Approved' : 'In Review'}</div>
                </div>

                <div style={{ textAlign: 'center', padding: '8px', borderRadius: '6px', background: isCompanyResponded ? '#e2f9e5' : '#f1f5f9', border: isCompanyResponded ? '1px solid #a6e9b4' : '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{isCompanyResponded ? '✓' : '🏢'}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isCompanyResponded ? '#1b5e20' : '#475569' }}>3. Company Alert</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{isCompanyResponded ? 'Responded' : 'Published'}</div>
                </div>

                <div style={{ textAlign: 'center', padding: '8px', borderRadius: '6px', background: isResolved ? '#e2f9e5' : '#f1f5f9', border: isResolved ? '1px solid #a6e9b4' : '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{isResolved ? '🎉' : '🎯'}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isResolved ? '#1b5e20' : '#475569' }}>4. Resolution</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{isResolved ? 'Resolved' : 'Pending'}</div>
                </div>
              </div>

              {/* Status Note or Updates */}
              {complaint.statusNote && (
                <div style={{ padding: '0.75rem', background: '#fff', borderLeft: '4px solid #0284c7', borderRadius: '4px', margin: '0.8rem 0', fontSize: '0.85rem' }}>
                  <strong style={{ color: '#0369a1' }}>Official Update Note:</strong> {complaint.statusNote}
                </div>
              )}

              {/* Deletion Status & Actions (Point 2) */}
              {deleteMessage && (
                <div style={{ padding: '0.6rem 0.8rem', background: '#e8f4fd', border: '1px solid #b6d4fe', color: '#084298', borderRadius: '4px', margin: '0.5rem 0', fontSize: '0.85rem' }}>
                  {deleteMessage}
                </div>
              )}

              {complaint.deleteRequested ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', background: '#fff3cd', border: '1px solid #ffeeba', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem' }}>
                  <div>
                    <strong style={{ color: '#856404', fontSize: '0.85rem' }}>⚠️ Deletion Request Submitted to Admin:</strong>
                    <div style={{ fontSize: '0.78rem', color: '#664d03', marginTop: '2px' }}>
                      Reason: {complaint.deleteReason || 'Requested by complainant'}. (Admin review in progress).
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelDeleteRequest}
                    style={{ padding: '4px 10px', fontSize: '0.78rem', background: '#fff', border: '1px solid #d39e00', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel Deletion Request
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Need to remove this complaint? You can request deletion for admin verification.
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(true)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: '#fff',
                      border: '1px solid #ef4444',
                      color: '#dc2626',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Request Complaint Deletion
                  </button>
                </div>
              )}
            </div>

            {/* Media Gallery */}
            <ComplaintMediaGallery complaint={complaint} />

            {complaint.description && (
              <p className="complaint-detail__description">{complaint.description}</p>
            )}

            {/* Facts Grid */}
            <dl className="complaint-detail__facts">
              <div>
                <dt>{complaint.type === 'Service' ? 'Service Provider' : 'Company'}</dt>
                <dd>
                  <Link to={`/companies/${encodeURIComponent(complaint.companyId || complaint.company)}`}>
                    {complaint.company}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{complaint.category}</dd>
              </div>
              {complaint.serviceType && (
                <div>
                  <dt>Service Type</dt>
                  <dd>{complaint.serviceType}</dd>
                </div>
              )}
              {complaint.model && (
                <div>
                  <dt>{complaint.type === 'Service' ? 'Service Details / Booking ID' : 'Product / Model'}</dt>
                  <dd>{complaint.model}</dd>
                </div>
              )}
              {complaint.seller && (
                <div>
                  <dt>{complaint.type === 'Service' ? 'Branch / Unit' : 'Seller / Shop'}</dt>
                  <dd>{complaint.seller}</dd>
                </div>
              )}
              {complaint.location && (
                <div>
                  <dt>Location</dt>
                  <dd>{complaint.location}</dd>
                </div>
              )}
              {complaint.complainantCity && (
                <div>
                  <dt>Filed from</dt>
                  <dd>{complaint.complainantCity}</dd>
                </div>
              )}
            </dl>

            {/* COMMENTS & PUBLIC DISCUSSION SECTION (Point 6) */}
            <section style={{ marginTop: '2.5rem', borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💬 Public Comments & Discussion ({comments.length})
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Share your experience, updates, or helpful advice
                </span>
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handlePostComment} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.2rem', marginBottom: '1.8rem' }}>
                <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '0.95rem', color: '#1e293b' }}>
                  Leave a Comment
                </h3>

                {commentError && (
                  <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.6rem', fontWeight: 600 }}>{commentError}</p>
                )}
                {commentSuccess && (
                  <p style={{ color: '#16a34a', fontSize: '0.85rem', marginBottom: '0.6rem', fontWeight: 600 }}>{commentSuccess}</p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Your Name *"
                    value={commentAuthorName}
                    onChange={(e) => setCommentAuthorName(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Your Email (Optional, kept private)"
                    value={commentAuthorEmail}
                    onChange={(e) => setCommentAuthorEmail(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>

                <textarea
                  rows={3}
                  placeholder="Write your comment, reply, or question about this complaint…"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box', marginBottom: '10px' }}
                  required
                />

                <button
                  type="submit"
                  disabled={commentSubmitting}
                  style={{
                    padding: '8px 18px',
                    background: '#232f3e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {commentSubmitting ? 'Posting…' : 'Post Comment'}
                </button>
              </form>

              {/* Comments Listing */}
              {commentsLoading && <Skeleton lines={3} />}
              {!commentsLoading && comments.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                  No comments yet on this complaint. Be the first to share your thoughts or experience!
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {comments.map((cmt) => (
                  <div
                    key={cmt.id}
                    style={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#e0e7ff',
                            color: '#3730a3',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {(cmt.authorName || 'U')[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                          {cmt.authorName}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {cmt.createdAt ? new Date(cmt.createdAt).toLocaleDateString() : 'Recently'}
                        </span>
                      </div>

                      {(isAdmin || (account?.email && account.email === cmt.authorEmail)) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(cmt.id)}
                          style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#334155', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                      {cmt.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </article>
        )}

        <div className="complaint-detail__nav" style={{ marginTop: '2rem' }}>
          <Link className="complaint-detail__back" to="/complaints">← Back to all complaints</Link>
        </div>
      </section>

      {/* USER DELETION REQUEST MODAL (Point 2) */}
      {deleteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                Request Complaint Deletion
              </h3>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '0.75rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '0.8rem', color: '#92400e', marginBottom: '1rem' }}>
              ℹ️ <strong>Platform Policy:</strong> For platform trust, submitted complaints can only be finalized and deleted by BadService.in Administrators. Please provide your reason below for rapid review.
            </div>

            <form onSubmit={handleSubmitDeleteRequest}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Reason for Deletion *
              </label>
              <select
                value={deleteReasonCategory}
                onChange={(e) => setDeleteReasonCategory(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '12px', fontSize: '0.85rem' }}
              >
                <option value="Company resolved my issue">Company resolved my issue / settled grievance</option>
                <option value="Received replacement or full refund">Received replacement or full refund</option>
                <option value="Complaint submitted with incorrect information">Complaint submitted with incorrect information</option>
                <option value="Filed by mistake / Duplicate complaint">Filed by mistake / Duplicate submission</option>
                <option value="Other reason">Other reason (explain below)</option>
              </select>

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Additional Explanation (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Provide any details about how the issue was resolved or why removal is needed…"
                value={deleteCustomReason}
                onChange={(e) => setDeleteCustomReason(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '12px', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Your Phone or Email (Verification)
              </label>
              <input
                type="text"
                placeholder="Enter the phone or email used when submitting"
                value={deleteContact}
                onChange={(e) => setDeleteContact(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '1.2rem', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteSubmitting}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  {deleteSubmitting ? 'Submitting…' : 'Submit Deletion Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
