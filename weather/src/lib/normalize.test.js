import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeForecast, normalizeAirQuality } from './normalize.js';

// Mirrors a past_days=1 response: daily starts yesterday, hourly spans
// yesterday too, and minutely_15 covers the current window.
const RAW_FORECAST = {
  timezone: 'America/New_York',
  current: {
    time: '2026-07-23T12:20',
    temperature_2m: 24.3,
    apparent_temperature: 25.1,
    weather_code: 2,
    wind_speed_10m: 12,
    wind_direction_10m: 180,
    wind_gusts_10m: 22,
    relative_humidity_2m: 55,
    precipitation: 0,
    cloud_cover: 40,
    pressure_msl: 1014.2,
    is_day: 1,
  },
  hourly: {
    time: ['2026-07-23T09:00', '2026-07-23T10:00', '2026-07-23T11:00', '2026-07-23T12:00', '2026-07-23T13:00'],
    temperature_2m: [20, 21, 23, 24.3, 25],
    weather_code: [1, 1, 2, 2, 2],
    precipitation_probability: [0, 0, 0, 5, 10],
    is_day: [1, 1, 1, 1, 1],
    wind_speed_10m: [8, 9, 10, 12, 14],
    relative_humidity_2m: [60, 58, 56, 55, 54],
    visibility: [24000, 24000, 24000, 18000, 18000],
    dew_point_2m: [14, 14, 14.5, 15, 15],
    pressure_msl: [1012.5, 1013, 1013.6, 1014.2, 1014.5],
  },
  daily: {
    time: ['2026-07-22', '2026-07-23', '2026-07-24'],
    weather_code: [3, 2, 61],
    temperature_2m_max: [22, 26, 22],
    temperature_2m_min: [16, 18, 16],
    apparent_temperature_max: [23, 27, 22],
    apparent_temperature_min: [15, 17, 15],
    sunrise: ['2026-07-22T05:44', '2026-07-23T05:45', '2026-07-24T05:46'],
    sunset: ['2026-07-22T20:16', '2026-07-23T20:15', '2026-07-24T20:14'],
    precipitation_probability_max: [20, 10, 60],
    precipitation_sum: [0.4, 0, 5.2],
    uv_index_max: [5.5, 6.2, 3.1],
    wind_speed_10m_max: [18, 20, 30],
  },
  minutely_15: {
    time: ['2026-07-23T12:00', '2026-07-23T12:15', '2026-07-23T12:30', '2026-07-23T12:45'],
    precipitation: [0, 0.2, 0.5, 0.1],
  },
};

test('daily anchors on today even with past_days in the response', () => {
  const result = normalizeForecast(RAW_FORECAST);
  assert.equal(result.today.date, '2026-07-23');
  assert.equal(result.daily[0].date, '2026-07-23');
  assert.equal(result.yesterday.date, '2026-07-22');
  assert.equal(result.yesterday.max, 22);
});

test('hourly keeps the in-progress hour so the first entry is Now', () => {
  const result = normalizeForecast(RAW_FORECAST);
  assert.equal(result.hourly[0].time, '2026-07-23T12:00');
});

test('current is enriched with visibility, dew point, and pressure trend', () => {
  const result = normalizeForecast(RAW_FORECAST);
  assert.equal(result.current.visibility, 18000);
  assert.equal(result.current.dewPoint, 15);
  assert.equal(result.current.pressureTrend, 'rising');
  assert.equal(result.current.windGusts, 22);
});

test('nowcast starts at the current quarter hour', () => {
  const result = normalizeForecast(RAW_FORECAST);
  assert.equal(result.nowcast.steps[0].time, '2026-07-23T12:15');
  assert.ok(Math.abs(result.nowcast.total - 0.8) < 1e-9);
});

test('missing minutely data yields no nowcast', () => {
  const { minutely_15, ...rest } = RAW_FORECAST;
  const result = normalizeForecast(rest);
  assert.equal(result.nowcast, null);
});

test('normalizeAirQuality maps current pollutant fields', () => {
  const result = normalizeAirQuality({ current: { us_aqi: 42, pm2_5: 8.1, pm10: 15, ozone: 30 } });
  assert.deepEqual(result, { aqi: 42, pm2_5: 8.1, pm10: 15, ozone: 30 });
});

test('normalizeAirQuality returns null when data is missing', () => {
  assert.equal(normalizeAirQuality(null), null);
  assert.equal(normalizeAirQuality({}), null);
});
