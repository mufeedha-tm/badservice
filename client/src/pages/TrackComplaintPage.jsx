import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { trackComplaint, requestDeleteComplaint, cancelDeleteComplaint, getErrorMessage } from '../services/api.js';

const STATUS_STEPS = [
  { key: 'PENDING', label: 'Submitted', desc: 'Your complaint has been received.' },
  { key: 'UNDER_REVIEW', label: 'Under review', desc: 'The submission is being checked.' },
  { key: 'APPROVED', label: 'Verified', desc: 'The complaint has been approved.' },
  { key: 'COMPANY_RESPONDED', label: 'Company update', desc: 'A response has been recorded.' },
  { key: 'RESOLVED', label: 'Resolved', desc: 'The complaint is marked resolved.' },
];

function getStepIndex(status) {
  if (status === 'PENDING') return 0;
  if (status === 'UNDER_REVIEW') return 1;
  if (status === 'APPROVED') return 2;
  if (status === 'COMPANY_RESPONDED') return 3;
  if (status === 'RESOLVED') return 4;
  return -1;
}

function formatStatus(status = '') {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value, includeTime = false) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString(undefined, includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' });
}

export default function TrackComplaintPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || searchParams.get('id') || '';
  const lastAutoQuery = useRef('');
  const [query, setQuery] = useState(initialQuery);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState({ text: '', type: '' });

  useEffect(() => {
    const value = initialQuery.trim();
    if (value && value !== lastAutoQuery.current) {
      lastAutoQuery.current = value;
      handleSearch(value);
    }
  }, [initialQuery]);

  async function handleSearch(searchQuery = query) {
    const q = searchQuery.trim();
    if (!q) {
      setError('Enter your complaint reference ID or registered mobile number.');
      setSearched(false);
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);
    lastAutoQuery.current = q;
    try {
      setSearchParams({ q });
      const data = await trackComplaint(q);
      setComplaints(Array.isArray(data) ? data : data ? [data] : []);
    } catch (err) {
      setError(getErrorMessage(err) || 'We could not find a complaint for those details. Check your entry and try again.');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenDeleteModal(complaintId) {
    setDeleteTargetId(complaintId);
    setDeleteReason('');
    setModalFeedback({ text: '', type: '' });
  }

  async function handleSubmitDeleteRequest(event) {
    event.preventDefault();
    if (!deleteReason.trim()) {
      setModalFeedback({ text: 'Please specify a reason for requesting deletion.', type: 'error' });
      return;
    }
    setDeleteSubmitting(true);
    setModalFeedback({ text: '', type: '' });
    try {
      await requestDeleteComplaint(deleteTargetId, deleteReason.trim());
      setComplaints((previous) => previous.map((complaint) => complaint.id === deleteTargetId
        ? { ...complaint, deleteRequested: true, deleteReason: deleteReason.trim() }
        : complaint));
      setModalFeedback({ text: 'Your deletion request was submitted for admin review.', type: 'success' });
      setTimeout(() => setDeleteTargetId(null), 1800);
    } catch (err) {
      setModalFeedback({ text: getErrorMessage(err) || 'Unable to submit the deletion request.', type: 'error' });
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleCancelDelete(complaintId) {
    if (!window.confirm('Cancel your deletion request for this complaint?')) return;
    try {
      await cancelDeleteComplaint(complaintId);
      setComplaints((previous) => previous.map((complaint) => complaint.id === complaintId
        ? { ...complaint, deleteRequested: false, deleteReason: null, deleteRequestedAt: null }
        : complaint));
    } catch (err) {
      window.alert(getErrorMessage(err) || 'Unable to cancel the deletion request.');
    }
  }

  return (
    <MainLayout>
      <div className="tracking-page">
        <section className="tracking-page__hero" aria-labelledby="tracking-title">
          <div className="tracking-page__hero-copy">
            <span className="tracking-page__eyebrow"><span aria-hidden="true">●</span> BadService.in · Consumer support</span>
            <h1 id="tracking-title">Track your complaint</h1>
            <p>See the latest status, verification notes, and recorded company updates in one place.</p>
          </div>

          <form className="tracking-search" onSubmit={(event) => { event.preventDefault(); handleSearch(); }}>
            <label htmlFor="tracking-query">Complaint reference ID or registered mobile number</label>
            <div className="tracking-search__controls">
              <span className="tracking-search__icon" aria-hidden="true">⌕</span>
              <input
                id="tracking-query"
                type="text"
                inputMode="text"
                autoComplete="off"
                placeholder="e.g. complaint ID or 10-digit mobile number"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-describedby="tracking-search-help"
              />
              <button type="submit" disabled={loading}>
                {loading ? <><span className="tracking-spinner" aria-hidden="true" /> Searching</> : 'Track status'}
              </button>
            </div>
            <p id="tracking-search-help">Use the reference ID from your submission, or the mobile number you registered with.</p>
          </form>
        </section>

        {error && !loading && (
          <div className="tracking-state tracking-state--error" role="alert">
            <span className="tracking-state__icon" aria-hidden="true">!</span>
            <div><strong>{error.includes('Enter your') ? 'Details needed' : 'We couldn’t find that complaint'}</strong><p>{error}</p></div>
            {searched && <button type="button" onClick={() => handleSearch()}>Try again</button>}
          </div>
        )}

        {loading && (
          <div className="tracking-state tracking-state--loading" role="status" aria-live="polite">
            <span className="tracking-spinner tracking-spinner--large" aria-hidden="true" />
            <div><strong>Looking up your complaint</strong><p>Fetching the latest available status and updates…</p></div>
            <div className="tracking-skeleton" aria-hidden="true"><i /><i /><i /></div>
          </div>
        )}

        {!loading && searched && !error && complaints.length === 0 && (
          <div className="tracking-state tracking-state--empty" role="status">
            <span className="tracking-state__icon" aria-hidden="true">?</span>
            <h2>No complaint found</h2>
            <p>Check the reference ID or use the mobile number provided when you submitted the complaint.</p>
            <Link className="tracking-button tracking-button--secondary" to="/file-complaint">File a complaint</Link>
          </div>
        )}

        {!loading && complaints.length > 0 && (
          <section className="tracking-results" aria-label="Complaint tracking results">
            <div className="tracking-results__heading">
              <div><span className="tracking-page__eyebrow">Your records</span><h2>Tracking results</h2></div>
              <span className="tracking-results__count">{complaints.length} {complaints.length === 1 ? 'complaint' : 'complaints'}</span>
            </div>

            {complaints.map((complaint) => {
              const currentStep = getStepIndex(complaint.status);
              const history = Array.isArray(complaint.statusHistory) ? complaint.statusHistory : [];
              const companyUpdates = history.filter((update) => update.to === 'COMPANY_RESPONDED');
              const statusClass = (complaint.status || 'pending').toLowerCase().replace(/_/g, '-');
              return (
                <article className="tracking-result-card" key={complaint.id}>
                  <header className="tracking-result-card__header">
                    <div className="tracking-result-card__title-group">
                      <div className="tracking-result-card__badges">
                        <span className="tracking-id">Reference <strong>{complaint.id}</strong></span>
                        <span className={`tracking-type tracking-type--${complaint.type === 'Service' ? 'service' : 'product'}`}>
                          {complaint.type === 'Service' ? 'Service' : 'Product'}
                        </span>
                      </div>
                      <h3>{complaint.title}</h3>
                      <p className="tracking-result-card__company">
                        <strong>{complaint.company}</strong>
                        {complaint.productName && complaint.productName !== complaint.company && <> · {complaint.productName}</>}
                        {complaint.serviceType && <> · {complaint.serviceType}</>}
                      </p>
                    </div>
                    <span className={`tracking-status tracking-status--${statusClass}`}><i aria-hidden="true" />{formatStatus(complaint.status || 'PENDING')}</span>
                  </header>

                  <dl className="tracking-details">
                    <div><dt>Submitted</dt><dd>{formatDate(complaint.createdAt)}</dd></div>
                    {complaint.category && <div><dt>Category</dt><dd>{complaint.category}</dd></div>}
                    <div><dt>Last updated</dt><dd>{formatDate(complaint.updatedAt || complaint.statusChangedAt || complaint.createdAt)}</dd></div>
                  </dl>

                  {complaint.status !== 'REJECTED' && !complaint.isDeleted && (
                    <section className="tracking-progress" aria-label={`Complaint progress: ${formatStatus(complaint.status)}`}>
                      <div className="tracking-section-heading"><div><span className="tracking-section-heading__icon" aria-hidden="true">01</span><div><h4>Status progress</h4><p>Progress reflects the latest status recorded for this complaint.</p></div></div></div>
                      <ol className="tracking-timeline">
                        {STATUS_STEPS.map((step, index) => {
                          const complete = currentStep >= index;
                          const active = currentStep === index;
                          return (
                            <li className={`tracking-timeline__step${complete ? ' is-complete' : ''}${active ? ' is-current' : ''}`} key={step.key}>
                              <span className="tracking-timeline__marker" aria-hidden="true">{complete ? '✓' : index + 1}</span>
                              <div><strong>{step.label}</strong><p>{step.desc}</p></div>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  )}

                  {(complaint.statusNote || complaint.deleteAdminNote || complaint.status === 'REJECTED' || complaint.isDeleted) && (
                    <section className="tracking-note tracking-note--admin">
                      <div className="tracking-note__heading"><span aria-hidden="true">A</span><div><h4>Admin verification note</h4><p>Update from the BadService.in review team</p></div></div>
                      <p>{complaint.deleteAdminNote || complaint.statusNote || 'This complaint was not approved for publication.'}</p>
                      {(complaint.status === 'REJECTED' || complaint.isDeleted) && <span className="tracking-note__tag">{complaint.isDeleted ? 'Archived' : 'Not approved'}</span>}
                    </section>
                  )}

                  {(complaint.status === 'COMPANY_RESPONDED' || complaint.status === 'RESOLVED' || companyUpdates.length > 0) && (
                    <section className="tracking-note tracking-note--company">
                      <div className="tracking-note__heading"><span aria-hidden="true">C</span><div><h4>Company response status</h4><p>Admin-recorded status update; no direct company message is included</p></div></div>
                      {companyUpdates.length > 0 ? companyUpdates.map((update, index) => (
                        <div className="tracking-note__response" key={`${update.changedAt || 'response'}-${index}`}>
                          <p>{update.note || 'A company response was recorded.'}</p>
                          <time>{formatDate(update.changedAt, true)}</time>
                        </div>
                      )) : <p className="tracking-note__unavailable">A response status is recorded, but no response message is included in the tracking record.</p>}
                    </section>
                  )}

                  {history.length > 0 && (
                    <details className="tracking-history">
                      <summary><span><strong>Update history</strong><small>{history.length} {history.length === 1 ? 'update' : 'updates'} recorded</small></span><span aria-hidden="true">＋</span></summary>
                      <ol>
                        {history.map((update, index) => (
                          <li key={`${update.changedAt || 'update'}-${index}`}>
                            <span className="tracking-history__dot" aria-hidden="true" />
                            <div><strong>{update.from ? `${formatStatus(update.from)} → ` : ''}{formatStatus(update.to)}</strong>
                              {update.note && <p>{update.note}</p>}
                              <time>{formatDate(update.changedAt, true)}</time>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}

                  {complaint.deleteRequested && (
                    <div className="tracking-delete-notice">
                      <div><strong>Deletion request submitted</strong><p>{complaint.deleteReason || 'Your request is waiting for admin review.'}</p></div>
                      <button type="button" onClick={() => handleCancelDelete(complaint.id)}>Cancel request</button>
                    </div>
                  )}

                  <footer className="tracking-result-card__footer">
                    <Link className="tracking-button tracking-button--primary" to={`/complaints/${encodeURIComponent(complaint.id)}`}>View complaint details <span aria-hidden="true">↗</span></Link>
                    {!complaint.deleteRequested && !complaint.isDeleted && <button className="tracking-button tracking-button--quiet" type="button" onClick={() => handleOpenDeleteModal(complaint.id)}>Request deletion</button>}
                  </footer>
                </article>
              );
            })}
          </section>
        )}

        {!searched && (
          <section className="tracking-guide" aria-labelledby="tracking-guide-title">
            <div className="tracking-guide__heading"><span className="tracking-section-heading__icon" aria-hidden="true">?</span><div><h2 id="tracking-guide-title">A clearer view of every update</h2><p>Use your submission details to securely find your complaint progress.</p></div></div>
            <div className="tracking-guide__items">
              <div><span aria-hidden="true">01</span><h3>Look up your record</h3><p>Enter a complaint reference ID or the registered mobile number to find submitted complaints.</p></div>
              <div><span aria-hidden="true">02</span><h3>Follow verified updates</h3><p>Review the latest status, admin notes, and any company response recorded in the complaint history.</p></div>
              <div><span aria-hidden="true">03</span><h3>Need to report an issue?</h3><p>Submit a new complaint with clear details and supporting evidence.</p><Link to="/file-complaint">File a complaint <span aria-hidden="true">→</span></Link></div>
            </div>
          </section>
        )}

        {deleteTargetId && (
          <div className="tracking-modal-backdrop" role="presentation" onClick={() => !deleteSubmitting && setDeleteTargetId(null)}>
            <section className="tracking-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title" onClick={(event) => event.stopPropagation()}>
              <button className="tracking-delete-modal__close" type="button" aria-label="Close dialog" onClick={() => setDeleteTargetId(null)} disabled={deleteSubmitting}>×</button>
              <span className="tracking-section-heading__icon tracking-section-heading__icon--orange" aria-hidden="true">!</span>
              <h2 id="delete-modal-title">Request complaint removal</h2>
              <p>Removal requests are reviewed by an administrator. Tell us why you would like this complaint removed.</p>
              {modalFeedback.text && <div className={`tracking-modal-feedback tracking-modal-feedback--${modalFeedback.type}`} role={modalFeedback.type === 'error' ? 'alert' : 'status'}>{modalFeedback.text}</div>}
              <form onSubmit={handleSubmitDeleteRequest}>
                <label htmlFor="delete-reason">Reason for request</label>
                <textarea id="delete-reason" rows={4} value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} placeholder="For example, the issue has been resolved with the company." required />
                <div className="tracking-delete-modal__actions">
                  <button className="tracking-button tracking-button--quiet" type="button" onClick={() => setDeleteTargetId(null)} disabled={deleteSubmitting}>Cancel</button>
                  <button className="tracking-button tracking-button--danger" type="submit" disabled={deleteSubmitting}>{deleteSubmitting ? 'Submitting…' : 'Submit request'}</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
