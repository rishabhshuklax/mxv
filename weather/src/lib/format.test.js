import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTemp,
  formatWind,
  windDirectionLabel,
  aqiLevel,
  uvLevel,
  formatDayLabel,
  formatHour,
  formatClockTime,
  formatFullDate,
  formatTempDelta,
  formatPressure,
  formatVisibility,
  formatDaylight,
  pressureTrendInfo,
} from './format.js';

test('formatTemp rounds and defaults to celsius', () => {
  assert.equal(formatTemp(21.6), '22°');
});

test('formatTemp converts to fahrenheit', () => {
  assert.equal(formatTemp(0, 'F'), '32°');
  assert.equal(formatTemp(100, 'F'), '212°');
});

test('formatTemp handles missing values', () => {
  assert.equal(formatTemp(null), '--°');
  assert.equal(formatTemp(undefined), '--°');
});

test('formatWind converts km/h to mph', () => {
  assert.equal(formatWind(10, 'C'), '10 km/h');
  assert.equal(formatWind(10, 'F'), '6 mph');
});

test('windDirectionLabel maps degrees to compass points', () => {
  assert.equal(windDirectionLabel(0), 'N');
  assert.equal(windDirectionLabel(90), 'E');
  assert.equal(windDirectionLabel(180), 'S');
  assert.equal(windDirectionLabel(270), 'W');
});

test('aqiLevel buckets values', () => {
  assert.equal(aqiLevel(20).tone, 'good');
  assert.equal(aqiLevel(75).tone, 'moderate');
  assert.equal(aqiLevel(400).tone, 'hazardous');
  assert.equal(aqiLevel(null).tone, 'unknown');
});

test('uvLevel buckets values', () => {
  assert.equal(uvLevel(1).tone, 'good');
  assert.equal(uvLevel(9).tone, 'unhealthy');
  assert.equal(uvLevel(12).tone, 'hazardous');
});

test('formatDayLabel returns Today for index 0', () => {
  assert.equal(formatDayLabel('2026-07-23', 0), 'Today');
});

test('formatDayLabel returns a weekday abbreviation otherwise', () => {
  const label = formatDayLabel('2026-07-24', 1);
  assert.match(label, /^[A-Z][a-z]{2}$/);
});

// Open-Meteo returns each location's own local wall-clock time with no UTC
// offset (e.g. a Tokyo sunrise of "2026-07-24T04:47"). These display helpers
// must show that wall-clock value as-is, regardless of the host machine's
// own timezone — not re-interpret it through one.
test('formatClockTime shows the wall-clock hour and minute untouched', () => {
  assert.equal(formatClockTime('2026-07-24T04:47'), '4:47 AM');
  assert.equal(formatClockTime('2026-07-24T18:52'), '6:52 PM');
});

test('formatHour shows the wall-clock hour untouched', () => {
  assert.equal(formatHour('2026-07-24T00:00'), '12 AM');
  assert.equal(formatHour('2026-07-24T13:00'), '1 PM');
});

test('formatFullDate reads the date from the wall-clock string, not a shifted one', () => {
  assert.equal(formatFullDate('2026-07-24T23:30'), 'Friday, July 24');
});

test('formatTempDelta scales differences without the +32 offset', () => {
  assert.equal(formatTempDelta(5, 'C'), '5°');
  assert.equal(formatTempDelta(5, 'F'), '9°');
  assert.equal(formatTempDelta(-5, 'F'), '9°');
});

test('formatPressure switches between hPa and inHg', () => {
  assert.equal(formatPressure(1013.25, 'C'), '1013 hPa');
  assert.equal(formatPressure(1013.25, 'F'), '29.92 inHg');
});

test('formatVisibility caps at 10 and handles sub-kilometer values', () => {
  assert.equal(formatVisibility(24000, 'C'), '10+ km');
  assert.equal(formatVisibility(6200, 'C'), '6 km');
  assert.equal(formatVisibility(800, 'C'), '800 m');
  assert.equal(formatVisibility(24000, 'F'), '10+ mi');
});

test('formatDaylight renders hours and minutes', () => {
  assert.equal(formatDaylight(846), '14h 06m');
});

test('pressureTrendInfo maps trends to labels', () => {
  assert.equal(pressureTrendInfo('rising').arrow, '↑');
  assert.equal(pressureTrendInfo('falling').label, 'Falling');
  assert.equal(pressureTrendInfo(null).label, '');
});
