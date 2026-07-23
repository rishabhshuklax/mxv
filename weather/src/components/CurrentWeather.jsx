import WeatherIcon from './WeatherIcon.jsx';
import { formatTemp, formatFullDate } from '../lib/format.js';

export default function CurrentWeather({ location, forecast, unit, isSaved, onToggleSave }) {
  const { current, today } = forecast;
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
          <p className="hero-date">{formatFullDate(current.time)}</p>
        </div>
        <button
          type="button"
          className={`save-btn ${isSaved ? 'save-btn--active' : ''}`}
          onClick={onToggleSave}
          title={isSaved ? 'Remove from saved locations' : 'Save this location'}
          aria-pressed={isSaved}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
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

      <div className="hero-main">
        <WeatherIcon icon={current.info.icon} size={110} />
        <div className="hero-temp">{formatTemp(current.temperature, unit)}</div>
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
