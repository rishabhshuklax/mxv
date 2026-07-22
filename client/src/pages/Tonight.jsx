import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, img, splitId, titleOf, yearOf } from '../api';
import { useWatchlist, useTitle } from '../store';
import PosterCard from '../components/PosterCard';

// The projection booth. Four dials, one verdict — the anti-scroll.

const DIALS = [
  {
    key: 'mood',
    label: 'Mood',
    options: [
      ['electric', 'electric'],
      ['funny', 'funny'],
      ['tender', 'tender'],
      ['dark', 'dark'],
      ['strange', 'strange'],
      ['epic', 'epic'],
      ['true', 'true'],
      ['childlike', 'childlike']
    ]
  },
  {
    key: 'era',
    label: 'Era',
    options: [
      ['any', 'any era'],
      ['golden', 'golden age'],
      ['classics', "'80s–'90s"],
      ['aughts', 'the aughts'],
      ['fresh', 'brand new']
    ]
  },
  {
    key: 'length',
    label: 'Length',
    options: [
      ['brisk', 'brisk'],
      ['standard', 'standard'],
      ['grand', 'grand']
    ]
  },
  {
    key: 'path',
    label: 'Path',
    options: [
      ['crowd', 'the crowd'],
      ['balanced', 'balanced'],
      ['hidden', 'deep cuts']
    ]
  }
];

export default function Tonight() {
  useTitle('Tonight');
  const [phase, setPhase] = useState('booth'); // booth | rolling | verdict
  const [choices, setChoices] = useState({
    mood: 'strange',
    era: 'any',
    length: 'standard',
    path: 'balanced'
  });
  const [count, setCount] = useState(3);
  const [result, setResult] = useState(null);
  const [extras, setExtras] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [error, setError] = useState(false);
  const { has, toggle } = useWatchlist();

  const roll = async (seedOverride) => {
    setError(false);
    setExtras(null);
    setShowTrailer(false);
    setPhase('rolling');
    setCount(3);
    setTimeout(() => setCount(2), 650);
    setTimeout(() => setCount(1), 1300);

    const q = new URLSearchParams({
      ...choices,
      seed: String(seedOverride ?? Math.floor(Math.random() * 1e9))
    });
    const [data] = await Promise.all([
      api.tonight(q.toString()).catch(() => null),
      new Promise((r) => setTimeout(r, 1950))
    ]);

    if (!data || !data.feature) {
      setPhase('booth');
      setError(true);
      return;
    }
    setResult(data);
    setPhase('verdict');
    const { type, id } = splitId(data.feature.id);
    api.extras(type, id).then(setExtras).catch(() => setExtras(null));
  };

  const feature = result?.feature;

  return (
    <>
      {phase !== 'verdict' && (
        <div className="page-pad tonight">
          <p className="kicker">The projection booth</p>
          <h1 className="page-title display">One film. No scrolling.</h1>
          <p className="page-sub">
            The average viewer loses twenty minutes a night to the feed. Set four dials
            instead — we make the call. One feature, two understudies, no feed.
          </p>
          <div className="booth">
            {DIALS.map((d) => (
              <div key={d.key} className="dial">
                <span className="dial-label">{d.label}</span>
                <div className="dial-options">
                  {d.options.map(([val, label]) => (
                    <button
                      key={val}
                      className={`dial-opt ${choices[d.key] === val ? 'active' : ''}`}
                      onClick={() => setChoices((c) => ({ ...c, [d.key]: val }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary roll" onClick={() => roll()}>
            Roll film
          </button>
          {error && (
            <p className="booth-note">
              The booth came up empty — loosen a dial and roll again.
            </p>
          )}
        </div>
      )}

      {phase === 'rolling' && (
        <div className="leader" aria-hidden="true">
          <div className="leader-disc">
            <div className="leader-hand" />
            <span className="leader-num display">{count}</span>
          </div>
          <p className="leader-cap">composing tonight's programme…</p>
        </div>
      )}

      {phase === 'verdict' && feature && (
        <div className="verdict fade-up" key={feature.id}>
          <div className="title-backdrop">
            <img src={img(feature.backdrop_path, 'w1280')} alt="" />
          </div>
          <div className="verdict-body">
            <p className="kicker">Tonight's feature</p>
            <h1 className="display">{titleOf(feature)}</h1>
            <p className="verdict-reason">Because you asked for {result.reason}.</p>
            <div className="chips">
              <span className="chip">{yearOf(feature)}</span>
              {extras?.runtime ? (
                <span className="chip">
                  {Math.floor(extras.runtime / 60)}h {extras.runtime % 60}m
                </span>
              ) : null}
              <span className="chip">★ {(feature.vote_average || 0).toFixed(1)}</span>
            </div>
            <p className="overview">{feature.overview}</p>
            <div className="hero-actions">
              {extras?.trailer && (
                <button className="btn btn-primary" onClick={() => setShowTrailer(true)}>
                  ▶ Watch trailer
                </button>
              )}
              <Link className="btn btn-ghost" to={`/title/${feature.id}`}>
                Open dossier →
              </Link>
              <button className="btn btn-ghost" onClick={() => toggle(feature)}>
                {has(feature.id) ? '♥ Saved' : '♡ Watchlist'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => roll((result.seed || 0) + 1)}
              >
                ↻ Deal another
              </button>
            </div>

            {result.understudies?.length > 0 && (
              <div className="understudies">
                <span className="understudies-label">If the feature doesn't land</span>
                <div className="understudies-cards">
                  {result.understudies.map((e) => (
                    <PosterCard key={e.id} entity={e} />
                  ))}
                </div>
              </div>
            )}

            <button className="back-booth" onClick={() => setPhase('booth')}>
              ← Back to the booth
            </button>
          </div>
        </div>
      )}

      {showTrailer && extras?.trailer && (
        <div className="modal" onClick={() => setShowTrailer(false)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${extras.trailer.key}?autoplay=1`}
              title={`${titleOf(feature)} — trailer`}
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
