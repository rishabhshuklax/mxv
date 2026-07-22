import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, img, splitId, titleOf, yearOf } from '../api';
import { useWatchlist, useTitle } from '../store';
import Rating from '../components/Rating';
import Row from '../components/Row';

const runtimeOf = (d) => {
  if (d.type === 'tv') {
    const s = d.number_of_seasons;
    return s ? `${s} season${s === 1 ? '' : 's'}` : null;
  }
  if (!d.runtime) return null;
  const h = Math.floor(d.runtime / 60);
  const m = d.runtime % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

function Providers({ providers }) {
  if (!providers) return null;
  const groups = [
    ['Stream', providers.flatrate],
    ['Rent', providers.rent],
    ['Buy', providers.buy]
  ].filter(([, list]) => list?.length);
  if (!groups.length) return null;

  return (
    <section className="providers">
      <h2 className="row-title">Where to watch</h2>
      {groups.map(([label, list]) => (
        <div key={label} className="provider-group">
          <span className="provider-label">{label}</span>
          <div className="provider-logos">
            {list.map((p) => (
              <a
                key={p.provider_id}
                href={providers.link}
                target="_blank"
                rel="noopener noreferrer"
                title={p.provider_name}
              >
                <img src={img(p.logo_path, 'w92')} alt={p.provider_name} />
              </a>
            ))}
          </div>
        </div>
      ))}
      <p className="attribution">Availability data by JustWatch, via TMDB.</p>
    </section>
  );
}

export default function Title() {
  const { compoundId } = useParams();
  const { type, id } = splitId(compoundId);
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const { has, toggle } = useWatchlist();

  useTitle(d ? titleOf(d) : '');

  useEffect(() => {
    setD(null);
    setErr(null);
    setShowTrailer(false);
    window.scrollTo(0, 0);
    let on = true;
    api
      .extras(type, id)
      .then((data) => on && setD(data))
      .catch((e) => on && setErr(e.message));
    return () => {
      on = false;
    };
  }, [compoundId]);

  if (err) {
    return (
      <div className="empty-state">
        <h2>Couldn't load this title</h2>
        <p>{err}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="title-hero">
        <div className="title-content">
          <div className="skel skel-poster" />
          <div style={{ flex: 1 }}>
            <div className="skel skel-title" style={{ width: '60%' }} />
            <div className="skel skel-line" />
            <div className="skel skel-line" style={{ width: '80%' }} />
          </div>
        </div>
      </div>
    );
  }

  const saved = has(d.id);
  const people = d.type === 'tv' ? d.creators : d.directors;
  const peopleLabel = d.type === 'tv' ? 'Created by' : 'Directed by';

  return (
    <>
      <div className="title-hero fade-up">
        {d.backdrop_path && (
          <div className="title-backdrop">
            <img src={img(d.backdrop_path, 'w1280')} alt="" />
          </div>
        )}
        <div className="title-content">
          <div className="title-poster">
            {d.poster_path ? (
              <img src={img(d.poster_path, 'w500')} alt={titleOf(d)} />
            ) : (
              <div className="card-fallback">{titleOf(d)}</div>
            )}
          </div>
          <div className="title-info">
            <p className="kicker">{d.type === 'tv' ? 'Series' : 'Film'}</p>
            <h1 className="display">{titleOf(d)}</h1>
            {d.tagline && <p className="tagline">“{d.tagline}”</p>}
            <div className="chips">
              <Rating value={d.vote_average} />
              <span className="chip">{yearOf(d)}</span>
              {runtimeOf(d) && <span className="chip">{runtimeOf(d)}</span>}
              {(d.genres || []).slice(0, 3).map((g) => (
                <span key={g.id} className="chip">
                  {g.name}
                </span>
              ))}
            </div>
            <p className="overview">{d.overview}</p>
            {people?.length > 0 && (
              <p className="credit-line">
                <span>{peopleLabel}</span> {people.join(', ')}
              </p>
            )}
            <div className="hero-actions">
              {d.trailer && (
                <button className="btn btn-primary" onClick={() => setShowTrailer(true)}>
                  ▶ Watch trailer
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => toggle(d)}>
                {saved ? '♥ Saved' : '♡ Watchlist'}
              </button>
              <Link className="btn btn-ghost" to={`/constellation/${d.id}`}>
                ✦ Explore connections
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="rows">
        {d.cast?.length > 0 && (
          <section className="row fade-up">
            <h2 className="row-title">Cast</h2>
            <div className="row-scroller">
              {d.cast.map((c) => (
                <Link key={c.credit_id || c.id} to={`/person/${c.id}`} className="person">
                  {c.profile_path ? (
                    <img src={img(c.profile_path, 'w185')} alt={c.name} loading="lazy" />
                  ) : (
                    <div className="person-fallback">{c.name[0]}</div>
                  )}
                  <strong>{c.name}</strong>
                  <span>{c.character}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {d.belongs_to_collection && (
          <section className="row fade-up collection-banner">
            {d.belongs_to_collection.backdrop_path && (
              <img
                className="collection-bg"
                src={img(d.belongs_to_collection.backdrop_path, 'w1280')}
                alt=""
              />
            )}
            <div className="collection-content">
              <span className="cst-focus-label">Part of a saga</span>
              <h2 className="display">{d.belongs_to_collection.name}</h2>
            </div>
          </section>
        )}

        <Providers providers={d.providers} />

        <Row title="More like this" items={d.recommendations} />
      </div>

      {showTrailer && d.trailer && (
        <div className="modal" onClick={() => setShowTrailer(false)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${d.trailer.key}?autoplay=1`}
              title={`${titleOf(d)} — trailer`}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
            <button className="modal-close" onClick={() => setShowTrailer(false)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
