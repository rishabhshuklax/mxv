# Ultimate Weather

A weather webapp built to feel alive — and the only one with a **memory** and **judgment**. Past: 85 years of local climate records. Present: an animated sky matching the conditions outside. Future: it doesn't just show the forecast, it tells you the best time to use it.

## What makes it unique

**Climate memory (since 1940)** — powered by Open-Meteo's historical archive, computed live for the exact location:
- Warming stripes (Ed Hawkins-style) rendered from every year's mean temperature *here*
- "Is today normal?" — today's high vs. the local normal, with a percentile ("6° hotter than a normal July 24 here — hotter than 97% of them since 1940")
- All-time record high/low for today's calendar date, with the year it happened
- "This day in 1950 / 1975 / 2000 / 2015" — actual conditions on this date in past decades
- The ~85-year daily series is fetched once per location, cached on-device for 30 days

**Best time to… (next 48 h)** — an activity planner that scores every forecast hour and recommends a concrete window with a reason:
- Running, cycling, picnic, stargazing (cloud-cover aware), line-dry laundry
- Honest "No good window" when the weather won't cooperate
- Golden-hour times for photographers, with a light-quality hint from sunset cloud cover

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
