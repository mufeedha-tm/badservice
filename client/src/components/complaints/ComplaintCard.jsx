import { useState } from 'react';
import { Link } from 'react-router-dom';
import EvidenceCarousel from '../media/EvidenceCarousel.jsx';
import ComplaintActionButton from './ComplaintActionButton.jsx';
import ComplaintBadge from './ComplaintBadge.jsx';
import ComplaintMeta from './ComplaintMeta.jsx';
import { useAccount } from '../../context/AccountContext.jsx';
import { deleteAdminComplaint } from '../../services/api.js';

export default function ComplaintCard({ complaint, onRemoved }) {
  const { account } = useAccount();
  const isAdmin = account && account.role === 'ADMIN';
  const [removed, setRemoved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleAdminRemove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Admin: Remove "${complaint.title}" from the website? The complaint will be safely preserved in the database archive.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAdminComplaint(complaint.id, 'Removed by admin from website card');
      setRemoved(true);
      if (onRemoved) onRemoved(complaint.id);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to remove complaint.');
    } finally {
      setIsDeleting(false);
    }
  }

  if (removed) {
    return (
      <article className="complaint-card" style={{ padding: '1rem', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '8px', color: '#721c24' }}>
        <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>
          ✓ Complaint removed from website & stored in database archive.
        </p>
      </article>
    );
  }

  return (
    <article className="complaint-card" aria-labelledby={`complaint-${complaint.id}`} style={{ position: 'relative' }}>
      {isAdmin && (
        <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
          <button
            type="button"
            onClick={handleAdminRemove}
            disabled={isDeleting}
            style={{
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
            title="Admin Quick Action: Remove from Website"
          >
            {isDeleting ? 'Removing…' : '🗑️ Remove (Admin)'}
          </button>
        </div>
      )}
      <Link className="complaint-card__evidence-link" to={`/complaints/${encodeURIComponent(complaint.id)}`} aria-label={`Open ${complaint.title}`}>
        <EvidenceCarousel complaint={complaint} category={complaint.category} productName={complaint.productName || complaint.company || 'Product'} compact />
      </Link>
      {complaint.badge && <ComplaintBadge badge={complaint.badge} />}
      <h2 className="complaint-card__title" id={`complaint-${complaint.id}`}>{complaint.title}</h2>
      <ComplaintMeta items={complaint.metadata} />
      <ComplaintActionButton label={complaint.actionLabel} complaintId={complaint.id} />
    </article>
  );
}
