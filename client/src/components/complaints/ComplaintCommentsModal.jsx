import { useEffect, useState } from 'react';
import { useAccount } from '../../context/AccountContext.jsx';
import { getComments, postComment, editComment, deleteComment, getErrorMessage } from '../../services/api.js';

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

  // Comment edit state
  const [editingId, setEditingId] = useState(null);
  const [editingBody, setEditingBody] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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
      // Store locally created comment IDs in localStorage so the user can edit/delete their comment even if guest
      try {
        const myComments = JSON.parse(localStorage.getItem('my_comment_ids') || '[]');
        myComments.push(newComment.id);
        localStorage.setItem('my_comment_ids', JSON.stringify(myComments));
      } catch (_e) {}
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

  async function handleDelete(commentId, authorEmailToDelete = '') {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(commentId, authorEmailToDelete || account?.email || '');
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to delete comment.'));
    }
  }

  async function handleSaveEdit(cmt) {
    if (!editingBody.trim()) {
      alert('Comment message cannot be empty.');
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await editComment(cmt.id, {
        body: editingBody.trim(),
        authorEmail: cmt.authorEmail || account?.email || '',
      });
      setComments((prev) => prev.map((c) => (c.id === cmt.id ? { ...c, body: updated.body || editingBody.trim() } : c)));
      setEditingId(null);
      setEditingBody('');
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to save comment edits.'));
    } finally {
      setSavingEdit(false);
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
          maxWidth: '360px',
          maxHeight: '62vh',
          backgroundColor: '#fff',
          borderRadius: '10px',
          boxShadow: '0 16px 36px rgba(0,0,0,0.22)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInUp 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            backgroundColor: '#f8fafc',
          }}
        >
          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#e65100', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              💬 Discussion
            </span>
            <h3 style={{ margin: '1px 0 0 0', fontSize: '0.86rem', color: '#0f172a', fontWeight: 700, lineHeight: 1.2 }}>
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
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.78rem',
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
            padding: '10px 12px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
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

          {!loading && comments.map((cmt) => {
            let myCommentIds = [];
            try {
              myCommentIds = JSON.parse(localStorage.getItem('my_comment_ids') || '[]');
            } catch (_e) {}

            const isAuthorOrAdmin = Boolean(
              isAdmin ||
              myCommentIds.includes(cmt.id) ||
              (account?.email && cmt.authorEmail && account.email.toLowerCase() === cmt.authorEmail.toLowerCase()) ||
              (account?.name && cmt.authorName && account.name.toLowerCase() === cmt.authorName.toLowerCase()) ||
              (!cmt.authorEmail && !account) // If viewing as anonymous and comment has no email, let user manage
            );
            const isEditing = editingId === cmt.id;

            return (
              <div
                key={cmt.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {(cmt.authorName || 'U')[0].toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b' }}>
                      {cmt.authorName}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {cmt.createdAt ? new Date(cmt.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>

                  {isAuthorOrAdmin && !isEditing && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(cmt.id);
                          setEditingBody(cmt.body);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cmt.id, cmt.authorEmail)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ marginTop: '4px' }}>
                    <textarea
                      value={editingBody}
                      onChange={(e) => setEditingBody(e.target.value)}
                      rows={2}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={savingEdit}
                        style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(cmt)}
                        disabled={savingEdit}
                        style={{ padding: '3px 10px', fontSize: '0.72rem', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {savingEdit ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                    {cmt.body}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Comment Input Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '8px 12px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
          }}
        >
          {error && (
            <p style={{ color: '#dc2626', fontSize: '0.75rem', margin: '0 0 6px 0', fontWeight: 600 }}>
              {error}
            </p>
          )}
          {success && (
            <p style={{ color: '#16a34a', fontSize: '0.75rem', margin: '0 0 6px 0', fontWeight: 600 }}>
              {success}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
            <input
              type="text"
              placeholder="Your Name *"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
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
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <textarea
              rows={2}
              placeholder="Write a comment…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                minHeight: '36px',
                maxHeight: '60px',
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
                borderRadius: '6px',
                padding: '0 12px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background-color 0.2s',
              }}
            >
              {submitting ? '…' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
