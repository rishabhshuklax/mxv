export default function SavedLocations({ locations, activeId, onSelect, onRemove }) {
  if (!locations?.length) return null;
  return (
    <div className="saved-row">
      {locations.map((location) => (
        <button
          type="button"
          key={location.id}
          className={`saved-chip ${location.id === activeId ? 'saved-chip--active' : ''}`}
          onClick={() => onSelect(location)}
        >
          {location.name}
          <span
            className="saved-chip-remove"
            role="button"
            tabIndex={-1}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(location.id);
            }}
            aria-label={`Remove ${location.name}`}
          >
            ×
          </span>
        </button>
      ))}
    </div>
  );
}
