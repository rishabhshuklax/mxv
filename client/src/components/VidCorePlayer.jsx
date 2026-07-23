import { useEffect, useMemo, useRef, useState } from 'react';
import { buildVidCoreUrl, getVidCoreProgress } from '../lib/vidcore';

export default function VidCorePlayer({
  playback,
  title,
  startAt = 0,
  onProgress
}) {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef(null);
  const progressHandlerRef = useRef(onProgress);
  const src = useMemo(
    () => buildVidCoreUrl(playback, startAt),
    [playback.type, playback.id, playback.season, playback.episode, startAt]
  );

  useEffect(() => {
    progressHandlerRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const seconds = getVidCoreProgress(event.origin, event.data);
      if (seconds !== null) {
        progressHandlerRef.current?.(seconds);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="vidcore-player" aria-busy={!loaded}>
      {!loaded && (
        <div className="player-loading" role="status">
          <span className="player-aperture" aria-hidden="true" />
          <strong>Preparing the projection</strong>
          <span>Finding the best available source…</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        title={`${title} — VidCore player`}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
