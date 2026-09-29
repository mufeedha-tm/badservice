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
            <Link to={item.to}>
              {item.icon && (
                <span className="nav-item-icon" aria-hidden="true" style={{ marginRight: '0.35rem' }}>
                  {item.icon}
                </span>
              )}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}