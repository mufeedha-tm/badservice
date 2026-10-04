export default function Skeleton({ className = '', lines = 0 }) {
  return (
    <div className={`skeleton-block ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} className="skeleton-line" />
      ))}
    </div>
  );
}
