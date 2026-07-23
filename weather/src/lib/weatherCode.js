// WMO weather interpretation codes, as used by Open-Meteo.
// https://open-meteo.com/en/docs#weathervariables

const CODES = {
  0: { label: 'Clear sky', icon: 'clear', group: 'clear' },
  1: { label: 'Mostly clear', icon: 'clear', group: 'clear' },
  2: { label: 'Partly cloudy', icon: 'partly-cloudy', group: 'cloud' },
  3: { label: 'Overcast', icon: 'cloudy', group: 'cloud' },
  45: { label: 'Fog', icon: 'fog', group: 'fog' },
  48: { label: 'Rime fog', icon: 'fog', group: 'fog' },
  51: { label: 'Light drizzle', icon: 'drizzle', group: 'rain' },
  53: { label: 'Drizzle', icon: 'drizzle', group: 'rain' },
  55: { label: 'Dense drizzle', icon: 'drizzle', group: 'rain' },
  56: { label: 'Freezing drizzle', icon: 'drizzle', group: 'rain' },
  57: { label: 'Freezing drizzle', icon: 'drizzle', group: 'rain' },
  61: { label: 'Light rain', icon: 'rain', group: 'rain' },
  63: { label: 'Rain', icon: 'rain', group: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain', group: 'rain' },
  66: { label: 'Freezing rain', icon: 'rain', group: 'rain' },
  67: { label: 'Freezing rain', icon: 'rain', group: 'rain' },
  71: { label: 'Light snow', icon: 'snow', group: 'snow' },
  73: { label: 'Snow', icon: 'snow', group: 'snow' },
  75: { label: 'Heavy snow', icon: 'snow', group: 'snow' },
  77: { label: 'Snow grains', icon: 'snow', group: 'snow' },
  80: { label: 'Light showers', icon: 'rain', group: 'rain' },
  81: { label: 'Showers', icon: 'rain', group: 'rain' },
  82: { label: 'Violent showers', icon: 'rain', group: 'rain' },
  85: { label: 'Snow showers', icon: 'snow', group: 'snow' },
  86: { label: 'Heavy snow showers', icon: 'snow', group: 'snow' },
  95: { label: 'Thunderstorm', icon: 'thunder', group: 'storm' },
  96: { label: 'Thunderstorm with hail', icon: 'thunder', group: 'storm' },
  99: { label: 'Thunderstorm with hail', icon: 'thunder', group: 'storm' },
};

export function getWeatherInfo(code, isDay = true) {
  const entry = CODES[code] ?? { label: 'Unknown', icon: 'cloudy', group: 'cloud' };
  const icon = !isDay && entry.icon === 'clear' ? 'clear-night' : entry.icon;
  const icon2 = !isDay && entry.icon === 'partly-cloudy' ? 'partly-cloudy-night' : icon;
  return { ...entry, icon: icon2, isDay };
}

export function backgroundTheme(code, isDay = true) {
  const { group } = getWeatherInfo(code, isDay);
  if (!isDay) return 'night';
  return group;
}

// Relative particle density for the animated sky, 0 for non-precipitation codes.
const HEAVY = new Set([55, 65, 67, 75, 82, 86, 99]);
const MODERATE = new Set([53, 63, 73, 81, 95, 96]);
const LIGHT = new Set([51, 56, 57, 61, 66, 71, 77, 80, 85]);

export function precipIntensity(code) {
  if (HEAVY.has(code)) return 1;
  if (MODERATE.has(code)) return 0.7;
  if (LIGHT.has(code)) return 0.45;
  return 0;
}
