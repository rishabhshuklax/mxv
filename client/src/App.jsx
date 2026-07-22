import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Nav from './components/Nav';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Search from './pages/Search';
import Title from './pages/Title';
import Watchlist from './pages/Watchlist';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="empty-state">
      <h2>Lost in the credits</h2>
      <p>This page doesn't exist.</p>
      <Link to="/" className="btn btn-primary">
        Back home
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/search" element={<Search />} />
          <Route path="/title/:compoundId" element={<Title />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <span className="brand-mark small">MXV</span>
        <p>
          A discovery engine — trailers, ratings and where to watch. No streaming here,
          just taste.
        </p>
        <p className="attribution">
          This product uses the TMDB API but is not endorsed or certified by TMDB. Watch
          provider data by JustWatch.
        </p>
      </footer>
    </>
  );
}
