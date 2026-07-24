import { useEffect, useMemo, useRef, useState } from 'react';
import { searchLocations, fetchForecast } from '../lib/api.js';
import { normalizeForecast } from '../lib/normalize.js';
import { compareCities } from '../lib/duel.js';
import { formatTemp, formatWind, formatPrecip } from '../lib/format.js';
import { shareText } from '../lib/share.js';

function formatCell(value, kind, unit) {
  if (value == null) return '--';
  if (kind === 'temp') return formatTemp(value, unit);
  if (kind === 'wind') return formatWind(value, unit);
  if (kind === 'pct') return `${Math.round(value)}%`;
  if (kind === 'mm') return formatPrecip(value);
  return `${value}`;
}

export default function DuelPanel({ location, forecast, unit }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [rival, setRival] = useState(null);
  const [rivalForecast, setRivalForecast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef(null);
  const pickSeq = useRef(0);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const found = await searchLocations(query);
        if (!cancelled) setResults(found.slice(0, 5));
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function onClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setResults([]);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // A new home city resets the duel.
  useEffect(() => {
    setRival(null);
    setRivalForecast(null);
    setError(null);
  }, [location?.id]);

  async function pickRival(city) {
    setQuery('');
    setResults([]);
    setError(null);
    if (Math.abs(city.latitude - location.latitude) < 0.05 && Math.abs(city.longitude - location.longitude) < 0.05) {
      setError('Pick a different city — a place can’t duel itself.');
      return;
    }
    setBusy(true);
    const seq = ++pickSeq.current;
    try {
      const raw = await fetchForecast(city.latitude, city.longitude);
      if (seq !== pickSeq.current) return; // a newer pick superseded this one
      setRival(city);
      setRivalForecast(normalizeForecast(raw));
    } catch {
      if (seq === pickSeq.current) setError('Could not fetch that city right now.');
    } finally {
      if (seq === pickSeq.current) setBusy(false);
    }
  }

  const duel = useMemo(() => {
    if (!rival || !rivalForecast || !forecast) return null;
    return compareCities({ name: location.name, forecast }, { name: rival.name, forecast: rivalForecast }, unit);
  }, [rival, rivalForecast, forecast, location, unit]);

  async function handleShare() {
    if (!duel) return;
    const ok = await shareText(`⚔️ ${duel.verdict}`, window.location.href);
    if (ok === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <section className="panel duel">
      <h2 className="panel-title">City duel</h2>
      {!rival && (
        <>
          <p className="tm-prompt">
            {location.name} vs… who? Pit your city against a rival and settle it with data.
          </p>
          <div className="duel-search" ref={boxRef}>
            <input
              type="text"
              className="tm-input"
              placeholder="Search a rival city…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setResults([]);
                if (e.key === 'Enter' && results[0]) {
                  e.preventDefault();
                  pickRival(results[0]);
                }
              }}
              aria-label="Search a rival city"
            />
            {busy && <span className="spinner duel-spinner" aria-hidden="true" />}
            {results.length > 0 && (
              <div className="search-results duel-results">
                {results.map((city) => (
                  <button type="button" key={city.id} className="search-result" onClick={() => pickRival(city)}>
                    <span className="search-result-name">{city.name}</span>
                    <span className="search-result-meta">{[city.admin1, city.country].filter(Boolean).join(', ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {error && <p className="tm-miss">{error}</p>}
        </>
      )}
      {duel && rival && (
        <div className="duel-result">
          <p className="duel-verdict">{duel.verdict}</p>
          <div className="duel-table" role="table">
            <div className="duel-row duel-row--head" role="row">
              <span />
              <span className="duel-city">{location.name}</span>
              <span className="duel-city">{rival.name}</span>
            </div>
            {duel.rows.map((row) => {
              const better = row.a != null && row.b != null && row.a !== row.b ? (row.a > row.b ? 'a' : 'b') : null;
              return (
                <div className="duel-row" role="row" key={row.label}>
                  <span className="duel-label">{row.label}</span>
                  <span className={better === 'a' ? 'duel-strong' : ''}>{formatCell(row.a, row.kind, unit)}</span>
                  <span className={better === 'b' ? 'duel-strong' : ''}>{formatCell(row.b, row.kind, unit)}</span>
                </div>
              );
            })}
          </div>
          <div className="duel-actions">
            <button type="button" className="tm-share" onClick={handleShare}>
              {copied ? 'Copied!' : 'Share the verdict'}
            </button>
            <button
              type="button"
              className="duel-reset"
              onClick={() => {
                setRival(null);
                setRivalForecast(null);
              }}
            >
              New rival
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
