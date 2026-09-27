import { Link } from 'react-router-dom';

export default function MegaMenuItem({ item }) {
  return (
    <li className="mega-menu__item">
      <Link className="mega-menu__item-link" to={item.to || `/categories/${item.id}`}>
        <span className="mega-menu__item-label">{item.label}</span>
        {item.examples && <span className="mega-menu__item-examples">{item.examples}</span>}
      </Link>
    </li>
  );
}