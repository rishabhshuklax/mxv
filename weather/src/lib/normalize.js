import { getWeatherInfo } from './weatherCode.js';

function floorToHour(iso) {
  return `${iso.slice(0, 13)}:00`;
}

function floorToQuarter(iso) {
  const minutes = Number(iso.slice(14, 16));
  const quarter = String(Math.floor(minutes / 15) * 15).padStart(2, '0');
  return `${iso.slice(0, 14)}${quarter}`;
}

// The forecast is requested with past_days=1, so daily/hourly arrays begin
// yesterday. Everything here anchors on the current wall-clock time string —
// ISO wall-clock strings compare correctly as plain strings.
export function normalizeForecast(raw) {
  const c = raw.current;
  const current = {
    temperature: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    weatherCode: c.weather_code,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    windGusts: c.wind_gusts_10m ?? null,
    humidity: c.relative_humidity_2m,
    precipitation: c.precipitation,
    cloudCover: c.cloud_cover ?? null,
    pressure: c.pressure_msl ?? null,
    isDay: c.is_day === 1,
    time: c.time,
  };

  const currentDate = c.time.slice(0, 10);
  const hourFloor = floorToHour(c.time);

  const hourlyTimes = raw.hourly?.time ?? [];
  const hourlyAll = hourlyTimes.map((time, i) => ({
    time,
    temperature: raw.hourly.temperature_2m?.[i] ?? null,
    feelsLike: raw.hourly.apparent_temperature?.[i] ?? null,
    weatherCode: raw.hourly.weather_code?.[i] ?? null,
    precipitationProbability: raw.hourly.precipitation_probability?.[i] ?? null,
    isDay: raw.hourly.is_day?.[i] === 1,
    windSpeed: raw.hourly.wind_speed_10m?.[i] ?? null,
    humidity: raw.hourly.relative_humidity_2m?.[i] ?? null,
    cloudCover: raw.hourly.cloud_cover?.[i] ?? null,
    visibility: raw.hourly.visibility?.[i] ?? null,
    dewPoint: raw.hourly.dew_point_2m?.[i] ?? null,
    pressure: raw.hourly.pressure_msl?.[i] ?? null,
  }));

  const nowIdx = hourlyTimes.indexOf(hourFloor);
  const upcoming = hourlyAll.filter((hour) => hour.time >= hourFloor);
  const hourly = upcoming.slice(0, 24);
  const hourly48 = upcoming.slice(0, 48);
  const nowHour = nowIdx >= 0 ? hourlyAll[nowIdx] : hourly[0] ?? null;

  let pressureTrend = null;
  if (nowIdx >= 3) {
    const nowPressure = hourlyAll[nowIdx].pressure;
    const pastPressure = hourlyAll[nowIdx - 3].pressure;
    if (nowPressure != null && pastPressure != null) {
      const delta = nowPressure - pastPressure;
      pressureTrend = delta > 1.2 ? 'rising' : delta < -1.2 ? 'falling' : 'steady';
    }
  }

  const dailyTimes = raw.daily?.time ?? [];
  const dailyAll = dailyTimes.map((date, i) => ({
    date,
    weatherCode: raw.daily.weather_code?.[i] ?? null,
    max: raw.daily.temperature_2m_max?.[i] ?? null,
    min: raw.daily.temperature_2m_min?.[i] ?? null,
    feelsMax: raw.daily.apparent_temperature_max?.[i] ?? null,
    feelsMin: raw.daily.apparent_temperature_min?.[i] ?? null,
    sunrise: raw.daily.sunrise?.[i] ?? null,
    sunset: raw.daily.sunset?.[i] ?? null,
    precipitationProbability: raw.daily.precipitation_probability_max?.[i] ?? null,
    precipitationSum: raw.daily.precipitation_sum?.[i] ?? null,
    uvIndex: raw.daily.uv_index_max?.[i] ?? null,
    windMax: raw.daily.wind_speed_10m_max?.[i] ?? null,
  }));

  let todayIdx = dailyAll.findIndex((day) => day.date === currentDate);
  if (todayIdx < 0) todayIdx = 0;
  const yesterday = todayIdx > 0 ? dailyAll[todayIdx - 1] : null;
  const daily = dailyAll.slice(todayIdx, todayIdx + 8);

  let nowcast = null;
  const minutelyTimes = raw.minutely_15?.time;
  if (minutelyTimes?.length) {
    const quarterFloor = floorToQuarter(c.time);
    const steps = [];
    for (let i = 0; i < minutelyTimes.length && steps.length < 8; i += 1) {
      if (minutelyTimes[i] >= quarterFloor) {
        steps.push({ time: minutelyTimes[i], precipitation: raw.minutely_15.precipitation?.[i] ?? 0 });
      }
    }
    if (steps.length) {
      nowcast = { steps, total: steps.reduce((sum, step) => sum + (step.precipitation || 0), 0) };
    }
  }

  return {
    timezone: raw.timezone,
    current: {
      ...current,
      info: getWeatherInfo(current.weatherCode, current.isDay),
      visibility: nowHour?.visibility ?? null,
      dewPoint: nowHour?.dewPoint ?? null,
      pressure: current.pressure ?? nowHour?.pressure ?? null,
      pressureTrend,
    },
    hourly,
    hourly48,
    daily,
    today: daily[0] ?? null,
    yesterday,
    nowcast,
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
