import { useSearchParams } from 'react-router-dom';
import ComplaintPage from './ComplaintPage.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';

export default function ComplaintsSearchPage() {
  const [params] = useSearchParams();
  const search = {
    q: params.get('q') || '',
    category: params.get('category') || '',
    company: params.get('company') || '',
    sort: params.get('sort') || '',
    status: params.get('status') || '',
  };

  return (
    <MainLayout>
      <ComplaintPage title="Search complaints" search={search} />
    </MainLayout>
  );
}
