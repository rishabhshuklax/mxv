import { formatTempDelta, formatWind } from './format.js';

// City Duel: compare two normalized forecasts and produce one punchy verdict
// plus a small stat table. Pure and unit-testable.

function sumPrecip(daily) {
  return (daily ?? []).slice(0, 1).reduce((s, d) => s + (d.precipitationSum ?? 0), 0);
}

export function compareCities(a, b, unit = 'C') {
  if (!a?.forecast || !b?.forecast) return null;
  const ca = a.forecast.current;
  const cb = b.forecast.current;

  const rows = [
    { label: 'Now', a: ca.temperature, b: cb.temperature, kind: 'temp' },
    { label: 'Feels like', a: ca.feelsLike, b: cb.feelsLike, kind: 'temp' },
    { label: 'High today', a: a.forecast.today?.max ?? null, b: b.forecast.today?.max ?? null, kind: 'temp' },
    { label: 'Wind', a: ca.windSpeed, b: cb.windSpeed, kind: 'wind' },
    { label: 'Humidity', a: ca.humidity, b: cb.humidity, kind: 'pct' },
    { label: 'Cloud cover', a: ca.cloudCover, b: cb.cloudCover, kind: 'pct' },
    { label: 'Rain today', a: sumPrecip(a.forecast.daily), b: sumPrecip(b.forecast.daily), kind: 'mm' },
  ];

  // Verdict: pick the most decisive contrast, in priority order.
  const tempDelta = (ca.temperature ?? 0) - (cb.temperature ?? 0);
  const rainA = sumPrecip(a.forecast.daily);
  const rainB = sumPrecip(b.forecast.daily);
  const cloudDelta = (ca.cloudCover ?? 50) - (cb.cloudCover ?? 50);
  const windDelta = (ca.windSpeed ?? 0) - (cb.windSpeed ?? 0);

  // Verdict framing: temperature reads from the user's city (a); the other
  // contrasts lead with whichever city "wins" the superlative.
  let verdict;
  if (Math.abs(tempDelta) >= 3) {
    const delta = formatTempDelta(tempDelta, unit);
    verdict =
      tempDelta > 0
        ? `${a.name} is ${delta} hotter than ${b.name} today. Shorts win.`
        : `${a.name} is ${delta} colder than ${b.name} today. Coat territory.`;
  } else if (Math.abs(rainA - rainB) >= 3) {
    const wet = rainA > rainB ? a : b;
    const dry = rainA > rainB ? b : a;
    verdict = `${wet.name} takes the rain — ${Math.abs(rainA - rainB).toFixed(0)} mm more than ${dry.name} today.`;
  } else if (Math.abs(cloudDelta) >= 30) {
    const sunny = cloudDelta < 0 ? a : b;
    const grey = cloudDelta < 0 ? b : a;
    verdict = `${sunny.name} takes the sun — ${Math.abs(Math.round(cloudDelta))}% less cloud than ${grey.name} today.`;
  } else if (Math.abs(windDelta) >= 12) {
    const windy = windDelta > 0 ? a : b;
    const calm = windDelta > 0 ? b : a;
    verdict = `${windy.name} is ${formatWind(Math.abs(windDelta), unit)} windier than ${calm.name} today. Hold onto your hat.`;
  } else {
    verdict = `Dead heat — ${a.name} and ${b.name} are wearing the same weather today.`;
  }

  return { verdict, rows };
}
