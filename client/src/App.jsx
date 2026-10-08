import { Route, Routes } from 'react-router-dom';
import ScrollToTop from './components/common/ScrollToTop.jsx';
import CategoryPage from './pages/CategoryPage.jsx';
import ComplaintDetailPage from './pages/ComplaintDetailPage.jsx';
import ComplaintCollectionPage from './pages/ComplaintCollectionPage.jsx';
import CompanyDirectoryPage from './pages/CompanyDirectoryPage.jsx';
import CompanyPage from './pages/CompanyPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import FileComplaintPage from './pages/FileComplaintPage.jsx';
import HelpPage from './pages/HelpPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ComplaintsSearchPage from './pages/ComplaintsSearchPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import TrackComplaintPage from './pages/TrackComplaintPage.jsx';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>

      <Route path="/" element={<HomePage />} />
      <Route path="/complaints" element={<ComplaintsSearchPage />} />
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
    </>
  );
}