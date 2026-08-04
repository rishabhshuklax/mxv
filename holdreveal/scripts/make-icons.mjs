// Generates the PWA icons: the brand checkerboard with the torch hold-ring.
// Run with `npm run icons`; output goes to public/icons/.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import UPNG from 'upng-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function makeIcon(size) {
  const rgba = new Uint8Array(size * size * 4)
  const cell = size / 8
  const cx = size / 2
  const cy = size / 2
  const rOuter = size * 0.34
  const rInner = size * 0.26
  const rDot = size * 0.09
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const even = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0
      let [r, g, b] = even ? [0x1a, 0x1a, 0x1c] : [0x10, 0x10, 0x12]
      const d = Math.hypot(x - cx, y - cy)
      if ((d <= rOuter && d >= rInner) || d <= rDot) {
        ;[r, g, b] = [0xff, 0xc8, 0x33]
      }
      rgba[i] = r
      rgba[i + 1] = g
      rgba[i + 2] = b
      rgba[i + 3] = 255
    }
  }
  return Buffer.from(UPNG.encode([rgba.buffer], size, size, 64))
}

mkdirSync(join(root, 'public/icons'), { recursive: true })
for (const size of [192, 512]) {
  writeFileSync(join(root, `public/icons/icon-${size}.png`), makeIcon(size))
  console.log(`icon-${size}.png`)
}
