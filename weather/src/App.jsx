import { useCallback, useEffect, useMemo, useState } from 'react';
import SearchBar from './components/SearchBar.jsx';
import SavedLocations from './components/SavedLocations.jsx';
import CurrentWeather from './components/CurrentWeather.jsx';
import InsightsRow from './components/InsightsRow.jsx';
import NowcastCard from './components/NowcastCard.jsx';
import HourlyPanel from './components/HourlyPanel.jsx';
import DailyForecast from './components/DailyForecast.jsx';
import ConditionsPanel from './components/ConditionsPanel.jsx';
import SunMoonPanel from './components/SunMoonPanel.jsx';
import AirQualityCard from './components/AirQualityCard.jsx';
import UnitToggle from './components/UnitToggle.jsx';
import SkyCanvas from './components/SkyCanvas.jsx';
import PlannerPanel from './components/PlannerPanel.jsx';
import ClimatePanel from './components/ClimatePanel.jsx';
import { LoadingScreen, ErrorScreen, EmptyScreen } from './components/StateScreens.jsx';
import { fetchForecast, fetchAirQuality, fetchHistoricalDaily, reverseGeocode } from './lib/api.js';
import { normalizeForecast, normalizeAirQuality } from './lib/normalize.js';
import { backgroundTheme } from './lib/weatherCode.js';
import { buildInsights } from './lib/insights.js';
import { formatTemp } from './lib/format.js';
import { buildSeries, readHistoryCache, writeHistoryCache, stripesData, calendarDayStats, HISTORY_START_YEAR } from './lib/history.js';
import { warmCardFonts, renderTodayCard, shareCanvas, slugify } from './lib/share.js';
import { formatFullDate } from './lib/format.js';
import TimeMachinePanel from './components/TimeMachinePanel.jsx';
import DuelPanel from './components/DuelPanel.jsx';
import { wallClockMinutes } from './lib/astro.js';

import {
  loadSavedLocations,
  addSavedLocation,
  removeSavedLocation,
  isSavedLocation,
  loadUnit,
  saveUnit,
  loadLastLocation,
  saveLastLocation,
} from './lib/storage.js';

const SHARE_URL_SHORT = 'ultimate-weather-mocha.vercel.app';

// Warm the whole scene when the sun is within ~40 minutes of the horizon.
function isGoldenHour(forecast) {
  const today = forecast?.today;
  const now = wallClockMinutes(forecast?.current?.time);
  if (!today?.sunrise || !today?.sunset || now === null) return false;
  const rise = wallClockMinutes(today.sunrise);
  const set = wallClockMinutes(today.sunset);
  return (now >= rise - 15 && now <= rise + 40) || (now >= set - 40 && now <= set + 15);
}

