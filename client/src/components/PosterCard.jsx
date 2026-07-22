import { Link } from 'react-router-dom';
import { img, titleOf, yearOf } from '../api';
import { useWatchlist } from '../store';

export default function PosterCard({ entity }) {
  const { has, toggle } = useWatchlist();
  const saved = has(entity.id);
  const poster = img(entity.poster_path || entity.backdrop_path, 'w342');

  return (
    <Link to={`/title/${entity.id}`} className="card" aria-label={titleOf(entity)}>
      <div className="card-frame">
        {poster ? (
          <img src={poster} alt="" loading="lazy" />
        ) : (
          <div className="card-fallback">{titleOf(entity)}</div>
        )}
        <button
          className={`heart ${saved ? 'on' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            toggle(entity);
          }}
          aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {saved ? '♥' : '♡'}
        </button>
      </div>
      <div className="card-caption">
        <strong>{titleOf(entity)}</strong>
        <span>
          {yearOf(entity)} · {(entity.vote_average || 0).toFixed(1)}
        </span>
      </div>
    </Link>
  );
}
