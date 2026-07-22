import test from 'node:test';
import assert from 'node:assert/strict';
import { img, splitId, titleOf, yearOf } from '../api.js';

test('img builds a TMDB image URL when a path is given', () => {
  assert.equal(img('/poster.jpg', 'w342'), 'https://image.tmdb.org/t/p/w342/poster.jpg');
});

test('img defaults to size w342 when omitted', () => {
  assert.equal(img('/poster.jpg'), 'https://image.tmdb.org/t/p/w342/poster.jpg');
});

test('img returns null when there is no path', () => {
  assert.equal(img(null), null);
  assert.equal(img(undefined), null);
  assert.equal(img(''), null);
});

test('splitId separates a compound "type~id" identifier', () => {
  assert.deepEqual(splitId('movie~603'), { type: 'movie', id: '603' });
  assert.deepEqual(splitId('tv~1399'), { type: 'tv', id: '1399' });
});

test('splitId coerces a non-string input before splitting', () => {
  assert.deepEqual(splitId(603), { type: '603', id: undefined });
});

test('titleOf prefers title, then name, then original variants', () => {
  assert.equal(titleOf({ title: 'The Matrix' }), 'The Matrix');
  assert.equal(titleOf({ name: 'Breaking Bad' }), 'Breaking Bad');
  assert.equal(titleOf({ original_title: 'Amélie' }), 'Amélie');
  assert.equal(titleOf({ original_name: 'Kimetsu no Yaiba' }), 'Kimetsu no Yaiba');
});

test('titleOf falls back to "Untitled" when nothing matches', () => {
  assert.equal(titleOf({}), 'Untitled');
});

test('yearOf reads release_date for movies and first_air_date for TV', () => {
  assert.equal(yearOf({ release_date: '1999-03-31' }), '1999');
  assert.equal(yearOf({ first_air_date: '2008-01-20' }), '2008');
});

test('yearOf returns an em dash when no date is present', () => {
  assert.equal(yearOf({}), '—');
});
