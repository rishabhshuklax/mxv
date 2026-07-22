export function SkeletonRow({ count = 8 }) {
  return (
    <section className="row">
      <div className="skel skel-title" />
      <div className="row-scroller">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="skel skel-card" />
        ))}
      </div>
    </section>
  );
}

export function SkeletonGrid({ count = 12 }) {
  return (
    <div className="grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skel skel-card" />
      ))}
    </div>
  );
}
