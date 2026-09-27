import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCategories } from '../../services/api.js';

export default function SearchBar({ onSearch }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [category, setCategory] = useState(() => searchParams.get('category') || '');
  const [categories, setCategories] = useState([]);
  const [categoryLoadFailed, setCategoryLoadFailed] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    getCategories()
      .then((availableCategories) => {
        if (isCurrent) setCategories(availableCategories);
      })
      .catch(() => {
        if (isCurrent) setCategoryLoadFailed(true);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setCategory(searchParams.get('category') || '');
  }, [searchParams]);

  function handleSubmit(event) {
    event.preventDefault();
    const filters = { q: query.trim(), category };

    if (onSearch) {
      onSearch(filters);
      return;
    }

    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    navigate(`/complaints${params.size ? `?${params}` : ''}`);
  }

  return (
    <form className="search-bar" role="search" onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor="search-category">
        Search category
      </label>
      <select
        id="search-category"
        value={category}
        disabled={categories.length === 0}
        title={categoryLoadFailed ? 'Category filters are currently unavailable' : undefined}
        onChange={(event) => setCategory(event.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <label className="visually-hidden" htmlFor="company-search">
        Search companies and complaints
      </label>
      <input
        id="company-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search any company - HP, Apollo, Maruti, Taj Hotel, IndiGo..."
      />
      <button type="submit">SEARCH</button>
    </form>
  );
}