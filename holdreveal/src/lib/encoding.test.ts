import { describe, it, expect } from 'vitest'
import {
  encodeSwap,
  encodeGhost,
  compositeOn,
  luma,
  ghostWashAlpha,
  solveSwapPixel,
  SWAP_DEFAULTS,
} from './encoding'

function gradient(w: number, h: number, horizontal: boolean): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = (y * w + x) * 4
      const v = Math.round(((horizontal ? x : y) / (horizontal ? w - 1 : h - 1)) * 255)
      out[j] = v
      out[j + 1] = v
      out[j + 2] = v
      out[j + 3] = 255
    }
  }
  return out
}

describe('solveSwapPixel', () => {
  it('round-trips: composited on white gives remapped cover, on black gives remapped hidden', () => {
    for (let c = 0; c <= 255; c += 5) {
      for (let h = 0; h <= 255; h += 5) {
        const { v, a } = solveSwapPixel(c, h, SWAP_DEFAULTS)
        const C = SWAP_DEFAULTS.coverFloor + (c * (255 - SWAP_DEFAULTS.coverFloor)) / 255
        const H = (h * SWAP_DEFAULTS.hiddenCeil) / 255
        expect(v * a + 255 * (1 - a)).toBeCloseTo(C, 4)
        expect(v * a).toBeCloseTo(H, 4)
      }
    }
  })

  it('guards alpha = 0', () => {
    const { v, a } = solveSwapPixel(255, 0, { coverFloor: 255, hiddenCeil: 0 })
    expect(a).toBe(0)
    expect(v).toBe(0)
  })
})

describe('encodeSwap', () => {
  const W = 32
  const H = 32
  const cover = gradient(W, H, true)
  const hidden = gradient(W, H, false)

  it('composited on white approximates the remapped cover', () => {
    const encoded = encodeSwap(cover, hidden, W, H)
    const onWhite = compositeOn(encoded, 255)
    let maxErr = 0
    for (let i = 0; i < W * H; i++) {
      const j = i * 4
      const c = luma(cover[j], cover[j + 1], cover[j + 2])
      const expected =
        SWAP_DEFAULTS.coverFloor + (c * (255 - SWAP_DEFAULTS.coverFloor)) / 255
      maxErr = Math.max(maxErr, Math.abs(onWhite[j] - expected))
    }
    expect(maxErr).toBeLessThanOrEqual(2)
  })

  it('composited on black approximates the remapped hidden image', () => {
    const encoded = encodeSwap(cover, hidden, W, H)
    const onBlack = compositeOn(encoded, 0)
    let maxErr = 0
    for (let i = 0; i < W * H; i++) {
      const j = i * 4
      const h = luma(hidden[j], hidden[j + 1], hidden[j + 2])
      const expected = (h * SWAP_DEFAULTS.hiddenCeil) / 255
      maxErr = Math.max(maxErr, Math.abs(onBlack[j] - expected))
    }
    expect(maxErr).toBeLessThanOrEqual(2)
  })

  it('outputs gray pixels (r = g = b)', () => {
    const encoded = encodeSwap(cover, hidden, W, H)
    for (let j = 0; j < encoded.length; j += 4) {
      expect(encoded[j]).toBe(encoded[j + 1])
      expect(encoded[j]).toBe(encoded[j + 2])
    }
  })
})

describe('encodeGhost', () => {
  const W = 16
  const H = 16
  const image = gradient(W, H, true)

  it('keeps painted pixels fully opaque and untouched', () => {
    const mask = new Uint8Array(W * H).fill(255)
    const out = encodeGhost(image, mask, W, H, { hideStrength: 0.7 })
    for (let i = 0; i < W * H; i++) {
      const j = i * 4
      expect(out[j + 3]).toBe(255)
      expect(out[j]).toBe(image[j])
      expect(out[j + 1]).toBe(image[j + 1])
      expect(out[j + 2]).toBe(image[j + 2])
    }
  })

  it('turns unpainted pixels into a 1px checkerboard of transparent + wash', () => {
    const mask = new Uint8Array(W * H).fill(0)
    const strength = 0.7
    const washA = ghostWashAlpha(strength)
    const out = encodeGhost(image, mask, W, H, { hideStrength: strength })
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const j = (y * W + x) * 4
        if ((x + y) % 2 === 0) {
          expect(out[j + 3]).toBe(0)
        } else {
          expect(out[j + 3]).toBe(washA)
        }
      }
    }
  })

  it('wash pixels stay ghosted on white but carry the image on black', () => {
    const mask = new Uint8Array(W * H).fill(0)
    const strength = 0.7
    const out = encodeGhost(image, mask, W, H, { hideStrength: strength })
    const onWhite = compositeOn(out, 255)
    const onBlack = compositeOn(out, 0)
    const washA = ghostWashAlpha(strength)
    for (let y = 0; y < H; y++) {
      for (let x = 1 - (y % 2); x < W; x += 2) {
        const j = (y * W + x) * 4
        // On white: within washA of pure white → a faint ghost.
        expect(255 - onWhite[j]).toBeLessThanOrEqual(washA + 1)
        // On black: matches the original up to the washA brightness ceiling.
        const expected = Math.min(image[j], washA)
        expect(Math.abs(onBlack[j] - expected)).toBeLessThanOrEqual(2)
      }
    }
  })

  it('higher hide-strength lowers the wash alpha', () => {
    expect(ghostWashAlpha(0)).toBeGreaterThan(ghostWashAlpha(0.5))
    expect(ghostWashAlpha(0.5)).toBeGreaterThan(ghostWashAlpha(1))
  })
})
