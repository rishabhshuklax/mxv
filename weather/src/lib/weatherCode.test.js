import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getWeatherInfo, backgroundTheme } from './weatherCode.js';

test('clear sky by day', () => {
  assert.deepEqual(getWeatherInfo(0, true), {
    label: 'Clear sky',
    icon: 'clear',
    group: 'clear',
    isDay: true,
  });
});

test('clear sky by night uses a night icon', () => {
  const info = getWeatherInfo(0, false);
  assert.equal(info.icon, 'clear-night');
  assert.equal(info.group, 'clear');
});

test('partly cloudy by night uses a night variant', () => {
  const info = getWeatherInfo(2, false);
  assert.equal(info.icon, 'partly-cloudy-night');
});

test('unknown codes fall back gracefully', () => {
  const info = getWeatherInfo(999, true);
  assert.equal(info.label, 'Unknown');
  assert.equal(info.icon, 'cloudy');
});

test('thunderstorm codes map to the storm group', () => {
  assert.equal(getWeatherInfo(95, true).group, 'storm');
  assert.equal(getWeatherInfo(99, true).group, 'storm');
});

test('backgroundTheme returns night regardless of code after sunset', () => {
  assert.equal(backgroundTheme(0, false), 'night');
  assert.equal(backgroundTheme(95, false), 'night');
});

test('backgroundTheme reflects the weather group during the day', () => {
  assert.equal(backgroundTheme(61, true), 'rain');
  assert.equal(backgroundTheme(71, true), 'snow');
});
