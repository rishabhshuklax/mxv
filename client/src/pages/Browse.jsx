import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useTitle } from '../store';
import PosterCard from '../components/PosterCard';
import { SkeletonGrid } from '../components/Skeletons';

const MAX_PAGES = 10;

export default function Browse() {
  useTitle('Browse');
  const [genres, setGenres] = useState([]);
  const [selected, setSelected] = useState(28);
  const [items, setItems] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef(null);

  useEffect(() => {
    api.genres().then(setGenres).catch(() => setGenres([]));
  }, []);

  useEffect(() => {
    setItems(null);
    setPage(1);
  }, [selected]);

  useEffect(() => {
    let on = true;
    setLoading(true);
    api
      .byGenre(selected, page)
      .then((fresh) => {
        if (!on) return;
        setItems((prev) => {
          const base = page === 1 || !prev ? [] : prev;
          const seen = new Set(base.map((x) => x.id));
          return [...base, ...fresh.filter((x) => !seen.has(x.id))];
        });
      })
      .catch(() => on && setItems((prev) => prev || []))
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [selected, page]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && page < MAX_PAGES) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: '600px' }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, page]);

  return (
    <div className="page-pad">
      <h1 className="page-title display">Browse by mood</h1>
      <div className="pills">
        {genres.map((g) => (
          <button
            key={g.id}
            className={`pill ${selected === g.id ? 'active' : ''}`}
            onClick={() => setSelected(g.id)}
          >
            {g.name}
          </button>
        ))}
      </div>
      {items === null ? (
        <SkeletonGrid />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h2>Nothing here yet</h2>
          <p>Try another genre.</p>
        </div>
      ) : (
        <div className="grid fade-up">
          {items.map((e) => (
            <PosterCard key={e.id} entity={e} />
          ))}
        </div>
      )}
      <div ref={sentinel} style={{ height: 1 }} />
      {loading && items && <p className="loading-note">Fetching more…</p>}
    </div>
  );
}
