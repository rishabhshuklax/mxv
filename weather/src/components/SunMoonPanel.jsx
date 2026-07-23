import { sunProgress, moonPhase } from '../lib/astro.js';
import { formatClockTime, formatDaylight } from '../lib/format.js';

// Parametric moon: shadow disc + light region built from the outer semicircle
// on the lit side and a terminator half-ellipse whose rx follows the phase.
function MoonIcon({ illumination, waxing, size = 44 }) {
  const r = 20;
  const c = 24;
  const rx = r * Math.abs(1 - 2 * illumination);
  let light = null;
  if (illumination > 0.96) {
    light = <circle cx={c} cy={c} r={r} className="moon-light" />;
  } else if (illumination > 0.04) {
    const outerSweep = waxing ? 1 : 0;
    const termSweep = waxing ? (illumination < 0.5 ? 0 : 1) : illumination < 0.5 ? 1 : 0;
    const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${outerSweep} ${c} ${c + r} A ${rx.toFixed(2)} ${r} 0 0 ${termSweep} ${c} ${c - r} Z`;
    light = <path d={d} className="moon-light" />;
  }
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className="moon-icon">
      <circle cx={c} cy={c} r={r} className="moon-shadow" />
      {light}
    </svg>
  );
}

export default function SunMoonPanel({ today, currentTime }) {
  if (!today?.sunrise || !today?.sunset) return null;
  const progress = sunProgress(today.sunrise, today.sunset, currentTime);
  const moon = moonPhase();

  const fraction = progress?.fraction ?? 0;
  const showSun = progress && !progress.beforeSunrise && !progress.afterSunset;
  const angle = Math.PI * (1 - fraction);
  const sunX = 110 + 88 * Math.cos(angle);
  const sunY = 96 - 88 * Math.sin(angle);

  return (
    <section className="panel sunmoon">
      <h2 className="panel-title">Sun &amp; moon</h2>
      <div className="sun-arc-wrap">
        <svg viewBox="0 0 220 104" className="sun-arc" aria-hidden="true">
          <line x1="8" y1="96" x2="212" y2="96" className="sun-horizon" />
          <path d="M 22 96 A 88 88 0 0 1 198 96" className="sun-track" pathLength="100" />
          <path
            d="M 22 96 A 88 88 0 0 1 198 96"
            className="sun-progress"
            pathLength="100"
            style={{ strokeDasharray: `${(fraction * 100).toFixed(1)} 100` }}
          />
          {showSun && (
            <g>
              <circle cx={sunX} cy={sunY} r="14" className="sun-dot-glow" />
              <circle cx={sunX} cy={sunY} r="5.5" className="sun-dot" />
            </g>
          )}
        </svg>
      </div>
      <div className="sun-stats">
        <div>
          <span className="sun-stat-label">Sunrise</span>
          <span className="sun-stat-value">{formatClockTime(today.sunrise)}</span>
        </div>
        <div>
          <span className="sun-stat-label">Daylight</span>
          <span className="sun-stat-value">{formatDaylight(progress?.daylightMinutes)}</span>
        </div>
        <div>
          <span className="sun-stat-label">Sunset</span>
          <span className="sun-stat-value">{formatClockTime(today.sunset)}</span>
        </div>
      </div>
      <div className="moon-row">
        <MoonIcon illumination={moon.illumination} waxing={moon.waxing} />
        <div className="moon-meta">
          <span className="moon-name">{moon.name}</span>
          <span className="moon-illum">{Math.round(moon.illumination * 100)}% illuminated</span>
        </div>
      </div>
    </section>
  );
}
