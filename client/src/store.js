import { useEffect, useState } from 'react';
import { titleOf } from './api';

const KEY = 'mxv.watchlist.v1';
const EVENT = 'mxv:watchlist';

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

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
    const list = read();
    const i = list.findIndex((x) => x.id === entity.id);
    if (i >= 0) {
      list.splice(i, 1);
    } else {
      list.unshift({
        id: entity.id,
        title: titleOf(entity),
        poster_path: entity.poster_path || null,
        backdrop_path: entity.backdrop_path || null,
        vote_average: entity.vote_average || 0,
        release_date: entity.release_date || entity.first_air_date || ''
      });
    }
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  };

  const has = (id) => items.some((x) => x.id === id);

  return { items, toggle, has };
}

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · MXV` : 'MXV — find your next obsession';
  }, [title]);
}
