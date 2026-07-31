const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DAY_MS,
  DEFAULT_HALF_LIFE_MS,
  makeKey,
  parseKey,
  labelFor,
  relType,
  reinforce,
  decayed
} = require('../lib/graph/living');

test('makeKey builds kind~id keys and lowercases the kind', () => {
  assert.equal(makeKey('Movie', 603), 'movie~603');
  assert.equal(makeKey('person', '6384'), 'person~6384');
});

test('makeKey rejects missing parts', () => {
  assert.throws(() => makeKey('', 1));
  assert.throws(() => makeKey('movie', ''));
  assert.throws(() => makeKey('movie', null));
});

test('parseKey inverts makeKey', () => {
  assert.deepEqual(parseKey('movie~603'), { kind: 'movie', id: '603' });
  assert.deepEqual(parseKey('search~space operas'), { kind: 'search', id: 'space operas' });
});

test('parseKey keeps ids containing the separator intact', () => {
  assert.deepEqual(parseKey('search~a~b'), { kind: 'search', id: 'a~b' });
});

test('parseKey returns null for malformed keys', () => {
  assert.equal(parseKey('nokey'), null);
  assert.equal(parseKey('~603'), null);
  assert.equal(parseKey('movie~'), null);
  assert.equal(parseKey(42), null);
});

test('labelFor produces safe capitalized labels', () => {
  assert.equal(labelFor('movie'), 'Movie');
  assert.equal(labelFor('tv'), 'Tv');
  // injection attempts collapse to a harmless label
  assert.equal(labelFor('movie) DETACH DELETE (n'), 'MovieDETACHDELETEn');
  assert.equal(labelFor('123bad'), 'Thing');
  assert.equal(labelFor('~~~'), 'Thing');
});

test('relType uppercases and strips unsafe characters', () => {
  assert.equal(relType('acted_in'), 'ACTED_IN');
  assert.equal(relType('resonates with'), 'RESONATES_WITH');
  assert.throws(() => relType('1]->()<-[x'));
});

test('reinforce grows weight with diminishing returns', () => {
  const first = reinforce(0, 1);
  const second = reinforce(first, 1) - first;
  const heavy = reinforce(50, 1) - 50;
  assert.equal(first, 1);
  assert.ok(second < first, 'second touch adds less than the first');
  assert.ok(heavy < second, 'a heavy edge gains even less per touch');
  assert.ok(heavy > 0, 'but every touch still adds something');
});

test('reinforce never goes negative and ignores bad input', () => {
  assert.equal(reinforce(-5, 1), 1);
  assert.equal(reinforce('junk', 0), 0);
});

test('decayed halves the weight after one half-life', () => {
  const w = decayed(10, DEFAULT_HALF_LIFE_MS);
  assert.ok(Math.abs(w - 5) < 1e-9);
});

test('decayed is identity at zero elapsed time', () => {
  assert.equal(decayed(7, 0), 7);
});

test('decayed respects a custom half-life', () => {
  const w = decayed(8, 2 * DAY_MS, DAY_MS);
  assert.ok(Math.abs(w - 2) < 1e-9, 'two half-lives quarter the weight');
});

test('decayed never returns a negative value', () => {
  assert.equal(decayed(-3, DAY_MS), 0);
  assert.ok(decayed(1, 1000 * DEFAULT_HALF_LIFE_MS) >= 0);
});
