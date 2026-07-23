import SkeletonView from './Skeletons.jsx';

export function LoadingScreen() {
  return <SkeletonView />;
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
