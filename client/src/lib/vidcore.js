const VIDCORE_ORIGINS = new Set([
  'https://vidcore.org',
  'https://www.vidcore.org'
]);

const POSITIVE_INTEGER = /^[1-9]\d*$/;
const PROGRESS_PREFIX = 'mxv:watch-progress:v1';

function positiveInteger(value, label, fallback) {
  if ((value === undefined || value === null || value === '') && fallback) {
    return fallback;
  }

  const normalized = String(value);
  if (!POSITIVE_INTEGER.test(normalized)) {
    throw new Error(`Invalid ${label}`);
  }

  return Number(normalized);
}

function defaultStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export function normalizePlayback(type, id, season, episode) {
  if (type !== 'movie' && type !== 'tv') {
    throw new Error('Unsupported media type');
  }

  const normalizedId = String(id);
  if (!POSITIVE_INTEGER.test(normalizedId)) {
    throw new Error('Invalid TMDB id');
  }

  if (type === 'movie') {
    return {
      type,
      id: normalizedId,
      season: null,
      episode: null
    };
  }

  return {
    type,
    id: normalizedId,
    season: positiveInteger(season, 'season', 1),
    episode: positiveInteger(episode, 'episode', 1)
  };
}

export function buildVidCoreUrl(playback, startAt = 0) {
  const normalized = normalizePlayback(
    playback.type,
    playback.id,
    playback.season,
    playback.episode
  );
  const path =
    normalized.type === 'movie'
      ? `/embed/movie/${normalized.id}`
      : `/embed/tv/${normalized.id}/${normalized.season}/${normalized.episode}`;
  const url = new URL(path, 'https://vidcore.org');

  url.searchParams.set('autoPlay', 'true');
  url.searchParams.set('theme', 'e0a458');
  if (Number.isFinite(startAt) && startAt >= 1) {
    url.searchParams.set('startAt', String(Math.floor(startAt)));
  }

  return url.toString();
}

export function isTrustedVidCoreOrigin(origin) {
  return VIDCORE_ORIGINS.has(origin);
}

export function getVidCoreProgress(origin, message) {
  if (
    !isTrustedVidCoreOrigin(origin) ||
    !message ||
    message.type !== 'PLAYER_EVENT' ||
    !message.data
  ) {
    return null;
  }

  const eventName = message.data.event || message.data.type;
  if (!['timeupdate', 'seeked', 'pause', 'ended'].includes(eventName)) {
    return null;
  }

  if (eventName === 'ended') return 0;

  const seconds = [
    message.data.currentTime,
    message.data.time,
    message.data.seconds
  ].find((value) => Number.isFinite(value) && value >= 0);

  return seconds ?? null;
}

export function getProgressKey(playback) {
  const normalized = normalizePlayback(
    playback.type,
    playback.id,
    playback.season,
    playback.episode
  );

  if (normalized.type === 'movie') {
    return `${PROGRESS_PREFIX}:movie:${normalized.id}`;
  }

  return `${PROGRESS_PREFIX}:tv:${normalized.id}:${normalized.season}:${normalized.episode}`;
}

export function readProgress(playback, storage = defaultStorage()) {
  if (!storage) return 0;

  try {
    const value = Number(storage.getItem(getProgressKey(playback)));
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

export function writeProgress(playback, seconds, storage = defaultStorage()) {
  if (!storage) return;

  try {
    const key = getProgressKey(playback);
    if (!Number.isFinite(seconds) || seconds < 1) {
      storage.removeItem(key);
      return;
    }
    storage.setItem(key, String(Math.floor(seconds)));
  } catch {
    // Playback should continue when storage is unavailable or blocked.
  }
}

export function adjacentEpisode(seasons, season, episode, direction) {
  if (direction !== -1 && direction !== 1) {
    throw new Error('Episode direction must be -1 or 1');
  }

  const available = (Array.isArray(seasons) ? seasons : [])
    .map((item) => ({
      season: Number(item.season_number),
      episodes: Number(item.episode_count)
    }))
    .filter(
      (item) =>
        Number.isInteger(item.season) &&
        item.season > 0 &&
        Number.isInteger(item.episodes) &&
        item.episodes > 0
    )
    .sort((a, b) => a.season - b.season);
  const seasonIndex = available.findIndex((item) => item.season === Number(season));

  if (seasonIndex === -1) return null;

  const currentSeason = available[seasonIndex];
  const currentEpisode = Number(episode);
  if (
    !Number.isInteger(currentEpisode) ||
    currentEpisode < 1 ||
    currentEpisode > currentSeason.episodes
  ) {
    return null;
  }

  const withinSeason = currentEpisode + direction;
  if (withinSeason >= 1 && withinSeason <= currentSeason.episodes) {
    return { season: currentSeason.season, episode: withinSeason };
  }

  const adjacentSeason = available[seasonIndex + direction];
  if (!adjacentSeason) return null;

  return {
    season: adjacentSeason.season,
    episode: direction === 1 ? 1 : adjacentSeason.episodes
  };
}
