import { buildPlan, goldenHours } from '../lib/planner.js';

const ACTIVITY_ICONS = {
  run: 'M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 20l2.5-5L9 12l1.5-4.5L14 9l3 2 3.5-1M9 12l-4 1.5M10.5 7.5L14 9',
  cycle: 'M5.5 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM18.5 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14l3.5-6h6l3.5 6M12 14l-3-6M14 5h-3',
  picnic: 'M4 10h16M6 10l-1.5 9M18 10l1.5 9M8.5 10L12 4l3.5 6M4.5 15h15',
  stargaze: 'M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3zM5 16l.8 1.8L7.5 18.5l-1.7.8L5 21l-.8-1.7-1.7-.8 1.7-.7L5 16zM18 15l.7 1.5 1.5.7-1.5.7-.7 1.6-.7-1.6-1.5-.7 1.5-.7.7-1.5z',
  laundry: 'M3 6h18M7 6V4.5h10V6M6 6l1 13.5h10L18 6M9.5 11a2.5 2.5 0 0 0 5 0',
  golden: 'M12 13a4 4 0 0 1 8 0M4 13a4 4 0 0 1 8 0M2 17h20M5 20h14',
};

function scoreTone(score) {
  if (score >= 80) return 'great';
  if (score >= 65) return 'good';
  return 'fair';
}

function IconTile({ kind }) {
  return (
    <span className={`planner-tile planner-tile--${kind}`}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d={ACTIVITY_ICONS[kind]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function PlannerPanel({ hourly48, today }) {
  const plan = buildPlan(hourly48);
  if (!plan.length) return null;
  const golden = goldenHours(today, hourly48);

  return (
    <section className="panel planner">
      <h2 className="panel-title">Best time to… · next 48 hours</h2>
      <div className="planner-grid">
        {plan.map(({ key, label, window }, i) => (
          <div key={key} className={`planner-card ${window ? '' : 'planner-card--none'}`} style={{ '--i': i }}>
            <div className="planner-card-head">
              <IconTile kind={key} />
              {window && <span className={`planner-score planner-score--${scoreTone(window.score)}`}>{window.score}</span>}
            </div>
            <span className="planner-label">{label}</span>
            {window ? (
              <>
                <span className="planner-window">
                  {window.dayOffset === 1 && <span className="planner-pill">Tomorrow</span>}
                  {window.startLabel} – {window.endLabel}
                </span>
                <span className="planner-reason">{window.reason}</span>
              </>
            ) : (
              <>
                <span className="planner-window planner-window--none">No good window</span>
                <span className="planner-reason">weather won't cooperate</span>
              </>
            )}
          </div>
        ))}
        {golden && (
          <div className="planner-card planner-card--golden" style={{ '--i': plan.length }}>
            <div className="planner-card-head">
              <IconTile kind="golden" />
            </div>
            <span className="planner-label">Golden hour</span>
            <div className="golden-rows">
              <span className="golden-row">
                <span className="golden-tag">dawn</span> {golden.morning}
              </span>
              <span className="golden-row">
                <span className="golden-tag">dusk</span> {golden.evening}
              </span>
            </div>
            {golden.quality && <span className="planner-reason">{golden.quality}</span>}
          </div>
        )}
      </div>
    </section>
  );
}
