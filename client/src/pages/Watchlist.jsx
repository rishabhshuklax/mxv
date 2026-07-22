import { Link } from 'react-router-dom';
import { useWatchlist, useTitle } from '../store';
import PosterCard from '../components/PosterCard';

export default function Watchlist() {
  useTitle('Watchlist');
  const { items } = useWatchlist();

  if (!items.length) {
    return (
      <div className="empty-state">
        <h2>Your watchlist is empty</h2>
        <p>Tap the ♡ on anything that looks good — it lands here, saved on this device.</p>
        <Link to="/browse" className="btn btn-primary">
          Start browsing
        </Link>
      </div>
    );
  }

  return (
    <div className="page-pad">
      <h1 className="page-title display">Your watchlist</h1>
      <p className="page-sub">
        {items.length} title{items.length === 1 ? '' : 's'}, saved on this device.
      </p>
      <div className="grid fade-up">
        {items.map((e) => (
          <PosterCard key={e.id} entity={e} />
        ))}
      </div>
    </div>
  );
}
