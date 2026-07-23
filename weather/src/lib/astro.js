// Lightweight astronomy helpers. Moon phase uses the mean synodic month
// anchored to a known new moon (2000-01-06 18:14 UTC) — accurate to within
// a few hours, which is plenty for a phase name and illumination readout.

const SYNODIC_MONTH = 29.530588853;
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14);

export function moonPhase(date = new Date()) {
  const days = (date.getTime() - KNOWN_NEW_MOON_UTC) / 86400000;
  const age = ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const phase = age / SYNODIC_MONTH;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;

  let name;
  if (age < 1.0 || age >= SYNODIC_MONTH - 1.0) name = 'New moon';
  else if (age < 6.38) name = 'Waxing crescent';
  else if (age < 8.38) name = 'First quarter';
  else if (age < 13.76) name = 'Waxing gibbous';
  else if (age < 15.77) name = 'Full moon';
  else if (age < 21.15) name = 'Waning gibbous';
  else if (age < 23.15) name = 'Last quarter';
  else name = 'Waning crescent';

  return { age, phase, illumination, name, waxing: phase <= 0.5 };
}

export function wallClockMinutes(isoString) {
  const match = /T(\d{2}):(\d{2})/.exec(isoString ?? '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function sunProgress(sunriseIso, sunsetIso, nowIso) {
  const rise = wallClockMinutes(sunriseIso);
  const set = wallClockMinutes(sunsetIso);
  const now = wallClockMinutes(nowIso);
  if (rise === null || set === null || now === null || set <= rise) return null;
  const daylightMinutes = set - rise;
  return {
    fraction: Math.max(0, Math.min(1, (now - rise) / daylightMinutes)),
    beforeSunrise: now < rise,
    afterSunset: now > set,
    daylightMinutes,
  };
}
