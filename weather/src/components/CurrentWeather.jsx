import { useEffect, useRef, useState } from 'react';
import WeatherIcon from './WeatherIcon.jsx';
import { formatTemp, formatFullDate, celsiusToFahrenheit } from '../lib/format.js';

// Tweens the displayed number when the target changes (unit toggles,
// location switches). Snaps immediately under prefers-reduced-motion.
function useAnimatedNumber(target, duration = 450) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !Number.isFinite(from) || from === target) {
      fromRef.current = target;
      setValue(target);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setValue(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      fromRef.current = target;
    };
  }, [target, duration]);
  return value;
}

function greeting(isoTime) {
  const hour = Number(isoTime?.slice(11, 13) ?? 12);
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Good night';
}

export default function CurrentWeather({ location, forecast, unit, isSaved, onToggleSave, onRefresh, refreshing, onShareToday }) {
  const { current, today } = forecast;
  const targetTemp = unit === 'F' ? celsiusToFahrenheit(current.temperature) : current.temperature;
  const displayTemp = useAnimatedNumber(targetTemp);

  return (
    <section className="hero">
      <div className="hero-top">
        <div>
          <h1 className="hero-location">
            {location.name}
            <span className="hero-region">
              {[location.admin1, location.country].filter(Boolean).join(', ')}
            </span>
          </h1>
          <p className="hero-date">
            {greeting(current.time)} · {formatFullDate(current.time)}
          </p>
        </div>
        <div className="hero-actions">
          {onShareToday && (
            <button type="button" className="icon-btn" onClick={onShareToday} title="Share today" aria-label="Share today's weather as an image">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M12 3v12M12 3l-4 4M12 3l4 4M5 13v6h14v-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <button
            type="button"
            className={`icon-btn ${refreshing ? 'icon-btn--spin' : ''}`}
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh forecast"
            aria-label="Refresh forecast"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`icon-btn ${isSaved ? 'icon-btn--active' : ''}`}
            onClick={onToggleSave}
            title={isSaved ? 'Remove from saved locations' : 'Save this location'}
            aria-pressed={isSaved}
            aria-label={isSaved ? 'Remove from saved locations' : 'Save this location'}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
              <path
                d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z"
                fill={isSaved ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="hero-main">
        <div className="hero-icon">
          <WeatherIcon icon={current.info.icon} size={116} />
        </div>
        <div className="hero-temp">
          {Math.round(displayTemp)}
          <span className="hero-degree">°</span>
        </div>
      </div>

      <p className="hero-condition">{current.info.label}</p>
      <div className="hero-substats">
        <span>Feels like {formatTemp(current.feelsLike, unit)}</span>
        {today && (
          <span>
            H:{formatTemp(today.max, unit)} L:{formatTemp(today.min, unit)}
          </span>
        )}
      </div>
    </section>
  );
}
