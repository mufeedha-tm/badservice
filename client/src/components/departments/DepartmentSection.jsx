import DepartmentItem from './DepartmentItem.jsx';

export default function DepartmentSection({ department }) {
  const items = department.items || [];

  return (
    <section className="department-section" aria-labelledby={`department-${department.id}`}>
      <h3 id={`department-${department.id}`}>
        {department.title}
        {department.count ? <span> ({department.count})</span> : null}
      </h3>
      <ul>
        {items.map((item, index) => {
          const key = typeof item === 'object' && item !== null
            ? (item.to || item.label || index)
            : item;
          return <DepartmentItem item={item} key={key} />;
        })}
      </ul>
    </section>
  );
}