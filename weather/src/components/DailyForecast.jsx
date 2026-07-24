import { useState } from 'react';
import WeatherIcon from './WeatherIcon.jsx';
import { getWeatherInfo } from '../lib/weatherCode.js';
import { formatTemp, formatDayLabel, formatWind, formatPrecip, formatClockTime } from '../lib/format.js';

export default function DailyForecast({ daily, unit }) {
  const [openDate, setOpenDate] = useState(null);
  if (!daily?.length) return null;
  const max = Math.max(...daily.map((d) => d.max));
  const min = Math.min(...daily.map((d) => d.min));
  const span = Math.max(max - min, 1);

  return (
    <section className="panel">
      <h2 className="panel-title">8-day forecast</h2>
      <div className="daily-list">
        {daily.map((day, index) => {
          const info = getWeatherInfo(day.weatherCode, true);
          const leftPct = ((day.min - min) / span) * 100;
          const widthPct = ((day.max - day.min) / span) * 100;
          const open = openDate === day.date;
          return (
            <div key={day.date} className={`daily-item ${open ? 'daily-item--open' : ''}`} style={{ '--row': index }}>
              <button
                type="button"
                className="daily-row"
                aria-expanded={open}
                onClick={() => setOpenDate(open ? null : day.date)}
              >
                <span className="daily-day">{formatDayLabel(day.date, index)}</span>
                <WeatherIcon icon={info.icon} size={26} />
                <span className="daily-precip">
                  {day.precipitationProbability > 0 ? `${day.precipitationProbability}%` : ''}
                </span>
                <span className="daily-min">{formatTemp(day.min, unit)}</span>
                <div className="daily-bar-track">
                  <div className="daily-bar-fill" style={{ left: `${leftPct}%`, width: `${widthPct}%` }} />
                </div>
                <span className="daily-max">{formatTemp(day.max, unit)}</span>
                <svg viewBox="0 0 16 16" width="14" height="14" className="daily-chevron" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="daily-detail">
                <div className="daily-detail-inner">
                  <div className="daily-detail-grid">
                    <div>
                      <span className="detail-label">Feels like</span>
                      <span className="detail-mini">
                        {day.feelsMin != null ? `${formatTemp(day.feelsMin, unit)} – ${formatTemp(day.feelsMax, unit)}` : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="detail-label">Rain total</span>
                      <span className="detail-mini">{formatPrecip(day.precipitationSum)}</span>
                    </div>
                    <div>
                      <span className="detail-label">Max wind</span>
                      <span className="detail-mini">{formatWind(day.windMax, unit)}</span>
                    </div>
                    <div>
                      <span className="detail-label">UV index</span>
                      <span className="detail-mini">{day.uvIndex != null ? Math.round(day.uvIndex) : '--'}</span>
                    </div>
                    <div>
                      <span className="detail-label">Sunrise</span>
                      <span className="detail-mini">{day.sunrise ? formatClockTime(day.sunrise) : '--'}</span>
                    </div>
                    <div>
                      <span className="detail-label">Sunset</span>
                      <span className="detail-mini">{day.sunset ? formatClockTime(day.sunset) : '--'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
