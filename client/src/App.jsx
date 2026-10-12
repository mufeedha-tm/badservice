import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import ScrollToTop from './components/common/ScrollToTop.jsx';
import HomePage from './pages/HomePage.jsx';

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
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid #cbd5e1',
          borderTopColor: '#0284c7',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
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
    </>
  );
}