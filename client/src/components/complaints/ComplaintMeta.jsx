export default function ComplaintMeta({ items }) {
  return (
    <p className="complaint-meta">
      {items.map((item, index) => (
        <span className="complaint-meta__part" key={`${item}-${index}`}>
          {index > 0 && <span className="complaint-meta__separator" aria-hidden="true">|</span>}
          {item}
        </span>
      ))}
    </p>
  );
}