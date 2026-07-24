import { stripesData, calendarDayStats, sampleYearsOnDay, rankToday, HISTORY_START_YEAR } from '../lib/history.js';
import { formatTemp, formatTempDelta, formatFullDate } from '../lib/format.js';
import { renderStripesCard, shareCanvas, slugify } from '../lib/share.js';

function rankLine(rank, dayLabel) {
  if (!rank || rank.rank > 10) return null;
  if (rank.rank === 1) return `Hottest ${dayLabel} on record here — and the record starts in ${HISTORY_START_YEAR}.`;
  if (rank.rank === 2) return `Only one ${dayLabel} since ${HISTORY_START_YEAR} was hotter than this.`;
  if (rank.rank === 3) return `Only two ${dayLabel}s since ${HISTORY_START_YEAR} were hotter than this.`;
  return `#${rank.rank} hottest ${dayLabel} here since ${HISTORY_START_YEAR}.`;
}

// Honesty gate: only claim "warming" when the recent years actually run warm.
function pickHeadline(city, anomalies) {
  const recent = anomalies.slice(-10);
  const recentMean = recent.reduce((s, a) => s + a.anomaly, 0) / recent.length;
  return recentMean > 0.3 ? `${city} is warming. Here's the receipt.` : `This isn't a gradient. It's ${city}'s temperature record.`;
}

// Diverging blue→red for warming-stripe anomalies, Ed Hawkins style.
function stripeColor(anomaly, maxAbs) {
  const t = Math.max(-1, Math.min(1, anomaly / maxAbs));
  if (t < 0) {
    const a = 0.25 + 0.75 * -t;
    return `rgba(69, 117, 199, ${a.toFixed(2)})`;
  }
  const a = 0.25 + 0.75 * t;
  return `rgba(214, 66, 57, ${a.toFixed(2)})`;
}

export default function ClimatePanel({ series, loading, today, currentTime, unit, cityName, themeKey }) {
  if (loading) {
    return (
      <section className="panel climate">
        <h2 className="panel-title">Climate memory · since {HISTORY_START_YEAR}</h2>
        <p className="climate-loading">Reading {new Date().getFullYear() - HISTORY_START_YEAR} years of local records…</p>
        <div className="skeleton skeleton-stripes" aria-hidden="true" />
      </section>
    );
  }
  if (!series) return null;

  const stripes = stripesData(series);
  const monthDay = currentTime.slice(5, 10);
  const stats = calendarDayStats(series, monthDay, today?.max ?? null);
  const pastDays = sampleYearsOnDay(series, monthDay);
  if (!stripes) return null;

  const firstYear = stripes.anomalies[0].year;
  const lastYear = stripes.anomalies[stripes.anomalies.length - 1].year;
  const dayLabel = formatFullDate(currentTime).split(', ')[1] ?? formatFullDate(currentTime);

  let verdict = null;
  if (stats?.anomaly != null) {
    const abs = Math.abs(stats.anomaly);
    if (abs < 1.5) verdict = `Today is a typical ${dayLabel} for this location.`;
    else
      verdict = `Today runs ${formatTempDelta(stats.anomaly, unit)} ${stats.anomaly > 0 ? 'hotter' : 'colder'} than a normal ${dayLabel} here — ${
        stats.anomaly > 0 ? 'hotter' : 'colder'
      } than ${stats.anomaly > 0 ? stats.percentile : 100 - stats.percentile}% of them since ${HISTORY_START_YEAR}.`;
  }

  const rank = rankToday(series, monthDay, today?.max ?? null);
  const rankText = rankLine(rank, dayLabel);

  async function handleShareStripes() {
    const canvas = renderStripesCard({
      city: cityName ?? '',
      anomalies: stripes.anomalies,
      maxAbs: stripes.maxAbs,
      verdict: verdict ?? `Every year in ${cityName} since ${firstYear}, one stripe each.`,
      themeKey: themeKey ?? 'clear',
      shareUrl: 'ultimate-weather-mocha.vercel.app',
    });
    await shareCanvas(
      canvas,
      `stripes-${slugify(cityName)}.png`,
      `${pickHeadline(cityName ?? 'My city', stripes.anomalies)} · https://ultimate-weather-mocha.vercel.app`,
    );
  }

  return (
    <section className="panel climate">
      <div className="climate-head">
        <h2 className="panel-title">Climate memory · since {HISTORY_START_YEAR}</h2>
        <button type="button" className="tm-share climate-share" onClick={handleShareStripes}>
          Show my stripes
        </button>
      </div>

      {rankText && <p className="climate-rank">{rankText}</p>}
      {verdict && <p className="climate-verdict">{verdict}</p>}

      <div className="stripes-wrap" role="img" aria-label={`Warming stripes for this location, ${firstYear} to ${lastYear}`}>
        <svg viewBox={`0 0 ${stripes.anomalies.length} 40`} preserveAspectRatio="none" className="stripes stripes--wipe">
          {stripes.anomalies.map((a, i) => (
            <rect key={a.year} x={i} y="0" width="1.02" height="40" fill={stripeColor(a.anomaly, stripes.maxAbs)}>
              <title>{`${a.year}: ${a.anomaly >= 0 ? '+' : ''}${a.anomaly.toFixed(2)}°C vs early-record average`}</title>
            </rect>
          ))}
        </svg>
        <div className="stripes-labels">
          <span>{firstYear}</span>
          <span className="stripes-caption">each stripe = one year's mean temperature here</span>
          <span>{lastYear}</span>
        </div>
      </div>

      <div className="climate-grid">
        {stats?.recordHigh && (
          <div>
            <span className="detail-label">Record high · {dayLabel}</span>
            <span className="detail-mini">
              {formatTemp(stats.recordHigh.value, unit)} <span className="climate-year">({stats.recordHigh.year})</span>
            </span>
          </div>
        )}
        {stats?.recordLow && (
          <div>
            <span className="detail-label">Record low · {dayLabel}</span>
            <span className="detail-mini">
              {formatTemp(stats.recordLow.value, unit)} <span className="climate-year">({stats.recordLow.year})</span>
            </span>
          </div>
        )}
        {stats && (
          <div>
            <span className="detail-label">Normal high · {dayLabel}</span>
            <span className="detail-mini">{formatTemp(stats.normalHigh, unit)}</span>
          </div>
        )}
      </div>

      {pastDays.length > 0 && (
        <div className="climate-history">
          <span className="detail-label">This day in…</span>
          <div className="climate-history-row">
            {pastDays.map((d) => (
              <div className="climate-chip" key={d.year}>
                <span className="climate-chip-year">{d.year}</span>
                <span className="climate-chip-temp">
                  {formatTemp(d.hi, unit)} / {formatTemp(d.lo, unit)}
                </span>
                <span className="climate-chip-precip">{d.precip > 0.2 ? `${d.precip.toFixed(1)} mm rain` : 'dry'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
