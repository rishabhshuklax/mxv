import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moonPhase, sunProgress, wallClockMinutes } from './astro.js';

const ANCHOR = Date.UTC(2000, 0, 6, 18, 14);
const DAY = 86400000;

test('moonPhase at the anchor new moon', () => {
  const result = moonPhase(new Date(ANCHOR));
  assert.equal(result.name, 'New moon');
  assert.ok(result.illumination < 0.01);
});

test('moonPhase half a synodic month later is full', () => {
  const result = moonPhase(new Date(ANCHOR + 14.765 * DAY));
  assert.equal(result.name, 'Full moon');
  assert.ok(result.illumination > 0.99);
});

test('moonPhase a quarter month in is first quarter and waxing', () => {
  const result = moonPhase(new Date(ANCHOR + 7.38 * DAY));
  assert.equal(result.name, 'First quarter');
  assert.equal(result.waxing, true);
  assert.ok(Math.abs(result.illumination - 0.5) < 0.05);
});

test('moonPhase three quarters in is waning', () => {
  const result = moonPhase(new Date(ANCHOR + 22.15 * DAY));
  assert.equal(result.name, 'Last quarter');
  assert.equal(result.waxing, false);
});

test('wallClockMinutes parses the wall-clock time', () => {
  assert.equal(wallClockMinutes('2026-07-23T06:30'), 390);
  assert.equal(wallClockMinutes('2026-07-23'), null);
});

test('sunProgress at solar noon is halfway', () => {
  const result = sunProgress('2026-07-23T06:00', '2026-07-23T18:00', '2026-07-23T12:00');
  assert.equal(result.fraction, 0.5);
  assert.equal(result.beforeSunrise, false);
  assert.equal(result.afterSunset, false);
  assert.equal(result.daylightMinutes, 720);
});

test('sunProgress clamps outside daylight and flags night', () => {
  const before = sunProgress('2026-07-23T06:00', '2026-07-23T18:00', '2026-07-23T04:00');
  assert.equal(before.fraction, 0);
  assert.equal(before.beforeSunrise, true);
  const after = sunProgress('2026-07-23T06:00', '2026-07-23T18:00', '2026-07-23T21:30');
  assert.equal(after.fraction, 1);
  assert.equal(after.afterSunset, true);
});
