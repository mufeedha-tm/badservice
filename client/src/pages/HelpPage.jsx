import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';

export default function HelpPage() {
  return (
    <MainLayout>
      <section className="help-hub" aria-labelledby="help-page-title">
        <div className="help-hub__intro">
          <p className="help-hub__eyebrow"><span aria-hidden="true" /> BadService.in</p>
          <h1 id="help-page-title">Help</h1>
          <p>Choose where you need help:</p>
        </div>
        <ul className="help-links">
          <li>
            <Link to="/complaints">
              <span className="help-links__icon" aria-hidden="true">01</span>
              <span className="help-links__label">Browse complaints</span>
              <span className="help-links__arrow" aria-hidden="true">↗</span>
            </Link>
          </li>
          <li>
            <Link to="/companies">
              <span className="help-links__icon" aria-hidden="true">02</span>
              <span className="help-links__label">Browse companies</span>
              <span className="help-links__arrow" aria-hidden="true">↗</span>
            </Link>
          </li>
          <li>
            <Link to="/file-complaint">
              <span className="help-links__icon" aria-hidden="true">03</span>
              <span className="help-links__label">File a complaint</span>
              <span className="help-links__arrow" aria-hidden="true">↗</span>
            </Link>
          </li>
        </ul>
      </section>
    </MainLayout>
  );
}
