import { useEffect, useRef, useState } from 'react';

const SEARCH_URL = 'https://photon.komoot.io/api/';

function formatPlace(feature) {
  const properties = feature.properties || {};
  return [
    properties.name,
    properties.street,
    properties.city || properties.town || properties.village,
    properties.state,
  ].filter((part, index, parts) => part && parts.indexOf(part) === index).join(', ');
}

export default function LocationAutocomplete({
  label,
  value,
  onChange,
  placeholder,
  error,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchError, setSearchError] = useState('');
  const blurTimerRef = useRef(null);

  useEffect(() => {
    const query = value.trim();
    setSuggestions([]);
    setSearchError('');
    setIsLoading(false);
    if (query.length < 3) {
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setSearchError('');
      try {
        const params = new URLSearchParams({
          q: query,
          limit: '6',
          lang: 'en',
          bbox: '68.1,6.5,97.4,35.5',
        });
        const response = await fetch(`${SEARCH_URL}?${params}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          throw new Error(`Location search returned ${response.status}.`);
        }
        const data = await response.json();
        setSuggestions(
          (data.features || [])
            .map((feature) => ({ feature, label: formatPlace(feature) }))
            .filter((place) => place.label)
        );
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions([]);
          setSearchError('Location suggestions are unavailable. You can still enter the location manually.');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  useEffect(() => () => window.clearTimeout(blurTimerRef.current), []);

  function selectSuggestion(place) {
    onChange(place);
    setSuggestions([]);
    setIsOpen(false);
  }

  return (
    <div className="field location-autocomplete">
      <label htmlFor="complaint-location">{label}</label>
      <input
        id="complaint-location"
        name="location"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          blurTimerRef.current = window.setTimeout(() => setIsOpen(false), 120);
        }}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-controls="complaint-location-suggestions"
        aria-invalid={Boolean(error)}
        placeholder={placeholder}
        className={error ? 'is-invalid' : ''}
      />
      {error && <small className="field-error">{error}</small>}

      {isOpen && (isLoading || suggestions.length > 0 || searchError) && (
        <div className="location-autocomplete__dropdown">
          {isLoading && <p className="location-autocomplete__message">Searching locations…</p>}
          {searchError && <p className="location-autocomplete__message" role="status">{searchError}</p>}
          {suggestions.length > 0 && (
            <>
              <ul id="complaint-location-suggestions" role="listbox">
                {suggestions.map(({ feature, label: place }) => (
                  <li key={`${feature.properties.osm_type}-${feature.properties.osm_id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === place}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectSuggestion(place)}
                    >
                      {place}
                    </button>
                  </li>
                ))}
              </ul>
              <small className="location-autocomplete__attribution">
                Location data © OpenStreetMap contributors
              </small>
            </>
          )}
        </div>
      )}
    </div>
  );
}
