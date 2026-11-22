import { Link } from 'react-router-dom';

export default function Logo({ className = '', compact = false, to = '/', ariaLabel = 'BadService.in home' }) {
  return (
    <Link
      className={`logo${compact ? ' logo--compact' : ''}${className ? ` ${className}` : ''}`}
      to={to}
      aria-label={ariaLabel}
    >
      <span className="logo__mark-frame" aria-hidden="true">
        <img className="logo__mark-image" src="/badservice-shield.png" alt="" />
      </span>
      {!compact && <span className="logo__wordmark">BadService<span className="logo__domain">.in</span></span>}
    </Link>
  );
}
