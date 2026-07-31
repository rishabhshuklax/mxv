// The graph's senses. Mounted once in index.js, this middleware watches
// ordinary API traffic and turns it into graph events — nobody has to "use"
// the Everything Graph for it to grow; using the app is using the graph.
//
// Identity is best-effort and anonymous by default:
//   - a client may send `x-graph-session` (any opaque string) to get session
//     resonance ("things browsed together belong together")
//   - an authenticated user (or an `x-graph-actor` header) additionally gets
//     personal TOUCHED/RATED edges, which power /api/graph/me
const graph = require('../lib/graph/everything');
const weaver = require('../lib/graph/weaver');

// Per-session ring of recently touched things, for resonance edges.
// In-memory on purpose: resonance is about "close together in time", and a
// warm process is exactly that window. (Same trade-off as lib/cache.)
const RECENT_LIMIT = 5;
const RECENT_TTL_MS = 30 * 60 * 1000;
const recentBySession = new Map();

function recall(sessionId) {
  if (!sessionId) return [];
  const entry = recentBySession.get(sessionId);
  if (!entry || entry.expires < Date.now()) {
    recentBySession.delete(sessionId);
    return [];
  }
  return entry.keys;
}

function remember(sessionId, key) {
  if (!sessionId) return;
  const keys = recall(sessionId).filter((k) => k !== key);
  keys.push(key);
  recentBySession.set(sessionId, {
    keys: keys.slice(-RECENT_LIMIT),
    expires: Date.now() + RECENT_TTL_MS
  });
  if (recentBySession.size > 1000) {
    const oldest = recentBySession.keys().next().value;
    recentBySession.delete(oldest);
  }
}

// Route → event. Only successful GETs teach the graph anything.
function eventFor(req) {
  const path = req.path;
  let m;

  if ((m = path.match(/^\/api\/movie\/(\d+)$/))) {
    return { type: 'view', subject: `movie~${m[1]}`, weaves: ['movie', m[1]] };
  }
  if ((m = path.match(/^\/api\/tv\/(\d+)$/))) {
    return { type: 'view', subject: `tv~${m[1]}`, weaves: ['tv', m[1]] };
  }
  if ((m = path.match(/^\/api\/entity\/(movie|tv)\/(\d+)\/extras$/))) {
    return { type: 'view', subject: `${m[1]}~${m[2]}`, weaves: [m[1], m[2]] };
  }
  if ((m = path.match(/^\/api\/person\/(\d+)$/))) {
    return { type: 'view', subject: `person~${m[1]}` };
  }
  if ((m = path.match(/^\/api\/genres\/([^/]+)$/))) {
    return { type: 'view', subject: `genre~${decodeURIComponent(m[1])}` };
  }
  if (path === '/api/entity/search' && req.query.query) {
    return { type: 'search', query: String(req.query.query) };
  }
  return null;
}

module.exports = function observeMiddleware(req, res, next) {
  if (!graph.enabled() || req.method !== 'GET') return next();

  const base = eventFor(req);
  if (!base) return next();

  res.on('finish', () => {
    if (res.statusCode >= 400) return;

    const sessionId = req.headers['x-graph-session'] || null;
    const actorId = (req.user && (req.user.id || req.user._id)) || req.headers['x-graph-actor'] || null;

    const event = {
      type: base.type,
      subject: base.subject,
      query: base.query,
      actor: actorId ? `user~${actorId}` : undefined,
      recent: recall(sessionId)
    };
    graph.observeInBackground(event);

    const touchedKey = base.subject || (base.query && `search~${base.query.trim().toLowerCase()}`);
    if (touchedKey) remember(sessionId, touchedKey);

    // Viewing a title quietly weaves its cast/genres/similars into the graph.
    if (base.weaves) weaver.weaveInBackground(base.weaves[0], base.weaves[1]);
  });

  next();
};
