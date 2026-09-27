import { Link } from 'react-router-dom';
import { useNavigation } from '../../context/NavigationContext.jsx';

export default function SecondaryNavigation() {
  const { navigation } = useNavigation();
  const items = navigation?.secondaryNavigationItems || [];

  return (
    <nav className="secondary-navigation" aria-label="Complaint categories">
      <ul>
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}