import { useSearchParams } from 'react-router-dom';
import ComplaintPage from './ComplaintPage.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const search = q || category ? { q, category } : null;

  function handleSearch(filters) {
    const nextParams = new URLSearchParams();
    if (filters.q) nextParams.set('q', filters.q);
    if (filters.category) nextParams.set('category', filters.category);
    setSearchParams(nextParams);
  }

  return (
    <MainLayout onSearch={handleSearch}>
      <ComplaintPage search={search} />
    </MainLayout>
  );
}