import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCategories, getCompanies, searchComplaints } from '../../services/api.js';

export default function SearchBar({ onSearch }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [category, setCategory] = useState(() => searchParams.get('category') || '');
  const [categories, setCategories] = useState([]);
  const [categoryLoadFailed, setCategoryLoadFailed] = useState(false);

  // Autocomplete state
  const [companies, setCompanies] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;

    Promise.all([getCategories(), getCompanies()])
      .then(([availableCategories, availableCompanies]) => {
        if (!isCurrent) return;
        if (Array.isArray(availableCategories)) {
          setCategories(availableCategories);
        }
        if (Array.isArray(availableCompanies)) {
          setCompanies(availableCompanies);
        }
      })
      .catch(() => {
        if (isCurrent) setCategoryLoadFailed(true);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  // Fetch real suggestions debounced
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(() => {
      // 1. Matching companies / brands
      const companyMatches = (companies || [])
        .filter((c) => (c.name || '').toLowerCase().includes(trimmed))
        .slice(0, 4)
        .map((c) => ({
          type: 'company',
          title: c.name,
          subtitle: c.category || 'Company / Brand',
          query: c.name,
          icon: '🏢',
        }));

      // 2. Matching categories
      const categoryMatches = (categories || [])
        .filter((cat) => (cat.name || '').toLowerCase().includes(trimmed))
        .slice(0, 2)
        .map((cat) => ({
          type: 'category',
          title: cat.name,
          subtitle: 'Category',
          query: cat.name,
          category: cat.name,
          icon: '📁',
        }));

      // 3. Search real complaints matching query
      searchComplaints({ q: trimmed })
        .then((complaintData) => {
          if (!isCurrent) return;
          const complaintMatches = (complaintData || [])
            .slice(0, 4)
            .map((comp) => ({
              type: 'complaint',
              title: comp.title,
              subtitle: `${comp.company} · ${comp.location || comp.category}`,
              query: comp.title,
              id: comp.id,
              icon: '🚨',
            }));

          const combined = [...companyMatches, ...categoryMatches, ...complaintMatches].slice(0, 8);
          setSuggestions(combined);
        })
        .catch(() => {
          if (isCurrent) {
            setSuggestions([...companyMatches, ...categoryMatches]);
          }
        });
    }, 200);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query, companies, categories]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setCategory(searchParams.get('category') || '');
  }, [searchParams]);

  function handleSubmit(event) {
    if (event) event.preventDefault();
    setShowSuggestions(false);
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

  function handleSelectSuggestion(item) {
    setShowSuggestions(false);
    if (item.type === 'complaint' && item.id) {
      navigate(`/complaints/${encodeURIComponent(item.id)}`);
      return;
    }
    setQuery(item.query || item.title);
    const params = new URLSearchParams();
    params.set('q', item.query || item.title);
    if (item.category) params.set('category', item.category);
    navigate(`/complaints?${params.toString()}`);
  }

  function handleKeyDown(e) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[activeSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  return (
    <div className="search-bar-wrapper" ref={containerRef} style={{ position: 'relative', flex: '1 1 24rem', maxWidth: '50rem', margin: '0 auto' }}>
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
          {categories.map((cat) => {
            const id = typeof cat === 'object' ? (cat.id || cat.slug || cat.name) : cat;
            const name = typeof cat === 'object' ? (cat.name || cat.slug) : cat;
            const val = typeof cat === 'object' ? (cat.name || cat.slug) : cat;
            return (
              <option key={id} value={val}>
                {name}
              </option>
            );
          })}
        </select>

        <label className="visually-hidden" htmlFor="company-search">
          Search companies and complaints
        </label>
        <input
          id="company-search"
          type="search"
          value={query}
          autoComplete="off"
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setQuery(event.target.value);
            setShowSuggestions(true);
            setActiveSuggestionIndex(-1);
          }}
          placeholder="Search complaints, products, brands, hospitals, flights..."
        />

        <button className="search-bar__submit" type="submit" aria-label="Search complaints">
          <svg
            className="search-bar__icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="search-bar__submit-text">SEARCH</span>
        </button>
      </form>

      {/* Autocomplete Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <ul
          className="search-autocomplete-dropdown"
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.22)',
            margin: 0,
            padding: '6px 0',
            listStyle: 'none',
            zIndex: 1000,
            maxHeight: '380px',
            overflowY: 'auto',
          }}
        >
          {suggestions.map((item, idx) => {
            const isSelected = idx === activeSuggestionIndex;
            return (
              <li key={`${item.type}-${item.title}-${idx}`}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(item);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: isSelected ? '#eff6ff' : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={() => setActiveSuggestionIndex(idx)}
                >
                  <span style={{ fontSize: '1.15rem' }}>{item.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {item.subtitle}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                    {item.type === 'complaint' ? 'Inspect →' : 'Search →'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}