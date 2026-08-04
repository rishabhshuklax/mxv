# HoldReveal

Make the viral X (Twitter) "tap and hold" hidden-image PNGs — entirely in your
browser. The exported PNG looks one way in X's white timeline preview and
reveals a second picture when a viewer opens it full screen and presses and
holds (X's black image viewer).

Everything runs client-side: Canvas API for editing, a Web Worker for the
pixel math, UPNG.js for PNG-8 export. Image data never leaves the device.

## Develop

```bash
cd holdreveal
npm install
npm run dev        # Vite dev server
npm test           # vitest — encoding round-trip + checkerboard tests
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
npm run icons      # regenerate the PWA icons in public/icons/
```

## Deploy (Vercel)

Create a Vercel project with **Root Directory** set to `holdreveal/`. The
included `holdreveal/vercel.json` marks it as a static Vite build (`npm run
build`, output `dist/`). No environment variables, no functions.

## How the encoding works

X composites transparent PNGs on **white** in the timeline and on **black**
in the full-screen viewer. A pixel with color `v` and alpha `a` therefore
renders as `v·a + 255·(1−a)` on the timeline and `v·a` in the viewer — two
independent equations, two unknowns per pixel.

### Mode 2 — A/B swap (two images)

Remap the cover image's luminance into `[coverFloor, 255]` (default 140) and
the hidden image's into `[0, hiddenCeil]` (default 115), giving targets `C`
and `H` per pixel. Solving the two compositing equations:

```
a = 1 − (C − H) / 255
v = H / a            (clamped to [0,255], a = 0 guarded)
```

On white the pixel shows `C` (the cover); on black it shows `H` (the hidden
image). Alpha is a single channel per pixel, so the system only closes in one
dimension — which is why the output (like the viral originals) is grayscale.
The two sliders move `coverFloor` and `hiddenCeil`, trading fidelity between
the two views.

### Mode 1 — Ghost reveal (one image)

Painted "teaser" pixels stay fully opaque. Every unpainted pixel becomes a
fine 1px checkerboard: half the pixels fully transparent, the other half a
low-alpha wash whose color is boosted by `255/alpha` so that compositing on
black approximately restores the original (`boosted·a ≈ original`). On white
the wash reads as a faint ghost; the hide-strength slider sets the wash alpha
(`a = 128 − 108·s`), trading timeline invisibility against reveal brightness.

### Export

The result is quantized to a 256-color palette and written as **PNG-8 with
alpha** via UPNG.js. This matters: X re-encodes large RGBA PNGs to JPEG
(killing the alpha channel and the whole trick), but palettized PNG-8 under
~4.5MB survives untouched. Images are capped at 1500px on the longest side
*before* editing, because resampling would destroy the 1px checkerboard.

### Posting rules that make or break it

1. Post from a **desktop browser** at x.com — the X mobile app re-encodes to
   JPEG.
2. Don't route the file through WhatsApp/Instagram first; they strip
   transparency.
3. Reveal on X: open the image full screen, press and hold → "Load in 4K"
   (iOS) / "Save 4K image" (Android). Some Android clients are inconsistent.
