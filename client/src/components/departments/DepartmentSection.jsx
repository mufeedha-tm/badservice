import DepartmentItem from './DepartmentItem.jsx';

export default function DepartmentSection({ department }) {
  return (
    <section className="department-section" aria-labelledby={`department-${department.id}`}>
      <h3 id={`department-${department.id}`}>
        {department.title}
        {department.count && <span> ({department.count})</span>}
      </h3>
      <ul>
        {department.items.map((item) => (
          <DepartmentItem item={item} key={item} />
        ))}
      </ul>
    </section>
  );
}