import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useTitle } from '../store';
import PosterCard from '../components/PosterCard';
import { SkeletonGrid } from '../components/Skeletons';

export default function Search() {
  useTitle('Search');
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [results, setResults] = useState(null);
  const [popular, setPopular] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    api.trending().then(setPopular).catch(() => setPopular([]));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setParams({}, { replace: true });
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      setParams({ q }, { replace: true });
      api
        .search(q)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const showingResults = query.trim().length > 0;

  return (
    <div className="page-pad">
      <h1 className="page-title display">Search everything</h1>
      <input
        ref={inputRef}
        className="search-input"
        type="search"
        placeholder="Films, series, anything…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {showingResults ? (
        loading || results === null ? (
          <SkeletonGrid />
        ) : results.length === 0 ? (
          <div className="empty-state">
            <h2>No matches</h2>
            <p>Nothing found for “{query.trim()}”. Try a different spelling.</p>
          </div>
        ) : (
          <div className="grid fade-up">
            {results.map((e) => (
              <PosterCard key={e.id} entity={e} />
            ))}
          </div>
        )
      ) : (
        <>
          <h2 className="row-title" style={{ marginTop: '2rem' }}>
            Popular right now
          </h2>
          {popular === null ? (
            <SkeletonGrid />
          ) : (
            <div className="grid fade-up">
              {popular.map((e) => (
                <PosterCard key={e.id} entity={e} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
