import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import ScrollToTop from './components/common/ScrollToTop.jsx';
import HomePage from './pages/HomePage.jsx';
import Footer from './components/layout/Footer.jsx';
import Header from './components/layout/Header.jsx';
import MegaMenu from './components/layout/MegaMenu.jsx';
import SecondaryNavigation from './components/layout/SecondaryNavigation.jsx';

const CategoryPage = lazy(() => import('./pages/CategoryPage.jsx'));
const ComplaintDetailPage = lazy(() => import('./pages/ComplaintDetailPage.jsx'));
const ComplaintCollectionPage = lazy(() => import('./pages/ComplaintCollectionPage.jsx'));
const CompanyDirectoryPage = lazy(() => import('./pages/CompanyDirectoryPage.jsx'));
const CompanyPage = lazy(() => import('./pages/CompanyPage.jsx'));
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'));
const FileComplaintPage = lazy(() => import('./pages/FileComplaintPage.jsx'));
const HelpPage = lazy(() => import('./pages/HelpPage.jsx'));
const ComplaintsSearchPage = lazy(() => import('./pages/ComplaintsSearchPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.jsx'));
const TermsPage = lazy(() => import('./pages/TermsPage.jsx'));
const TrackComplaintPage = lazy(() => import('./pages/TrackComplaintPage.jsx'));

function PageFallback() {
  return (
    <div className="page-frame page-route-loading" aria-label="Loading page" aria-busy="true">
      <div className="route-loading-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuPanelRef = useRef(null);
  const menuButtonRef = useRef(null);
  const menuId = 'all-services-menu';

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handlePointerDown(event) {
      const clickedMenu = menuPanelRef.current?.contains(event.target);
      const clickedToggle = menuButtonRef.current?.contains(event.target);
      if (!clickedMenu && !clickedToggle) setMenuOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className={isAdminRoute ? 'admin-site-layout' : 'site-layout'}>
      <ScrollToTop />
      {!isAdminRoute && (
        <div className="site-navigation">
          <Header
            menuOpen={menuOpen}
            menuId={menuId}
            onMenuToggle={() => setMenuOpen((isOpen) => !isOpen)}
            menuButtonRef={menuButtonRef}
          />
          <SecondaryNavigation />
          <MegaMenu id={menuId} open={menuOpen} panelRef={menuPanelRef} />
        </div>
      )}
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/complaints" element={<ComplaintsSearchPage />} />
          <Route path="/complaints/live" element={<ComplaintCollectionPage title="Live Complaints" search={{ sort: 'latest' }} />} />
          <Route path="/complaints/today" element={<ComplaintCollectionPage title="Today's Complaints" search={{ period: 'today', sort: 'latest' }} />} />
          <Route path="/complaints/most-complained" element={<ComplaintCollectionPage title="Most Complained Companies" search={{ sort: 'most-complained' }} />} />
          <Route path="/complaints/new" element={<ComplaintCollectionPage title="New Complaints" search={{ sort: 'latest' }} />} />
          <Route path="/complaints/resolved-today" element={<ComplaintCollectionPage title="Resolved Complaints" search={{ status: 'RESOLVED', sort: 'latest' }} />} />
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="/companies" element={<CompanyDirectoryPage />} />
          <Route path="/companies/:id" element={<CompanyPage />} />
          <Route path="/file-complaint" element={<FileComplaintPage />} />
          <Route path="/track" element={<TrackComplaintPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      {!isAdminRoute && <Footer />}
    </div>
  );
}
