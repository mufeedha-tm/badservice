import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCategories } from '../../services/api.js';

export default function ComplaintToolbar({ search, resultCount, showFilters = true }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const query = search?.q || '';
  const category = search?.category || '';
  const date = search?.date || '';
  const hasFilters = Boolean(query || category || date || search?.company);

  useEffect(() => {
    if (!showFilters) return undefined;
    let isCurrent = true;
    getCategories()
      .then((items) => {
        if (isCurrent && Array.isArray(items)) {
          setCategories(items.filter((item) => !item.parentId));
        }
      })
      .catch(() => {});
    return () => { isCurrent = false; };
  }, [showFilters]);

  const categoryNames = useMemo(() => categories.map((item) => item.name).filter(Boolean), [categories]);

  function updateFilter(key, value) {
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set(key, value);
    else nextParams.delete(key);
    if (key === 'date' && value) nextParams.delete('period');
    setSearchParams(nextParams);
  }

  return (
    <div className="complaint-toolbar">
      <div className="complaint-toolbar__intro" role="status" aria-live="polite">
        <div>
          <p className="complaint-toolbar__eyebrow">Consumer reports</p>
          <h2>Explore complaints</h2>
          <p className="complaint-toolbar__hint">Filter reports by category or date.</p>
        </div>
        <span className="complaint-toolbar__count">
          <strong>{resultCount}</strong> {resultCount === 1 ? 'report' : 'reports'}
        </span>
      </div>
      {showFilters && <div className="complaint-toolbar__filters" role="group" aria-label="Filter complaints">
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => updateFilter('category', event.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {categoryNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>
          <span>Date</span>
          <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(event) => updateFilter('date', event.target.value)} aria-label="Filter by date" />
        </label>
        {hasFilters && <button type="button" className="complaint-toolbar__clear" onClick={() => setSearchParams({})}>Clear filters</button>}
      </div>}
      <Link className="complaint-toolbar__companies" to="/companies">Browse companies</Link>
    </div>
  );
}
