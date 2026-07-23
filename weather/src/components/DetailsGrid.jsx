import { formatWind, windDirectionLabel, formatPrecip, formatClockTime, uvLevel } from '../lib/format.js';

function DetailCard({ label, value, sub, tone }) {
  return (
    <div className={`detail-card ${tone ? `detail-card--${tone}` : ''}`}>
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
      {sub && <span className="detail-sub">{sub}</span>}
    </div>
  );
}

export default function DetailsGrid({ forecast, unit }) {
  const { current, today } = forecast;
  const uv = today ? uvLevel(today.uvIndex) : null;

  return (
    <section className="panel">
      <h2 className="panel-title">Conditions</h2>
      <div className="details-grid">
        <DetailCard
          label="Wind"
          value={formatWind(current.windSpeed, unit)}
          sub={windDirectionLabel(current.windDirection)}
        />
        <DetailCard label="Humidity" value={`${Math.round(current.humidity)}%`} />
        <DetailCard label="Precipitation" value={formatPrecip(current.precipitation)} />
        {today && (
          <DetailCard
            label="UV index"
            value={today.uvIndex != null ? Math.round(today.uvIndex) : '--'}
            sub={uv?.label}
            tone={uv?.tone}
          />
        )}
        {today && (
          <DetailCard label="Sunrise" value={formatClockTime(today.sunrise)} />
        )}
        {today && (
          <DetailCard label="Sunset" value={formatClockTime(today.sunset)} />
        )}
      </div>
    </section>
  );
}
