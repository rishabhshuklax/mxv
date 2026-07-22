import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useWatchlist } from '../store';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { items } = useWatchlist();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="brand">
        <span className="brand-mark">MXV</span>
        <span className="brand-tag">find your next obsession</span>
      </Link>
      <nav className="nav-links">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/browse">Browse</NavLink>
        <NavLink to="/search">Search</NavLink>
        <NavLink to="/watchlist">
          Watchlist
          {items.length > 0 && <span className="badge">{items.length}</span>}
        </NavLink>
      </nav>
    </header>
  );
}
