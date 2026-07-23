import WeatherIcon from './WeatherIcon.jsx';
import { getWeatherInfo } from '../lib/weatherCode.js';
import { formatTemp, formatHour } from '../lib/format.js';

export default function HourlyStrip({ hourly, unit }) {
  if (!hourly?.length) return null;
  return (
    <section className="panel">
      <h2 className="panel-title">Hourly forecast</h2>
      <div className="hourly-strip">
        {hourly.map((hour, index) => {
          const info = getWeatherInfo(hour.weatherCode, hour.isDay);
          return (
            <div className="hourly-item" key={hour.time}>
              <span className="hourly-time">{index === 0 ? 'Now' : formatHour(hour.time)}</span>
              <WeatherIcon icon={info.icon} size={32} />
              <span className="hourly-temp">{formatTemp(hour.temperature, unit)}</span>
              <span className="hourly-precip">
                {hour.precipitationProbability > 0 ? `${hour.precipitationProbability}%` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
