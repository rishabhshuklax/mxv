// Express controller for the Everything Graph. Read endpoints answer from the
// living graph; the observe endpoint lets clients report what passive
// middleware can't see (playback, ratings).
const graph = require('../lib/graph/everything');

// Every handler needs the graph to be configured; answer honestly when it isn't.
function guard(res) {
  if (!graph.enabled()) {
    res.status(503).json({
      error: 'Everything Graph is not configured',
      hint: 'set NEO4J_URI, NEO4J_USER and NEO4J_PASSWORD'
    });
    return false;
  }
  return true;
}

module.exports = {
  // POST /api/graph/observe
  // body: { type: 'watch'|'rate'|'view'|'search', subject: 'movie~603',
  //         value?: 8, query?: '...', name?: '...' }
  observe: async (req, res) => {
    if (!guard(res)) return;
    const { type, subject, query, value, name } = req.body || {};
    if (!type || (!subject && !query)) {
      return res.status(400).json({ error: 'type and subject (or query) are required' });
    }
    if (!['view', 'search', 'watch', 'rate'].includes(type)) {
      return res.status(400).json({ error: `unknown event type: ${type}` });
    }
    const actorId = (req.user && (req.user.id || req.user._id)) || req.headers['x-graph-actor'];
    try {
      const result = await graph.observe({
        type, subject, query, value, name,
        actor: actorId ? `user~${actorId}` : undefined
      });
      res.json({ observed: true, ...result });
    } catch (err) {
      console.error('graph observe error:', err.message);
      res.status(500).json({ error: 'failed to observe event' });
    }
  },

  // GET /api/graph/thing/:key — one thing and its vitals
  thing: async (req, res) => {
    if (!guard(res)) return;
    try {
      const found = await graph.thing(req.params.key);
      if (!found) return res.status(404).json({ error: 'the graph has not met this thing yet' });
      res.json(found);
    } catch (err) {
      console.error('graph thing error:', err.message);
      res.status(500).json({ error: 'failed to look up thing' });
    }
  },

  // GET /api/graph/related/:key?limit=20 — strongest current connections
  related: async (req, res) => {
    if (!guard(res)) return;
    try {
      const list = await graph.related(req.params.key, { limit: req.query.limit });
      res.json({ key: req.params.key, related: list || [] });
    } catch (err) {
      console.error('graph related error:', err.message);
      res.status(500).json({ error: 'failed to fetch related things' });
    }
  },

  // GET /api/graph/why/:from/:to — the path that explains a connection
  why: async (req, res) => {
    if (!guard(res)) return;
    try {
      const path = await graph.why(req.params.from, req.params.to, { maxHops: req.query.maxHops });
      if (!path) return res.status(404).json({ error: 'no path between these things (yet)' });
      res.json(path);
    } catch (err) {
      console.error('graph why error:', err.message);
      res.status(500).json({ error: 'failed to trace path' });
    }
  },

  // GET /api/graph/pulse — size, hottest things, newest arrivals
  pulse: async (req, res) => {
    if (!guard(res)) return;
    try {
      const stats = await graph.pulse();
      res.json(stats || { things: 0, links: 0, hottest: [], newest: [] });
    } catch (err) {
      console.error('graph pulse error:', err.message);
      res.status(500).json({ error: 'failed to read pulse' });
    }
  },

  // GET /api/graph/me — the authenticated user's personal neighbourhood
  me: async (req, res) => {
    if (!guard(res)) return;
    const actorId = req.user && (req.user.id || req.user._id);
    if (!actorId) return res.status(401).json({ error: 'authentication required' });
    try {
      const list = await graph.related(`user~${actorId}`, { limit: req.query.limit || 30 });
      res.json({ key: `user~${actorId}`, related: list || [] });
    } catch (err) {
      console.error('graph me error:', err.message);
      res.status(500).json({ error: 'failed to fetch your graph' });
    }
  },

  // POST /api/graph/gardener — decay checkpoint + prune withered edges
  gardener: async (req, res) => {
    if (!guard(res)) return;
    try {
      const report = await graph.garden({ pruneBelow: req.body && req.body.pruneBelow });
      res.json({ tended: true, ...report });
    } catch (err) {
      console.error('graph gardener error:', err.message);
      res.status(500).json({ error: 'failed to tend the graph' });
    }
  }
};
