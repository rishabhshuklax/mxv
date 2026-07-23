import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeForecast, normalizeAirQuality } from './normalize.js';

const RAW_FORECAST = {
  timezone: 'America/New_York',
  current: {
    time: '2026-07-23T12:00',
    temperature_2m: 24.3,
    apparent_temperature: 25.1,
    weather_code: 2,
    wind_speed_10m: 12,
    wind_direction_10m: 180,
    relative_humidity_2m: 55,
    precipitation: 0,
    is_day: 1,
  },
  hourly: {
    time: ['2026-07-23T11:00', '2026-07-23T12:00', '2026-07-23T13:00'],
    temperature_2m: [23, 24.3, 25],
    weather_code: [1, 2, 2],
    precipitation_probability: [0, 5, 10],
    is_day: [1, 1, 1],
  },
  daily: {
    time: ['2026-07-23', '2026-07-24'],
    weather_code: [2, 61],
    temperature_2m_max: [26, 22],
    temperature_2m_min: [18, 16],
    sunrise: ['2026-07-23T05:45', '2026-07-24T05:46'],
    sunset: ['2026-07-23T20:15', '2026-07-24T20:14'],
    precipitation_probability_max: [10, 60],
    uv_index_max: [6.2, 3.1],
  },
};

test('normalizeForecast builds current, hourly, and daily view models', () => {
  const result = normalizeForecast(RAW_FORECAST);
  assert.equal(result.timezone, 'America/New_York');
  assert.equal(result.current.temperature, 24.3);
  assert.equal(result.current.info.group, 'cloud');
  assert.equal(result.today.date, '2026-07-23');
  assert.equal(result.daily.length, 2);
});

test('normalizeForecast drops hourly entries before the current time', () => {
  const result = normalizeForecast(RAW_FORECAST);
  assert.equal(result.hourly.length, 2);
  assert.equal(result.hourly[0].time, '2026-07-23T12:00');
});

test('normalizeAirQuality maps current pollutant fields', () => {
  const result = normalizeAirQuality({ current: { us_aqi: 42, pm2_5: 8.1, pm10: 15, ozone: 30 } });
  assert.deepEqual(result, { aqi: 42, pm2_5: 8.1, pm10: 15, ozone: 30 });
});

test('normalizeAirQuality returns null when data is missing', () => {
  assert.equal(normalizeAirQuality(null), null);
  assert.equal(normalizeAirQuality({}), null);
});
