import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, img, splitId, titleOf, yearOf } from '../api';
import { useTitle } from '../store';

// A live star-map of cinema. One film sits at the center; its strongest
// connections orbit it. Click an orbiting film and the universe re-forms
// around it — discovery as spatial exploration, not a scrolling list.

const RING = 11;

export default function Constellation() {
  const { compoundId } = useParams();
  const navigate = useNavigate();
  useTitle('Constellation');

  const [center, setCenter] = useState(null);
  const [trail, setTrail] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [loading, setLoading] = useState(true);

  const canvasRef = useRef(null);
  const tipRef = useRef(null);
  const nodesRef = useRef([]);
  const starsRef = useRef([]);
  const imgCache = useRef(new Map());
  const mouse = useRef({ x: -1, y: -1 });
  const raf = useRef(0);
  const size = useRef({ w: 0, h: 0 });

  const loadImage = useCallback((url) => {
    if (!url) return null;
    if (imgCache.current.has(url)) return imgCache.current.get(url);
    const im = new Image();
    im.src = url;
    imgCache.current.set(url, im);
    return im;
  }, []);

  // resolve a starting node
  useEffect(() => {
    let on = true;
    setLoading(true);
    const start = async () => {
      let seed = compoundId;
      if (!seed) {
        const trending = await api.trending().catch(() => []);
        const first = trending.find((e) => e.poster_path) || trending[0];
        seed = first?.id;
      }
      if (!seed) return;
      const { type, id } = splitId(seed);
      const data = await api.extras(type, id).catch(() => null);
      if (on && data) {
        setCenter(data);
        setTrail([]);
      }
      if (on) setLoading(false);
    };
    start();
    return () => {
      on = false;
    };
  }, [compoundId]);

  // rebuild orbit whenever the center changes
  useEffect(() => {
    if (!center) return;
    const conns = (center.recommendations || [])
      .filter((e) => e.poster_path)
      .slice(0, RING);
    const cx = size.current.w / 2;
    const cy = size.current.h / 2;
    nodesRef.current = conns.map((e, idx) => {
      const angle = (idx / conns.length) * Math.PI * 2 - Math.PI / 2;
      return {
        entity: e,
        angle,
        speed: 0.00006 + Math.random() * 0.00006,
        phase: Math.random() * Math.PI * 2,
        radius: Math.min(size.current.w, size.current.h) * (0.3 + (idx % 3) * 0.045),
        x: cx,
        y: cy,
        r: 34,
        appear: 0
      };
    });
    conns.forEach((e) => loadImage(img(e.poster_path, 'w185')));
    loadImage(img(center.poster_path, 'w342'));
  }, [center, loadImage]);

  // canvas setup + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      size.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // starfield
      if (!starsRef.current.length) {
        starsRef.current = Array.from({ length: 90 }, () => ({
          x: Math.random(),
          y: Math.random(),
          z: Math.random(),
          tw: Math.random() * Math.PI * 2
        }));
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const roundImg = (im, x, y, r, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      if (im && im.complete && im.naturalWidth) {
        const ar = im.naturalWidth / im.naturalHeight;
        let dw = r * 2,
          dh = r * 2;
        if (ar > 1) dw = dh * ar;
        else dh = dw / ar;
        ctx.drawImage(im, x - dw / 2, y - dh / 2, dw, dh);
      } else {
        ctx.fillStyle = '#1a1813';
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.restore();
    };

    const draw = (t) => {
      const { w, h } = size.current;
      const cx = w / 2;
      const cy = h / 2;
      ctx.clearRect(0, 0, w, h);

      // starfield
      starsRef.current.forEach((s) => {
        const px = s.x * w;
        const py = s.y * h;
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.001 + s.tw));
        ctx.globalAlpha = tw * (0.3 + s.z * 0.5);
        ctx.fillStyle = '#eae5da';
        ctx.fillRect(px, py, s.z > 0.7 ? 1.6 : 1, s.z > 0.7 ? 1.6 : 1);
      });
      ctx.globalAlpha = 1;

      const nodes = nodesRef.current;
      let hit = null;

      // links
      nodes.forEach((n) => {
        n.appear = Math.min(1, n.appear + 0.03);
        const a = n.angle + t * n.speed;
        const tx = cx + Math.cos(a) * n.radius * n.appear;
        const ty = cy + Math.sin(a) * n.radius * n.appear;
        n.x += (tx - n.x) * 0.06;
        n.y += (ty - n.y) * 0.06;

        const grad = ctx.createLinearGradient(cx, cy, n.x, n.y);
        grad.addColorStop(0, 'rgba(224,164,88,0.32)');
        grad.addColorStop(1, 'rgba(224,164,88,0.04)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      });

      // orbit nodes
      nodes.forEach((n) => {
        const dist = Math.hypot(mouse.current.x - n.x, mouse.current.y - n.y);
        const isHover = dist < n.r + 6;
        if (isHover) hit = n;
        const r = n.r * (isHover ? 1.14 : 1) * n.appear;

        ctx.save();
        ctx.shadowColor = isHover ? 'rgba(224,164,88,0.7)' : 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = isHover ? 26 : 12;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 1.5, 0, Math.PI * 2);
        ctx.fillStyle = isHover ? '#e0a458' : 'rgba(234,229,218,0.22)';
        ctx.fill();
        ctx.restore();

        roundImg(loadImage(img(n.entity.poster_path, 'w185')), n.x, n.y, r, n.appear);
      });

      // pulsing center
      const pulse = 1 + Math.sin(t * 0.0018) * 0.02;
      const cr = 56 * pulse;
      const distC = Math.hypot(mouse.current.x - cx, mouse.current.y - cy);
      const hoverC = distC < cr;
      if (hoverC && !hit) hit = { center: true };

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, cr + 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(224,164,88,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(224,164,88,0.5)';
      ctx.shadowBlur = 34;
      ctx.beginPath();
      ctx.arc(cx, cy, cr + 2, 0, Math.PI * 2);
      ctx.fillStyle = '#e0a458';
      ctx.fill();
      ctx.restore();
      if (center) roundImg(loadImage(img(center.poster_path, 'w342')), cx, cy, cr, 1);

      // cursor + hover tooltip: show/hide via state (rare), glue position via ref (every frame)
      canvas.style.cursor = hit ? 'pointer' : 'default';
      const node = hit && !hit.center ? hit : null;
      if (node) {
        if (tipRef.current) {
          tipRef.current.style.left = `${node.x}px`;
          tipRef.current.style.top = `${node.y - node.r}px`;
        }
        if (hovered?.id !== node.entity.id)
          setHovered({ kind: 'node', id: node.entity.id, e: node.entity });
      } else if (hovered) {
        setHovered(null);
      }

      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);

  const onMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onLeave = () => {
    mouse.current = { x: -1, y: -1 };
  };

  const onClick = async () => {
    const cx = size.current.w / 2;
    const cy = size.current.h / 2;
    // center hit → open detail
    if (Math.hypot(mouse.current.x - cx, mouse.current.y - cy) < 56) {
      if (center) navigate(`/title/${center.id}`);
      return;
    }
    const nodes = nodesRef.current;
    const target = nodes.find(
      (n) => Math.hypot(mouse.current.x - n.x, mouse.current.y - n.y) < n.r + 6
    );
    if (!target) return;
    const { type, id } = splitId(target.entity.id);
    setLoading(true);
    const data = await api.extras(type, id).catch(() => null);
    if (data) {
      setTrail((tr) => [...tr, { id: center.id, title: titleOf(center) }].slice(-8));
      setCenter(data);
    }
    setLoading(false);
  };

  const jumpTo = async (compound) => {
    const { type, id } = splitId(compound);
    setLoading(true);
    const data = await api.extras(type, id).catch(() => null);
    if (data) setCenter(data);
    setLoading(false);
  };

  return (
    <div className="constellation">
      <canvas
        ref={canvasRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={onClick}
      />

      <div className="cst-intro">
        <p className="kicker">The Constellation</p>
        <p className="cst-hint">
          Every film is a star. Click one to travel — the map re-forms around it.
        </p>
      </div>

      {center && (
        <div className="cst-focus fade-up" key={center.id}>
          <span className="cst-focus-label">Now orbiting</span>
          <h2 className="display">{titleOf(center)}</h2>
          <div className="cst-focus-meta">
            {yearOf(center)} · {(center.vote_average || 0).toFixed(1)}/10
          </div>
          <button className="btn btn-primary" onClick={() => navigate(`/title/${center.id}`)}>
            Open dossier →
          </button>
        </div>
      )}

      {trail.length > 0 && (
        <div className="cst-trail">
          <span className="cst-trail-label">Your path</span>
          <div className="cst-trail-items">
            {trail.map((t, i) => (
              <button key={`${t.id}-${i}`} onClick={() => jumpTo(t.id)}>
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {hovered?.kind === 'node' && (
        <div className="cst-tip" ref={tipRef}>
          <strong>{titleOf(hovered.e)}</strong>
          <span>{yearOf(hovered.e)} · ★ {(hovered.e.vote_average || 0).toFixed(1)}</span>
        </div>
      )}

      {loading && <div className="cst-loading">aligning the stars…</div>}
    </div>
  );
}
