const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const MovieController = require('../controller/MovieController');

process.env.TMDB_API_BASE_URL = process.env.TMDB_API_BASE_URL || 'https://api.themoviedb.org';
process.env.TMDB_API_KEY = process.env.TMDB_API_KEY || 'test-key';

// NOTE: tonight() caches pools in-process per dial combo, so each test below
// uses a distinct dial combination unless it explicitly wants the cached pool.

const entity = (id, vote_average, vote_count, extra = {}) => ({
  id,
  vote_average,
  vote_count,
  poster_path: `/p${id}.jpg`,
  backdrop_path: `/b${id}.jpg`,
  overview: `Overview for ${id}`,
  softcore: false,
  ...extra
});

function run(query, results) {
  const seenUrls = [];
  const original = axios.get;
  axios.get = (url) => {
    seenUrls.push(url);
    const list = results(url) || [];
    return Promise.resolve({ data: { results: list } });
  };
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      set: () => res,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        axios.get = original;
        resolve({ body, statusCode: this.statusCode, seenUrls });
        return this;
      }
    };
    MovieController.tonight({ query }, res).catch((e) => {
      axios.get = original;
      reject(e);
    });
  });
}

test('film brief queries discover/movie with popularity sort and a rating floor', async () => {
  const pool = Array.from({ length: 30 }, (_, i) => entity(i + 1, 7.0 + (i % 10) / 10, 1000));
  const { body, seenUrls } = await run(
    { format: 'film', mood: 'funny', era: 'fresh', length: 'brisk', path: 'balanced', seed: '7' },
    (url) => (url.includes('&page=1') ? pool : [])
  );
  assert.ok(seenUrls.every((u) => u.includes('/discover/movie')), 'film brief must only hit discover/movie');
  const first = seenUrls[0];
  assert.ok(first.includes('sort_by=popularity.desc'), 'must sort by popularity');
  assert.ok(first.includes('vote_average.gte=6.8'), 'balanced path must carry its rating floor');
  assert.ok(first.includes('primary_release_date.gte=2016-01-01'), 'fresh era must constrain release date');
  assert.ok(first.includes('with_runtime.lte=99'), 'brisk length must constrain runtime');
  assert.ok(body.feature.id.startsWith('movie~'));
});

test('series brief queries discover/tv with tv genres, air dates, and no runtime filter', async () => {
  const pool = Array.from({ length: 30 }, (_, i) => entity(100 + i, 7.5, 800));
  const { body, seenUrls } = await run(
    { format: 'series', mood: 'strange', era: 'fresh', length: 'standard', path: 'balanced', seed: '7' },
    (url) => (url.includes('&page=1') ? pool : [])
  );
  assert.ok(seenUrls.every((u) => u.includes('/discover/tv')), 'series brief must only hit discover/tv');
  const first = seenUrls[0];
  assert.ok(first.includes('with_genres=10765%2C9648'), 'strange must map to tv genre ids');
  assert.ok(first.includes('first_air_date.gte=2016-01-01'), 'era must map to first_air_date for tv');
  assert.ok(!first.includes('with_runtime'), 'tv queries must never carry runtime constraints');
  assert.ok(first.includes('vote_count.gte=150'), 'tv must use the scaled-down vote threshold');
  assert.ok(body.feature.id.startsWith('tv~'));
});

test('either brief merges film and tv pools with correctly prefixed ids', async () => {
  const { body } = await run(
    { format: 'either', mood: 'dark', era: 'any', length: 'standard', path: 'crowd', seed: '11' },
    (url) => {
      if (!url.includes('&page=1')) return [];
      return url.includes('/discover/tv')
        ? Array.from({ length: 15 }, (_, i) => entity(500 + i, 8.0, 5000))
        : Array.from({ length: 15 }, (_, i) => entity(600 + i, 8.0, 5000));
    }
  );
  const all = [body.feature, ...body.understudies].map((e) => e.id);
  assert.ok(all.every((id) => id.startsWith('movie~') || id.startsWith('tv~')));
  assert.equal(body.poolSize, 30, 'both pools must merge');
});

