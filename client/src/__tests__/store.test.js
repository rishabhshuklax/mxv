import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleInList, recordViewInList } from '../store.js';

test('toggleInList adds an entity that is not yet in the list, to the front', () => {
  const list = [{ id: 1, title: 'Existing' }];
  const result = toggleInList(list, { id: 2, title: 'New', vote_average: 8.1 });
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 2);
  assert.equal(result[0].title, 'New');
  assert.equal(result[1].id, 1);
});

test('toggleInList removes an entity that is already in the list', () => {
  const list = [{ id: 1, title: 'A' }, { id: 2, title: 'B' }];
  const result = toggleInList(list, { id: 1, title: 'A' });
  assert.deepEqual(result.map((x) => x.id), [2]);
});

test('toggleInList derives genre_ids from a genres array when genre_ids is absent', () => {
  const result = toggleInList([], { id: 5, title: 'X', genres: [{ id: 28 }, { id: 12 }] });
  assert.deepEqual(result[0].genre_ids, [28, 12]);
});

test('toggleInList falls back to first_air_date when release_date is absent', () => {
  const result = toggleInList([], { id: 5, name: 'Show', first_air_date: '2020-05-01' });
  assert.equal(result[0].release_date, '2020-05-01');
});

test('toggleInList does not mutate the input list', () => {
  const list = [{ id: 1, title: 'A' }];
  const original = [...list];
  toggleInList(list, { id: 2, title: 'B' });
  assert.deepEqual(list, original);
});

test('recordViewInList moves a re-viewed entity to the front instead of duplicating it', () => {
  const list = [
    { id: 1, title: 'A' },
    { id: 2, title: 'B' },
    { id: 3, title: 'C' }
  ];
  const result = recordViewInList(list, { id: 2, title: 'B' });
  assert.equal(result.length, 3);
  assert.equal(result[0].id, 2);
  assert.deepEqual(result.map((x) => x.id), [2, 1, 3]);
});

test('recordViewInList caps the list at the max length', () => {
  const list = Array.from({ length: 14 }, (_, i) => ({ id: i, title: `T${i}` }));
  const result = recordViewInList(list, { id: 99, title: 'New' }, 14);
  assert.equal(result.length, 14);
  assert.equal(result[0].id, 99);
  assert.equal(result.at(-1).id, 12);
});

test('recordViewInList does not mutate the input list', () => {
  const list = [{ id: 1, title: 'A' }];
  const original = [...list];
  recordViewInList(list, { id: 2, title: 'B' });
  assert.deepEqual(list, original);
});
