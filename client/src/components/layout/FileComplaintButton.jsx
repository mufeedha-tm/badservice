import { Link } from 'react-router-dom';

export default function FileComplaintButton() {
  return (
    <Link className="file-complaint-button" to="/file-complaint">
      🔥 File Complaint
    </Link>
  );
}