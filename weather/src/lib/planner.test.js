import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITIES, bestWindow, buildPlan, goldenHours } from './planner.js';

function hour(time, overrides = {}) {
  return {
    time,
    temperature: 18,
    feelsLike: 18,
    precipitationProbability: 5,
    windSpeed: 10,
    humidity: 45,
    cloudCover: 20,
    isDay: true,
    ...overrides,
  };
}

function hours48(make) {
  const out = [];
  for (let i = 0; i < 48; i += 1) {
    const day = 23 + Math.floor((14 + i) / 24);
    const hr = (14 + i) % 24;
    const time = `2026-07-${day}T${String(hr).padStart(2, '0')}:00`;
    out.push(make(i, time, hr));
  }
  return out;
}

const run = ACTIVITIES.find((a) => a.key === 'run');
const picnic = ACTIVITIES.find((a) => a.key === 'picnic');
const stargaze = ACTIVITIES.find((a) => a.key === 'stargaze');

test('rain forecloses running and picnics', () => {
  assert.equal(run.score(hour('t', { precipitationProbability: 70 })), 0);
  assert.equal(picnic.score(hour('t', { precipitationProbability: 45 })), 0);
});

test('stargazing needs a dark, clear sky', () => {
  assert.equal(stargaze.score(hour('t', { isDay: true, cloudCover: 0 })), 0);
  assert.ok(stargaze.score(hour('t', { isDay: false, cloudCover: 5 })) > 80);
  assert.ok(stargaze.score(hour('t', { isDay: false, cloudCover: 90 })) < 20);
});

test('bestWindow finds the cool morning stretch for a run', () => {
  const hourly = hours48((i, time, hr) =>
    hour(time, {
      isDay: hr >= 6 && hr < 21,
      feelsLike: hr >= 6 && hr <= 9 ? 14 : 30,
      temperature: hr >= 6 && hr <= 9 ? 14 : 30,
    }),
  );
  const win = bestWindow(hourly, run);
  assert.ok(win);
  assert.equal(win.start.slice(11, 13), '06');
  assert.ok(win.score > 70);
  assert.match(win.reason, /feels 14°/);
});

test('bestWindow returns null when nothing qualifies', () => {
  const hourly = hours48((i, time) => hour(time, { precipitationProbability: 90 }));
  assert.equal(bestWindow(hourly, run), null);
});

test('a single good hour cannot carry a three-hour picnic window', () => {
  const hourly = hours48((i, time, hr) =>
    hour(time, { isDay: hr === 12, temperature: hr === 12 ? 22 : 5, precipitationProbability: hr === 12 ? 0 : 80 }),
  );
  assert.equal(bestWindow(hourly, picnic), null);
});

test('windows are exactly the activity span and prefer the best average', () => {
  const hourly = hours48((i, time, hr) =>
    hour(time, { isDay: hr >= 6 && hr < 21, feelsLike: hr >= 6 && hr <= 10 ? 12 : 26, temperature: 20 }),
  );
  const win = bestWindow(hourly, run);
  const startHour = Number(win.start.slice(11, 13));
  const endHour = Number(win.end.slice(11, 13));
  assert.equal(endHour - startHour, 1); // two hourly slots
  assert.ok(startHour >= 6 && startHour <= 9);
});

test('buildPlan covers every activity', () => {
  const hourly = hours48((i, time, hr) => hour(time, { isDay: hr >= 6 && hr < 21, cloudCover: 10 }));
  const plan = buildPlan(hourly);
  assert.equal(plan.length, ACTIVITIES.length);
  assert.ok(plan.find((p) => p.key === 'stargaze').window);
  assert.ok(plan.find((p) => p.key === 'laundry').window);
});

test('goldenHours reads sunset-hour cloud for a quality hint', () => {
  const today = { sunrise: '2026-07-23T05:12', sunset: '2026-07-23T21:05' };
  const hourly = [hour('2026-07-23T21:00', { cloudCover: 40 })];
  const golden = goldenHours(today, hourly);
  assert.equal(golden.morning, '5:12 AM – 6:12 AM');
  assert.equal(golden.evening, '8:05 PM – 9:05 PM');
  assert.equal(golden.quality, 'dramatic light likely');
});
