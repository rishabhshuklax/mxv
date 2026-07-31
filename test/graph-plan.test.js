const test = require('node:test');
const assert = require('node:assert/strict');
const { planFor, RESONANCE_SPAN } = require('../lib/graph/plan');

test('an anonymous view touches the subject and nothing else', () => {
  const ops = planFor({ type: 'view', subject: 'movie~603' });
  assert.deepEqual(ops, [{ op: 'touch', key: 'movie~603', props: {} }]);
});

test('a named view carries the display name onto the touch', () => {
  const ops = planFor({ type: 'view', subject: 'movie~603', name: 'The Matrix' });
  assert.deepEqual(ops[0], { op: 'touch', key: 'movie~603', props: { name: 'The Matrix' } });
});

test('an actor gets touched and connected to the subject', () => {
  const ops = planFor({ type: 'view', subject: 'movie~603', actor: 'user~alice' });
  const connect = ops.find((o) => o.op === 'connect');
  assert.ok(ops.some((o) => o.op === 'touch' && o.key === 'user~alice'));
  assert.equal(connect.from, 'user~alice');
  assert.equal(connect.to, 'movie~603');
  assert.equal(connect.rel, 'TOUCHED');
});

test('a watch lands harder than a view', () => {
  const view = planFor({ type: 'view', subject: 'movie~603', actor: 'user~alice' })
    .find((o) => o.op === 'connect');
  const watch = planFor({ type: 'watch', subject: 'movie~603', actor: 'user~alice' })
    .find((o) => o.op === 'connect');
  assert.ok(watch.amount > view.amount);
});

test('a rating becomes a RATED edge scaled by enthusiasm', () => {
  const ten = planFor({ type: 'rate', subject: 'movie~603', actor: 'user~alice', value: 10 })
    .find((o) => o.op === 'connect');
  const five = planFor({ type: 'rate', subject: 'movie~603', actor: 'user~alice', value: 5 })
    .find((o) => o.op === 'connect');
  assert.equal(ten.rel, 'RATED');
  assert.ok(ten.amount > five.amount);
  assert.equal(ten.props.lastValue, 10);
});

test('a search makes the query itself a thing', () => {
  const ops = planFor({ type: 'search', query: '  Space Operas ' });
  assert.deepEqual(ops[0], { op: 'touch', key: 'search~space operas', props: {} });
});

test('a link event connects subject to target with the given rel', () => {
  const ops = planFor({
    type: 'link', subject: 'person~6384', to: 'movie~603', rel: 'APPEARS_IN', toName: 'The Matrix'
  });
  const connect = ops.find((o) => o.op === 'connect');
  assert.equal(connect.rel, 'APPEARS_IN');
  assert.ok(ops.some((o) => o.op === 'touch' && o.key === 'movie~603' && o.props.name === 'The Matrix'));
});

test('recent session things resonate with the new subject', () => {
  const ops = planFor({
    type: 'view',
    subject: 'movie~603',
    recent: ['tv~1399', 'movie~157336']
  });
  const resonance = ops.filter((o) => o.op === 'connect' && o.rel === 'RESONATES_WITH');
  assert.equal(resonance.length, 2);
  assert.deepEqual(resonance.map((o) => o.to).sort(), ['movie~157336', 'tv~1399']);
});

test('resonance is capped and never self-referential', () => {
  const recent = ['movie~603', 'a~1', 'a~2', 'a~3', 'a~4', 'a~5'];
  const ops = planFor({ type: 'view', subject: 'movie~603', recent });
  const resonance = ops.filter((o) => o.op === 'connect' && o.rel === 'RESONATES_WITH');
  assert.ok(resonance.length <= RESONANCE_SPAN);
  assert.ok(resonance.every((o) => o.to !== 'movie~603'));
});

test('malformed events plan nothing', () => {
  assert.deepEqual(planFor(null), []);
  assert.deepEqual(planFor({}), []);
  assert.deepEqual(planFor({ type: 'view' }), []);
  assert.deepEqual(planFor({ type: 'search' }), []);
});
