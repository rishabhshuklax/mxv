# Ultimate Weather

A fast, elegant weather webapp: live conditions, hourly and 8-day forecasts, air quality, and instant city search — with a background theme that shifts with the sky.

## Features

- Live conditions: temperature, feels-like, wind, humidity, precipitation
- Hourly forecast strip and 8-day outlook with min/max range bars
- Air quality index with pollutant breakdown (PM2.5, PM10, ozone)
- UV index, sunrise/sunset
- City search with debounced autocomplete, plus one-tap "use my location"
- Save locations for quick switching, persisted locally
- Celsius/Fahrenheit toggle, persisted locally
- Dynamic background theme (clear, cloudy, rain, snow, fog, storm, night)
- No API key required — powered by [Open-Meteo](https://open-meteo.com/)

## Setup

```
cd weather
npm install
npm run dev
```

Then open the printed local URL in your browser.

## Testing

```
npm test
```

Runs the pure-logic test suite (weather code mapping, unit formatting, forecast normalization, and local storage helpers) with Node's built-in test runner.

## Build

```
npm run build
```
