import { Link } from 'react-router-dom';

export default function EmptyState({ title, message, actionTo = '/file-complaint', actionLabel = 'File a Complaint' }) {
  return (
    <div className="empty-state" role="status">
      <h3>{title}</h3>
      <p>{message}</p>
      {actionTo && (
        <Link className="primary-cta" to={actionTo}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
