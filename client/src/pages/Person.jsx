import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, img } from '../api';
import { useTitle } from '../store';
import PosterCard from '../components/PosterCard';
import { SkeletonGrid } from '../components/Skeletons';

export default function Person() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [err, setErr] = useState(null);
  useTitle(p?.name || '');

  useEffect(() => {
    setP(null);
    setErr(null);
    window.scrollTo(0, 0);
    let on = true;
    api
      .person(id)
      .then((data) => on && setP(data))
      .catch((e) => on && setErr(e.message));
    return () => {
      on = false;
    };
  }, [id]);

  if (err) {
    return (
      <div className="empty-state">
        <h2>Couldn't load this person</h2>
        <p>{err}</p>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="page-pad">
        <div className="skel skel-title" style={{ width: '40%' }} />
        <SkeletonGrid />
      </div>
    );
  }

  return (
    <div className="page-pad person-page">
      <div className="person-header">
        {p.profile_path ? (
          <img className="person-portrait" src={img(p.profile_path, 'w342')} alt={p.name} />
        ) : (
          <div className="person-portrait person-fallback">{p.name?.[0]}</div>
        )}
        <div>
          <p className="kicker">{p.known_for_department || 'Filmography'}</p>
          <h1 className="page-title display">{p.name}</h1>
          <div className="chips">
            {p.birthday && <span className="chip">Born {p.birthday}</span>}
            {p.place_of_birth && <span className="chip">{p.place_of_birth}</span>}
          </div>
          {p.biography && <p className="overview person-bio">{p.biography}</p>}
        </div>
      </div>

      {p.filmography?.length > 0 && (
        <div className="rows">
          <section className="row fade-up">
            <h2 className="row-title">Filmography · {p.filmography.length} credits</h2>
            <div className="grid">
              {p.filmography.map((c) => (
                <div key={c.id} className="person-credit">
                  <PosterCard entity={c} />
                  {c.role && <span className="person-role">{c.role}</span>}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
