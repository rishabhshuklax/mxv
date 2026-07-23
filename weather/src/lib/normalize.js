import { getWeatherInfo } from './weatherCode.js';

export function normalizeForecast(raw) {
  const timezone = raw.timezone;
  const current = {
    temperature: raw.current.temperature_2m,
    feelsLike: raw.current.apparent_temperature,
    weatherCode: raw.current.weather_code,
    windSpeed: raw.current.wind_speed_10m,
    windDirection: raw.current.wind_direction_10m,
    humidity: raw.current.relative_humidity_2m,
    precipitation: raw.current.precipitation,
    isDay: raw.current.is_day === 1,
    time: raw.current.time,
  };

  const nowMs = new Date(current.time).getTime();
  const hourly = raw.hourly.time
    .map((time, index) => ({
      time,
      temperature: raw.hourly.temperature_2m[index],
      weatherCode: raw.hourly.weather_code[index],
      precipitationProbability: raw.hourly.precipitation_probability[index],
      isDay: raw.hourly.is_day[index] === 1,
    }))
    .filter((hour) => new Date(hour.time).getTime() >= nowMs)
    .slice(0, 24);

  const daily = raw.daily.time.map((date, index) => ({
    date,
    weatherCode: raw.daily.weather_code[index],
    max: raw.daily.temperature_2m_max[index],
    min: raw.daily.temperature_2m_min[index],
    sunrise: raw.daily.sunrise[index],
    sunset: raw.daily.sunset[index],
    precipitationProbability: raw.daily.precipitation_probability_max[index],
    uvIndex: raw.daily.uv_index_max[index],
  }));

  return {
    timezone,
    current: { ...current, info: getWeatherInfo(current.weatherCode, current.isDay) },
    hourly,
    daily,
    today: daily[0] ?? null,
  };
}

export function normalizeAirQuality(raw) {
  if (!raw?.current) return null;
  return {
    aqi: raw.current.us_aqi ?? null,
    pm2_5: raw.current.pm2_5 ?? null,
    pm10: raw.current.pm10 ?? null,
    ozone: raw.current.ozone ?? null,
  };
}
