import { Link } from 'react-router-dom';

export default function MegaMenuItem({ item }) {
  const label = item.label?.name ?? item.label;
  const examples = item.examples?.name ?? item.examples;

  return (
    <li className="mega-menu__item">
      <Link className="mega-menu__item-link" to={item.to || `/categories/${item.id}`}>
        <span className="mega-menu__item-label">{label}</span>
        {examples && <span className="mega-menu__item-examples">{examples}</span>}
      </Link>
    </li>
  );
}