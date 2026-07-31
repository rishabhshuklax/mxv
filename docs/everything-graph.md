# The Everything Graph

A living knowledge graph for mxv, backed by Neo4j, that **grows and reorganizes
itself purely from use**. Nobody curates it. Browsing the app *is* feeding it.

## The three ideas

### 1. One primitive: the Thing

Every node is a `Thing` with a `key` following the repo's existing id
convention, extended to any kind of entity:

```
movie~603        tv~1399        person~6384
genre~28         user~65a1f...  search~space operas
```

A new kind of thing needs no migration and no schema decision — just a new
key prefix. Each Thing also gets a kind label (`:Movie`, `:Person`,
`:Search`, …) so plain Cypher stays pleasant in Neo4j Browser.

### 2. Living edges

Every relationship carries `weight`, `touches`, `firstSeen`, `lastSeen`.

- **Use strengthens.** Each touch reinforces the edge with diminishing
  returns (`+ amount / (1 + ln(1 + weight))`), so nothing can drown out the
  rest of the graph by brute repetition.
- **Neglect fades.** Weights decay exponentially with a half-life
  (default 14 days, tune with `GRAPH_HALF_LIFE_MS`). Decay is applied lazily
  at read and write time, so it costs nothing and needs no cron.
- **The gardener prunes.** `POST /api/graph/gardener` checkpoints decay,
  deletes edges that have withered below a threshold, and sweeps orphan
  nodes. Run it weekly, or never — reads are correct either way.

The result: the graph *remembers what keeps mattering and forgets what
doesn't*, which is what makes it manageable at any size.

### 3. Growth by observation

Three feeders, no administrators:

- **The observer** (`middleware/observe.js`) watches ordinary GET traffic.
  Viewing a movie, opening a person page, searching — each becomes a graph
  event automatically.
- **The weaver** (`lib/graph/weaver.js`) reacts to a title being viewed by
  quietly pulling its genres, top cast, and similar titles from TMDB and
  weaving them in as things and links. One page view teaches the graph a
  whole neighbourhood. (Deduped in-memory: at most one weave per title per
  day per warm process.)
- **Explicit events** (`POST /api/graph/observe`) let clients report what
  passive observation can't see — playback and ratings — which carry more
  conviction than views.

Two lightweight headers make the graph smarter, both optional:

| Header | Effect |
|---|---|
| `x-graph-session: <any-opaque-string>` | Things browsed close together in this session grow `RESONATES_WITH` edges — associations no schema anticipated. |
| `x-graph-actor: <user-id>` (or a JWT on authed routes) | The user becomes a Thing too, with personal `TOUCHED` / `RATED` edges powering `/api/graph/me`. |

## API

| Endpoint | What it answers |
|---|---|
| `GET /api/graph/thing/:key` | One thing and its vitals (touches, degree, first/last seen). |
| `GET /api/graph/related/:key?limit=20` | Its strongest connections ranked by *living* (decayed) weight. |
| `GET /api/graph/why/:from/:to` | **Why are these related?** The shortest path, as readable steps — recommendations that explain themselves. |
| `GET /api/graph/pulse` | The heartbeat: size, hottest things, newest arrivals. |
| `GET /api/graph/me` (auth) | The authenticated user's personal neighbourhood. |
| `POST /api/graph/observe` | Report `{type: 'watch'\|'rate'\|'view'\|'search', subject, value?, query?}`. |
| `POST /api/graph/gardener` | Tend the graph: decay checkpoint + prune + sweep. |

### Example: an explainable recommendation

```
GET /api/graph/why/movie~603/movie~157336

{
  "hops": 2,
  "steps": [
    { "from": "The Matrix",   "rel": "RESONATES_WITH", "to": "Blade Runner", "strength": 2.31 },
    { "from": "Blade Runner", "rel": "SIMILAR_TO",     "to": "Interstellar", "strength": 1.5 }
  ]
}
```

## Setup

1. Any Neo4j 5.x (or 4.4+) — [Aura free tier](https://neo4j.com/cloud/aura/)
   works out of the box.
2. Environment:

```
NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
GRAPH_HALF_LIFE_MS=1209600000   # optional, default 14 days
```

Without `NEO4J_URI` the whole feature is a no-op: the observer stands down,
graph endpoints return `503` with a hint, and the rest of the API is
untouched (same graceful pattern as the optional MongoDB connection). All
graph writes are fire-and-forget — a down database can never slow or break
a request.

## Architecture

```
middleware/observe.js     traffic → events (+ session resonance memory)
lib/graph/plan.js         event → operations        (pure, tested)
lib/graph/living.js       weights, decay, key rules (pure, tested)
lib/graph/everything.js   operations → Cypher; related / why / pulse / garden
lib/graph/weaver.js       TMDB structure weaving around viewed titles
init/graph.js             optional driver bootstrap + unique-key constraint
controller/GraphController.js + routes in index.js
```

The event vocabulary (`view`, `search`, `watch`, `rate`, `link`) and the
planner are deliberately domain-agnostic: point the observer at different
routes and the same living graph works for any catalogue of things.
