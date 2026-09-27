import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ComplaintGrid from '../components/complaints/ComplaintGrid.jsx';
import ComplaintToolbar from '../components/complaints/ComplaintToolbar.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import { useNavigation } from '../context/NavigationContext.jsx';
import { getCategories, searchComplaints } from '../services/api.js';
import { getCategoriesForSlug } from '../utils/categoryForSlug.js';
import { getNavigationTitle } from '../utils/navigationTitle.js';
import PlaceholderPage from './PlaceholderPage.jsx';

export default function CategoryPage() {
  const { slug } = useParams();
  const { navigation, status: navigationStatus } = useNavigation();
  const [result, setResult] = useState({ status: 'loading', categories: [], complaints: [] });

  useEffect(() => {
    let isCurrent = true;

    if (navigationStatus === 'loading') return () => { isCurrent = false; };
    if (navigationStatus === 'error') {
      setResult({ status: 'error', categories: [], complaints: [] });
      return () => { isCurrent = false; };
    }

    const requestedCategories = getCategoriesForSlug(slug, navigation);
    if (!requestedCategories.length) {
      setResult({ status: 'placeholder', categories: [], complaints: [] });
      return () => { isCurrent = false; };
    }

    setResult({ status: 'loading', categories: requestedCategories, complaints: [] });
    getCategories()
      .then((availableCategories) => {
        if (!isCurrent) return;
        const categories = requestedCategories.filter((category) => availableCategories.includes(category));
        if (!categories.length) {
          setResult({ status: 'placeholder', categories: [], complaints: [] });
          return;
        }

        Promise.all(categories.map((category) => searchComplaints({ category })))
          .then((results) => {
            if (!isCurrent) return;
            const complaints = [...new Map(results.flat().map((complaint) => [complaint.id, complaint])).values()];

            setResult({
              status: complaints.length ? 'success' : 'empty',
              categories,
              complaints,
            });
          })
          .catch(() => {
            if (isCurrent) setResult({ status: 'error', categories, complaints: [] });
          });
      })
      .catch(() => {
        if (isCurrent) setResult({ status: 'error', categories: requestedCategories, complaints: [] });
      });

    return () => { isCurrent = false; };
  }, [navigation, navigationStatus, slug]);

  if (result.status === 'placeholder') {
    return <PlaceholderPage title={getNavigationTitle(slug, navigation)} />;
  }

  return (
    <MainLayout>
      <section className="complaint-page" aria-labelledby="category-page-title">
        <h1 className="visually-hidden" id="category-page-title">
          {getNavigationTitle(slug, navigation)}
        </h1>
        {result.categories.length > 0 && (
          <ComplaintToolbar search={{ category: result.categories.join(', ') }} resultCount={result.complaints.length} />
        )}
        {result.status === 'loading' && <p className="complaint-list-state" role="status">Loading complaints...</p>}
        {result.status === 'error' && <p className="complaint-list-state complaint-list-state--error" role="alert">Unable to load this category.</p>}
        {result.status === 'empty' && <p className="complaint-list-state" role="status">No complaints in this category yet.</p>}
        {result.status === 'success' && <ComplaintGrid complaints={result.complaints} />}
      </section>
    </MainLayout>
  );
}