import { Link } from 'react-router-dom';

export default function DepartmentItem({ item }) {
  if (typeof item === 'object' && item !== null) {
    return (
      <li className="department-item">
        <Link to={item.to || '#'}>{item.label || item.name}</Link>
      </li>
    );
  }

  return <li className="department-item">{item}</li>;
}