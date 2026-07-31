// The Everything Graph — a living knowledge graph that grows from use.
//
// Three ideas make it work:
//   1. One primitive. Everything is a Thing with a `key` ("movie~603",
//      "person~6384", "search~space operas"). New kinds of things need no
//      migration, no schema meeting — just a new key prefix.
//   2. Living edges. Every relationship carries a weight that is reinforced
//      each time it's used (with diminishing returns) and decays with a
//      half-life when it isn't. The graph forgets what stops mattering.
//   3. Growth by observation. Nothing here is administered; the graph is fed
//      by watching real traffic (middleware/observe.js) and by weaving in
//      structure around whatever people actually look at (weaver.js).
//
// Every write is safe to fire-and-forget: failures are logged, never thrown
// into a request path.
const graphdb = require('../../init/graph');
const { DEFAULT_HALF_LIFE_MS, parseKey, labelFor, relType } = require('./living');
const { planFor } = require('./plan');

const HALF_LIFE_MS = Number(process.env.GRAPH_HALF_LIFE_MS) || DEFAULT_HALF_LIFE_MS;

function enabled() {
  return graphdb.enabled();
}

// MERGE a Thing, stamp its kind label, bump its touch count. `props` are
// additive — a touch never erases what the graph already knows.
async function touch(key, props = {}) {
  const parsed = parseKey(key);
  if (!parsed) return null;
  const label = labelFor(parsed.kind);
  return graphdb.run(
    `MERGE (t:Thing {key: $key})
     ON CREATE SET t.kind = $kind, t.firstSeen = timestamp(), t.touches = 0
     SET t:${label},
         t.touches = t.touches + 1,
         t.lastSeen = timestamp(),
         t += $props
     RETURN t.key AS key`,
    { key, kind: parsed.kind, props }
  );
}

// MERGE an edge and reinforce it. The stored weight is decayed to "now"
// before the reinforcement lands, so weights are always internally
// consistent no matter how irregularly an edge is used.
async function connect(from, to, rel, { amount = 1, props = {} } = {}) {
  const fromParsed = parseKey(from);
  const toParsed = parseKey(to);
  if (!fromParsed || !toParsed || from === to) return null;
  const type = relType(rel);
  return graphdb.run(
    `MERGE (a:Thing {key: $from})
       ON CREATE SET a.kind = $fromKind, a.firstSeen = timestamp(), a.touches = 0
     MERGE (b:Thing {key: $to})
       ON CREATE SET b.kind = $toKind, b.firstSeen = timestamp(), b.touches = 0
     MERGE (a)-[r:${type}]->(b)
       ON CREATE SET r.weight = 0, r.touches = 0, r.firstSeen = timestamp(), r.lastSeen = timestamp()
     SET r.weight = r.weight * (0.5 ^ ((timestamp() - r.lastSeen) * 1.0 / $halfLife))
     SET r.weight = r.weight + $amount / (1.0 + log(1.0 + r.weight)),
         r.touches = r.touches + 1,
         r.lastSeen = timestamp(),
         r += $props
     RETURN r.weight AS weight`,
    {
      from, to,
      fromKind: fromParsed.kind,
      toKind: toParsed.kind,
      amount: Number(amount) || 1,
      props,
      halfLife: HALF_LIFE_MS
    }
  );
}

// High-level entry point: hand it an event, it plans and executes the touches
// and connections that event implies. This is the only call the rest of the
// app needs to know about.
async function observe(event) {
  if (!enabled()) return { ops: 0 };
  const ops = planFor(event);
  for (const op of ops) {
    if (op.op === 'touch') await touch(op.key, op.props);
    else if (op.op === 'connect') await connect(op.from, op.to, op.rel, { amount: op.amount, props: op.props });
  }
  return { ops: ops.length };
}

// Same as observe, but never awaited and never throws — for request paths.
function observeInBackground(event) {
  observe(event).catch((err) => console.error('Everything Graph observe failed:', err.message));
}

// A thing and its strongest current connections, ranked by *living* weight
// (stored weight decayed to this instant). Dead edges sink on their own.
async function related(key, { limit = 20 } = {}) {
  const result = await graphdb.run(
    `MATCH (a:Thing {key: $key})-[r]-(b:Thing)
     WITH b, type(r) AS rel, startNode(r).key = $key AS outbound,
          r.weight * (0.5 ^ ((timestamp() - r.lastSeen) * 1.0 / $halfLife)) AS living,
          r.touches AS touches
     WHERE living > 0.01
     RETURN b.key AS key, b.kind AS kind, b.name AS name, b.touches AS nodeTouches,
            rel, outbound, living, touches
     ORDER BY living DESC
     LIMIT toInteger($limit)`,
    { key, halfLife: HALF_LIFE_MS, limit: Math.min(Number(limit) || 20, 100) }
  );
  if (!result) return null;
  return result.records.map((rec) => ({
    key: rec.get('key'),
    kind: rec.get('kind'),
    name: rec.get('name') || undefined,
    rel: rec.get('rel'),
    direction: rec.get('outbound') ? 'out' : 'in',
    living: round3(rec.get('living')),
    touches: rec.get('touches')
  }));
}

