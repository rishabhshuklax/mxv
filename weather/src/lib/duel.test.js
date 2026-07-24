import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareCities } from './duel.js';

function city(name, over = {}) {
  return {
    name,
    forecast: {
      current: {
        temperature: 20,
        feelsLike: 20,
        windSpeed: 10,
        humidity: 50,
        cloudCover: 40,
        ...over.current,
      },
      today: { max: 24, ...over.today },
      daily: [{ precipitationSum: over.rain ?? 0 }],
    },
  };
}

test('temperature gap wins the verdict', () => {
  const result = compareCities(city('Delhi', { current: { temperature: 34 } }), city('London'), 'C');
  assert.match(result.verdict, /Delhi is 14° hotter than London today. Shorts win./);
  assert.equal(result.rows.length, 7);
});

test('rain decides when temperatures are close', () => {
  const result = compareCities(city('Mumbai', { rain: 18 }), city('Cairo'), 'C');
  assert.match(result.verdict, /Mumbai takes the rain — 18 mm more than Cairo today./);
});

test('cloud cover decides when temp and rain are close', () => {
  const result = compareCities(city('Lisbon', { current: { cloudCover: 5 } }), city('Brussels', { current: { cloudCover: 90 } }));
  assert.match(result.verdict, /Lisbon takes the sun — 85% less cloud than Brussels today./);
});

test('similar cities get an honest tie', () => {
  const result = compareCities(city('Lyon'), city('Turin'));
  assert.match(result.verdict, /Dead heat — Lyon and Turin/);
});

test('temperature deltas convert for fahrenheit users', () => {
  const result = compareCities(city('Phoenix', { current: { temperature: 30 } }), city('Boston'), 'F');
  assert.match(result.verdict, /18° hotter/);
});

test('missing forecast returns null', () => {
  assert.equal(compareCities(city('A'), null), null);
});
