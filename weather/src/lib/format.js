export function celsiusToFahrenheit(c) {
  return (c * 9) / 5 + 32;
}

export function formatTemp(celsius, unit = 'C') {
  if (celsius === null || celsius === undefined || Number.isNaN(celsius)) return '--°';
  const value = unit === 'F' ? celsiusToFahrenheit(celsius) : celsius;
  return `${Math.round(value)}°`;
}

export function kmhToMph(kmh) {
  return kmh * 0.621371;
}

export function formatWind(kmh, unit = 'C') {
  if (kmh === null || kmh === undefined || Number.isNaN(kmh)) return '--';
  const value = unit === 'F' ? kmhToMph(kmh) : kmh;
  const label = unit === 'F' ? 'mph' : 'km/h';
  return `${Math.round(value)} ${label}`;
}

export function formatPrecip(mm) {
  if (mm === null || mm === undefined || Number.isNaN(mm)) return '--';
  return `${mm.toFixed(1)} mm`;
}

const WIND_DIRECTIONS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function windDirectionLabel(degrees) {
  if (degrees === null || degrees === undefined || Number.isNaN(degrees)) return '';
  const index = Math.round(degrees / 22.5) % 16;
  return WIND_DIRECTIONS[index];
}

// Open-Meteo returns timestamps as the location's own local wall-clock time
// with no UTC offset (e.g. "2026-07-24T04:47" for a Tokyo sunrise). Parsing
// that directly with `new Date(...)` ties it to the *browser's* local
// timezone, and formatting it again with an explicit `timeZone` shifts it a
// second time. Anchoring the parsed components to UTC and always formatting
// with `timeZone: 'UTC'` displays the wall-clock value untouched.
function parseLocalWallClock(isoString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(isoString);
  if (!match) return new Date(isoString);
  const [, year, month, day, hour = '0', minute = '0'] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
}

export function formatHour(isoString) {
  const date = parseLocalWallClock(isoString);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', timeZone: 'UTC' }).format(date);
}

export function formatDayLabel(isoDateString, index) {
  if (index === 0) return 'Today';
  const date = parseLocalWallClock(isoDateString);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(date);
}

export function formatFullDate(isoDateString) {
  const date = parseLocalWallClock(isoDateString);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatClockTime(isoString) {
  const date = parseLocalWallClock(isoString);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(date);
}

// Temperature *differences* scale by 9/5 only — no +32 offset.
export function formatTempDelta(deltaCelsius, unit = 'C') {
  if (deltaCelsius === null || deltaCelsius === undefined || Number.isNaN(deltaCelsius)) return '--°';
  const value = unit === 'F' ? (deltaCelsius * 9) / 5 : deltaCelsius;
  return `${Math.round(Math.abs(value))}°`;
}

export function formatPressure(hpa, unit = 'C') {
  if (hpa === null || hpa === undefined || Number.isNaN(hpa)) return '--';
  if (unit === 'F') return `${(hpa * 0.02953).toFixed(2)} inHg`;
  return `${Math.round(hpa)} hPa`;
}

export function formatVisibility(meters, unit = 'C') {
  if (meters === null || meters === undefined || Number.isNaN(meters)) return '--';
  if (unit === 'F') {
    const miles = meters / 1609.34;
    if (miles >= 10) return '10+ mi';
    return `${miles < 2 ? miles.toFixed(1) : Math.round(miles)} mi`;
  }
  const km = meters / 1000;
  if (km >= 10) return '10+ km';
  if (km >= 1) return `${km < 2 ? km.toFixed(1) : Math.round(km)} km`;
  return `${Math.round(meters / 100) * 100} m`;
}

export function formatDaylight(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '--';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function pressureTrendInfo(trend) {
  if (trend === 'rising') return { label: 'Rising', arrow: '↑' };
  if (trend === 'falling') return { label: 'Falling', arrow: '↓' };
  if (trend === 'steady') return { label: 'Steady', arrow: '→' };
  return { label: '', arrow: '' };
}

export function aqiLevel(aqi) {
  if (aqi === null || aqi === undefined || Number.isNaN(aqi)) return { label: 'Unknown', tone: 'unknown' };
  if (aqi <= 50) return { label: 'Good', tone: 'good' };
  if (aqi <= 100) return { label: 'Moderate', tone: 'moderate' };
  if (aqi <= 150) return { label: 'Unhealthy for sensitive groups', tone: 'sensitive' };
  if (aqi <= 200) return { label: 'Unhealthy', tone: 'unhealthy' };
  if (aqi <= 300) return { label: 'Very unhealthy', tone: 'very-unhealthy' };
  return { label: 'Hazardous', tone: 'hazardous' };
}

export function uvLevel(uv) {
  if (uv === null || uv === undefined || Number.isNaN(uv)) return { label: 'Unknown', tone: 'unknown' };
  if (uv < 3) return { label: 'Low', tone: 'good' };
  if (uv < 6) return { label: 'Moderate', tone: 'moderate' };
  if (uv < 8) return { label: 'High', tone: 'sensitive' };
  if (uv < 11) return { label: 'Very high', tone: 'unhealthy' };
  return { label: 'Extreme', tone: 'hazardous' };
}
