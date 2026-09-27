import { Route, Routes } from 'react-router-dom';
import CategoryPage from './pages/CategoryPage.jsx';
import ComplaintDetailPage from './pages/ComplaintDetailPage.jsx';
import ComplaintCollectionPage from './pages/ComplaintCollectionPage.jsx';
import CompanyDirectoryPage from './pages/CompanyDirectoryPage.jsx';
import CompanyPage from './pages/CompanyPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import FileComplaintPage from './pages/FileComplaintPage.jsx';
import HelpPage from './pages/HelpPage.jsx';
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/complaints" element={<HomePage />} />
      <Route path="/complaints/today" element={<ComplaintCollectionPage title="Today's Complaints" search={{ period: 'today', sort: 'latest' }} />} />
      <Route path="/complaints/most-complained" element={<ComplaintCollectionPage title="Most Complained Companies" search={{ sort: 'most-complained' }} />} />
      <Route path="/complaints/new" element={<ComplaintCollectionPage title="New Complaints" search={{ sort: 'latest' }} />} />
      <Route path="/complaints/resolved-today" element={<PlaceholderPage title="Resolved Today" />} />
      <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
      <Route path="/companies" element={<CompanyDirectoryPage />} />
      <Route path="/companies/:id" element={<CompanyPage />} />
      <Route path="/file-complaint" element={<FileComplaintPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/categories/:slug" element={<CategoryPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}