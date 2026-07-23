import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adjacentEpisode,
  buildVidCoreUrl,
  getProgressKey,
  getVidCoreProgress,
  isTrustedVidCoreOrigin,
  normalizePlayback,
  readProgress,
  writeProgress
} from './vidcore.js';

const seasons = [
  { season_number: 0, episode_count: 4 },
  { season_number: 1, episode_count: 3 },
  { season_number: 2, episode_count: 2 },
  { season_number: 4, episode_count: 0 }
];

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test('normalizes movie and TV playback coordinates', () => {
  assert.deepEqual(normalizePlayback('movie', '27205'), {
    type: 'movie',
    id: '27205',
    season: null,
    episode: null
  });
  assert.deepEqual(normalizePlayback('tv', 1396, '2', '3'), {
    type: 'tv',
    id: '1396',
    season: 2,
    episode: 3
  });
  assert.deepEqual(normalizePlayback('tv', '1396'), {
    type: 'tv',
    id: '1396',
    season: 1,
    episode: 1
  });
});

test('rejects unsupported or unsafe playback coordinates', () => {
  assert.throws(() => normalizePlayback('person', '12'), /Unsupported media type/);
  assert.throws(() => normalizePlayback('movie', 'abc'), /Invalid TMDB id/);
  assert.throws(() => normalizePlayback('movie', '0'), /Invalid TMDB id/);
  assert.throws(() => normalizePlayback('tv', '1396', '-1', '2'), /Invalid season/);
  assert.throws(() => normalizePlayback('tv', '1396', '1', '2.5'), /Invalid episode/);
});

test('builds documented VidCore movie and TV embed URLs', () => {
  assert.equal(
    buildVidCoreUrl(normalizePlayback('movie', '27205'), 95.8),
    'https://vidcore.org/embed/movie/27205?autoPlay=true&theme=e0a458&startAt=95'
  );
  assert.equal(
    buildVidCoreUrl(normalizePlayback('tv', '1396', 2, 3)),
    'https://vidcore.org/embed/tv/1396/2/3?autoPlay=true&theme=e0a458'
  );
  assert.equal(
    buildVidCoreUrl(normalizePlayback('movie', '27205'), Number.NaN),
    'https://vidcore.org/embed/movie/27205?autoPlay=true&theme=e0a458'
  );
});

test('accepts only exact documented VidCore origins', () => {
  assert.equal(isTrustedVidCoreOrigin('https://vidcore.org'), true);
  assert.equal(isTrustedVidCoreOrigin('https://www.vidcore.org'), true);
  assert.equal(isTrustedVidCoreOrigin('http://vidcore.org'), false);
  assert.equal(isTrustedVidCoreOrigin('https://vidcore.org.evil.test'), false);
});

test('extracts progress only from trusted VidCore player events', () => {
  assert.equal(
    getVidCoreProgress('https://vidcore.org', {
      type: 'PLAYER_EVENT',
      data: { event: 'timeupdate', currentTime: 42.8 }
    }),
    42.8
  );
  assert.equal(
    getVidCoreProgress('https://www.vidcore.org', {
      type: 'PLAYER_EVENT',
      data: { type: 'seeked', time: 118 }
    }),
    118
  );
  assert.equal(
    getVidCoreProgress('https://vidcore.org', {
      type: 'PLAYER_EVENT',
      data: { event: 'pause', seconds: 12 }
    }),
    12
  );
  assert.equal(
    getVidCoreProgress('https://vidcore.org', {
      type: 'PLAYER_EVENT',
      data: { event: 'ended', currentTime: 888 }
    }),
    0
  );
  assert.equal(
    getVidCoreProgress('https://vidcore.org.evil.test', {
      type: 'PLAYER_EVENT',
      data: { event: 'timeupdate', currentTime: 42 }
    }),
    null
  );
  assert.equal(
    getVidCoreProgress('https://vidcore.org', {
      type: 'PLAYER_EVENT',
      data: { event: 'play', currentTime: 42 }
    }),
    null
  );
  assert.equal(getVidCoreProgress('https://vidcore.org', null), null);
});

test('stores progress per movie or exact TV episode', () => {
  const storage = memoryStorage();
  const movie = normalizePlayback('movie', '27205');
  const episode = normalizePlayback('tv', '1396', 2, 3);

  assert.equal(getProgressKey(movie), 'mxv:watch-progress:v1:movie:27205');
  assert.equal(getProgressKey(episode), 'mxv:watch-progress:v1:tv:1396:2:3');
  assert.equal(readProgress(movie, storage), 0);

  writeProgress(movie, 95.8, storage);
  writeProgress(episode, 121, storage);
  assert.equal(readProgress(movie, storage), 95);
  assert.equal(readProgress(episode, storage), 121);

  writeProgress(movie, 0, storage);
  assert.equal(readProgress(movie, storage), 0);
});

test('treats corrupt or inaccessible progress storage as empty', () => {
  const movie = normalizePlayback('movie', '27205');
  const corrupt = memoryStorage({ [getProgressKey(movie)]: 'not-a-time' });
  const inaccessible = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('denied');
    },
    removeItem() {
      throw new Error('denied');
    }
  };

  assert.equal(readProgress(movie, corrupt), 0);
  assert.equal(readProgress(movie, inaccessible), 0);
  assert.doesNotThrow(() => writeProgress(movie, 20, inaccessible));
});

test('moves between episodes and crosses regular-season boundaries', () => {
  assert.deepEqual(adjacentEpisode(seasons, 1, 1, 1), { season: 1, episode: 2 });
  assert.deepEqual(adjacentEpisode(seasons, 1, 3, 1), { season: 2, episode: 1 });
  assert.deepEqual(adjacentEpisode(seasons, 2, 1, -1), { season: 1, episode: 3 });
  assert.equal(adjacentEpisode(seasons, 1, 1, -1), null);
  assert.equal(adjacentEpisode(seasons, 2, 2, 1), null);
});

test('rejects unsupported episode-navigation directions', () => {
  assert.throws(() => adjacentEpisode(seasons, 1, 1, 0), /direction/);
});