// One thing, with its vitals.
async function thing(key) {
  const result = await graphdb.run(
    `MATCH (t:Thing {key: $key})
     RETURN t.key AS key, t.kind AS kind, t.name AS name, t.touches AS touches,
            t.firstSeen AS firstSeen, t.lastSeen AS lastSeen,
            COUNT { (t)--() } AS degree`,
    { key }
  );
  if (!result || result.records.length === 0) return null;
  const rec = result.records[0];
  return {
    key: rec.get('key'),
    kind: rec.get('kind'),
    name: rec.get('name') || undefined,
    touches: rec.get('touches'),
    degree: rec.get('degree'),
    firstSeen: rec.get('firstSeen'),
    lastSeen: rec.get('lastSeen')
  };
}

// Why are these two things related? Returns the shortest path as readable
// steps — recommendations that can explain themselves.
async function why(fromKey, toKey, { maxHops = 4 } = {}) {
  if (fromKey === toKey) return { hops: 0, things: [], steps: [] };
  const hops = Math.min(Math.max(Number(maxHops) || 4, 1), 6);
  const result = await graphdb.run(
    `MATCH (a:Thing {key: $from}), (b:Thing {key: $to}),
           p = shortestPath((a)-[*..${hops}]-(b))
     RETURN [n IN nodes(p) | {key: n.key, kind: n.kind, name: n.name}] AS things,
            [r IN relationships(p) | {rel: type(r), weight: r.weight, touches: r.touches}] AS links
     LIMIT 1`,
    { from: fromKey, to: toKey }
  );
  if (!result || result.records.length === 0) return null;
  const rec = result.records[0];
  const things = rec.get('things');
  const links = rec.get('links');
  const steps = links.map((link, i) => ({
    from: things[i].name || things[i].key,
    rel: link.rel,
    to: things[i + 1].name || things[i + 1].key,
    strength: round3(link.weight)
  }));
  return { hops: links.length, things, steps };
}

// The graph's heartbeat: how big it is, what's hottest, what just happened.
async function pulse() {
  const result = await graphdb.run(
    `CALL {
       MATCH (t:Thing) RETURN count(t) AS things
     }
     CALL {
       MATCH ()-[r]->() RETURN count(r) AS links
     }
     CALL {
       MATCH (h:Thing) WITH h ORDER BY h.touches DESC LIMIT 10
       RETURN collect({key: h.key, kind: h.kind, name: h.name, touches: h.touches}) AS hottest
     }
     CALL {
       MATCH (x:Thing) WITH x ORDER BY x.firstSeen DESC LIMIT 5
       RETURN collect({key: x.key, kind: x.kind, name: x.name}) AS newest
     }
     RETURN things, links, hottest, newest`
  );
  if (!result || result.records.length === 0) return null;
  const rec = result.records[0];
  return {
    things: rec.get('things'),
    links: rec.get('links'),
    hottest: rec.get('hottest'),
    newest: rec.get('newest'),
    halfLifeDays: HALF_LIFE_MS / (24 * 60 * 60 * 1000)
  };
}

// The gardener: checkpoint decay into stored weights, prune edges that have
// withered away, and sweep up untouched orphan nodes. Run it whenever —
// weekly, or never; reads decay lazily either way.
async function garden({ pruneBelow = 0.05 } = {}) {
  const decayResult = await graphdb.run(
    `MATCH ()-[r]->()
     SET r.weight = r.weight * (0.5 ^ ((timestamp() - r.lastSeen) * 1.0 / $halfLife)),
         r.lastSeen = timestamp()
     RETURN count(r) AS checkpointed`,
    { halfLife: HALF_LIFE_MS }
  );
  if (!decayResult) return null;
  const pruneResult = await graphdb.run(
    `MATCH ()-[r]->()
     WHERE r.weight < $pruneBelow
     DELETE r
     RETURN count(r) AS pruned`,
    { pruneBelow: Number(pruneBelow) || 0.05 }
  );
  const orphanResult = await graphdb.run(
    `MATCH (t:Thing)
     WHERE NOT (t)--() AND t.touches <= 1
     DELETE t
     RETURN count(t) AS swept`
  );
  return {
    checkpointed: decayResult.records[0].get('checkpointed'),
    pruned: pruneResult ? pruneResult.records[0].get('pruned') : 0,
    swept: orphanResult ? orphanResult.records[0].get('swept') : 0
  };
}

function round3(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000;
}

module.exports = {
  enabled,
  touch,
  connect,
  observe,
  observeInBackground,
  related,
  thing,
  why,
  pulse,
  garden
};
