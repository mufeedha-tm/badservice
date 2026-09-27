import { Link } from 'react-router-dom';

export default function ComplaintToolbar({ search, resultCount, title = 'All Complaints' }) {
  const category = search?.category || (title === 'All Complaints' ? 'All Services' : title);
  const query = search?.q;
  const hasFilters = Boolean(query || search?.category || search?.company || search?.period || title !== 'All Complaints');
  const sortLabel = search?.sort === 'most-complained' ? 'Most Complained' : 'Latest';

  return (
    <div className="complaint-toolbar" role="group" aria-label="Complaint list summary">
      <span>
        Showing complaints for <strong>{category}</strong>
        {query && <> matching <strong>&quot;{query}&quot;</strong></>}
        {hasFilters ? ` - ${resultCount} ${resultCount === 1 ? 'result' : 'results'}` : ' - 1-12 of 12,000+'}
      </span>
      <span>
        Sort: <strong>{sortLabel}</strong>
      </span>
      {!hasFilters && <span>Filter by Brand: HP, Apollo, Maruti, OYO, IndiGo...</span>}
      <Link className="complaint-toolbar__companies" to="/companies">Browse companies</Link>
    </div>
  );
}