/**
 * Programmatic canvases for the landing page — the hero and the three inline
 * demos are drawn at runtime, so the landing ships zero image bytes.
 */

export interface DemoPair {
  white: HTMLCanvasElement
  black: HTMLCanvasElement
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!]
}

export async function loadDisplayFont(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('700 80px "Bricolage Grotesque"'),
      document.fonts.load('800 120px "Bricolage Grotesque"'),
    ])
  } catch {
    /* system fallback still looks fine */
  }
}

/**
 * Hero: on white, a dim ghosted thumbprint — a secret in plain sight. On
 * black, the app name and tagline, lit by the torch accent.
 */
export function makeHeroPair(): DemoPair {
  const W = 780
  const H = 880

  const [white, wctx] = canvas(W, H)
  wctx.fillStyle = '#FAFAF7'
  wctx.fillRect(0, 0, W, H)
  // Soft central smudge
  const smudge = wctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 330)
  smudge.addColorStop(0, 'rgba(5,5,5,0.055)')
  smudge.addColorStop(1, 'rgba(5,5,5,0)')
  wctx.fillStyle = smudge
  wctx.fillRect(0, 0, W, H)
  // Ghost thumbprint: concentric arcs, barely there
  wctx.strokeStyle = 'rgba(5,5,5,0.075)'
  wctx.lineWidth = 7
  wctx.lineCap = 'round'
  for (let i = 0; i < 11; i++) {
    const r = 44 + i * 30
    const start = Math.PI * (0.65 + 0.12 * Math.sin(i * 1.7))
    const end = start + Math.PI * (1.05 + 0.35 * Math.cos(i * 0.9))
    wctx.beginPath()
    wctx.arc(W / 2, H / 2 - 40, r, start, end)
    wctx.stroke()
  }
  // Faint scattered plus-marks
  wctx.strokeStyle = 'rgba(5,5,5,0.06)'
  wctx.lineWidth = 4
  const marks = [
    [120, 150], [660, 210], [150, 700], [630, 660], [390, 100], [90, 430], [690, 460],
  ]
  for (const [x, y] of marks) {
    wctx.beginPath()
    wctx.moveTo(x - 10, y)
    wctx.lineTo(x + 10, y)
    wctx.moveTo(x, y - 10)
    wctx.lineTo(x, y + 10)
    wctx.stroke()
  }
  wctx.fillStyle = 'rgba(5,5,5,0.26)'
  wctx.font = '500 26px ui-sans-serif, system-ui, sans-serif'
  wctx.textAlign = 'center'
  wctx.fillText('there is something here', W / 2, 208)

  const [black, bctx] = canvas(W, H)
  bctx.fillStyle = '#050505'
  bctx.fillRect(0, 0, W, H)
  // Torch glow behind the wordmark
  const glow = bctx.createRadialGradient(W / 2, H / 2 - 60, 20, W / 2, H / 2 - 60, 420)
  glow.addColorStop(0, 'rgba(255,200,51,0.16)')
  glow.addColorStop(1, 'rgba(255,200,51,0)')
  bctx.fillStyle = glow
  bctx.fillRect(0, 0, W, H)
  bctx.textAlign = 'center'
  bctx.fillStyle = '#F2F2F0'
  bctx.font = '800 108px "Bricolage Grotesque", ui-sans-serif, system-ui'
  bctx.fillText('Hold', W / 2, H / 2 - 96)
  bctx.fillStyle = '#FFC833'
  bctx.fillText('Reveal', W / 2, H / 2 + 14)
  bctx.fillStyle = '#9A9A96'
  bctx.font = '500 30px ui-sans-serif, system-ui, sans-serif'
  bctx.fillText('Hide a second picture inside a PNG.', W / 2, H / 2 + 110)
  bctx.fillText('It only shows when you press and hold on X.', W / 2, H / 2 + 156)
  return { white, black }
}

