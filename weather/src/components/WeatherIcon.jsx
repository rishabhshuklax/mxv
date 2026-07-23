const ICONS = {
  clear: (
    <>
      <circle cx="32" cy="32" r="14" className="wi-sun" />
      <g className="wi-rays">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line key={deg} x1="32" y1="6" x2="32" y2="14" transform={`rotate(${deg} 32 32)`} />
        ))}
      </g>
    </>
  ),
  'clear-night': (
    <path
      className="wi-moon"
      d="M40 12a20 20 0 1 0 12 36 16 16 0 0 1-12-36z"
    />
  ),
  'partly-cloudy': (
    <>
      <circle cx="24" cy="24" r="10" className="wi-sun" />
      <path
        className="wi-cloud"
        d="M20 46a10 10 0 0 1 1-20 13 13 0 0 1 25 4 9 9 0 0 1-2 16H20z"
      />
    </>
  ),
  'partly-cloudy-night': (
    <>
      <path className="wi-moon-sm" d="M30 14a11 11 0 1 0 7 20 9 9 0 0 1-7-20z" />
      <path
        className="wi-cloud"
        d="M20 46a10 10 0 0 1 1-20 13 13 0 0 1 25 4 9 9 0 0 1-2 16H20z"
      />
    </>
  ),
  cloudy: (
    <>
      <path
        className="wi-cloud"
        d="M16 46a11 11 0 0 1 1-22 14 14 0 0 1 27 4 10 10 0 0 1-2 18H16z"
      />
      <path
        className="wi-cloud wi-cloud-back"
        d="M10 34a8 8 0 0 1 6-14 10 10 0 0 1 15-3"
      />
    </>
  ),
  fog: (
    <>
      <path className="wi-cloud" d="M18 30a10 10 0 0 1 1-20 13 13 0 0 1 24 5H18z" />
      {[38, 46, 54].map((y, i) => (
        <line key={y} x1={10 + i * 2} y1={y} x2={54 - i * 2} y2={y} className="wi-fog-line" />
      ))}
    </>
  ),
  drizzle: (
    <>
      <path className="wi-cloud" d="M16 34a10 10 0 0 1 1-20 13 13 0 0 1 25 4 9 9 0 0 1-2 16H16z" />
      {[22, 32, 42].map((x) => (
        <line key={x} x1={x} y1="42" x2={x - 4} y2="52" className="wi-drop-line" />
      ))}
    </>
  ),
  rain: (
    <>
      <path className="wi-cloud" d="M16 32a10 10 0 0 1 1-20 13 13 0 0 1 25 4 9 9 0 0 1-2 16H16z" />
      {[20, 30, 40, 48].map((x, i) => (
        <line key={x} x1={x} y1="40" x2={x - 6} y2="56" className="wi-drop-line wi-drop-heavy" style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </>
  ),
  snow: (
    <>
      <path className="wi-cloud" d="M16 30a10 10 0 0 1 1-20 13 13 0 0 1 25 4 9 9 0 0 1-2 16H16z" />
      {[20, 32, 44].map((x, i) => (
        <circle key={x} cx={x} cy={44 + (i % 2) * 8} r="2.4" className="wi-snow-dot" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </>
  ),
  thunder: (
    <>
      <path className="wi-cloud" d="M16 28a10 10 0 0 1 1-20 13 13 0 0 1 25 4 9 9 0 0 1-2 16H16z" />
      <path className="wi-bolt" d="M33 30l-9 14h7l-3 12 12-16h-7l4-10z" />
    </>
  ),
};

export default function WeatherIcon({ icon, size = 48, className = '' }) {
  const content = ICONS[icon] ?? ICONS.cloudy;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`weather-icon weather-icon--${icon} ${className}`}
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}
