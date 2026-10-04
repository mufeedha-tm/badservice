import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ComplaintGrid from '../components/complaints/ComplaintGrid.jsx';
import ComplaintToolbar from '../components/complaints/ComplaintToolbar.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import { useNavigation } from '../context/NavigationContext.jsx';
import { getCategories, searchComplaints } from '../services/api.js';
import { getCategoryFilterForSlug } from '../utils/categoryForSlug.js';
import { getNavigationTitle } from '../utils/navigationTitle.js';
import { getShowcaseImage } from '../utils/showcaseImages.js';

export default function CategoryPage() {
  const { slug } = useParams();
  const { navigation, status: navigationStatus } = useNavigation();
  const [result, setResult] = useState({
    status: 'loading',
    title: '',
    categories: [],
    complaints: [],
  });

  useEffect(() => {
    let isCurrent = true;

    if (navigationStatus === 'loading') return () => { isCurrent = false; };

    setResult((prev) => ({ ...prev, status: 'loading' }));

    getCategories()
      .then((availableCategories) => {
        if (!isCurrent) return;

        // 1. Check navigation and known subcategories map
        const filterInfo = getCategoryFilterForSlug(slug, navigation);
        let requestedCategories = filterInfo.categories || [];
        const subcategory = filterInfo.subcategory || null;
        let title = filterInfo.title || getNavigationTitle(slug, navigation) || slug;

        // 2. If not found in navigation mapping, look for direct match in DB categories
        if (!requestedCategories.length) {
          const directMatch = (availableCategories || []).find((c) => {
            const cSlug = c.slug || (c.name ? c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '');
            return cSlug.toLowerCase() === slug.toLowerCase() ||
                   (c.name && c.name.toLowerCase() === slug.toLowerCase());
          });

          if (directMatch) {
            requestedCategories = [directMatch.name];
            title = directMatch.name;
          }
        }

        if (!requestedCategories.length) {
          setResult({
            status: 'not-found',
            title,
            categories: [],
            complaints: [],
          });
          return;
        }

        // 3. Match against availableCategories safely
        const matchedCategories = requestedCategories.filter((categoryName) =>
          (availableCategories || []).some((cat) => {
            const catName = typeof cat === 'object' ? cat.name : cat;
            return catName && catName.toLowerCase() === categoryName.toLowerCase();
          })
        );

        const categoriesToQuery = matchedCategories.length ? matchedCategories : requestedCategories;

        // 4. Query complaints
        Promise.all(categoriesToQuery.map((category) => searchComplaints({ category, subcategory })))
          .then((results) => {
            if (!isCurrent) return;
            const complaints = [...new Map(results.flat().map((complaint) => [complaint.id, complaint])).values()];

            setResult({
              status: complaints.length ? 'success' : 'empty',
              title,
              categories: categoriesToQuery,
              complaints,
            });
          })
          .catch(() => {
            if (isCurrent) {
              setResult({
                status: 'error',
                title,
                categories: categoriesToQuery,
                complaints: [],
              });
            }
          });
      })
      .catch(() => {
        if (isCurrent) {
          setResult({
            status: 'error',
            title: getNavigationTitle(slug, navigation) || slug,
            categories: [],
            complaints: [],
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [navigation, navigationStatus, slug]);

  const displayTitle = result.title || getNavigationTitle(slug, navigation) || slug;

  return (
    <MainLayout>
      <section className="complaint-page" aria-labelledby="category-page-title">
        <div style={{ padding: '0.5rem 0 1rem 0' }}>
          <h1 id="category-page-title" style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: '#111' }}>
            {displayTitle}
          </h1>
          <p style={{ color: '#555', margin: 0, fontSize: '0.9rem' }}>
            Browse verified public complaints, resolutions, and reviews for {displayTitle}.
          </p>
        </div>

        {result.categories.length > 0 && result.status !== 'empty' && (
          <>
            <section className="category-page-modern__hero">
              <div><span className="home-section__eyebrow">Category complaint record</span><h2>{displayTitle}</h2><p>Explore complaint patterns, recent reports and the evidence attached to customer complaints in this category.</p></div>
              <img src={getShowcaseImage(result.categories[0])} alt="" />
            </section>
            <ComplaintToolbar
              search={{ category: result.categories.join(', ') }}
              resultCount={result.complaints.length}
            />
          </>
        )}

        {result.status === 'loading' && (
          <p className="complaint-list-state" role="status">
            Loading complaints for {displayTitle}...
          </p>
        )}

        {result.status === 'error' && (
          <p className="complaint-list-state complaint-list-state--error" role="alert">
            Unable to load complaints for this category at the moment. Please try again.
          </p>
        )}

        {result.status === 'not-found' && (
          <div className="complaint-list-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <h2>Category &quot;{displayTitle}&quot; Not Found</h2>
            <p style={{ margin: '1rem 0 1.5rem 0', color: '#555' }}>
              We couldn&apos;t find this category. You can explore all complaints or file a new one.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/complaints" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                All Complaints
              </Link>
              <Link to="/file-complaint" className="btn btn-primary" style={{ padding: '0.5rem 1rem', background: '#e47911', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}>
                File a Complaint
              </Link>
            </div>
          </div>
        )}

        {result.status === 'empty' && (
          <div className="complaint-list-state" style={{ padding: '3rem 1rem', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No complaints found for {displayTitle}</h2>
            <p style={{ color: '#666', margin: '0 0 1.5rem 0', fontSize: '0.95rem' }}>
              Be the first consumer to file a complaint or review in this category.
            </p>
            <Link
              to="/file-complaint"
              className="btn btn-primary"
              style={{
                display: 'inline-block',
                padding: '0.6rem 1.4rem',
                background: '#e47911',
                color: '#fff',
                borderRadius: '4px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              File a Complaint
            </Link>
          </div>
        )}

        {result.status === 'success' && <ComplaintGrid complaints={result.complaints} />}
      </section>
    </MainLayout>
  );
}