export default function Rating({ value }) {
  const v = value ? value.toFixed(1) : null;
  return (
    <span className="score" title={v ? `${v} / 10 on TMDB` : 'Not yet rated'}>
      <strong>{v || '–'}</strong>
      <span>/10</span>
    </span>
  );
}
