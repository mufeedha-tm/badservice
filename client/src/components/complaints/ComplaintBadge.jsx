export default function ComplaintBadge({ badge }) {
  return <span className={`complaint-badge complaint-badge--${badge.tone}`}>{badge.label}</span>;
}