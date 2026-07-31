// The weaver: when someone looks at a title, quietly pull its structure from
// TMDB — genres, top cast, similar titles — and weave it into the graph as
// first-class things and links. This is how one page view teaches the graph
// a whole neighbourhood.
//
// Weaving is deduped in-memory (same pattern as lib/cache): an entity is
// re-woven at most once a day per warm process, so browsing stays cheap.
const axios = require('axios');
const cache = require('../cache');
const graph = require('./everything');
const { makeKey } = require('./living');

const WEAVE_TTL_MS = 24 * 60 * 60 * 1000;
const TOP_CAST = 8;
const TOP_SIMILAR = 5;

// How much conviction structural links carry. TMDB facts are real but cheap;
// human behaviour (watches, ratings, resonance) should be able to outweigh
// them, so they start modest and rely on re-weaving to stay warm.
const STRUCTURE_WEIGHT = 1.5;

async function weave(type, id) {
  if (!graph.enabled()) return { woven: false };
  if (type !== 'movie' && type !== 'tv') return { woven: false };

  const key = makeKey(type, id);
  return cache.wrap(`graph:weave:${key}`, WEAVE_TTL_MS, async () => {
    const { data } = await axios.get(
      `${process.env.TMDB_API_BASE_URL}/3/${type}/${id}` +
      `?language=en-US&append_to_response=credits,similar&api_key=${process.env.TMDB_API_KEY}`
    );

    const name = data.title || data.name;
    await graph.touch(key, name ? { name } : {});

    let links = 0;
    for (const genre of data.genres || []) {
      const genreKey = makeKey('genre', genre.id);
      await graph.touch(genreKey, { name: genre.name });
      await graph.connect(key, genreKey, 'IN_GENRE', { amount: STRUCTURE_WEIGHT });
      links += 1;
    }

    const cast = (data.credits && data.credits.cast) || [];
    for (const member of cast.slice(0, TOP_CAST)) {
      const personKey = makeKey('person', member.id);
      await graph.touch(personKey, { name: member.name });
      await graph.connect(personKey, key, 'APPEARS_IN', {
        amount: STRUCTURE_WEIGHT,
        props: member.character ? { as: member.character } : {}
      });
      links += 1;
    }

    const similar = (data.similar && data.similar.results) || [];
    for (const other of similar.slice(0, TOP_SIMILAR)) {
      const otherKey = makeKey(type, other.id);
      await graph.touch(otherKey, { name: other.title || other.name });
      await graph.connect(key, otherKey, 'SIMILAR_TO', { amount: STRUCTURE_WEIGHT });
      links += 1;
    }

    return { woven: true, key, name, links };
  });
}

// Fire-and-forget wrapper for request paths.
function weaveInBackground(type, id) {
  weave(type, id).catch((err) =>
    console.error(`Everything Graph weave failed for ${type}~${id}:`, err.message)
  );
}

module.exports = { weave, weaveInBackground };
