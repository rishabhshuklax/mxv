import { aqiLevel } from '../lib/format.js';

export default function AirQualityCard({ airQuality }) {
  if (!airQuality || airQuality.aqi === null) return null;
  const level = aqiLevel(airQuality.aqi);
  const pct = Math.min(100, (airQuality.aqi / 300) * 100);

  return (
    <section className="panel">
      <h2 className="panel-title">Air quality</h2>
      <div className={`aqi-card aqi-card--${level.tone}`}>
        <div className="aqi-headline">
          <span className="aqi-value">{Math.round(airQuality.aqi)}</span>
          <span className="aqi-label">{level.label}</span>
        </div>
        <div className="aqi-track">
          <div className="aqi-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="aqi-pollutants">
          <span>PM2.5 {airQuality.pm2_5?.toFixed(1) ?? '--'}</span>
          <span>PM10 {airQuality.pm10?.toFixed(1) ?? '--'}</span>
          <span>Ozone {airQuality.ozone?.toFixed(0) ?? '--'}</span>
        </div>
      </div>
    </section>
  );
}
