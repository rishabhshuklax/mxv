import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ROUTES = {
  h: ['/', 'Home'],
  t: ['/tonight', 'Tonight'],
  b: ['/browse', 'Browse'],
  c: ['/constellation', 'Constellation'],
  w: ['/watchlist', 'Watchlist']
};

const isTyping = (el) =>
  el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

export default function ShortcutsLayer() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(document.activeElement)) {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        navigate('/search');
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setShowHelp(false);
        return;
      }
      const route = ROUTES[e.key.toLowerCase()];
      if (route) navigate(route[0]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  if (!showHelp) return null;

  return (
    <div className="modal" onClick={() => setShowHelp(false)}>
      <div className="shortcuts-card" onClick={(e) => e.stopPropagation()}>
        <p className="kicker">Keyboard shortcuts</p>
        <dl>
          <dt>/</dt>
          <dd>Jump to search</dd>
          {Object.entries(ROUTES).map(([key, [, label]]) => (
            <Fragment key={key}>
              <dt>{key}</dt>
              <dd>{label}</dd>
            </Fragment>
          ))}
          <dt>?</dt>
          <dd>Toggle this panel</dd>
        </dl>
      </div>
    </div>
  );
}
