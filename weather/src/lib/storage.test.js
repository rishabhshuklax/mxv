import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadSavedLocations,
  addSavedLocation,
  removeSavedLocation,
  isSavedLocation,
  loadUnit,
  saveUnit,
} from './storage.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
  };
}

test('loadSavedLocations defaults to an empty list', () => {
  assert.deepEqual(loadSavedLocations(fakeStorage()), []);
});

test('addSavedLocation prepends and dedupes by id', () => {
  const storage = fakeStorage();
  addSavedLocation({ id: '1', name: 'Paris' }, storage);
  const next = addSavedLocation({ id: '1', name: 'Paris' }, storage);
  assert.equal(next.length, 1);
});

test('addSavedLocation caps the list at 8 entries', () => {
  const storage = fakeStorage();
  for (let i = 0; i < 10; i += 1) {
    addSavedLocation({ id: `${i}`, name: `City ${i}` }, storage);
  }
  assert.equal(loadSavedLocations(storage).length, 8);
});

test('removeSavedLocation drops the matching entry', () => {
  const storage = fakeStorage();
  addSavedLocation({ id: '1', name: 'Paris' }, storage);
  addSavedLocation({ id: '2', name: 'Tokyo' }, storage);
  const next = removeSavedLocation('1', storage);
  assert.deepEqual(next.map((l) => l.id), ['2']);
});

test('isSavedLocation reflects membership', () => {
  const storage = fakeStorage();
  addSavedLocation({ id: '1', name: 'Paris' }, storage);
  assert.equal(isSavedLocation('1', storage), true);
  assert.equal(isSavedLocation('2', storage), false);
});

test('unit preference defaults to celsius and persists fahrenheit', () => {
  const storage = fakeStorage();
  assert.equal(loadUnit(storage), 'C');
  saveUnit('F', storage);
  assert.equal(loadUnit(storage), 'F');
});
