import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';

export default function NotFoundPage() {
  return (
    <MainLayout>
      <section className="not-found" aria-labelledby="not-found-title">
        <p className="route-placeholder__eyebrow">BadService.in</p>
        <h1 id="not-found-title">Page not found</h1>
        <Link to="/">Return to the home page</Link>
      </section>
    </MainLayout>
  );
}