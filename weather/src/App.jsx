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
import { LoadingScreen, ErrorScreen, EmptyScreen } from './components/StateScreens.jsx';
import { fetchForecast, fetchAirQuality, reverseGeocode } from './lib/api.js';
import { normalizeForecast, normalizeAirQuality } from './lib/normalize.js';
import { backgroundTheme } from './lib/weatherCode.js';
import { buildInsights } from './lib/insights.js';
import { formatTemp } from './lib/format.js';
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
    const last = loadLastLocation();
    if (last) {
      loadWeatherFor(last);
    } else {
      handleUseLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className={`app theme-${status === 'ready' ? theme : 'clear'}`}>
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
            <div className="panel-grid reveal" style={{ '--i': 4 }}>
              <DailyForecast daily={forecast.daily} unit={unit} />
              <div className="panel-stack">
                <ConditionsPanel forecast={forecast} unit={unit} />
                <SunMoonPanel today={forecast.today} currentTime={forecast.current.time} />
                <AirQualityCard airQuality={airQuality} />
              </div>
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
