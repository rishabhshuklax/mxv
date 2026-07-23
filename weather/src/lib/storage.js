const SAVED_KEY = 'ultimate-weather:saved-locations';
const UNIT_KEY = 'ultimate-weather:unit';
const LAST_KEY = 'ultimate-weather:last-location';
const MAX_SAVED = 8;

function safeParse(json, fallback) {
  try {
    const parsed = JSON.parse(json);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadSavedLocations(storage = window.localStorage) {
  return safeParse(storage.getItem(SAVED_KEY), []);
}

export function addSavedLocation(location, storage = window.localStorage) {
  const existing = loadSavedLocations(storage).filter((item) => item.id !== location.id);
  const next = [location, ...existing].slice(0, MAX_SAVED);
  storage.setItem(SAVED_KEY, JSON.stringify(next));
  return next;
}

export function removeSavedLocation(id, storage = window.localStorage) {
  const next = loadSavedLocations(storage).filter((item) => item.id !== id);
  storage.setItem(SAVED_KEY, JSON.stringify(next));
  return next;
}

export function isSavedLocation(id, storage = window.localStorage) {
  return loadSavedLocations(storage).some((item) => item.id === id);
}

export function loadUnit(storage = window.localStorage) {
  const value = storage.getItem(UNIT_KEY);
  return value === 'F' ? 'F' : 'C';
}

export function saveUnit(unit, storage = window.localStorage) {
  storage.setItem(UNIT_KEY, unit === 'F' ? 'F' : 'C');
}

export function loadLastLocation(storage = window.localStorage) {
  return safeParse(storage.getItem(LAST_KEY), null);
}

export function saveLastLocation(location, storage = window.localStorage) {
  storage.setItem(LAST_KEY, JSON.stringify(location));
}
