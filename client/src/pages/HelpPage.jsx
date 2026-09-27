import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';

export default function HelpPage() {
  return (
    <MainLayout>
      <section className="route-placeholder" aria-labelledby="help-page-title">
        <p className="route-placeholder__eyebrow">BadService.in</p>
        <h1 id="help-page-title">Help</h1>
        <p>Choose where you need help:</p>
        <ul className="help-links">
          <li><Link to="/complaints">Browse complaints</Link></li>
          <li><Link to="/companies">Browse companies</Link></li>
          <li><Link to="/file-complaint">File a complaint</Link></li>
        </ul>
      </section>
    </MainLayout>
  );
}