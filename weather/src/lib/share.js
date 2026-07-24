// Shareable image cards, drawn on canvas to the design spec: 1080x1350
// (Instagram 4:5) at 2x. Two variants — the warming-stripes card and the
// "today vs history" card — plus Web Share / clipboard helpers.

const W = 1080;
const H = 1350;
const SCALE = 2;
const MARGIN = 96;
const CONTENT_W = 888;

export const CARD_THEME = {
  clear: { bg1: '#2c5b8f', bg2: '#0d1b34', accent: '#ffb547' },
  cloud: { bg1: '#3a4767', bg2: '#11162a', accent: '#cbd6f2' },
  rain: { bg1: '#24384f', bg2: '#0a1420', accent: '#6ec3ff' },
  snow: { bg1: '#35476b', bg2: '#131c30', accent: '#d9ecff' },
  fog: { bg1: '#3c4250', bg2: '#14161f', accent: '#b9c2d6' },
  storm: { bg1: '#2c2350', bg2: '#0a0817', accent: '#b98bff' },
  night: { bg1: '#101a3a', bg2: '#05070f', accent: '#8fa4ff' },
};

const TEXT_PRIMARY = '#F4F7FF';
const TEXT_SECONDARY = 'rgba(244,247,255,0.70)';
const TEXT_FAINT = 'rgba(244,247,255,0.45)';
const HAIRLINE = 'rgba(244,247,255,0.08)';

const CARD_FONTS = [
  '600 30px Inter',
  '700 96px Inter',
  '500 30px Inter',
  '500 24px Inter',
  '500 44px Inter',
  '700 236px Inter',
  '500 46px Inter',
  '600 54px Inter',
  '600 34px Inter',
  '700 26px Inter',
  '500 22px Inter',
];

// Warm the exact weights/sizes the cards use; canvas silently falls back to
// system fonts for any face that was never loaded on the page.
export function warmCardFonts() {
  if (!document?.fonts?.load) return Promise.resolve();
  return Promise.allSettled(CARD_FONTS.map((f) => document.fonts.load(f))).then(() => undefined);
}

