// The pure math and naming rules that make the Everything Graph "alive".
// No I/O here — everything is deterministic and unit-testable.

// One day, in milliseconds. The default half-life is two weeks: an edge
// nobody touches loses half its strength every fourteen days.
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_HALF_LIFE_MS = 14 * DAY_MS;

// Keys follow the repo's existing convention: `movie~603`, `tv~1399`.
// The graph extends it to any kind of thing: `person~6384`, `genre~28`,
// `user~65a1...`, `search~space operas`.
function makeKey(kind, id) {
  if (!kind || id === undefined || id === null || id === '') {
    throw new Error('makeKey requires a kind and an id');
  }
  return `${String(kind).toLowerCase()}~${String(id)}`;
}

function parseKey(key) {
  if (typeof key !== 'string') return null;
  const sep = key.indexOf('~');
  if (sep <= 0 || sep === key.length - 1) return null;
  return { kind: key.slice(0, sep).toLowerCase(), id: key.slice(sep + 1) };
}

// Labels and relationship types are interpolated into Cypher (they cannot be
// parameterized), so they must be locked down to a safe alphabet.
function labelFor(kind) {
  const cleaned = String(kind).replace(/[^A-Za-z0-9]/g, '');
  if (!/^[A-Za-z]/.test(cleaned)) return 'Thing';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function relType(name) {
  const cleaned = String(name).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (!/^[A-Z]/.test(cleaned)) throw new Error(`invalid relationship type: ${name}`);
  return cleaned;
}

// Repeated use strengthens an edge, but with diminishing returns — the
// hundredth view of a movie should not drown out everything else.
function reinforce(weight, amount = 1) {
  const current = Math.max(0, Number(weight) || 0);
  const add = Math.max(0, Number(amount) || 0);
  return current + add / (1 + Math.log(1 + current));
}

// Exponential decay: what a stored weight is worth `elapsedMs` after it was
// last checkpointed. Never negative, and fresh weights pass through intact.
function decayed(weight, elapsedMs, halfLifeMs = DEFAULT_HALF_LIFE_MS) {
  const w = Math.max(0, Number(weight) || 0);
  const dt = Math.max(0, Number(elapsedMs) || 0);
  if (dt === 0 || w === 0) return w;
  return w * Math.pow(0.5, dt / halfLifeMs);
}

module.exports = {
  DAY_MS,
  DEFAULT_HALF_LIFE_MS,
  makeKey,
  parseKey,
  labelFor,
  relType,
  reinforce,
  decayed
};
