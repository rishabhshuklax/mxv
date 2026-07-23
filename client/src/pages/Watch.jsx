import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, img, splitId, titleOf, yearOf } from '../api';
import VidCorePlayer from '../components/VidCorePlayer';
import { useTitle } from '../store';
import {
  adjacentEpisode,
  getProgressKey,
  normalizePlayback,
  readProgress,
  writeProgress
} from '../lib/vidcore';

function parsePlayback(compoundId, searchParams) {
  const { type, id } = splitId(compoundId);
  try {
    return {
      playback: normalizePlayback(
        type,
        id,
        searchParams.get('season'),
        searchParams.get('episode')
      ),
      error: null
    };
  } catch (error) {
    return { playback: null, error: error.message };
  }
}

function regularSeasonsOf(details) {
  return (details?.seasons || [])
    .filter(
      (season) =>
        Number.isInteger(season.season_number) &&
        season.season_number > 0 &&
        Number.isInteger(season.episode_count) &&
        season.episode_count > 0
    )
    .sort((a, b) => a.season_number - b.season_number);
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

export default function Watch() {
  const { compoundId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.toString();
  const parsed = useMemo(
    () => parsePlayback(compoundId, new URLSearchParams(query)),
    [compoundId, query]
  );
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);
  const lastSavedRef = useRef(0);

  useTitle(details ? `Watching ${titleOf(details)}` : 'Watch');

  const mediaType = parsed.playback?.type;
  const tmdbId = parsed.playback?.id;

  useEffect(() => {
    if (!mediaType || !tmdbId) return undefined;

    let active = true;
    setDetails(null);
    setError(null);
    api
      .extras(mediaType, tmdbId)
      .then((data) => {
        if (active) setDetails(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });

    return () => {
      active = false;
    };
  }, [mediaType, tmdbId]);

  const regularSeasons = useMemo(() => regularSeasonsOf(details), [details]);

  const playback = useMemo(() => {
    if (!parsed.playback) return null;
    if (parsed.playback.type === 'movie' || regularSeasons.length === 0) {
      return parsed.playback;
    }

    const requestedSeason = regularSeasons.find(
      (season) => season.season_number === parsed.playback.season
    );
    const season = requestedSeason || regularSeasons[0];
    const episode = Math.min(parsed.playback.episode, season.episode_count);
    return normalizePlayback('tv', parsed.playback.id, season.season_number, episode);
  }, [parsed.playback, regularSeasons]);

  useEffect(() => {
    if (
      !playback ||
      playback.type !== 'tv' ||
      (playback.season === parsed.playback?.season &&
        playback.episode === parsed.playback?.episode)
    ) {
      return;
    }

    navigate(
      `/watch/tv~${playback.id}?season=${playback.season}&episode=${playback.episode}`,
      { replace: true }
    );
  }, [navigate, parsed.playback, playback]);

  const progressKey = playback ? getProgressKey(playback) : '';
  const [resumeAt, setResumeAt] = useState(0);

  useEffect(() => {
    if (!playback) {
      setResumeAt(0);
      lastSavedRef.current = 0;
      return;
    }

    const saved = readProgress(playback);
    setResumeAt(saved);
    lastSavedRef.current = saved;
  }, [progressKey]);

  const saveProgress = useCallback(
    (seconds) => {
      if (!playback) return;
      const current = Math.floor(seconds);
      if (Math.abs(current - lastSavedRef.current) < 5) return;
      writeProgress(playback, current);
      lastSavedRef.current = current;
    },
    [playback, progressKey]
  );

  const goToEpisode = useCallback(
    (season, episode) => {
      if (!playback) return;
      navigate(`/watch/tv~${playback.id}?season=${season}&episode=${episode}`);
    },
    [navigate, playback]
  );

  const previousEpisode =
    playback?.type === 'tv'
      ? adjacentEpisode(regularSeasons, playback.season, playback.episode, -1)
      : null;
  const nextEpisode =
    playback?.type === 'tv'
      ? adjacentEpisode(regularSeasons, playback.season, playback.episode, 1)
      : null;
  const selectedSeason = regularSeasons.find(
    (season) => season.season_number === playback?.season
  );

  if (parsed.error) {
    return (
      <div className="empty-state">
        <p className="kicker">Invalid screening</p>
        <h2>This watch link is not valid</h2>
        <p>{parsed.error}. Choose a title from MXV to start playback safely.</p>
        <Link to="/browse" className="btn btn-primary">
          Browse titles
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <p className="kicker">Projection interrupted</p>
        <h2>We couldn't prepare this title</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  if (!details || !playback) {
    return (
      <div className="watch-page watch-loading-page">
        <div className="watch-shell">
          <div className="watch-heading">
            <div className="skel skel-line watch-skel-kicker" />
            <div className="skel skel-title watch-skel-title" />
          </div>
          <div className="skel watch-player-skeleton" />
        </div>
      </div>
    );
  }

  const title = titleOf(details);
  const detailsId = `${playback.type}~${playback.id}`;

  return (
    <div className="watch-page fade-up">
      {details.backdrop_path && (
        <div className="watch-ambient" aria-hidden="true">
          <img src={img(details.backdrop_path, 'w1280')} alt="" />
        </div>
      )}

      <div className="watch-shell">
        <header className="watch-heading">
          <div>
            <p className="kicker">Now watching</p>
            <h1 className="display">{title}</h1>
            <div className="watch-meta">
              <span>{yearOf(details)}</span>
              <span>{playback.type === 'tv' ? 'Series' : 'Film'}</span>
              {playback.type === 'tv' && (
                <span>
                  S{playback.season} E{playback.episode}
                </span>
              )}
              {resumeAt >= 10 && <span>Resuming from {formatTime(resumeAt)}</span>}
            </div>
          </div>
          <Link className="watch-back" to={`/title/${detailsId}`}>
            <span aria-hidden="true">←</span> Title details
          </Link>
        </header>

        <div className="watch-player-wrap">
          <VidCorePlayer
            playback={playback}
            title={title}
            startAt={resumeAt}
            onProgress={saveProgress}
          />
        </div>

        <div className="watch-toolbar">
          {playback.type === 'tv' ? (
            <>
              <div className="episode-controls">
                <label>
                  <span>Season</span>
                  <select
                    value={playback.season}
                    onChange={(event) => goToEpisode(Number(event.target.value), 1)}
                  >
                    {regularSeasons.map((season) => (
                      <option key={season.id || season.season_number} value={season.season_number}>
                        Season {season.season_number}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Episode</span>
                  <select
                    value={playback.episode}
                    onChange={(event) =>
                      goToEpisode(playback.season, Number(event.target.value))
                    }
                  >
                    {Array.from(
                      { length: selectedSeason?.episode_count || 1 },
                      (_, index) => index + 1
                    ).map((episode) => (
                      <option key={episode} value={episode}>
                        Episode {episode}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="episode-stepper">
                <button
                  className="btn btn-ghost"
                  disabled={!previousEpisode}
                  onClick={() =>
                    previousEpisode &&
                    goToEpisode(previousEpisode.season, previousEpisode.episode)
                  }
                >
                  ← Previous
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!nextEpisode}
                  onClick={() =>
                    nextEpisode && goToEpisode(nextEpisode.season, nextEpisode.episode)
                  }
                >
                  Next episode →
                </button>
              </div>
            </>
          ) : (
            <p className="watch-note">
              Playback progress is saved privately on this device.
            </p>
          )}
        </div>

        <footer className="watch-credit">
          <span className="watch-status-dot" aria-hidden="true" />
          Playback is provided by VidCore. Availability and sources are managed externally.
        </footer>
      </div>
    </div>
  );
}
