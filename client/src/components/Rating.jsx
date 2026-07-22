export default function Rating({ value, size = 42 }) {
  const v = Math.round((value || 0) * 10);
  const tone = v >= 70 ? 'var(--good)' : v >= 45 ? 'var(--mid)' : 'var(--bad)';
  return (
    <div
      className="ring"
      style={{ '--p': v, '--c': v ? tone : 'transparent', width: size, height: size }}
      title={v ? `${v}% user score` : 'Not yet rated'}
    >
      <span>{v || '–'}</span>
    </div>
  );
}
