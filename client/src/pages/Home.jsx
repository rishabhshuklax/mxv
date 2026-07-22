import { useEffect, useState } from 'react';
import { api } from '../api';
import { useTitle, useRecentlyViewed } from '../store';
import Hero from '../components/Hero';
import Row from '../components/Row';

export default function Home() {
  useTitle('');
  const [data, setData] = useState({});
  const [failed, setFailed] = useState(false);
  const recent = useRecentlyViewed();

  useEffect(() => {
    let on = true;
    Promise.allSettled([api.trending(), api.fresh(), api.top(), api.airing()]).then(
      ([t, f, top, a]) => {
        if (!on) return;
        const val = (r) => (r.status === 'fulfilled' ? r.value : []);
        if (t.status === 'rejected' && f.status === 'rejected') setFailed(true);
        setData({ trending: val(t), fresh: val(f), top: val(top), airing: val(a) });
      }
    );
    return () => {
      on = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="empty-state">
        <h2>Something's offline</h2>
        <p>The discovery service didn't respond. Give it a second and retry.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  const spotlight = data.trending
    ? data.trending.filter((e) => e.backdrop_path && e.overview).slice(0, 6)
    : null;

  return (
    <>
      <Hero items={spotlight} />
      <div className="rows">
        {recent.length > 0 && <Row title="Pick up where you left off" items={recent} />}
        <Row title="Trending this week" items={data.trending} />
        <Row title="Now playing & on air" items={data.fresh} />
        <Row title="Critically adored" items={data.top} />
        <Row title="Airing today" items={data.airing} />
      </div>
    </>
  );
}
