const ICON_PATHS = {
  rain: 'M12 3c3.4 4.1 5.8 7.1 5.8 9.9A5.8 5.8 0 0 1 6.2 12.9C6.2 10.1 8.6 7.1 12 3z',
  dry: 'M12 5.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z',
  feels: 'M11 4a1.6 1.6 0 0 1 3.2 0v8.1a3.6 3.6 0 1 1-3.2 0V4z',
  trend: 'M5 16l5-6 3.5 3.5L19 8m0 0h-4.5M19 8v4.5',
  uv: 'M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19',
  wind: 'M3.5 8.5h9.8a2.6 2.6 0 1 0-2.6-2.6M3.5 12.5h13.9a2.6 2.6 0 1 1-2.6 2.6M3.5 16.5h6.9',
  aqi: 'M6 18C6 9.5 12.5 5 19.5 4.5 19.5 12 15.5 18.5 7 18.5M6 18c1-3.5 3-6.5 6.5-9',
};

const STROKE_KINDS = new Set(['trend', 'uv', 'wind', 'aqi']);

export default function InsightsRow({ insights }) {
  if (!insights?.length) return null;
  return (
    <div className="insights-row" role="list" aria-label="Weather insights">
      {insights.map((insight) => (
        <div className="insight-chip" role="listitem" key={insight.kind + insight.text}>
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" className={`insight-icon insight-icon--${insight.kind}`}>
            <path
              d={ICON_PATHS[insight.kind] ?? ICON_PATHS.dry}
              fill={STROKE_KINDS.has(insight.kind) ? 'none' : 'currentColor'}
              stroke={STROKE_KINDS.has(insight.kind) ? 'currentColor' : 'none'}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{insight.text}</span>
        </div>
      ))}
    </div>
  );
}
