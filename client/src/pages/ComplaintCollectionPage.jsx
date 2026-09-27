import ComplaintPage from './ComplaintPage.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';

export default function ComplaintCollectionPage({ title, search }) {
  return (
    <MainLayout>
      <ComplaintPage title={title} search={search} />
    </MainLayout>
  );
}