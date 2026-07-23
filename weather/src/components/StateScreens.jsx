export function LoadingScreen() {
  return (
    <div className="state-screen">
      <span className="spinner spinner--lg" aria-hidden="true" />
      <p>Fetching the forecast…</p>
    </div>
  );
}

export function ErrorScreen({ message, onRetry }) {
  return (
    <div className="state-screen">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="retry-btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyScreen() {
  return (
    <div className="state-screen">
      <p>Search for a city or use your current location to get started.</p>
    </div>
  );
}
