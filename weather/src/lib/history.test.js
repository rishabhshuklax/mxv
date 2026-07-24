import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSeries,
  yearlyMeans,
  stripesData,
  calendarDayStats,
  sampleYearsOnDay,
  readHistoryCache,
  writeHistoryCache,
} from './history.js';

// Synthetic 40-year record: every day of each year present, tmax rises by
// 0.05°/year so the trend (and stripes) are deterministic.
function syntheticSeries(startYear = 1950, years = 40) {
  const time = [];
  const tmax = [];
  const tmin = [];
  const precip = [];
  for (let y = 0; y < years; y += 1) {
    const year = startYear + y;
    for (let m = 1; m <= 12; m += 1) {
      const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
      for (let d = 1; d <= days; d += 1) {
        time.push(`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        tmax.push(20 + y * 0.05);
        tmin.push(10 + y * 0.05);
        precip.push(d % 7 === 0 ? 4 : 0);
      }
    }
  }
  return { time, tmax, tmin, precip };
}

test('buildSeries compacts the archive payload', () => {
  const raw = { daily: { time: ['2000-01-01'], temperature_2m_max: [5], temperature_2m_min: [-2], precipitation_sum: [1.2] } };
  assert.deepEqual(buildSeries(raw), { time: ['2000-01-01'], tmax: [5], tmin: [-2], precip: [1.2] });
  assert.equal(buildSeries({}), null);
});

test('yearlyMeans returns one warming entry per year', () => {
  const means = yearlyMeans(syntheticSeries());
  assert.equal(means.length, 40);
  assert.equal(means[0].year, 1950);
  assert.ok(means[39].mean > means[0].mean + 1.9);
});

test('stripesData anomalies are negative early and positive late', () => {
  const stripes = stripesData(syntheticSeries());
  assert.equal(stripes.anomalies.length, 40);
  assert.ok(stripes.anomalies[0].anomaly < 0);
  assert.ok(stripes.anomalies[39].anomaly > 0);
  assert.ok(stripes.maxAbs >= 0.5);
});

test('calendarDayStats computes normal, percentile, and records', () => {
  const stats = calendarDayStats(syntheticSeries(), '07-15', 25, { normalFromYear: 1980 });
  assert.ok(stats);
  // Highs run 20..21.95 — a 25° day beats every sample.
  assert.equal(stats.percentile, 100);
  assert.ok(stats.anomaly > 3);
  assert.equal(stats.recordHigh.year, 1989);
  assert.equal(stats.recordLow.year, 1950);
  assert.ok(stats.sampleYears >= 40 * 6);
});

test('calendarDayStats handles the year-end wrap window', () => {
  const stats = calendarDayStats(syntheticSeries(), '01-01', 21);
  assert.ok(stats.sampleYears >= 40 * 6);
});

test('sampleYearsOnDay pulls the exact day from requested years', () => {
  const rows = sampleYearsOnDay(syntheticSeries(), '07-15', [1955, 1985]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].year, 1955);
  assert.ok(Math.abs(rows[0].hi - 20.25) < 1e-9);
});

test('history cache round-trips and expires', () => {
  const map = new Map();
  const storage = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
  const series = { time: ['2000-01-01'], tmax: [5], tmin: [1], precip: [0] };
  writeHistoryCache(51.5, -0.1, series, storage, 1000);
  assert.deepEqual(readHistoryCache(51.5, -0.1, storage, 2000), series);
  assert.equal(readHistoryCache(51.5, -0.1, storage, 1000 + 31 * 24 * 3600 * 1000), null);
  assert.equal(readHistoryCache(40, 40, storage, 2000), null);
});
