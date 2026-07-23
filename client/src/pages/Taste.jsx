import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, yearOf } from '../api';
import { useWatchlist, useTitle } from '../store';

const DECADE_OF = (item) => {
  const y = parseInt(yearOf(item), 10);
  if (!y) return null;
  return `${Math.floor(y / 10) * 10}s`;
};

export default function Taste() {
  useTitle('Your Taste');
  const { items } = useWatchlist();
  const [genreMap, setGenreMap] = useState({});

  useEffect(() => {
    api
      .genres()
      .then((list) => setGenreMap(Object.fromEntries(list.map((g) => [g.id, g.name]))))
      .catch(() => setGenreMap({}));
  }, []);

  const stats = useMemo(() => {
    if (!items.length) return null;

    const genreCounts = {};
    items.forEach((item) => {
      (item.genre_ids || []).forEach((gid) => {
        const name = genreMap[gid];
        if (!name) return;
        genreCounts[name] = (genreCounts[name] || 0) + 1;
      });
    });
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const maxGenreCount = topGenres[0]?.[1] || 1;

    const decadeCounts = {};
    items.forEach((item) => {
      const d = DECADE_OF(item);
      if (d) decadeCounts[d] = (decadeCounts[d] || 0) + 1;
    });
    const decades = Object.entries(decadeCounts).sort((a, b) => a[0].localeCompare(b[0]));
    const maxDecadeCount = Math.max(1, ...decades.map(([, n]) => n));

    const avgRating =
      items.reduce((sum, i) => sum + (i.vote_average || 0), 0) / items.length;

    const oldest = [...items].sort(
      (a, b) => (parseInt(yearOf(a), 10) || 9999) - (parseInt(yearOf(b), 10) || 9999)
    )[0];
    const highestRated = [...items].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))[0];

    let verdict;
    const [leadGenre] = topGenres[0] || [];
    if (avgRating >= 7.5 && leadGenre) {
      verdict = `A ${leadGenre.toLowerCase()} purist with high standards — your average pick clears ${avgRating.toFixed(1)}/10.`;
    } else if (decades.length && decades[0][1] / items.length > 0.4) {
      verdict = `You're anchored in the ${decades[0][0]} — nearly half your list comes from one decade.`;
    } else if (leadGenre) {
      verdict = `${leadGenre} is your gravity well — it shows up more than anything else on your list.`;
    } else {
      verdict = `Your list is wide open — no single genre or era dominates yet.`;
    }

    return { topGenres, maxGenreCount, decades, maxDecadeCount, avgRating, oldest, highestRated, verdict };
  }, [items, genreMap]);

  if (!items.length) {
    return (
      <div className="empty-state">
        <h2>No taste to analyze yet</h2>
        <p>Save a few titles to your watchlist and this page turns into a portrait of what you actually like.</p>
        <Link to="/browse" className="btn btn-primary">
          Start browsing
        </Link>
      </div>
    );
  }

  return (
    <div className="page-pad">
      <p className="kicker">Your taste, quantified</p>
      <h1 className="page-title display">
        {items.length} title{items.length === 1 ? '' : 's'}, one portrait.
      </h1>
      {stats && <p className="page-sub taste-verdict">{stats.verdict}</p>}

      {stats && (
        <div className="taste-grid">
          <section className="taste-panel">
            <h2 className="row-title">Genre gravity</h2>
            <div className="bars">
              {stats.topGenres.map(([name, count]) => (
                <div key={name} className="bar-row">
                  <span className="bar-label">{name}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(count / stats.maxGenreCount) * 100}%` }}
                    />
                  </div>
                  <span className="bar-value">{count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="taste-panel">
            <h2 className="row-title">By decade</h2>
            <div className="bars">
              {stats.decades.map(([decade, count]) => (
                <div key={decade} className="bar-row">
                  <span className="bar-label">{decade}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(count / stats.maxDecadeCount) * 100}%` }}
                    />
                  </div>
                  <span className="bar-value">{count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="taste-panel taste-stats">
            <h2 className="row-title">At a glance</h2>
            <div className="stat-block">
              <strong>{stats.avgRating.toFixed(1)}</strong>
              <span>average rating saved</span>
            </div>
            {stats.highestRated && (
              <div className="stat-block">
                <strong>{yearOf(stats.highestRated)}</strong>
                <span>
                  highest rated — <Link to={`/title/${stats.highestRated.id}`}>{stats.highestRated.title}</Link>
                </span>
              </div>
            )}
            {stats.oldest && (
              <div className="stat-block">
                <strong>{yearOf(stats.oldest)}</strong>
                <span>
                  oldest on your list — <Link to={`/title/${stats.oldest.id}`}>{stats.oldest.title}</Link>
                </span>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
