const test = require('node:test');
const assert = require('node:assert/strict');
const cache = require('../lib/cache');

test('set/get returns the cached value before expiry', () => {
  cache.set('k1', { hello: 'world' }, 1000);
  assert.deepEqual(cache.get('k1'), { hello: 'world' });
});

test('get returns undefined for a key that was never set', () => {
  assert.equal(cache.get('never-set-key'), undefined);
});

test('get returns undefined once the TTL has elapsed', async () => {
  cache.set('k2', 'soon-stale', 5);
  await new Promise((r) => setTimeout(r, 15));
  assert.equal(cache.get('k2'), undefined);
});

test('wrap only invokes the producer once per key while cached', async () => {
  let calls = 0;
  const producer = async () => {
    calls += 1;
    return 'produced';
  };
  const a = await cache.wrap('k3', 1000, producer);
  const b = await cache.wrap('k3', 1000, producer);
  assert.equal(a, 'produced');
  assert.equal(b, 'produced');
  assert.equal(calls, 1);
});

test('wrap invokes the producer separately for distinct keys', async () => {
  let calls = 0;
  const producer = async () => {
    calls += 1;
    return calls;
  };
  const a = await cache.wrap('k4a', 1000, producer);
  const b = await cache.wrap('k4b', 1000, producer);
  assert.notEqual(a, b);
  assert.equal(calls, 2);
});

test('wrap does not cache a rejected producer', async () => {
  let calls = 0;
  const producer = async () => {
    calls += 1;
    if (calls === 1) throw new Error('transient failure');
    return 'recovered';
  };
  await assert.rejects(() => cache.wrap('k5', 1000, producer));
  const result = await cache.wrap('k5', 1000, producer);
  assert.equal(result, 'recovered');
  assert.equal(calls, 2);
});

test('edge sets a Cache-Control header with s-maxage and stale-while-revalidate', () => {
  let captured = null;
  const res = { set: (name, value) => { captured = { name, value }; } };
  cache.edge(res, 60);
  assert.equal(captured.name, 'Cache-Control');
  assert.equal(captured.value, 'public, s-maxage=60, stale-while-revalidate=240');
});

test('edge accepts an explicit stale-while-revalidate override', () => {
  let captured = null;
  const res = { set: (name, value) => { captured = { name, value }; } };
  cache.edge(res, 60, 30);
  assert.equal(captured.value, 'public, s-maxage=60, stale-while-revalidate=30');
});

test('store evicts the oldest entry once it exceeds 500 keys', () => {
  for (let i = 0; i < 505; i += 1) {
    cache.set(`cap-${i}`, i, 60_000);
  }
  assert.equal(cache.get('cap-0'), undefined);
  assert.equal(cache.get('cap-504'), 504);
});
