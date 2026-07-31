// Neo4j bootstrap for the Everything Graph. Mirrors init/db.js: if the
// environment isn't configured, the app runs untouched and every graph
// feature quietly no-ops.
//
// Env:
//   NEO4J_URI       e.g. neo4j+s://xxxx.databases.neo4j.io (or bolt://localhost:7687)
//   NEO4J_USER      defaults to neo4j
//   NEO4J_PASSWORD
const neo4j = require('neo4j-driver');

let driver = null;
let constraintsEnsured = false;

function enabled() {
  return Boolean(process.env.NEO4J_URI);
}

function getDriver() {
  if (!enabled()) return null;
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || ''),
      // plain JS numbers everywhere; the graph never needs 64-bit precision
      { disableLosslessIntegers: true }
    );
    console.log('Everything Graph: Neo4j driver initialized');
  }
  return driver;
}

// Runs one query in a short-lived session. All graph access funnels through
// here so connection handling lives in exactly one place.
async function run(cypher, params = {}) {
  const d = getDriver();
  if (!d) return null;
  await ensureConstraints(d);
  const session = d.session();
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

// One unique key per Thing — the whole graph hangs off this.
async function ensureConstraints(d) {
  if (constraintsEnsured) return;
  constraintsEnsured = true; // set first so a failure doesn't retry every query
  const session = d.session();
  try {
    await session.run(
      'CREATE CONSTRAINT thing_key IF NOT EXISTS FOR (t:Thing) REQUIRE t.key IS UNIQUE'
    );
  } catch (err) {
    console.error('Everything Graph: could not ensure constraints:', err.message);
  } finally {
    await session.close();
  }
}

async function close() {
  if (driver) {
    await driver.close();
    driver = null;
    constraintsEnsured = false;
  }
}

module.exports = { enabled, run, close };
