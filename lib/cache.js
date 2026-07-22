// Tiny in-memory TTL cache. Lives at module scope so it survives across
// invocations on a warm Vercel lambda (cleared on cold start, which is fine —
// it's a de-dup layer for TMDB calls, not a source of truth).
const store = new Map();

function get(key) {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

function set(key, value, ttlMs) {
  store.set(key, { value, expires: Date.now() + ttlMs });
  // keep the map from growing unbounded across a long-lived warm container
  if (store.size > 500) {
    const oldestKey = store.keys().next().value;
    store.delete(oldestKey);
  }
}

// wraps an async producer: returns the cached value if fresh, otherwise
// calls fn(), caches the result, and returns it. Rejections are not cached.
async function wrap(key, ttlMs, fn) {
  const cached = get(key);
  if (cached !== undefined) return cached;
  const value = await fn();
  set(key, value, ttlMs);
  return value;
}

// sets a CDN-level Cache-Control header so Vercel's edge can serve repeat
// requests without invoking the function at all.
function edge(res, seconds, swr = seconds * 4) {
  res.set('Cache-Control', `public, s-maxage=${seconds}, stale-while-revalidate=${swr}`);
}

module.exports = { get, set, wrap, edge };
