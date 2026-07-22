import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { img, titleOf, yearOf } from '../api';
import { useWatchlist } from '../store';

export default function Hero({ items }) {
  const [i, setI] = useState(0);
  const { has, toggle } = useWatchlist();

  useEffect(() => {
    if (!items || items.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [items]);

  if (!items) return <div className="hero skel" />;
  if (!items.length) return null;

  const item = items[i % items.length];
  const saved = has(item.id);
  const isTv = String(item.id).startsWith('tv');

  return (
    <section className="hero">
      <img
        key={item.id}
        className="hero-bg"
        src={img(item.backdrop_path, 'w1280')}
        alt=""
      />
      <div className="hero-shade" />
      <div className="hero-content" key={`c-${item.id}`}>
        <p className="kicker">In the spotlight</p>
        <h1 className="display">{titleOf(item)}</h1>
        <div className="chips">
          <span className="chip chip-type">{isTv ? 'Series' : 'Film'}</span>
          <span className="chip">{yearOf(item)}</span>
          <span className="chip">★ {(item.vote_average || 0).toFixed(1)}</span>
        </div>
        <p className="hero-overview">{item.overview}</p>
        <div className="hero-actions">
          <Link to={`/title/${item.id}`} className="btn btn-primary">
            Explore →
          </Link>
          <button className="btn btn-ghost" onClick={() => toggle(item)}>
            {saved ? '♥ Saved' : '♡ Watchlist'}
          </button>
        </div>
      </div>
      <div className="hero-index">
        <span className="hero-count">
          {String((i % items.length) + 1).padStart(2, '0')} /{' '}
          {String(items.length).padStart(2, '0')}
        </span>
        <div className="hero-dots">
          {items.map((e, n) => (
            <button
              key={e.id}
              className={n === i % items.length ? 'on' : ''}
              onClick={() => setI(n)}
              aria-label={`Spotlight ${n + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
