import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { trackComplaint, requestDeleteComplaint, cancelDeleteComplaint, getErrorMessage } from '../services/api.js';

const STATUS_STEPS = [
  { key: 'SUBMITTED', label: 'Complaint Submitted', desc: 'Complaint registered and queued for verification' },
  { key: 'UNDER_REVIEW', label: 'Under Review', desc: 'Admin verifying bill evidence and details' },
  { key: 'COMPANY_RESPONDED', label: 'Brand Contacted', desc: 'Company notified or response in progress' },
  { key: 'RESOLVED', label: 'Approved & Resolved', desc: 'Complaint verified and active or resolved' },
];

function getStepIndex(status) {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'UNDER_REVIEW':
      return 1;
    case 'COMPANY_RESPONDED':
      return 2;
    case 'APPROVED':
    case 'RESOLVED':
      return 3;
    case 'REJECTED':
      return -1;
    default:
      return 0;
  }
}

export default function TrackComplaintPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || searchParams.get('id') || '';

  const [query, setQuery] = useState(initialQuery);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  // Deletion request modal state
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState({ text: '', type: '' });

  useEffect(() => {
    if (initialQuery.trim()) {
      handleSearch(initialQuery.trim());
    }
  }, [initialQuery]);

  async function handleSearch(searchQuery = query) {
    const q = searchQuery.trim();
    if (!q) {
      setError('Please enter a Complaint ID or registered Mobile Number.');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      setSearchParams({ q });
      const data = await trackComplaint(q);
      setComplaints(Array.isArray(data) ? data : data ? [data] : []);
    } catch (err) {
      setError(getErrorMessage(err) || 'Unable to find complaints matching this query.');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenDeleteModal(complaintId) {
    setDeleteTargetId(complaintId);
    setDeleteReason('');
    setModalFeedback({ text: '', type: '' });
  }

  async function handleSubmitDeleteRequest(e) {
    e.preventDefault();
    if (!deleteReason.trim()) {
      setModalFeedback({ text: 'Please specify a reason for requesting deletion.', type: 'error' });
      return;
    }

    setDeleteSubmitting(true);
    setModalFeedback({ text: '', type: '' });
    try {
      await requestDeleteComplaint(deleteTargetId, deleteReason.trim());
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === deleteTargetId
            ? { ...c, deleteRequested: true, deleteReason: deleteReason.trim(), deleteRequestedAt: new Date().toISOString() }
            : c
        )
      );
      setModalFeedback({ text: 'Deletion request submitted successfully. Admin will review and process it.', type: 'success' });
      setTimeout(() => {
        setDeleteTargetId(null);
      }, 1800);
    } catch (err) {
      setModalFeedback({ text: getErrorMessage(err) || 'Failed to submit deletion request.', type: 'error' });
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleCancelDelete(complaintId) {
    if (!window.confirm('Cancel your deletion request for this complaint?')) return;
    try {
      await cancelDeleteComplaint(complaintId);
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? { ...c, deleteRequested: false, deleteReason: null, deleteRequestedAt: null }
            : c
        )
      );
    } catch (err) {
      alert(getErrorMessage(err) || 'Failed to cancel deletion request.');
    }
  }

  return (
    <MainLayout>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Header Banner */}
        <div style={{ background: 'linear-gradient(135deg, #131921 0%, #232f3e 100%)', color: '#fff', borderRadius: '10px', padding: '2rem 1.75rem', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#febd69', fontWeight: 700 }}>
            BadService.in Consumer Portal
          </span>
          <h1 style={{ fontSize: '1.85rem', margin: '0.4rem 0 0.8rem 0', color: '#fff' }}>
            Track Complaint Status & Updation
          </h1>
          <p style={{ margin: 0, fontSize: '0.98rem', color: '#e0e0e0', maxWidth: '720px', lineHeight: '1.5' }}>
            Check the live progress of your submitted complaints, view admin verification notes, see company communication status, or submit a deletion request.
          </p>

          {/* Search Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}
          >
            <input
              type="text"
              placeholder="Enter Complaint Reference ID or 10-digit Mobile Number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: '1 1 320px',
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                borderRadius: '6px',
                border: '2px solid #febd69',
                outline: 'none',
                color: '#111',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#febd69',
                color: '#111',
                border: 'none',
                borderRadius: '6px',
                padding: '0.75rem 1.75rem',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {loading ? 'Searching...' : '🔍 Track Status'}
            </button>
          </form>
        </div>

        {error && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #ffcdd2' }}>
            {error}
          </div>
        )}

        {/* Results Section */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#666' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
            <p>Fetching real-time complaint updates and status...</p>
          </div>
        )}

        {!loading && searched && complaints.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>No complaints found</h3>
            <p style={{ color: '#666', maxWidth: '500px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem' }}>
              We could not find any complaint matching "<strong>{query}</strong>". Please make sure you entered the correct Complaint ID or the phone number provided during submission.
            </p>
            <Link
              to="/file-complaint"
              style={{
                display: 'inline-block',
                background: '#ff9900',
                color: '#111',
                padding: '0.6rem 1.25rem',
                borderRadius: '5px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              File a New Complaint
            </Link>
          </div>
        )}

        {!loading && complaints.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <p style={{ color: '#555', margin: '0 0 0.5rem 0', fontWeight: 600 }}>
              Found {complaints.length} complaint{complaints.length > 1 ? 's' : ''} matching your search:
            </p>

            {complaints.map((c) => {
              const currentStep = getStepIndex(c.status);
              return (
                <div
                  key={c.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Top card header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#f0f2f5', padding: '3px 8px', borderRadius: '4px', color: '#444' }}>
                          ID: {c.id}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, background: c.type === 'Service' ? '#fff3cd' : '#cce5ff', color: c.type === 'Service' ? '#856404' : '#004085', padding: '3px 8px', borderRadius: '4px' }}>
                          {c.type === 'Service' ? 'SERVICE' : 'PRODUCT'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#888' }}>
                          Submitted: {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <h2 style={{ fontSize: '1.25rem', margin: '0.5rem 0 0.25rem 0', color: '#111' }}>
                        {c.title}
                      </h2>
                      <div style={{ fontSize: '0.9rem', color: '#444' }}>
                        <strong>{c.company}</strong> {c.productName ? `— ${c.productName}` : ''} {c.serviceType ? `(${c.serviceType})` : ''}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.35rem 0.85rem',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          background:
                            c.status === 'APPROVED' ? '#d4edda' :
                            c.status === 'RESOLVED' ? '#c3e6cb' :
                            c.status === 'UNDER_REVIEW' ? '#d1ecf1' :
                            c.status === 'COMPANY_RESPONDED' ? '#e2e3e5' :
                            c.status === 'REJECTED' ? '#f8d7da' : '#fff3cd',
                          color:
                            c.status === 'APPROVED' || c.status === 'RESOLVED' ? '#155724' :
                            c.status === 'UNDER_REVIEW' ? '#0c5460' :
                            c.status === 'COMPANY_RESPONDED' ? '#383d41' :
                            c.status === 'REJECTED' ? '#721c24' : '#856404',
                        }}
                      >
                        ● {c.status}
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Stepper */}
                  <div style={{ marginBottom: '1.5rem', background: '#f9f9f9', padding: '1.25rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333', marginBottom: '1rem' }}>
                      Complaint Updation & Verification Timeline:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                      {STATUS_STEPS.map((step, idx) => {
                        const isDone = currentStep >= idx;
                        const isCurrent = currentStep === idx;
                        return (
                          <div
                            key={step.key}
                            style={{
                              borderLeft: `4px solid ${isDone ? '#28a745' : '#ccc'}`,
                              paddingLeft: '0.65rem',
                              background: isCurrent ? '#e8f5e9' : 'transparent',
                              borderRadius: '0 4px 4px 0',
                              paddingTop: '0.25rem',
                              paddingBottom: '0.25rem',
                            }}
                          >
                            <div style={{ fontSize: '0.85rem', fontWeight: isDone ? 700 : 500, color: isDone ? '#155724' : '#888' }}>
                              {isDone ? '✓ ' : `${idx + 1}. `} {step.label}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: isDone ? '#555' : '#aaa', marginTop: '2px' }}>
                              {step.desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Note from Admin / Platform */}
                  {c.statusNote && (
                    <div style={{ background: '#e8f4fd', border: '1px solid #b8daff', color: '#004085', padding: '0.85rem 1rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                      <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        📌 Latest Updation from Admin:
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>{c.statusNote}</p>
                    </div>
                  )}

                  {/* Deletion Request Status or Action */}
                  {c.deleteRequested ? (
                    <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', padding: '1rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: '#721c24' }}>
                            ⚠️ Deletion Request Submitted to Admin
                          </strong>
                          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem' }}>
                            <strong>Your reason:</strong> {c.deleteReason || 'Requested by complainant'}
                          </p>
                          <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                            Platform policy: Only platform administrators can permanently delete records from public view to ensure genuine complaints and transparency.
                          </small>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCancelDelete(c.id)}
                          style={{
                            background: '#fff',
                            border: '1px solid #856404',
                            color: '#856404',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          Cancel Deletion Request
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <Link
                        to={`/complaints/${encodeURIComponent(c.id)}`}
                        style={{
                          background: '#232f3e',
                          color: '#fff',
                          textDecoration: 'none',
                          padding: '0.45rem 1rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        View Full Details & Comments ↗
                      </Link>

                      {!c.deleteRequested && (
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(c.id)}
                          style={{
                            background: '#fff',
                            border: '1px solid #dc3545',
                            color: '#dc3545',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          🗑️ Request Deletion
                        </button>
                      )}
                    </div>

                    <small style={{ color: '#888' }}>
                      Last updated: {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : 'Recently'}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Feature Information Card */}
        {!searched && (
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.75rem', marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 1rem 0', color: '#111' }}>
              How Complaint Tracking & Updation Works
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              <div style={{ border: '1px solid #eee', padding: '1rem', borderRadius: '6px', background: '#fafafa' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>📱</div>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem' }}>Look up using Mobile Number</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#555', lineHeight: '1.5' }}>
                  Forgot your reference ID? Enter the 10-digit phone number you provided during submission to view all your complaints.
                </p>
              </div>

              <div style={{ border: '1px solid #eee', padding: '1rem', borderRadius: '6px', background: '#fafafa' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>⚡</div>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem' }}>Live Verification Progress</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#555', lineHeight: '1.5' }}>
                  Track review milestones from bill verification to brand communication and public publication.
                </p>
              </div>

              <div style={{ border: '1px solid #eee', padding: '1rem', borderRadius: '6px', background: '#fafafa' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>🛡️</div>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem' }}>Admin-Governed Deletions</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#555', lineHeight: '1.5' }}>
                  If your issue is resolved with the company, submit a deletion request. Platform admins review and process requests to protect truth and integrity.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Deletion Request Modal */}
        {deleteTargetId && (
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
            onClick={() => setDeleteTargetId(null)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '8px',
                width: '100%',
                maxWidth: '520px',
                padding: '1.75rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#111' }}>
                Request Deletion of Complaint
              </h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: '#666', lineHeight: '1.5' }}>
                To maintain consumer trust and dispute fairness, complaints can only be removed by platform administrators. Please tell us why you wish to delete this complaint:
              </p>

              {modalFeedback.text && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                    background: modalFeedback.type === 'success' ? '#d4edda' : '#f8d7da',
                    color: modalFeedback.type === 'success' ? '#155724' : '#721c24',
                  }}
                >
                  {modalFeedback.text}
                </div>
              )}

              <form onSubmit={handleSubmitDeleteRequest}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Reason for Deletion Request:
                  </label>
                  <textarea
                    rows={4}
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="e.g. The company contacted me and fully refunded / replaced my product. The issue is resolved."
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(null)}
                    disabled={deleteSubmitting}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#eee',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deleteSubmitting}
                    style={{
                      padding: '0.5rem 1.25rem',
                      background: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: deleteSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    {deleteSubmitting ? 'Submitting...' : 'Submit Deletion Request'}
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
