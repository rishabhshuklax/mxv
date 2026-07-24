import { formatClockTime } from '../lib/format.js';

// 15-minute precipitation bars for the next two hours. Renders only when
// there is actually precipitation in the window — a dry nowcast is noise.
export default function NowcastCard({ nowcast }) {
  if (!nowcast || !nowcast.steps?.length || nowcast.total < 0.1) return null;
  const max = Math.max(...nowcast.steps.map((s) => s.precipitation), 0.6);
  const wetNow = nowcast.steps[0].precipitation > 0.05;
  const firstWet = nowcast.steps.find((s) => s.precipitation > 0.05);
  const dryStep = wetNow ? nowcast.steps.find((s, i) => i > 0 && s.precipitation <= 0.05) : null;

  let summary = '';
  if (wetNow && dryStep) summary = `Easing around ${formatClockTime(dryStep.time)}`;
  else if (wetNow) summary = 'Continuing through the next 2 hours';
  else if (firstWet) summary = `Starting around ${formatClockTime(firstWet.time)}`;

  return (
    <section className="panel nowcast">
      <div className="nowcast-head">
        <h2 className="panel-title">Precipitation · next 2 hours</h2>
        <span className="nowcast-summary">{summary}</span>
      </div>
      <div className="nowcast-bars">
        {nowcast.steps.map((step, i) => (
          <div key={step.time} className="nowcast-slot" title={`${formatClockTime(step.time)} · ${step.precipitation.toFixed(1)} mm`}>
            <div
              className="nowcast-bar"
              style={{
                height: `${Math.max(8, (step.precipitation / max) * 100)}%`,
                opacity: step.precipitation > 0.02 ? 1 : 0.25,
                animationDelay: `${i * 55}ms`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="nowcast-ticks">
        <span>Now</span>
        <span>+30m</span>
        <span>+1h</span>
        <span>+90m</span>
        <span>+2h</span>
      </div>
    </section>
  );
}
