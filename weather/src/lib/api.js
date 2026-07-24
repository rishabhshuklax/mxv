const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const REVERSE_GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

export async function searchLocations(query) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(trimmed)}&count=8&language=en&format=json`;
  const data = await getJson(url);
  return (data.results ?? []).map((result) => ({
    id: `${result.id}`,
    name: result.name,
    admin1: result.admin1 ?? '',
    country: result.country ?? '',
    countryCode: result.country_code ?? '',
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
  }));
}

export async function reverseGeocode(latitude, longitude) {
  const url = `${REVERSE_GEOCODE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
  const data = await getJson(url);
  const name = data.city || data.locality || data.principalSubdivision || 'Current location';
  return {
    id: `${latitude.toFixed(2)},${longitude.toFixed(2)}`,
    name,
    admin1: data.principalSubdivision ?? '',
    country: data.countryName ?? '',
    countryCode: data.countryCode ?? '',
    latitude,
    longitude,
  };
}

const FORECAST_PARAMS = [
  'temperature_2m',
  'apparent_temperature',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'relative_humidity_2m',
  'is_day',
  'precipitation',
  'cloud_cover',
  'pressure_msl',
].join(',');

const HOURLY_PARAMS = [
  'temperature_2m',
  'apparent_temperature',
  'weather_code',
  'precipitation_probability',
  'is_day',
  'wind_speed_10m',
  'relative_humidity_2m',
  'cloud_cover',
  'visibility',
  'dew_point_2m',
  'pressure_msl',
].join(',');

const DAILY_PARAMS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'apparent_temperature_max',
  'apparent_temperature_min',
  'sunrise',
  'sunset',
  'precipitation_probability_max',
  'precipitation_sum',
  'uv_index_max',
  'wind_speed_10m_max',
].join(',');

export async function fetchForecast(latitude, longitude) {
  const url =
    `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current=${FORECAST_PARAMS}&hourly=${HOURLY_PARAMS}&daily=${DAILY_PARAMS}` +
    `&minutely_15=precipitation&timezone=auto&forecast_days=8&past_days=1`;
  return getJson(url);
}

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

// Daily record back to 1940 for this location. Roughly 31k days x 3 series;
// gzips well and is cached on-device by the history module.
export async function fetchHistoricalDaily(latitude, longitude, startDate, endDate) {
  const url =
    `${ARCHIVE_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  return getJson(url);
}

export async function fetchAirQuality(latitude, longitude) {
  const url = `${AIR_QUALITY_URL}?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm2_5,pm10,ozone&timezone=auto`;
  return getJson(url);
}
