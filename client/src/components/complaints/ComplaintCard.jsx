import { useState } from 'react';
import { Link } from 'react-router-dom';
import EvidenceCarousel from '../media/EvidenceCarousel.jsx';
import ComplaintActionButton from './ComplaintActionButton.jsx';
import ComplaintBadge from './ComplaintBadge.jsx';
import ComplaintMeta from './ComplaintMeta.jsx';
import ComplaintCommentsModal from './ComplaintCommentsModal.jsx';

export default function ComplaintCard({ complaint }) {
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <article className="complaint-card" aria-labelledby={`complaint-${complaint.id}`} style={{ position: 'relative' }}>
      <Link className="complaint-card__evidence-link" to={`/complaints/${encodeURIComponent(complaint.id)}`} aria-label={`Open ${complaint.title}`}>
        <EvidenceCarousel complaint={complaint} category={complaint.category} productName={complaint.productName || complaint.company || 'Product'} compact />
      </Link>
      {complaint.badge && <ComplaintBadge badge={complaint.badge} />}
      <h2 className="complaint-card__title" id={`complaint-${complaint.id}`}>{complaint.title}</h2>
      <ComplaintMeta items={complaint.metadata} />

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ComplaintActionButton label={complaint.actionLabel || 'View Details'} complaintId={complaint.id} />
        </div>
        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0 8px',
            height: '32px',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#334155',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'background-color 0.15s',
          }}
          title="Read and post public comments"
        >
          💬 Comments
        </button>
      </div>

      <ComplaintCommentsModal
        complaintId={complaint.id}
        complaintTitle={complaint.title}
        companyName={complaint.company}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />
    </article>
  );
}
