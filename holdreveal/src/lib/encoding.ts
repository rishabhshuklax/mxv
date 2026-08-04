/**
 * Pure pixel math for HoldReveal. No DOM — usable from the worker and tests.
 *
 * The trick both modes rely on: X's timeline composites transparent PNGs on
 * white, its full-screen viewer composites them on black. A pixel with color v
 * and alpha a therefore shows as `v·a + 255·(1−a)` in the timeline and `v·a`
 * in the viewer — two independent knobs per pixel.
 */

export interface SwapParams {
  /** Lower bound of the cover's remapped range. Higher = brighter timeline. */
  coverFloor: number
  /** Upper bound of the hidden image's remapped range. Higher = brighter reveal. */
  hiddenCeil: number
}

export const SWAP_DEFAULTS: SwapParams = { coverFloor: 140, hiddenCeil: 115 }

export interface GhostParams {
  /** 0..1 — how ghosted the hidden area looks on white. */
  hideStrength: number
}

export const GHOST_DEFAULTS: GhostParams = { hideStrength: 0.6 }

export function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Solve one pixel of the A/B swap: given cover luminance c and hidden
 * luminance h (both 0..255), find gray value v and alpha a so that the pixel
 * composites to the remapped cover on white and the remapped hidden on black.
 *
 *   white: v·a + 255·(1−a) = C   where C = coverFloor + c·(255−coverFloor)/255
 *   black: v·a             = H   where H = h·hiddenCeil/255
 *
 * Subtracting gives a = 1 − (C−H)/255, then v = H/a.
 */
export function solveSwapPixel(
  c: number,
  h: number,
  params: SwapParams,
): { v: number; a: number } {
  const C = params.coverFloor + (c * (255 - params.coverFloor)) / 255
  const H = (h * params.hiddenCeil) / 255
  const diff = Math.min(255, Math.max(0, C - H))
  const a = 1 - diff / 255
  if (a <= 0) return { v: 0, a: 0 }
  const v = Math.min(255, H / a)
  return { v, a }
}

/**
 * Mode 2 — A/B swap. Encodes two same-size RGBA buffers into one RGBA buffer
 * that reads as `cover` on white and `hidden` on black. Both become
 * monochrome: alpha is a single channel per pixel, so the constraint system
 * only closes in one dimension. That is why the viral originals are grayscale.
 */
export function encodeSwap(
  cover: Uint8ClampedArray,
  hidden: Uint8ClampedArray,
  width: number,
  height: number,
  params: SwapParams = SWAP_DEFAULTS,
): Uint8ClampedArray {
  const n = width * height
  const out = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    const c = luma(cover[j], cover[j + 1], cover[j + 2])
    const h = luma(hidden[j], hidden[j + 1], hidden[j + 2])
    const { v, a } = solveSwapPixel(c, h, params)
    const vv = Math.round(v)
    out[j] = vv
    out[j + 1] = vv
    out[j + 2] = vv
    out[j + 3] = Math.round(a * 255)
  }
  return out
}

/**
 * Mode 1 — Ghost reveal. `mask` is one byte per pixel: 255 = painted teaser
 * (stays fully visible everywhere), 0 = hidden. Hidden pixels become a fine
 * 1px checkerboard: half fully transparent, half a low-alpha wash whose color
 * is boosted so the picture survives compositing on black.
 *
 * hideStrength s maps to wash alpha a = 128 − 108·s (≈0.5 down to ≈0.08 of
 * full opacity): higher strength → whiter timeline ghost, dimmer reveal.
 */
export function ghostWashAlpha(hideStrength: number): number {
  const s = Math.min(1, Math.max(0, hideStrength))
  return Math.round(128 - 108 * s)
}

export function encodeGhost(
  image: Uint8ClampedArray,
  mask: Uint8Array,
  width: number,
  height: number,
  params: GhostParams = GHOST_DEFAULTS,
): Uint8ClampedArray {
  const washA = ghostWashAlpha(params.hideStrength)
  const n = width * height
  const out = new Uint8ClampedArray(n * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const j = i * 4
      const m = mask[i] / 255 // 1 = teaser, 0 = hidden
      const transparentSlot = (x + y) % 2 === 0
      const r = image[j]
      const g = image[j + 1]
      const b = image[j + 2]
      if (transparentSlot) {
        // Hidden contribution is full transparency; teaser fades it back in.
        out[j] = r
        out[j + 1] = g
        out[j + 2] = b
        out[j + 3] = Math.round(m * 255)
      } else {
        // Wash slot: boost color so `boosted·a ≈ original` on black.
        const boost = 255 / Math.max(1, washA)
        const br = Math.min(255, r * boost)
        const bg = Math.min(255, g * boost)
        const bb = Math.min(255, b * boost)
        out[j] = Math.round(br + (r - br) * m)
        out[j + 1] = Math.round(bg + (g - bg) * m)
        out[j + 2] = Math.round(bb + (b - bb) * m)
        out[j + 3] = Math.round(washA + (255 - washA) * m)
      }
    }
  }
  return out
}

/** Composite an RGBA buffer over a solid gray background (0..255). */
export function compositeOn(
  rgba: Uint8ClampedArray,
  bg: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length)
  for (let j = 0; j < rgba.length; j += 4) {
    const a = rgba[j + 3] / 255
    out[j] = Math.round(rgba[j] * a + bg * (1 - a))
    out[j + 1] = Math.round(rgba[j + 1] * a + bg * (1 - a))
    out[j + 2] = Math.round(rgba[j + 2] * a + bg * (1 - a))
    out[j + 3] = 255
  }
  return out
}