function hexToRgba(hex, alpha) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function stripeFill(anomaly, maxAbs) {
  const a = Math.max(0.08, Math.min(1, Math.abs(anomaly) / maxAbs)).toFixed(2);
  return anomaly <= 0 ? `rgba(69,117,199,${a})` : `rgba(214,66,57,${a})`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipsize(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

// Greedy late-break into at most two lines; single overlong words ellipsize.
function twoLines(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(/\s+/);
  let first = '';
  for (let i = words.length - 1; i > 0; i -= 1) {
    const candidate = words.slice(0, i).join(' ');
    if (ctx.measureText(candidate).width <= maxWidth) {
      first = candidate;
      break;
    }
  }
  if (!first) return [ellipsize(ctx, text, maxWidth)];
  const rest = text.slice(first.length).trim();
  return [first, ellipsize(ctx, rest, maxWidth)];
}

function newCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  return { canvas, ctx };
}

function drawBackground(ctx, theme) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, theme.bg1);
  bg.addColorStop(0.72, theme.bg2);
  bg.addColorStop(1, theme.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(864, -40, 0, 864, -40, 640);
  glow.addColorStop(0, hexToRgba(theme.accent, 0.16));
  glow.addColorStop(1, hexToRgba(theme.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const vignette = ctx.createRadialGradient(540, 620, 520, 540, 620, 990);
  vignette.addColorStop(0, 'rgba(4,7,16,0)');
  vignette.addColorStop(1, 'rgba(4,7,16,0.40)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

function drawStripesBand(ctx, anomalies, maxAbs, x, y, w, h, radius = 0, stroke = null) {
  ctx.save();
  if (radius > 0) {
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.clip();
  }
  const stripeW = w / anomalies.length;
  for (let i = 0; i < anomalies.length; i += 1) {
    ctx.fillStyle = stripeFill(anomalies[i].anomaly, maxAbs);
    const sx = x + i * stripeW;
    ctx.fillRect(sx, y, Math.min(stripeW + 0.75, x + w - sx), h);
  }
  ctx.restore();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    roundRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, Math.max(0, radius - 0.5));
    ctx.stroke();
  }
}

function drawFooter(ctx, theme, shareUrl) {
  ctx.fillStyle = theme.accent;
  roundRectPath(ctx, 96, 1272, 10, 10, 5);
  ctx.fill();
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = '700 26px Inter, sans-serif';
  ctx.fillText('ULTIMATE WEATHER', 122, 1286);
  ctx.fillStyle = TEXT_FAINT;
  ctx.font = '500 22px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(shareUrl, 984, 1286);
  ctx.textAlign = 'left';
}

export function renderStripesCard({ city, anomalies, maxAbs, verdict, themeKey, shareUrl }) {
  const theme = CARD_THEME[themeKey] ?? CARD_THEME.clear;
  const { canvas, ctx } = newCanvas();
  drawBackground(ctx, theme);

  ctx.fillStyle = theme.accent;
  ctx.font = '600 30px Inter, sans-serif';
  ctx.fillText('W A R M I N G   S T R I P E S', MARGIN, 152);

  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '700 96px Inter, sans-serif';
  const cityLines = twoLines(ctx, city, CONTENT_W);
  let baseline = 268;
  for (const line of cityLines) {
    ctx.fillText(line, MARGIN, baseline);
    baseline += 104;
  }

  const firstYear = anomalies[0].year;
  const lastYear = anomalies[anomalies.length - 1].year;
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = '500 30px Inter, sans-serif';
  ctx.fillText(`${firstYear} — ${lastYear}`, MARGIN, baseline - 104 + 60);

  ctx.fillStyle = HAIRLINE;
  ctx.fillRect(0, 519, W, 1);
  drawStripesBand(ctx, anomalies, maxAbs, 0, 520, W, 520, 0);
  ctx.fillRect(0, 1040, W, 1);

  ctx.fillStyle = TEXT_FAINT;
  ctx.font = '500 24px Inter, sans-serif';
  ctx.fillText(`${firstYear}`, MARGIN, 1096);
  ctx.textAlign = 'right';
  ctx.fillText(`${lastYear}`, 984, 1096);
  ctx.textAlign = 'left';

  if (verdict) {
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = '500 44px Inter, sans-serif';
    const lines = twoLines(ctx, verdict, CONTENT_W);
    let vy = 1168;
    for (const line of lines.slice(0, 2)) {
      ctx.fillText(line, MARGIN, vy);
      vy += 60;
    }
  }

  drawFooter(ctx, theme, shareUrl);
  return canvas;
}

export function renderTodayCard({ dateLine, temp, condition, city, percentileLine, anomalies, maxAbs, themeKey, shareUrl }) {
  const theme = CARD_THEME[themeKey] ?? CARD_THEME.clear;
  const { canvas, ctx } = newCanvas();
  drawBackground(ctx, theme);

  ctx.fillStyle = theme.accent;
  ctx.font = '600 30px Inter, sans-serif';
  ctx.fillText(dateLine.toUpperCase(), MARGIN, 152);

  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '700 236px Inter, sans-serif';
  ctx.fillText(temp, 90, 436);

  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = '500 46px Inter, sans-serif';
  ctx.fillText(ellipsize(ctx, condition, CONTENT_W), MARGIN, 518);

  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = '600 54px Inter, sans-serif';
  ctx.fillText(ellipsize(ctx, city, CONTENT_W), MARGIN, 602);

  if (percentileLine) {
    ctx.font = '600 34px Inter, sans-serif';
    const text = ellipsize(ctx, percentileLine, CONTENT_W - 68);
    const textW = ctx.measureText(text).width;
    ctx.fillStyle = hexToRgba(theme.accent, 0.13);
    roundRectPath(ctx, MARGIN, 664, textW + 68, 76, 38);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(theme.accent, 0.35);
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, MARGIN, 664, textW + 68, 76, 38);
    ctx.stroke();
    ctx.fillStyle = theme.accent;
    ctx.fillText(text, MARGIN + 34, 712);
  }

  if (anomalies?.length) {
    drawStripesBand(ctx, anomalies, maxAbs, MARGIN, 1076, CONTENT_W, 64, 14, 'rgba(244,247,255,0.10)');
    const firstYear = anomalies[0].year;
    const lastYear = anomalies[anomalies.length - 1].year;
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = '500 24px Inter, sans-serif';
    ctx.fillText(`${firstYear}`, MARGIN, 1176);
    ctx.textAlign = 'right';
    ctx.fillText(`${lastYear}`, 984, 1176);
    ctx.textAlign = 'left';
  }

  drawFooter(ctx, theme, shareUrl);
  return canvas;
}

// Safe PNG filename from any city name (CJK, Arabic, emoji all collapse).
export function slugify(name) {
  const slug = (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'city';
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// One share at a time: a second tap while the sheet is open must not fall
// through to a surprise download (share() rejects when one is in flight).
let shareInFlight = false;

// Share the canvas as a PNG. 'shared' | 'cancelled' | 'downloaded' | 'busy' | 'failed'.
export async function shareCanvas(canvas, filename, text) {
  if (shareInFlight) return 'busy';
  shareInFlight = true;
  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return 'failed';
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        return 'shared';
      } catch (err) {
        if (err?.name === 'AbortError') return 'cancelled';
        // NotAllowed/InvalidState/etc — fall through to download.
      }
    }
    download(blob, filename);
    return 'downloaded';
  } finally {
    shareInFlight = false;
  }
}

// Text-only share with clipboard fallback. 'shared' | 'cancelled' | 'copied' | 'busy' | false.
export async function shareText(text, url) {
  if (shareInFlight) return 'busy';
  shareInFlight = true;
  try {
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return 'shared';
      } catch (err) {
        if (err?.name === 'AbortError') return 'cancelled';
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url ?? ''}`.trim());
      return 'copied';
    } catch {
      return false;
    }
  } finally {
    shareInFlight = false;
  }
}
