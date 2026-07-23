import { formatTemp, formatTempDelta, formatWind, formatHour, formatClockTime, aqiLevel } from './format.js';

// Dark Sky-style plain-language summaries, computed locally from the
// forecast. Returns at most four insights, highest signal first.
export function buildInsights({ current, hourly = [], daily = [], today, yesterday, nowcast, airQuality, unit = 'C' }) {
  const list = [];
  const next12 = hourly.slice(0, 12);

  // Precipitation: prefer the 15-minute nowcast, fall back to hourly odds.
  if (nowcast && nowcast.total > 0.1 && nowcast.steps?.length) {
    const wetNow = nowcast.steps[0].precipitation > 0.05;
    if (wetNow) {
      const dryStep = nowcast.steps.find((s, i) => i > 0 && s.precipitation <= 0.05);
      list.push({
        kind: 'rain',
        text: dryStep
          ? `Precipitation easing around ${formatClockTime(dryStep.time)}`
          : 'Precipitation continuing for the next 2 hours',
      });
    } else {
      const firstWet = nowcast.steps.find((s) => s.precipitation > 0.05);
      if (firstWet) list.push({ kind: 'rain', text: `Precipitation starting around ${formatClockTime(firstWet.time)}` });
    }
  }
  if (!list.some((i) => i.kind === 'rain')) {
    const rainHour = next12.find((h) => (h.precipitationProbability ?? 0) >= 55);
    if (rainHour) {
      list.push({ kind: 'rain', text: `${rainHour.precipitationProbability}% chance of rain around ${formatHour(rainHour.time)}` });
    }
  }

  if (current && current.feelsLike != null && Math.abs(current.feelsLike - current.temperature) >= 3) {
    const warmer = current.feelsLike > current.temperature;
    list.push({
      kind: 'feels',
      text: `Feels like ${formatTemp(current.feelsLike, unit)} — ${warmer ? 'humidity makes it feel warmer' : 'wind makes it feel cooler'}`,
    });
  }

  if (today && yesterday && today.max != null && yesterday.max != null) {
    const diff = today.max - yesterday.max;
    if (Math.abs(diff) >= 3) {
      list.push({ kind: 'trend', text: `${formatTempDelta(diff, unit)} ${diff > 0 ? 'warmer' : 'cooler'} than yesterday` });
    }
  }

  const tomorrow = daily[1];
  if (today && tomorrow && tomorrow.max != null && today.max != null) {
    const diff = tomorrow.max - today.max;
    if (Math.abs(diff) >= 5) {
      list.push({ kind: 'trend', text: `Tomorrow: ${formatTempDelta(diff, unit)} ${diff > 0 ? 'warmer' : 'cooler'} than today` });
    }
  }

  if (today?.uvIndex >= 8) list.push({ kind: 'uv', text: 'Very high UV — midday sun protection essential' });
  else if (today?.uvIndex >= 6) list.push({ kind: 'uv', text: 'High UV around midday' });

  const maxWind = Math.max(0, ...next12.map((h) => h.windSpeed ?? 0));
  if (maxWind >= 45) list.push({ kind: 'wind', text: `Windy — gusts near ${formatWind(maxWind, unit)}` });
  else if (maxWind >= 30) list.push({ kind: 'wind', text: `Breezy later — winds up to ${formatWind(maxWind, unit)}` });

  if (airQuality?.aqi > 100) {
    list.push({ kind: 'aqi', text: `Air quality is ${aqiLevel(airQuality.aqi).label.toLowerCase()} — AQI ${Math.round(airQuality.aqi)}` });
  }

  if (!list.some((i) => i.kind === 'rain') && next12.length && next12.every((h) => (h.precipitationProbability ?? 0) < 30)) {
    list.push({ kind: 'dry', text: 'No precipitation expected in the next 12 hours' });
  }

  return list.slice(0, 4);
}
