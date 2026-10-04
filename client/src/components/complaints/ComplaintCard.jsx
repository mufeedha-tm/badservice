import { Link } from 'react-router-dom';
import { getComplaintMedia } from '../../utils/complaintMedia.js';
import ComplaintActionButton from './ComplaintActionButton.jsx';
import ComplaintBadge from './ComplaintBadge.jsx';
import ComplaintMeta from './ComplaintMeta.jsx';

export default function ComplaintCard({ complaint }) {
  const media = getComplaintMedia(complaint);
  const thumbnail = media[0];

  return (
    <article className="complaint-card" aria-labelledby={`complaint-${complaint.id}`}>
      {thumbnail && (
        <Link className="complaint-card__thumb" to={`/complaints/${encodeURIComponent(complaint.id)}`}>
          {thumbnail.type === 'video' ? (
            <span className="complaint-card__thumb-video">
              <video src={thumbnail.url} muted playsInline preload="metadata" />
              <span className="media-type-chip">Video</span>
            </span>
          ) : (
            <span className="complaint-card__thumb-image">
              <img src={thumbnail.url} alt="" />
              <span className="media-type-chip">Photo</span>
            </span>
          )}
        </Link>
      )}
      {complaint.badge && <ComplaintBadge badge={complaint.badge} />}
      <h2 className="complaint-card__title" id={`complaint-${complaint.id}`}>
        {complaint.title}
      </h2>
      <ComplaintMeta items={complaint.metadata} />
      <ComplaintActionButton label={complaint.actionLabel} complaintId={complaint.id} />
    </article>
  );
}
