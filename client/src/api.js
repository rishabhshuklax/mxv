const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API responded ${res.status}`);
  return res.json();
}

export const api = {
  trending: () => get('/api/entity/trending'),
  fresh: () => get('/api/movie/recommend'),
  top: () => get('/api/entity/top'),
  airing: () => get('/api/entity/airing'),
  genres: () => get('/api/genres'),
  byGenre: (id, page = 1) => get(`/api/genres/${id}?page=${page}`),
  search: (q) => get(`/api/entity/search?query=${encodeURIComponent(q)}`),
  extras: (type, id) => get(`/api/entity/${type}/${id}/extras`)
};

export const img = (path, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

export const splitId = (compound) => {
  const [type, id] = String(compound).split('~');
  return { type, id };
};

export const titleOf = (e) =>
  e.title || e.name || e.original_title || e.original_name || 'Untitled';

export const yearOf = (e) =>
  (e.release_date || e.first_air_date || '').slice(0, 4) || '—';
