import { useEffect, useRef } from 'react';
import { precipIntensity } from '../lib/weatherCode.js';

// Full-viewport animated sky layer: stars at night, drifting clouds, rain
// streaks, snow, fog bands, and lightning flashes for storms. Runs a single
// rAF loop, pauses when the tab is hidden, and renders one static frame when
// the user prefers reduced motion.
export default function SkyCanvas({ group, isDay, weatherCode, windSpeed }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = (a, b) => a + Math.random() * (b - a);

    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const intensity = precipIntensity(weatherCode) || 0.7;
    const windFactor = Math.min((windSpeed || 0) / 60, 1);

    const stars = [];
    const drops = [];
    const flakes = [];
    const clouds = [];
    const fogBands = [];

    if (!isDay && (group === 'clear' || group === 'cloud' || group === 'night')) {
      const count = group === 'clear' || group === 'night' ? 140 : 50;
      for (let i = 0; i < count; i += 1) {
        stars.push({ x: Math.random(), y: Math.random() * 0.72, r: rand(0.4, 1.5), tw: rand(0, Math.PI * 2), sp: rand(0.4, 1.8) });
      }
    }
    if (group === 'rain' || group === 'storm') {
      const count = Math.round(60 + 120 * intensity);
      for (let i = 0; i < count; i += 1) {
        drops.push({ x: rand(-80, w + 80), y: Math.random() * h, len: rand(10, 22), sp: rand(720, 1240) });
      }
    }
    if (group === 'snow') {
      const count = Math.round(40 + 70 * intensity);
      for (let i = 0; i < count; i += 1) {
        flakes.push({ bx: Math.random() * w, y: Math.random() * h, r: rand(1, 3), sp: rand(32, 82), ph: rand(0, Math.PI * 2), amp: rand(8, 30) });
      }
    }
    if (group === 'cloud' || group === 'rain' || group === 'storm' || group === 'snow') {
      for (let i = 0; i < 6; i += 1) {
        clouds.push({ x: Math.random() * 1.4 - 0.2, y: rand(0.04, 0.34), s: rand(130, 280), sp: rand(4, 13), a: rand(0.05, 0.11) });
      }
    }
    if (group === 'fog') {
      for (let i = 0; i < 4; i += 1) {
        fogBands.push({ y: rand(0.15, 0.8), r: rand(180, 340), sp: rand(7, 18), off: rand(0, 4000), a: rand(0.05, 0.1) });
      }
    }

    let flash = 0;
    let nextFlash = performance.now() + rand(3000, 9000);
    let last = performance.now();

    function drawCloud(cx, cy, size, alpha) {
      const gradient = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, size);
      gradient.addColorStop(0, `rgba(215, 226, 248, ${alpha})`);
      gradient.addColorStop(1, 'rgba(215, 226, 248, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(cx, cy, size, size * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function draw(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);

      if (isDay && group === 'clear') {
        const gradient = ctx.createRadialGradient(w * 0.82, h * 0.1, 0, w * 0.82, h * 0.1, Math.max(w, h) * 0.55);
        gradient.addColorStop(0, 'rgba(255, 194, 94, 0.22)');
        gradient.addColorStop(1, 'rgba(255, 194, 94, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }

      for (const star of stars) {
        const alpha = 0.2 + 0.7 * Math.abs(Math.sin(star.tw + now * 0.0011 * star.sp));
        ctx.fillStyle = `rgba(232, 240, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const cloud of clouds) {
        cloud.x += (cloud.sp * dt) / Math.max(w, 1);
        if (cloud.x > 1.35) cloud.x = -0.35;
        drawCloud(cloud.x * w, cloud.y * h, cloud.s, cloud.a);
      }

      for (const band of fogBands) {
        band.off += band.sp * dt;
        const x = -band.r + ((band.off % (w + band.r * 2)) + w + band.r * 2) % (w + band.r * 2);
        drawCloud(x, band.y * h, band.r, band.a);
        drawCloud(x - w * 0.6, band.y * h + 30, band.r * 0.8, band.a * 0.8);
      }

      if (drops.length) {
        ctx.strokeStyle = 'rgba(165, 200, 255, 0.34)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (const drop of drops) {
          const dx = drop.sp * dt * 0.12 * (0.4 + windFactor);
          drop.y += drop.sp * dt;
          drop.x += dx;
          if (drop.y > h + 30) {
            drop.y = rand(-60, -10);
            drop.x = rand(-80, w + 80);
          }
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - drop.len * 0.28, drop.y - drop.len);
        }
        ctx.stroke();
      }

      for (const flake of flakes) {
        flake.y += flake.sp * dt;
        if (flake.y > h + 6) {
          flake.y = rand(-30, -5);
          flake.bx = Math.random() * w;
        }
        const x = flake.bx + Math.sin(flake.ph + now * 0.0009) * flake.amp;
        ctx.fillStyle = 'rgba(238, 245, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(x, flake.y, flake.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (group === 'storm') {
        if (now > nextFlash) {
          flash = 1;
          nextFlash = now + rand(4000, 12000);
        }
        if (flash > 0.01) {
          flash *= Math.exp(-dt * 7);
          ctx.fillStyle = `rgba(224, 232, 255, ${flash * 0.2})`;
          ctx.fillRect(0, 0, w, h);
        }
      }

      if (running && !reduced) raf = requestAnimationFrame(draw);
    }

    if (reduced) {
      running = false;
      draw(performance.now());
    } else {
      raf = requestAnimationFrame(draw);
    }

    function onVisibility() {
      if (reduced) return;
      cancelAnimationFrame(raf);
      if (!document.hidden && running) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [group, isDay, weatherCode, windSpeed]);

  return <canvas ref={ref} className="sky-canvas" aria-hidden="true" />;
}
