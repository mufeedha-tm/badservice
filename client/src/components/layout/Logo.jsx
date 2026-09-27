import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <Link className="logo" to="/" aria-label="BadService.in home">
      badservice<span>.in</span>
    </Link>
  );
}