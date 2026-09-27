import { Link } from 'react-router-dom';

export default function ComplaintActionButton({ label, complaintId }) {
  return (
    <Link className="complaint-action-button" to={`/complaints/${encodeURIComponent(complaintId)}`}>
      {label}
    </Link>
  );
}