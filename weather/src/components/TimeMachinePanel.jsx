import { useMemo, useState } from 'react';
import { dayInHistory, HISTORY_START_YEAR } from '../lib/history.js';
import { formatTemp, formatFullDate } from '../lib/format.js';
import { shareText } from '../lib/share.js';

export default function TimeMachinePanel({ series, cityName, unit }) {
  const [dateStr, setDateStr] = useState('');
  const [copied, setCopied] = useState(false);

  const maxDate = series?.time?.[series.time.length - 1] ?? '';
  const result = useMemo(() => (series && dateStr ? dayInHistory(series, dateStr) : null), [series, dateStr]);

  if (!series) return null;

  const rainLabel = result
    ? result.precip > 0.2
      ? `${result.precip.toFixed(1)} mm of rain fell`
      : 'a dry day'
    : '';

  async function handleShare() {
    if (!result) return;
    const text = `On ${formatFullDate(result.date)} ${result.date.slice(0, 4)}, ${cityName} hit ${formatTemp(result.hi, unit)} by day, ${formatTemp(result.lo, unit)} by night — ${rainLabel}. What did the sky do on your birthday?`;
    const ok = await shareText(text, window.location.href);
    if (ok === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <section className="panel timemachine">
      <h2 className="panel-title">Time machine · any day since {HISTORY_START_YEAR}</h2>
      <p className="tm-prompt">Was it raining the day you were born? Pick the date — the sky remembers.</p>
      <div className="tm-row">
        <input
          type="date"
          className="tm-input"
          value={dateStr}
          min={`${HISTORY_START_YEAR}-01-01`}
          max={maxDate}
          onChange={(e) => setDateStr(e.target.value)}
          aria-label="Pick a date in the past"
        />
        {result && (
          <button type="button" className="tm-share" onClick={handleShare}>
            {copied ? 'Copied!' : 'Share this day'}
          </button>
        )}
      </div>
      {dateStr && !result && <p className="tm-miss">No record for that date here — try another day.</p>}
      {result && (
        <div className="tm-result" key={result.date}>
          <div className="tm-date">
            {formatFullDate(result.date)}, {result.date.slice(0, 4)} · {cityName}
          </div>
          <div className="tm-temps">
            <span className="tm-hi">{formatTemp(result.hi, unit)}</span>
            <span className="tm-lo">{formatTemp(result.lo, unit)}</span>
            <span className="tm-rain">{rainLabel}</span>
          </div>
        </div>
      )}
    </section>
  );
}
