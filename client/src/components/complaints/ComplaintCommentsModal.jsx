import { useEffect, useState } from 'react';
import { useAccount } from '../../context/AccountContext.jsx';
import { getComments, postComment, deleteComment, getErrorMessage } from '../../services/api.js';

export default function ComplaintCommentsModal({
  complaintId,
  complaintTitle = 'Complaint Discussion',
  companyName = '',
  isOpen,
  onClose,
}) {
  const { account } = useAccount();
  const isAdmin = account && account.role === 'ADMIN';

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState(account?.name || '');
  const [authorEmail, setAuthorEmail] = useState(account?.email || '');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (account?.name && !authorName) setAuthorName(account.name);
    if (account?.email && !authorEmail) setAuthorEmail(account.email);
  }, [account]);

  useEffect(() => {
    if (isOpen && complaintId) {
      loadComments();
    }
  }, [isOpen, complaintId]);

  async function loadComments() {
    setLoading(true);
    setError('');
    try {
      const data = await getComments(complaintId);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!authorName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!body.trim()) {
      setError('Please write a comment message.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const newComment = await postComment(complaintId, {
        authorName: authorName.trim(),
        authorEmail: authorEmail.trim() || undefined,
        body: body.trim(),
      });
      setComments((prev) => [...prev, newComment]);
      setBody('');
      setSuccess('✓ Comment posted successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to post comment.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId) {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to delete comment.'));
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="complaint-comments-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Complaint Comments"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="complaint-comments-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '88vh',
          backgroundColor: '#fff',
          borderRadius: '14px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.22)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInUp 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: '#f8fafc',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e65100', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              💬 Discussion & Consumer Reviews
            </span>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, lineHeight: 1.3 }}>
              {companyName ? `${companyName} — ` : ''}{complaintTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            style={{
              background: '#e2e8f0',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1rem',
              color: '#334155',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Comments List */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {loading && (
            <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', margin: '2rem 0' }}>
              Loading comments…
            </p>
          )}

          {!loading && comments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💭</div>
              <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>No comments yet</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>Be the first to share your experience or ask a question!</p>
            </div>
          )}

          {!loading && comments.map((cmt) => (
            <div
              key={cmt.id}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                  {cmt.authorName}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {cmt.createdAt ? new Date(cmt.createdAt).toLocaleDateString() : ''}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                {cmt.body}
              </p>
              {isAdmin && (
                <div style={{ marginTop: '8px', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => handleDelete(cmt.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Delete (Admin)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comment Input Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
          }}
        >
          {error && (
            <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: '0 0 8px 0', fontWeight: 600 }}>
              {error}
            </p>
          )}
          {success && (
            <p style={{ color: '#16a34a', fontSize: '0.8rem', margin: '0 0 8px 0', fontWeight: 600 }}>
              {success}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Your Name *"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
              required
            />
            <input
              type="email"
              placeholder="Email (Optional)"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <textarea
              rows={2}
              placeholder="Write a comment or share your experience…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              required
            />
            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: '#232f3e',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0 16px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background-color 0.2s',
              }}
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
