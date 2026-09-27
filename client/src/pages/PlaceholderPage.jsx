import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';

export default function PlaceholderPage({ title, message = 'This page will be available in a future phase.' }) {
  return (
    <MainLayout>
      <section className="route-placeholder" aria-labelledby="route-placeholder-title">
        <p className="route-placeholder__eyebrow">BadService.in</p>
        <h1 id="route-placeholder-title">{title}</h1>
        <p>{message}</p>
        <Link to="/complaints">Browse all complaints</Link>
      </section>
    </MainLayout>
  );
}