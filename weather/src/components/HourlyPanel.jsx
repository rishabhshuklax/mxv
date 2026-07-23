import WeatherIcon from './WeatherIcon.jsx';
import { getWeatherInfo } from '../lib/weatherCode.js';
import { formatTemp, formatHour } from '../lib/format.js';

const STEP = 56;
const CHART_H = 118;
const PAD_TOP = 26;
const PAD_BOTTOM = 30;

// Catmull-Rom spline through the hourly points, emitted as cubic beziers.
function buildPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function HourlyPanel({ hourly, unit }) {
  if (!hourly?.length) return null;
  const temps = hourly.map((h) => h.temperature ?? 0);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(max - min, 1);
  const width = hourly.length * STEP;

  const points = hourly.map((h, i) => ({
    x: i * STEP + STEP / 2,
    y: PAD_TOP + (1 - ((h.temperature ?? min) - min) / span) * (CHART_H - PAD_TOP - PAD_BOTTOM),
  }));
  const line = buildPath(points);
  const area = `${line} L ${points[points.length - 1].x} ${CHART_H} L ${points[0].x} ${CHART_H} Z`;

  return (
    <section className="panel panel-hourly">
      <h2 className="panel-title">Next 24 hours</h2>
      <div className="hourly-scroll">
        <div className="hourly-inner" style={{ width }}>
          <div className="hourly-times">
            {hourly.map((h, i) => (
              <span key={h.time}>{i === 0 ? 'Now' : formatHour(h.time)}</span>
            ))}
          </div>
          <svg className="hourly-chart" width={width} height={CHART_H} viewBox={`0 0 ${width} ${CHART_H}`} aria-hidden="true">
            <defs>
              <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.26" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {hourly.map((h, i) => {
              const prob = h.precipitationProbability ?? 0;
              if (prob < 15) return null;
              const barHeight = (prob / 100) * 26;
              return (
                <rect
                  key={`p${h.time}`}
                  className="chart-precip"
                  x={i * STEP + STEP / 2 - 9}
                  y={CHART_H - barHeight}
                  width={18}
                  height={barHeight}
                  rx={3}
                />
              );
            })}
            <path d={area} fill="url(#tempFill)" />
            <path d={line} className="chart-line" />
            {points.map((p, i) => (
              <text key={`t${hourly[i].time}`} className="chart-temp" x={p.x} y={p.y - 10} textAnchor="middle">
                {formatTemp(hourly[i].temperature, unit)}
              </text>
            ))}
            <circle className="chart-now" cx={points[0].x} cy={points[0].y} r={4} />
          </svg>
          <div className="hourly-icons">
            {hourly.map((h) => {
              const info = getWeatherInfo(h.weatherCode, h.isDay);
              const prob = h.precipitationProbability ?? 0;
              return (
                <div key={h.time} className="hourly-cell">
                  <WeatherIcon icon={info.icon} size={26} />
                  <span className="hourly-precip">{prob >= 20 ? `${prob}%` : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
