import { formatHour, formatClockTime } from './format.js';
import { wallClockMinutes } from './astro.js';

// Activity planner: score each forecast hour 0–100 per activity, then find
// the best contiguous window in the next 48 hours. Pure and unit-testable.

function clampScore(x) {
  return Math.max(0, Math.min(100, Math.round(x)));
}

// Penalty helper: 0 inside [lo, hi], growing by `rate` per unit outside.
function outside(value, lo, hi, rate) {
  if (value == null) return 0;
  if (value < lo) return (lo - value) * rate;
  if (value > hi) return (value - hi) * rate;
  return 0;
}

export const ACTIVITIES = [
  {
    key: 'run',
    label: 'Running',
    spanHours: 2,
    score(h) {
      if ((h.precipitationProbability ?? 0) >= 60) return 0;
      let s = 100;
      s -= outside(h.feelsLike ?? h.temperature, 6, 18, 5);
      s -= (h.precipitationProbability ?? 0) * 0.6;
      s -= Math.max(0, (h.windSpeed ?? 0) - 20) * 1.5;
      if (h.isDay === false) s -= 20;
      return clampScore(s);
    },
  },
  {
    key: 'cycle',
    label: 'Cycling',
    spanHours: 2,
    score(h) {
      if ((h.precipitationProbability ?? 0) >= 50) return 0;
      let s = 100;
      s -= outside(h.feelsLike ?? h.temperature, 10, 24, 4);
      s -= (h.precipitationProbability ?? 0) * 0.8;
      s -= Math.max(0, (h.windSpeed ?? 0) - 15) * 2.2;
      if (h.isDay === false) s -= 30;
      return clampScore(s);
    },
  },
  {
    key: 'picnic',
    label: 'Picnic',
    spanHours: 3,
    score(h) {
      if (h.isDay === false) return 0;
      if ((h.precipitationProbability ?? 0) >= 40) return 0;
      let s = 100;
      s -= outside(h.temperature, 17, 28, 6);
      s -= (h.precipitationProbability ?? 0) * 1.2;
      s -= Math.max(0, (h.windSpeed ?? 0) - 18) * 2;
      s -= Math.max(0, (h.cloudCover ?? 50) - 75) * 0.6;
      return clampScore(s);
    },
  },
  {
    key: 'stargaze',
    label: 'Stargazing',
    spanHours: 2,
    score(h) {
      if (h.isDay !== false) return 0;
      if ((h.precipitationProbability ?? 0) >= 30) return 0;
      let s = 100;
      s -= (h.cloudCover ?? 100) * 1.0;
      s -= (h.precipitationProbability ?? 0) * 0.5;
      s -= Math.max(0, (h.windSpeed ?? 0) - 25) * 1.2;
      return clampScore(s);
    },
  },
  {
    key: 'laundry',
    label: 'Laundry',
    spanHours: 4,
    score(h) {
      if (h.isDay === false) return 0;
      if ((h.precipitationProbability ?? 0) >= 25) return 0;
      let s = 90;
      s -= Math.max(0, (h.humidity ?? 60) - 55) * 1.6;
      s += Math.min(15, (h.windSpeed ?? 0) * 0.8);
      s -= (h.precipitationProbability ?? 0) * 1.5;
      return clampScore(s);
    },
  },
];

function windowReason(key, hours) {
  const avg = (sel) => hours.reduce((s, h) => s + (sel(h) ?? 0), 0) / hours.length;
  const temp = Math.round(avg((h) => h.feelsLike ?? h.temperature));
  const wind = Math.round(avg((h) => h.windSpeed));
  const cloud = Math.round(avg((h) => h.cloudCover ?? 0));
  const humidity = Math.round(avg((h) => h.humidity ?? 0));
  switch (key) {
    case 'stargaze':
      return `${cloud}% cloud, dry`;
    case 'laundry':
      return `${humidity}% humidity, ${wind} km/h breeze`;
    default:
      return `feels ${temp}°, ${wind} km/h wind`;
  }
}

// Slide a fixed-length window (the activity's natural duration) across the
// next 48 hours and keep the highest-average slot. A concrete "6 – 8 AM"
// beats an 11-hour smear. Ties go to the earliest slot; returns null when no
// slot clears the threshold — an honest "not today".
export function bestWindow(hourly, activity, { threshold = 55 } = {}) {
  const span = activity.spanHours;
  if (hourly.length < span) return null;
  const scores = hourly.map((h) => activity.score(h));
  let best = null;
  for (let start = 0; start + span <= scores.length; start += 1) {
    const slice = scores.slice(start, start + span);
    if (slice.some((s) => s === 0)) continue;
    const avg = slice.reduce((s, x) => s + x, 0) / span;
    if (avg < threshold) continue;
    if (!best || avg > best.avg + 2) best = { startIdx: start, avg };
  }
  if (!best) return null;
  const endIdx = best.startIdx + span - 1;
  const hours = hourly.slice(best.startIdx, endIdx + 1);
  return {
    key: activity.key,
    label: activity.label,
    start: hourly[best.startIdx].time,
    end: hourly[endIdx].time,
    startLabel: formatHour(hourly[best.startIdx].time),
    endLabel: formatHour(hourly[Math.min(endIdx + 1, hourly.length - 1)].time),
    dayOffset: hourly[best.startIdx].time.slice(0, 10) === hourly[0].time.slice(0, 10) ? 0 : 1,
    score: Math.round(best.avg),
    reason: windowReason(activity.key, hours),
  };
}

export function buildPlan(hourly48) {
  if (!hourly48?.length) return [];
  return ACTIVITIES.map((activity) => ({
    key: activity.key,
    label: activity.label,
    window: bestWindow(hourly48, activity),
  }));
}

// Golden hour: the hour after sunrise and before sunset, with a quality hint
// from cloud cover around sunset (some cloud makes for dramatic light).
export function goldenHours(today, hourly) {
  if (!today?.sunrise || !today?.sunset) return null;
  const sunsetMin = wallClockMinutes(today.sunset);
  const sunsetHourIso = `${today.sunset.slice(0, 11)}${String(Math.floor(sunsetMin / 60)).padStart(2, '0')}:00`;
  const sunsetHour = hourly?.find((h) => h.time === sunsetHourIso);
  const cloud = sunsetHour?.cloudCover ?? null;
  let quality = null;
  if (cloud != null) {
    if (cloud >= 25 && cloud <= 70) quality = 'dramatic light likely';
    else if (cloud < 25) quality = 'clean, clear light';
    else quality = 'likely muted by cloud';
  }
  const label = (minutes) => {
    const m = ((minutes % 1440) + 1440) % 1440;
    const h24 = Math.floor(m / 60);
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
  };
  const riseMin = wallClockMinutes(today.sunrise);
  return {
    morning: `${formatClockTime(today.sunrise)} – ${label(riseMin + 60)}`,
    evening: `${label(sunsetMin - 60)} – ${formatClockTime(today.sunset)}`,
    quality,
  };
}
