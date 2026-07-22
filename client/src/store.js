import { useEffect, useState } from 'react';
import { titleOf } from './api.js';

const KEY = 'mxv.watchlist.v1';
const EVENT = 'mxv:watchlist';

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

// Pure list-mutation logic, split out from the hook so it can be unit
// tested without a React renderer.
export function toggleInList(list, entity) {
  const i = list.findIndex((x) => x.id === entity.id);
  if (i >= 0) {
    return [...list.slice(0, i), ...list.slice(i + 1)];
  }
  return [
    {
      id: entity.id,
      title: titleOf(entity),
      poster_path: entity.poster_path || null,
      backdrop_path: entity.backdrop_path || null,
      vote_average: entity.vote_average || 0,
      release_date: entity.release_date || entity.first_air_date || '',
      genre_ids: entity.genre_ids || (entity.genres || []).map((g) => g.id),
      addedAt: Date.now()
    },
    ...list
  ];
}

export function useWatchlist() {
  const [items, setItems] = useState(read);

  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = (entity) => {
    const list = toggleInList(read(), entity);
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  };

  const has = (id) => items.some((x) => x.id === id);

  return { items, toggle, has };
}

const RECENT_KEY = 'mxv.recent.v1';
const RECENT_EVENT = 'mxv:recent';
const RECENT_MAX = 14;

const readRecent = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
};

// Pure list-mutation logic, split out so it can be unit tested without a
// React renderer or a real localStorage.
export function recordViewInList(list, entity, max = RECENT_MAX) {
  const deduped = list.filter((x) => x.id !== entity.id);
  return [
    {
      id: entity.id,
      title: titleOf(entity),
      poster_path: entity.poster_path || null,
      backdrop_path: entity.backdrop_path || null,
      vote_average: entity.vote_average || 0,
      release_date: entity.release_date || entity.first_air_date || ''
    },
    ...deduped
  ].slice(0, max);
}

export function recordView(entity) {
  if (!entity?.id) return;
  const list = recordViewInList(readRecent(), entity);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(RECENT_EVENT));
}

export function useRecentlyViewed() {
  const [items, setItems] = useState(readRecent);
  useEffect(() => {
    const sync = () => setItems(readRecent());
    window.addEventListener(RECENT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(RECENT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return items;
}

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · MXV` : 'MXV — find your next obsession';
  }, [title]);
}