/** Small square demos for the three landing steps. */
export function makeStepDemos(): [DemoPair, DemoPair, DemoPair] {
  const S = 320

  // 1 — Choose a photo: dim photo glyph → the same photo, lit.
  const drawPhoto = (
    ctx: CanvasRenderingContext2D,
    ghosted: boolean,
  ) => {
    const stroke = ghosted ? 'rgba(5,5,5,0.14)' : '#FFC833'
    const sun = ghosted ? 'rgba(5,5,5,0.14)' : '#FFC833'
    ctx.strokeStyle = stroke
    ctx.lineWidth = 8
    ctx.lineJoin = 'round'
    ctx.strokeRect(70, 80, 180, 150)
    ctx.beginPath()
    ctx.moveTo(85, 205)
    ctx.lineTo(140, 145)
    ctx.lineTo(180, 185)
    ctx.lineTo(215, 150)
    ctx.lineTo(240, 175)
    ctx.stroke()
    ctx.fillStyle = sun
    ctx.beginPath()
    ctx.arc(210, 115, 14, 0, Math.PI * 2)
    ctx.fill()
  }
  const [w1, w1c] = canvas(S, S)
  w1c.fillStyle = '#FAFAF7'
  w1c.fillRect(0, 0, S, S)
  drawPhoto(w1c, true)
  const [b1, b1c] = canvas(S, S)
  b1c.fillStyle = '#050505'
  b1c.fillRect(0, 0, S, S)
  drawPhoto(b1c, false)

  // 2 — Paint the teaser: brush blob → "👀" reveal.
  const [w2, w2c] = canvas(S, S)
  w2c.fillStyle = '#FAFAF7'
  w2c.fillRect(0, 0, S, S)
  w2c.fillStyle = 'rgba(5,5,5,0.09)'
  for (const [x, y, r] of [[130, 140, 52], [175, 165, 48], [145, 190, 44]]) {
    w2c.beginPath()
    w2c.arc(x, y, r, 0, Math.PI * 2)
    w2c.fill()
  }
  w2c.fillStyle = 'rgba(5,5,5,0.3)'
  w2c.font = '600 24px ui-sans-serif, system-ui'
  w2c.textAlign = 'center'
  w2c.fillText('paint', S / 2, 268)
  const [b2, b2c] = canvas(S, S)
  b2c.fillStyle = '#050505'
  b2c.fillRect(0, 0, S, S)
  b2c.textAlign = 'center'
  b2c.font = '84px ui-sans-serif, system-ui'
  b2c.fillText('👀', S / 2, S / 2 + 28)

  // 3 — Post it: timeline card lines → "hold me" in torch.
  const [w3, w3c] = canvas(S, S)
  w3c.fillStyle = '#FAFAF7'
  w3c.fillRect(0, 0, S, S)
  w3c.fillStyle = 'rgba(5,5,5,0.1)'
  w3c.beginPath()
  w3c.arc(70, 80, 22, 0, Math.PI * 2)
  w3c.fill()
  for (const [x, y, w, h] of [
    [105, 66, 120, 12], [105, 88, 80, 10], [48, 130, 224, 12], [48, 156, 190, 12], [48, 182, 205, 12],
  ]) {
    w3c.fillRect(x, y, w, h)
  }
  w3c.fillStyle = 'rgba(5,5,5,0.3)'
  w3c.font = '600 24px ui-sans-serif, system-ui'
  w3c.textAlign = 'center'
  w3c.fillText('post', S / 2, 268)
  const [b3, b3c] = canvas(S, S)
  b3c.fillStyle = '#050505'
  b3c.fillRect(0, 0, S, S)
  b3c.fillStyle = '#FFC833'
  b3c.textAlign = 'center'
  b3c.font = '700 44px "Bricolage Grotesque", ui-sans-serif, system-ui'
  b3c.fillText('hold me', S / 2, S / 2 + 14)
  return [
    { white: w1, black: b1 },
    { white: w2, black: b2 },
    { white: w3, black: b3 },
  ]
}
