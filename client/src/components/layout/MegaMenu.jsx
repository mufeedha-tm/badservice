import { useNavigation } from '../../context/NavigationContext.jsx';
import MegaMenuColumn from './MegaMenuColumn.jsx';

export default function MegaMenu({ id, open, panelRef }) {
  const { navigation } = useNavigation();
  const columns = navigation?.megaMenuColumns || [];

  return (
    <nav
      ref={panelRef}
      className="mega-menu"
      id={id}
      aria-label="All services and categories"
      hidden={!open}
    >
      {columns.map((column) => (
        <MegaMenuColumn column={column} key={column.id} />
      ))}
    </nav>
  );
}