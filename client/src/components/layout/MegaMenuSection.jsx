import { Link } from 'react-router-dom';
import MegaMenuItem from './MegaMenuItem.jsx';

function MegaMenuList({ items }) {
  return (
    <ul className="mega-menu__list">
      {items.map((item) => (
        <MegaMenuItem item={item} key={item.id} />
      ))}
    </ul>
  );
}

export default function MegaMenuSection({ section }) {
  return (
    <section className="mega-menu__section">
      <h2>{section.title}</h2>
      {section.groups ? (
        section.groups.map((group) => (
          <section className="mega-menu__group" key={group.id}>
            <h3>
              <Link to={`/categories/${group.id}`}>{group.title}</Link>
            </h3>
            <MegaMenuList items={group.items} />
          </section>
        ))
      ) : (
        <MegaMenuList items={section.items} />
      )}
    </section>
  );
}