test('exclude guarantees a fresh feature on re-deal', async () => {
  const pool = Array.from({ length: 20 }, (_, i) => entity(i + 1, 7.0 + (i % 5) / 10, 900));
  const query = { format: 'film', mood: 'epic', era: 'any', length: 'grand', path: 'balanced', seed: '42' };
  const first = await run(query, (url) => (url.includes('&page=1') ? pool : []));
  const dealt = [first.body.feature.id, ...first.body.understudies.map((e) => e.id)];

  const second = await run(
    { ...query, seed: '43', exclude: dealt.join(',') },
    (url) => (url.includes('&page=1') ? pool : [])
  );
  const secondHand = [second.body.feature.id, ...second.body.understudies.map((e) => e.id)];
  secondHand.forEach((id) => {
    assert.ok(!dealt.includes(id), `re-deal must not repeat already-dealt ${id}`);
  });
});

test('same seed and exclude deal the same hand (deterministic)', async () => {
  const pool = Array.from({ length: 20 }, (_, i) => entity(i + 1, 7.2, 700));
  const query = { format: 'film', mood: 'tender', era: 'classics', length: 'standard', path: 'balanced', seed: '99' };
  const a = await run(query, (url) => (url.includes('&page=1') ? pool : []));
  const b = await run(query, (url) => (url.includes('&page=1') ? pool : []));
  assert.equal(a.body.feature.id, b.body.feature.id);
  assert.deepEqual(
    a.body.understudies.map((e) => e.id),
    b.body.understudies.map((e) => e.id)
  );
});

test('quality-weighted pick: a standout headlines far more often than uniform chance', async () => {
  // one 8.8-rated heavyweight among fifteen 6.9 mid-tier titles; uniform picking
  // would give it 1-2 wins in 20 — weighting should multiply that several times
  const pool = [
    entity(1, 8.8, 25000),
    ...Array.from({ length: 15 }, (_, i) => entity(i + 2, 6.9, 450))
  ];
  let wins = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const { body } = await run(
      { format: 'film', mood: 'true', era: 'any', length: 'standard', path: 'balanced', seed: String(seed) },
      (url) => (url.includes('&page=1') ? pool : [])
    );
    if (body.feature.id === 'movie~1') wins += 1;
  }
  assert.ok(wins >= 4, `heavyweight should far exceed its uniform 1.25/20 share, won ${wins}/20`);
});

test('quality-weighted pick: a junk title almost never headlines over a strong pool', async () => {
  // the Vidocq case: one 6.0-rated obscurity in a pool of fifteen 7.8-rated titles
  const pool = [
    entity(1, 6.0, 585),
    ...Array.from({ length: 15 }, (_, i) => entity(i + 2, 7.8, 3000))
  ];
  let junkWins = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const { body } = await run(
      { format: 'film', mood: 'childlike', era: 'aughts', length: 'standard', path: 'crowd', seed: String(seed) },
      (url) => (url.includes('&page=1') ? pool : [])
    );
    if (body.feature.id === 'movie~1') junkWins += 1;
  }
  assert.ok(junkWins <= 1, `junk must not headline a strong pool, headlined ${junkWins}/20`);
});

test('relax ladder accumulates pool across levels instead of replacing it', async () => {
  // strict level yields 4, each relax level adds more; pool must be the union
  const strict = Array.from({ length: 4 }, (_, i) => entity(i + 1, 7.5, 600));
  const loose = Array.from({ length: 30 }, (_, i) => entity(i + 1, 7.0, 600)); // overlaps strict ids
  let call = 0;
  const { body } = await run(
    { format: 'film', mood: 'electric', era: 'golden', length: 'brisk', path: 'hidden', seed: '5' },
    (url) => {
      if (!url.includes('&page=1')) return [];
      call += 1;
      return call === 1 ? strict : loose;
    }
  );
  assert.ok(body.poolSize >= 30, `pool must accumulate without duplicates, got ${body.poolSize}`);
});

test('reason names the format and drops the length clause for series', async () => {
  const pool = Array.from({ length: 30 }, (_, i) => entity(700 + i, 7.4, 500));
  const { body } = await run(
    { format: 'series', mood: 'funny', era: 'any', length: 'grand', path: 'balanced', seed: '3' },
    (url) => (url.includes('&page=1') ? pool : [])
  );
  assert.ok(body.reason.startsWith('a series'), 'reason must lead with the format');
  assert.ok(!body.reason.includes('long sitting'), 'series reason must not mention film length');
});
