import { useEffect, useRef, useState } from 'react';
import { searchLocations } from '../lib/api.js';

export default function SearchBar({ onSelect, onUseLocation, locating }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      setActiveIndex(-1);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchLocations(query);
        if (!cancelled) {
          setResults(found);
          setActiveIndex(found.length ? 0 : -1);
          setError(found.length === 0 ? 'No matches found' : null);
        }
      } catch {
        if (!cancelled) setError('Search unavailable right now');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handleClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const node = listRef.current.children[activeIndex];
    node?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  function handleSelect(location) {
    onSelect(location);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (!open || !results.length) {
      if (event.key === 'Escape') setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  const showResults = open && query.trim().length >= 2;

  return (
    <div className="search" ref={containerRef}>
      <div className="search-input-row">
        <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="15.5" y1="15.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search for a city..."
          value={query}
          role="combobox"
          aria-expanded={showResults}
          aria-controls="search-listbox"
          aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          aria-label="Search for a city"
        />
        <button
          type="button"
          className="locate-btn"
          onClick={onUseLocation}
          disabled={locating}
          title="Use my location"
          aria-label="Use my current location"
        >
          {locating ? (
            <span className="spinner" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>
      {showResults && (
        <div className="search-results" role="listbox" id="search-listbox" ref={listRef}>
          {loading && <div className="search-hint">Searching…</div>}
          {!loading && error && <div className="search-hint">{error}</div>}
          {!loading &&
            results.map((location, index) => (
              <button
                type="button"
                key={location.id}
                id={`search-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`search-result ${index === activeIndex ? 'search-result--active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelect(location)}
              >
                <span className="search-result-name">{location.name}</span>
                <span className="search-result-meta">
                  {[location.admin1, location.country].filter(Boolean).join(', ')}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
