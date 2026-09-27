import ComplaintActionButton from './ComplaintActionButton.jsx';
import ComplaintBadge from './ComplaintBadge.jsx';
import ComplaintMeta from './ComplaintMeta.jsx';

export default function ComplaintCard({ complaint }) {
  return (
    <article className="complaint-card" aria-labelledby={`complaint-${complaint.id}`}>
      {complaint.badge && <ComplaintBadge badge={complaint.badge} />}
      <h2 className="complaint-card__title" id={`complaint-${complaint.id}`}>
        {complaint.title}
      </h2>
      <ComplaintMeta items={complaint.metadata} />
      <ComplaintActionButton label={complaint.actionLabel} complaintId={complaint.id} />
    </article>
  );
}