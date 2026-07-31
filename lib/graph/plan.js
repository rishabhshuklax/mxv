// Translates one observed event into a plan: a flat list of graph operations
// ({ op: 'touch' } and { op: 'connect' }). Pure — the executor in
// everything.js turns plans into Cypher, which keeps this logic testable
// without a database.
//
// An event looks like:
//   {
//     type: 'view' | 'search' | 'watch' | 'rate' | 'link',
//     subject: 'movie~603',            // the thing the event is about
//     name: 'The Matrix',              // optional display name for the subject
//     actor: 'user~65a1...',           // optional: who did it
//     query: 'space operas',           // search events only
//     value: 8,                        // rate events only (0..10)
//     to: 'person~6384',               // link events only
//     rel: 'ACTED_IN',                 // link events only
//     recent: ['movie~157336', ...]    // other things this session touched lately
//   }
//
// Event types carry different conviction: a watch says more than a view,
// a rating says more than a watch.
const EVENT_WEIGHT = {
  view: 1,
  search: 1,
  watch: 3,
  rate: 2,
  link: 1
};

// How many recently-touched session neighbours a new touch resonates with.
const RESONANCE_SPAN = 3;

function planFor(event) {
  if (!event || !event.type) return [];
  const ops = [];
  const weight = EVENT_WEIGHT[event.type] || 1;

  // A search is about the query itself; the query becomes a first-class
  // thing so the graph learns the language people use to find things.
  const subject = event.type === 'search' && event.query
    ? `search~${String(event.query).trim().toLowerCase()}`
    : event.subject;
  if (!subject) return [];

  ops.push({ op: 'touch', key: subject, props: event.name ? { name: event.name } : {} });

  if (event.actor) {
    ops.push({ op: 'touch', key: event.actor, props: {} });
    ops.push({
      op: 'connect',
      from: event.actor,
      to: subject,
      rel: event.type === 'rate' ? 'RATED' : 'TOUCHED',
      amount: event.type === 'rate' ? rateAmount(event.value) : weight,
      props: event.type === 'rate' && event.value !== undefined
        ? { lastValue: Number(event.value) }
        : {}
    });
  }

  // Explicit structural links (used by the weaver: cast, genres, similars).
  if (event.type === 'link' && event.to && event.rel) {
    ops.push({ op: 'touch', key: event.to, props: event.toName ? { name: event.toName } : {} });
    ops.push({ op: 'connect', from: subject, to: event.to, rel: event.rel, amount: weight, props: {} });
  }

  // Session resonance: things a session touches close together in time grow
  // an association, whatever their kinds. This is where the graph learns
  // connections nobody designed.
  const recent = Array.isArray(event.recent) ? event.recent : [];
  for (const other of recent.slice(-RESONANCE_SPAN)) {
    if (!other || other === subject) continue;
    ops.push({ op: 'connect', from: subject, to: other, rel: 'RESONATES_WITH', amount: weight, props: {} });
  }

  return ops;
}

// Ratings reinforce proportionally to enthusiasm: a 10 lands harder than a 5.
function rateAmount(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return EVENT_WEIGHT.rate;
  return Math.max(0.5, (Math.min(10, Math.max(0, v)) / 10) * 4);
}

module.exports = { planFor, EVENT_WEIGHT, RESONANCE_SPAN };
