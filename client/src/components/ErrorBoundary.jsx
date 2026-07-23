import { Component } from 'react';
import { Link } from 'react-router-dom';

// Catches render-time exceptions in whatever it wraps (a bad API payload
// shape, a canvas failure, etc.) so one broken page shows a recoverable
// screen instead of taking the whole app to a blank white page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('MXV crashed while rendering:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="empty-state">
          <h2>Something tore in the reel</h2>
          <p>This page hit an unexpected error. You can try again, or head back home.</p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Retry
            </button>
            <Link className="btn btn-ghost" to="/" onClick={() => this.setState({ error: null })}>
              Back home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
