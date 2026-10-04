export default function AllMenuButton({ expanded, menuId, onClick, buttonRef }) {
  return (
    <button
      ref={buttonRef}
      className="all-menu-button"
      type="button"
      aria-expanded={expanded}
      aria-controls={menuId}
      onClick={onClick}
    >
      <span className="all-menu-button__icon" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="all-menu-button__label">All Categories</span>
    </button>
  );
}