import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInsights } from './insights.js';

function dryHour(time, extra = {}) {
  return { time, precipitationProbability: 5, windSpeed: 10, ...extra };
}

const CALM = {
  current: { temperature: 22, feelsLike: 22.5, precipitation: 0 },
  hourly: Array.from({ length: 12 }, (_, i) => dryHour(`2026-07-23T${String(12 + i).padStart(2, '0')}:00`)),
  daily: [{ max: 25, min: 15, uvIndex: 4 }, { max: 26, min: 16 }],
  today: { max: 25, min: 15, uvIndex: 4 },
  yesterday: { max: 24, min: 14 },
  nowcast: null,
  airQuality: { aqi: 30 },
  unit: 'C',
};

test('calm day yields the dry reassurance insight', () => {
  const insights = buildInsights(CALM);
  assert.ok(insights.some((i) => i.kind === 'dry'));
  assert.ok(!insights.some((i) => i.kind === 'rain'));
});

test('nowcast rain produces a starting-time insight', () => {
  const insights = buildInsights({
    ...CALM,
    nowcast: {
      total: 2.4,
      steps: [
        { time: '2026-07-23T12:15', precipitation: 0 },
        { time: '2026-07-23T12:30', precipitation: 0.4 },
        { time: '2026-07-23T12:45', precipitation: 0.8 },
      ],
    },
  });
  const rain = insights.find((i) => i.kind === 'rain');
  assert.ok(rain);
  assert.match(rain.text, /starting around 12:30 PM/);
});

test('active precipitation that tapers reports the easing time', () => {
  const insights = buildInsights({
    ...CALM,
    nowcast: {
      total: 1.2,
      steps: [
        { time: '2026-07-23T12:15', precipitation: 0.6 },
        { time: '2026-07-23T12:30', precipitation: 0.4 },
        { time: '2026-07-23T12:45', precipitation: 0 },
      ],
    },
  });
  const rain = insights.find((i) => i.kind === 'rain');
  assert.match(rain.text, /easing around 12:45 PM/);
});

test('hourly probability produces a rain insight without a nowcast', () => {
  const hourly = CALM.hourly.map((h, i) => (i === 4 ? { ...h, precipitationProbability: 70 } : h));
  const insights = buildInsights({ ...CALM, hourly });
  const rain = insights.find((i) => i.kind === 'rain');
  assert.match(rain.text, /70% chance of rain/);
});

test('feels-like gap, yesterday delta, uv, wind, and aqi all trigger', () => {
  const insights = buildInsights({
    ...CALM,
    current: { temperature: 30, feelsLike: 35, precipitation: 0 },
    today: { max: 33, min: 22, uvIndex: 9 },
    yesterday: { max: 28, min: 20 },
    hourly: CALM.hourly.map((h) => ({ ...h, windSpeed: 40 })),
    airQuality: { aqi: 155 },
  });
  const kinds = insights.map((i) => i.kind);
  assert.ok(kinds.includes('feels'));
  assert.ok(kinds.includes('trend'));
  assert.equal(insights.length, 4);
});

test('temperature deltas convert to fahrenheit as differences', () => {
  const insights = buildInsights({ ...CALM, today: { max: 30, min: 20 }, yesterday: { max: 25, min: 15 }, unit: 'F' });
  const trend = insights.find((i) => i.kind === 'trend');
  assert.match(trend.text, /9° warmer than yesterday/);
});
