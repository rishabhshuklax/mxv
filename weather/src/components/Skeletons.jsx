function Block({ className }) {
  return <div className={`skeleton ${className ?? ''}`} aria-hidden="true" />;
}

export default function SkeletonView() {
  return (
    <div className="skeleton-view" role="status" aria-label="Loading forecast">
      <div className="panel">
        <div className="skeleton-hero">
          <Block className="skeleton-line skeleton-line--lg" />
          <Block className="skeleton-line skeleton-line--sm" />
          <div className="skeleton-hero-main">
            <Block className="skeleton-circle" />
            <Block className="skeleton-temp" />
          </div>
          <Block className="skeleton-line skeleton-line--md" />
        </div>
      </div>
      <div className="skeleton-chips">
        <Block className="skeleton-chip" />
        <Block className="skeleton-chip" />
        <Block className="skeleton-chip" />
      </div>
      <div className="panel">
        <Block className="skeleton-line skeleton-line--sm" />
        <Block className="skeleton-chart" />
      </div>
      <div className="skeleton-grid">
        <div className="panel">
          <Block className="skeleton-line skeleton-line--sm" />
          {Array.from({ length: 6 }, (_, i) => (
            <Block key={i} className="skeleton-line skeleton-line--row" />
          ))}
        </div>
        <div className="panel">
          <Block className="skeleton-line skeleton-line--sm" />
          <div className="skeleton-cards">
            {Array.from({ length: 6 }, (_, i) => (
              <Block key={i} className="skeleton-card" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
