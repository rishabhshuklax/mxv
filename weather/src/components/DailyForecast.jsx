import WeatherIcon from './WeatherIcon.jsx';
import { getWeatherInfo } from '../lib/weatherCode.js';
import { formatTemp, formatDayLabel } from '../lib/format.js';

export default function DailyForecast({ daily, unit }) {
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
          return (
            <div className="daily-row" key={day.date}>
              <span className="daily-day">{formatDayLabel(day.date, index)}</span>
              <WeatherIcon icon={info.icon} size={26} />
              <span className="daily-precip">
                {day.precipitationProbability > 0 ? `${day.precipitationProbability}%` : ''}
              </span>
              <span className="daily-min">{formatTemp(day.min, unit)}</span>
              <div className="daily-bar-track">
                <div
                  className="daily-bar-fill"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />
              </div>
              <span className="daily-max">{formatTemp(day.max, unit)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