export default function App() {
  const [location, setLocation] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [status, setStatus] = useState('empty'); // empty | loading | ready | error
  const [errorMessage, setErrorMessage] = useState('');
  const [unit, setUnit] = useState('C');
  const [saved, setSaved] = useState([]);
  const [locating, setLocating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme] = useState('clear');
  const [history, setHistory] = useState({ series: null, loading: false });

  useEffect(() => {
    setUnit(loadUnit());
    setSaved(loadSavedLocations());
  }, []);

  const loadWeatherFor = useCallback(async (targetLocation, { background = false } = {}) => {
    if (background) setRefreshing(true);
    else {
      setStatus('loading');
      setErrorMessage('');
    }
    try {
      const [rawForecast, rawAirQuality] = await Promise.all([
        fetchForecast(targetLocation.latitude, targetLocation.longitude),
        fetchAirQuality(targetLocation.latitude, targetLocation.longitude).catch(() => null),
      ]);
      const normalized = normalizeForecast(rawForecast);
      setForecast(normalized);
      setAirQuality(normalizeAirQuality(rawAirQuality));
      setLocation(targetLocation);
      setTheme(backgroundTheme(normalized.current.weatherCode, normalized.current.isDay));
      setStatus('ready');
      saveLastLocation(targetLocation);
      // Deep-linkable cities: shares land on the same place. 2-decimal
      // coordinates (~1 km) — precise enough for weather, coarse enough
      // that a geolocated user's shared URL never pinpoints their home.
      try {
        const params = new URLSearchParams();
        params.set('name', targetLocation.name);
        params.set('lat', targetLocation.latitude.toFixed(2));
        params.set('lon', targetLocation.longitude.toFixed(2));
        if (targetLocation.country) params.set('country', targetLocation.country);
        window.history.replaceState(null, '', `?${params.toString()}`);
      } catch {
        // History API unavailable (sandboxed iframe) — non-essential.
      }
    } catch {
      if (!background) {
        setStatus('error');
        setErrorMessage('Could not load the forecast. Check your connection and try again.');
      }
    } finally {
      if (background) setRefreshing(false);
    }
  }, []);

  const handleUseLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const place = await reverseGeocode(latitude, longitude);
          await loadWeatherFor(place);
        } catch {
          await loadWeatherFor({
            id: `${latitude.toFixed(2)},${longitude.toFixed(2)}`,
            name: 'Current location',
            admin1: '',
            country: '',
            latitude,
            longitude,
          });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setStatus((prev) => (prev === 'ready' ? prev : 'error'));
        setErrorMessage('Location access was denied. Search for a city instead.');
      },
      { timeout: 10000 },
    );
  }, [loadWeatherFor]);

  useEffect(() => {
    // Priority: shared deep link → last viewed city → geolocation.
    const params = new URLSearchParams(window.location.search);
    const lat = Number.parseFloat(params.get('lat'));
    const lon = Number.parseFloat(params.get('lon'));
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      loadWeatherFor({
        id: `${lat.toFixed(2)},${lon.toFixed(2)}`,
        name: params.get('name')?.slice(0, 60) || 'Shared location',
        admin1: '',
        country: params.get('country')?.slice(0, 60) ?? '',
        latitude: lat,
        longitude: lon,
      });
      return;
    }
    const last = loadLastLocation();
    if (last) {
      loadWeatherFor(last);
    } else {
      handleUseLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Climate memory loads lazily after the forecast: instant when cached,
  // one ~85-year archive request per location otherwise.
  useEffect(() => {
    if (status !== 'ready' || !location) return undefined;
    const cached = readHistoryCache(location.latitude, location.longitude);
    if (cached) {
      setHistory({ series: cached, loading: false });
      return undefined;
    }
    let cancelled = false;
    setHistory({ series: null, loading: true });
    const end = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    fetchHistoricalDaily(location.latitude, location.longitude, `${HISTORY_START_YEAR}-01-01`, end)
      .then((raw) => {
        if (cancelled) return;
        const series = buildSeries(raw);
        if (series) writeHistoryCache(location.latitude, location.longitude, series);
        setHistory({ series, loading: false });
      })
      .catch(() => {
        if (!cancelled) setHistory({ series: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [status, location]);

  useEffect(() => {
    if (status === 'ready' && forecast && location) {
      document.title = `${formatTemp(forecast.current.temperature, unit)} ${location.name} · Ultimate Weather`;
    } else {
      document.title = 'Ultimate Weather';
    }
  }, [status, forecast, location, unit]);

  const insights = useMemo(() => {
    if (status !== 'ready' || !forecast) return [];
    return buildInsights({ ...forecast, airQuality, unit });
  }, [status, forecast, airQuality, unit]);

  // Pre-warm the Inter faces the share cards draw with, so the canvas can be
  // rendered synchronously inside the tap that triggers the share sheet.
  useEffect(() => {
    if (status === 'ready') warmCardFonts();
  }, [status]);

  const handleShareToday = useCallback(async () => {
    if (!forecast || !location) return;
    const stripes = history.series ? stripesData(history.series) : null;
    const monthDay = forecast.current.time.slice(5, 10);
    const dayLabel = formatFullDate(forecast.current.time).split(', ')[1] ?? '';
    const stats = history.series ? calendarDayStats(history.series, monthDay, forecast.today?.max ?? null) : null;
    let percentileLine = null;
    if (stats?.percentile != null) {
      percentileLine =
        stats.percentile >= 50
          ? `Hotter than ${stats.percentile}% of ${dayLabel}s since ${HISTORY_START_YEAR}`
          : `Colder than ${100 - stats.percentile}% of ${dayLabel}s since ${HISTORY_START_YEAR}`;
    }
    const canvas = renderTodayCard({
      dateLine: formatFullDate(forecast.current.time).replace(', ', ' · '),
      temp: formatTemp(forecast.current.temperature, unit),
      condition: forecast.current.info.label,
      city: [location.name, location.country].filter(Boolean).join(', '),
      percentileLine,
      anomalies: stripes?.anomalies,
      maxAbs: stripes?.maxAbs,
      themeKey: theme,
      shareUrl: SHARE_URL_SHORT,
    });
    await shareCanvas(
      canvas,
      `weather-${slugify(location.name)}.png`,
      percentileLine ? `${location.name}, ${formatTemp(forecast.current.temperature, unit)} — ${percentileLine.toLowerCase()} · https://${SHARE_URL_SHORT}` : `${location.name} right now · https://${SHARE_URL_SHORT}`,
    );
  }, [forecast, location, history.series, theme, unit]);

  function handleUnitChange(next) {
    setUnit(next);
    saveUnit(next);
  }

  function handleToggleSave() {
    if (!location) return;
    if (isSavedLocation(location.id)) {
      setSaved(removeSavedLocation(location.id));
    } else {
      setSaved(addSavedLocation(location));
    }
  }

  function handleRemoveSaved(id) {
    setSaved(removeSavedLocation(id));
  }

  const isSaved = location ? saved.some((item) => item.id === location.id) : false;
  const ready = status === 'ready' && forecast && location;
  const golden = ready && (theme === 'clear' || theme === 'cloud') && isGoldenHour(forecast);

  return (
    <div className={`app theme-${status === 'ready' ? theme : 'clear'} ${golden ? 'golden-hour' : ''}`}>
      {ready && (
        <SkyCanvas
          group={theme}
          isDay={forecast.current.isDay}
          weatherCode={forecast.current.weatherCode}
          windSpeed={forecast.current.windSpeed}
        />
      )}
      <div className="app-glow" aria-hidden="true" />
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">☼</span>
          <span className="brand-name">Ultimate Weather</span>
        </div>
        <UnitToggle unit={unit} onChange={handleUnitChange} />
      </header>

      <div className="app-controls">
        <SearchBar onSelect={loadWeatherFor} onUseLocation={handleUseLocation} locating={locating} />
      </div>

      <SavedLocations
        locations={saved}
        activeId={location?.id}
        onSelect={loadWeatherFor}
        onRemove={handleRemoveSaved}
      />

      <main className="app-main" aria-busy={status === 'loading'}>
        {status === 'loading' && <LoadingScreen />}
        {status === 'error' && (
          <ErrorScreen
            message={errorMessage}
            onRetry={location ? () => loadWeatherFor(location) : handleUseLocation}
          />
        )}
        {status === 'empty' && <EmptyScreen />}
        {ready && (
          <>
            <div className="reveal" style={{ '--i': 0 }}>
              <CurrentWeather
                location={location}
                forecast={forecast}
                unit={unit}
                isSaved={isSaved}
                onToggleSave={handleToggleSave}
                onRefresh={() => loadWeatherFor(location, { background: true })}
                refreshing={refreshing}
                onShareToday={handleShareToday}
              />
            </div>
            <div className="reveal" style={{ '--i': 1 }}>
              <InsightsRow insights={insights} />
            </div>
            <div className="reveal" style={{ '--i': 2 }}>
              <NowcastCard nowcast={forecast.nowcast} />
            </div>
            <div className="reveal" style={{ '--i': 3 }}>
              <HourlyPanel hourly={forecast.hourly} unit={unit} />
            </div>
            <div className="reveal" style={{ '--i': 4 }}>
              <PlannerPanel hourly48={forecast.hourly48 ?? forecast.hourly} today={forecast.today} />
            </div>
            <div className="panel-grid reveal" style={{ '--i': 5 }}>
              <DailyForecast daily={forecast.daily} unit={unit} />
              <div className="panel-stack">
                <ConditionsPanel forecast={forecast} unit={unit} />
                <SunMoonPanel today={forecast.today} currentTime={forecast.current.time} />
                <AirQualityCard airQuality={airQuality} />
              </div>
            </div>
            <div className="reveal" style={{ '--i': 6 }}>
              <ClimatePanel
                series={history.series}
                loading={history.loading}
                today={forecast.today}
                currentTime={forecast.current.time}
                unit={unit}
                cityName={location.name}
                themeKey={theme}
              />
            </div>
            <div className="reveal" style={{ '--i': 7 }}>
              <TimeMachinePanel series={history.series} cityName={location.name} unit={unit} />
            </div>
            <div className="reveal" style={{ '--i': 8 }}>
              <DuelPanel location={location} forecast={forecast} unit={unit} />
            </div>
          </>
        )}
      </main>

      <footer className="app-footer">
        <span>Data from Open-Meteo · Ultimate Weather</span>
      </footer>
    </div>
  );
}
