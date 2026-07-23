const test = require('node:test');
const assert = require('node:assert/strict');
const { mulberry32 } = require('../lib/rng');

test('same seed produces the same sequence', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const seqA = Array.from({ length: 10 }, () => a());
  const seqB = Array.from({ length: 10 }, () => b());
  assert.deepEqual(seqA, seqB);
});

test('different seeds produce different sequences', () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  const seqA = Array.from({ length: 5 }, () => a());
  const seqB = Array.from({ length: 5 }, () => b());
  assert.notDeepEqual(seqA, seqB);
});

test('output stays within [0, 1)', () => {
  const rand = mulberry32(123456789);
  for (let i = 0; i < 1000; i += 1) {
    const v = rand();
    assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
  }
});

test('a generator instance advances state between calls (not constant)', () => {
  const rand = mulberry32(7);
  const first = rand();
  const second = rand();
  assert.notEqual(first, second);
});

test('negative or out-of-int32 seeds are coerced consistently via >>> 0', () => {
  const a = mulberry32(-5);
  const b = mulberry32(-5 >>> 0);
  assert.equal(a(), b());
});
