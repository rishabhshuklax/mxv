export default function UnitToggle({ unit, onChange }) {
  return (
    <div className="unit-toggle" role="group" aria-label="Temperature unit">
      <button
        type="button"
        className={unit === 'C' ? 'active' : ''}
        onClick={() => onChange('C')}
        aria-pressed={unit === 'C'}
      >
        °C
      </button>
      <button
        type="button"
        className={unit === 'F' ? 'active' : ''}
        onClick={() => onChange('F')}
        aria-pressed={unit === 'F'}
      >
        °F
      </button>
    </div>
  );
}
