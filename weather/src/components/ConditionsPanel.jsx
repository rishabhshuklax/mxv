import {
  formatWind,
  windDirectionLabel,
  formatPrecip,
  formatPressure,
  formatVisibility,
  formatTemp,
  pressureTrendInfo,
  uvLevel,
} from '../lib/format.js';

function DetailCard({ label, value, sub, tone, wide, children }) {
  return (
    <div className={`detail-card ${tone ? `detail-card--${tone}` : ''} ${wide ? 'detail-card--wide' : ''}`}>
      <span className="detail-label">{label}</span>
      {children ?? (
        <>
          <span className="detail-value">{value}</span>
          {sub && <span className="detail-sub">{sub}</span>}
        </>
      )}
    </div>
  );
}

function WindCompass({ direction }) {
  return (
    <svg viewBox="0 0 96 96" className="wind-compass" aria-hidden="true">
      <circle cx="48" cy="48" r="42" className="compass-ring" />
      {[0, 90, 180, 270].map((deg) => (
        <line
          key={deg}
          x1="48"
          y1="8"
          x2="48"
          y2="14"
          className="compass-tick"
          transform={`rotate(${deg} 48 48)`}
        />
      ))}
      <text x="48" y="22" textAnchor="middle" className="compass-label">N</text>
      <text x="48" y="80" textAnchor="middle" className="compass-label">S</text>
      <text x="15" y="52" textAnchor="middle" className="compass-label">W</text>
      <text x="81" y="52" textAnchor="middle" className="compass-label">E</text>
      {direction != null && (
        <g className="compass-needle" style={{ '--dir': `${direction + 180}deg`, transform: 'rotate(var(--dir))' }}>
          <path d="M48 20 L53 46 L48 42 L43 46 Z" className="needle-head" />
          <path d="M48 76 L52 52 L48 55 L44 52 Z" className="needle-tail" />
        </g>
      )}
    </svg>
  );
}

export default function ConditionsPanel({ forecast, unit }) {
  const { current, today } = forecast;
  const uv = today ? uvLevel(today.uvIndex) : null;
  const trend = pressureTrendInfo(current.pressureTrend);

  return (
    <section className="panel">
      <h2 className="panel-title">Conditions</h2>
      <div className="details-grid">
        <DetailCard label="Wind" wide>
          <div className="wind-card-body">
            <WindCompass direction={current.windDirection} />
            <div className="wind-card-meta">
              <span className="detail-value">{formatWind(current.windSpeed, unit)}</span>
              <span className="detail-sub">from {windDirectionLabel(current.windDirection)}</span>
              {current.windGusts != null && (
                <span className="detail-sub">gusts {formatWind(current.windGusts, unit)}</span>
              )}
            </div>
          </div>
        </DetailCard>
        <DetailCard
          label="Humidity"
          value={`${Math.round(current.humidity)}%`}
          sub={current.dewPoint != null ? `dew point ${formatTemp(current.dewPoint, unit)}` : undefined}
        />
        <DetailCard
          label="Pressure"
          value={formatPressure(current.pressure, unit)}
          sub={trend.label ? `${trend.arrow} ${trend.label}` : undefined}
        />
        <DetailCard label="Visibility" value={formatVisibility(current.visibility, unit)} />
        <DetailCard
          label="Cloud cover"
          value={current.cloudCover != null ? `${Math.round(current.cloudCover)}%` : '--'}
        />
        {today && (
          <DetailCard
            label="UV index"
            value={today.uvIndex != null ? Math.round(today.uvIndex) : '--'}
            sub={uv?.label}
            tone={uv?.tone}
          />
        )}
        <DetailCard label="Precipitation" value={formatPrecip(current.precipitation)} />
      </div>
    </section>
  );
}
