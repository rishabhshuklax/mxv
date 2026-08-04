// No-op when the committed font is present; downloads it otherwise so that
// file-drop deploys (no git checkout) still build with the self-hosted font.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dest = join(root, 'public/fonts/bricolage-latin.woff2')
if (!existsSync(dest)) {
  const url =
    'https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9K6as8bTXq_nANBjzKo3IeZx8z6up5BeSl9D4dj_x9PpZBMlGIInE.woff2'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`font download failed: ${res.status}`)
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
  console.log('fetched bricolage-latin.woff2')
}
