# Ultimate Weather

A weather webapp built to feel alive: an animated sky that matches the conditions outside, minute-by-minute precipitation, plain-language insights, an hourly temperature curve, and a full sun & moon almanac — all with no API key.

## Features

**Living sky** — a full-viewport canvas animation driven by current conditions: rain streaks angled by wind speed, drifting snow, twinkling stars after sunset, rolling clouds, fog banks, and lightning flashes during storms. Respects `prefers-reduced-motion` and pauses when the tab is hidden.

**Insights** — Dark Sky-style plain-language summaries computed locally: "Precipitation starting around 3:15 PM", "6° warmer than yesterday", "Very high UV — midday sun protection essential", "No precipitation expected in the next 12 hours".

**Nowcast** — 15-minute precipitation bars for the next two hours (shown only when rain is actually coming).

**Hourly curve** — a 24-hour temperature spline with per-hour labels, precipitation-probability bars, and condition icons, scrollable like the best native apps.

**8-day outlook** — min/max range bars on a shared scale; every row expands to feels-like range, rain total, max wind, UV, sunrise and sunset.

**Conditions** — animated wind compass with gusts, humidity with dew point, pressure with 3-hour trend arrow, visibility, cloud cover, UV with severity color.

**Sun & moon** — sun-path arc with live position, sunrise/sunset/daylight duration, and a parametric moon-phase icon with name and illumination.

**Air quality** — US AQI with a marker on the full severity gradient, plus PM2.5 / PM10 / ozone.

**Usability** — city search with debounced autocomplete and full keyboard navigation (arrows / Enter / Escape), one-tap geolocation, saved locations, °C/°F toggle (converts wind, pressure, visibility and dew point too), animated number transitions, skeleton loading states, live document title, yesterday-aware comparisons.

Data: [Open-Meteo](https://open-meteo.com/) forecast, geocoding, and air-quality APIs — no key required.

## Setup

```
cd weather
npm install
npm run dev
```

## Testing

```
npm test
```

Covers the pure logic: weather-code mapping, unit formatting, forecast normalization (including past-day anchoring and the 15-minute nowcast), moon phase and sun-path math, and the insights engine.

## Build

```
npm run build
```
