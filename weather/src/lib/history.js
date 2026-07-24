// Climate memory: statistics over the full daily record (1940 → now) for a
// location. All functions here are pure; fetching/caching is a thin wrapper
// around the archive API in api.js.

export const HISTORY_START_YEAR = 1940;
const CACHE_PREFIX = 'ultimate-weather:history:';
const CACHE_TTL_MS = 30 * 24 * 3600 * 1000;

export function historyCacheKey(latitude, longitude) {
  return `${CACHE_PREFIX}${latitude.toFixed(1)},${longitude.toFixed(1)}`;
}

export function readHistoryCache(latitude, longitude, storage = window.localStorage, now = Date.now()) {
  try {
    const raw = storage.getItem(historyCacheKey(latitude, longitude));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.fetchedAt || now - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.series ?? null;
  } catch {
    return null;
  }
}

export function writeHistoryCache(latitude, longitude, series, storage = window.localStorage, now = Date.now()) {
  try {
    storage.setItem(historyCacheKey(latitude, longitude), JSON.stringify({ fetchedAt: now, series }));
  } catch {
    // Quota exceeded or private mode — the feature just refetches next time.
  }
}

// Compact the raw archive payload into a lean series we can cache.
export function buildSeries(raw) {
  const time = raw?.daily?.time;
  if (!time?.length) return null;
  const tmax = raw.daily.temperature_2m_max ?? [];
  const tmin = raw.daily.temperature_2m_min ?? [];
  const precip = raw.daily.precipitation_sum ?? [];
  return { time, tmax, tmin, precip };
}

function dayMean(series, i) {
  const hi = series.tmax[i];
  const lo = series.tmin[i];
  if (hi == null || lo == null) return null;
  return (hi + lo) / 2;
}

// Annual mean temperature per year, skipping years with sparse data.
export function yearlyMeans(series) {
  const sums = new Map();
  for (let i = 0; i < series.time.length; i += 1) {
    const mean = dayMean(series, i);
    if (mean === null) continue;
    const year = Number(series.time[i].slice(0, 4));
    const entry = sums.get(year) ?? { sum: 0, n: 0 };
    entry.sum += mean;
    entry.n += 1;
    sums.set(year, entry);
  }
  const out = [];
  for (const [year, { sum, n }] of [...sums.entries()].sort((a, b) => a[0] - b[0])) {
    if (n >= 300) out.push({ year, mean: sum / n });
  }
  return out;
}

// Warming stripes: anomaly of each year vs the mean of a reference window
// (defaults to the first 30 complete years of the record).
export function stripesData(series) {
  const years = yearlyMeans(series);
  if (years.length < 10) return null;
  const reference = years.slice(0, Math.min(30, years.length));
  const baseline = reference.reduce((s, y) => s + y.mean, 0) / reference.length;
  const anomalies = years.map((y) => ({ year: y.year, anomaly: y.mean - baseline }));
  const maxAbs = Math.max(0.5, ...anomalies.map((a) => Math.abs(a.anomaly)));
  return { anomalies, baseline, maxAbs };
}

function sameCalendarWindow(isoDate, target, windowDays) {
  // Distance in calendar days between MM-DD values, wrapping the year end.
  const toDoy = (mmdd) => {
    const [m, d] = mmdd.split('-').map(Number);
    const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    return CUM[m - 1] + d;
  };
  const a = toDoy(isoDate.slice(5, 10));
  const b = toDoy(target);
  const diff = Math.abs(a - b);
  return Math.min(diff, 365 - diff) <= windowDays;
}

// Statistics for "days like today" (same calendar day ±windowDays across all
// years): the recent-normal high, today's percentile, and all-time records.
export function calendarDayStats(series, monthDay, todayMax, { windowDays = 3, normalFromYear = 1991 } = {}) {
  const samples = [];
  let recordHigh = null;
  let recordLow = null;
  for (let i = 0; i < series.time.length; i += 1) {
    if (!sameCalendarWindow(series.time[i], monthDay, windowDays)) continue;
    const hi = series.tmax[i];
    const lo = series.tmin[i];
    const year = Number(series.time[i].slice(0, 4));
    if (hi != null) {
      samples.push({ year, hi });
      if (!recordHigh || hi > recordHigh.value) recordHigh = { value: hi, year };
    }
    if (lo != null && (!recordLow || lo < recordLow.value)) recordLow = { value: lo, year };
  }
  if (samples.length < 30) return null;

  const recent = samples.filter((s) => s.year >= normalFromYear);
  const normalPool = recent.length >= 30 ? recent : samples;
  const normalHigh = normalPool.reduce((s, x) => s + x.hi, 0) / normalPool.length;

  let percentile = null;
  let anomaly = null;
  if (todayMax != null) {
    const below = samples.filter((s) => s.hi < todayMax).length;
    percentile = Math.round((below / samples.length) * 100);
    anomaly = todayMax - normalHigh;
  }

  return { normalHigh, anomaly, percentile, recordHigh, recordLow, sampleYears: samples.length };
}

// "This day in ..." — the exact calendar day in a handful of past years.
export function sampleYearsOnDay(series, monthDay, years = [1950, 1975, 2000, 2015]) {
  const byDate = new Map();
  for (let i = 0; i < series.time.length; i += 1) {
    if (series.time[i].slice(5, 10) === monthDay) {
      byDate.set(Number(series.time[i].slice(0, 4)), i);
    }
  }
  const out = [];
  for (const year of years) {
    const i = byDate.get(year);
    if (i === undefined) continue;
    const hi = series.tmax[i];
    const lo = series.tmin[i];
    if (hi == null || lo == null) continue;
    out.push({ year, hi, lo, precip: series.precip[i] ?? null });
  }
  return out;
}
