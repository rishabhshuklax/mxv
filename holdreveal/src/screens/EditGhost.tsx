import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HoldPreview from '../components/HoldPreview'
import { BottomSheet, LabeledSlider, PrimaryButton, StepHeader } from '../components/ui'
import { compositePreview, imageDataToCanvas } from '../lib/image'
import { workerEncodeGhost } from '../lib/worker-client'
import type { GhostParams } from '../lib/encoding'
import type { Project } from '../state'

const HISTORY_LIMIT = 20

type Tool = 'paint' | 'preview'

function maskFromCanvas(canvas: HTMLCanvasElement): Uint8Array {
  const { width, height } = canvas
  const data = canvas.getContext('2d')!.getImageData(0, 0, width, height).data
  const out = new Uint8Array(width * height)
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]
  return out
}

function maskToCanvas(mask: Uint8Array, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(width, height)
  for (let i = 0; i < mask.length; i++) {
    img.data[i * 4] = 255
    img.data[i * 4 + 1] = 255
    img.data[i * 4 + 2] = 255
    img.data[i * 4 + 3] = mask[i]
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

export default function EditGhost({
  project,
  onBack,
  onDone,
}: {
  project: Project
  onBack: () => void
  onDone: (p: Project) => void
}) {
  const ghost = project.ghost!
  const image = ghost.image
  const [params, setParams] = useState<GhostParams>(ghost.params)
  const [tool, setTool] = useState<Tool>('paint')
  const [sheetOpen, setSheetOpen] = useState(true)
  const [brushCss, setBrushCss] = useState(36)
  const [erasing, setErasing] = useState(false)
  const [encoded, setEncoded] = useState<ImageData | null>(null)
  const [states, setStates] = useState<{
    white: HTMLCanvasElement
    black: HTMLCanvasElement
  } | null>(null)
  const [historyLen, setHistoryLen] = useState(0)
  const [redoLen, setRedoLen] = useState(0)
  const [maskVersion, setMaskVersion] = useState(0)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)

  // View transform (CSS px): scale + translate of the zoomable stage.
  const view = useRef({ s: 1, tx: 0, ty: 0 })
  const stageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const veilRef = useRef<HTMLCanvasElement>(null)
  const baseRef = useRef<HTMLCanvasElement>(null)

  const maskCanvas = useMemo(
    () => maskToCanvas(ghost.mask, image.width, image.height),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const imageCanvas = useMemo(() => imageDataToCanvas(image), [image])

  const history = useRef<Uint8Array[]>([])
  const redo = useRef<Uint8Array[]>([])

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const painting = useRef(false)
  const strokeSnapshot = useRef<Uint8Array | null>(null)
  const lastImagePoint = useRef<{ x: number; y: number } | null>(null)
  const pinchStart = useRef<{
    dist: number
    mid: { x: number; y: number }
    view: { s: number; tx: number; ty: number }
  } | null>(null)

  const redrawVeil = useCallback(() => {
    const veil = veilRef.current
    if (!veil) return
    const ctx = veil.getContext('2d')!
    ctx.clearRect(0, 0, veil.width, veil.height)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(5,5,5,0.62)'
    ctx.fillRect(0, 0, veil.width, veil.height)
    // Punch holes where the teaser is painted.
    ctx.globalCompositeOperation = 'destination-out'
    ctx.drawImage(maskCanvas, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
  }, [maskCanvas])

  useEffect(() => {
    const base = baseRef.current
    const veil = veilRef.current
    if (!base || !veil) return
    base.width = image.width
    base.height = image.height
    base.getContext('2d')!.drawImage(imageCanvas, 0, 0)
    veil.width = image.width
    veil.height = image.height
    redrawVeil()
  }, [image, imageCanvas, redrawVeil])

  const applyView = () => {
    const stage = stageRef.current
    if (!stage) return
    const { s, tx, ty } = view.current
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`
  }

  const clampView = () => {
    const frame = frameRef.current
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    const v = view.current
    v.s = Math.min(6, Math.max(1, v.s))
    const minTx = rect.width * (1 - v.s)
    const minTy = rect.height * (1 - v.s)
    v.tx = Math.min(0, Math.max(minTx, v.tx))
    v.ty = Math.min(0, Math.max(minTy, v.ty))
  }

  const toImageCoords = (clientX: number, clientY: number) => {
    const frame = frameRef.current!
    const rect = frame.getBoundingClientRect()
    const { s, tx, ty } = view.current
    const cssX = (clientX - rect.left - tx) / s
    const cssY = (clientY - rect.top - ty) / s
    return {
      x: (cssX / rect.width) * image.width,
      y: (cssY / rect.height) * image.height,
      cssScale: image.width / rect.width,
    }
  }

  const paintSegment = (to: { x: number; y: number }) => {
    const ctx = maskCanvas.getContext('2d')!
    const frame = frameRef.current!
    const rect = frame.getBoundingClientRect()
    const radius = ((brushCss / 2) * (image.width / rect.width)) / view.current.s
    ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over'
    ctx.strokeStyle = ctx.fillStyle = '#ffffff'
    ctx.lineWidth = radius * 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const from = lastImagePoint.current ?? to
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    lastImagePoint.current = to
    redrawVeil()
  }

  const pushHistory = () => {
    history.current.push(maskFromCanvas(maskCanvas))
    if (history.current.length > HISTORY_LIMIT) history.current.shift()
    redo.current = []
    setHistoryLen(history.current.length)
    setRedoLen(0)
  }

  const restoreMask = (mask: Uint8Array) => {
    const ctx = maskCanvas.getContext('2d')!
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
    ctx.drawImage(maskToCanvas(mask, maskCanvas.width, maskCanvas.height), 0, 0)
    redrawVeil()
    setMaskVersion((v) => v + 1)
  }

  const undo = () => {
    const prev = history.current.pop()
    if (!prev) return
    redo.current.push(maskFromCanvas(maskCanvas))
    restoreMask(prev)
    setHistoryLen(history.current.length)
    setRedoLen(redo.current.length)
  }

  const redoAction = () => {
    const next = redo.current.pop()
    if (!next) return
    history.current.push(maskFromCanvas(maskCanvas))
    restoreMask(next)
    setHistoryLen(history.current.length)
    setRedoLen(redo.current.length)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    frameRef.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      painting.current = true
      strokeSnapshot.current = maskFromCanvas(maskCanvas)
      pushHistory()
      lastImagePoint.current = null
      const p = toImageCoords(e.clientX, e.clientY)
      paintSegment(p)
      setCursor({ x: e.clientX, y: e.clientY })
    } else if (pointers.current.size === 2) {
      // Second finger: never paint. Revert the in-flight stroke, start pinch.
      if (painting.current && strokeSnapshot.current) {
        restoreMask(strokeSnapshot.current)
        history.current.pop() // drop the history entry the aborted stroke pushed
        setHistoryLen(history.current.length)
      }
      painting.current = false
      setCursor(null)
      const [a, b] = [...pointers.current.values()]
      pinchStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        view: { ...view.current },
      }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1 && painting.current) {
      paintSegment(toImageCoords(e.clientX, e.clientY))
      setCursor({ x: e.clientX, y: e.clientY })
    } else if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()]
      const start = pinchStart.current
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const frame = frameRef.current!.getBoundingClientRect()
      const factor = dist / Math.max(1, start.dist)
      const s = Math.min(6, Math.max(1, start.view.s * factor))
      const applied = s / start.view.s
      const mx = start.mid.x - frame.left
      const my = start.mid.y - frame.top
      view.current = {
        s,
        tx: mx - applied * (mx - start.view.tx) + (mid.x - start.mid.x),
        ty: my - applied * (my - start.view.ty) + (mid.y - start.mid.y),
      }
      clampView()
      applyView()
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (painting.current && pointers.current.size === 0) {
      painting.current = false
      strokeSnapshot.current = null
      setMaskVersion((v) => v + 1)
    }
    if (pointers.current.size < 2) pinchStart.current = null
    setCursor(null)
  }

  // Preview tab: debounce-encode current mask + params in the worker.
  useEffect(() => {
    if (tool !== 'preview') return
    let cancelled = false
    const t = window.setTimeout(async () => {
      const mask = maskFromCanvas(maskCanvas)
      const result = await workerEncodeGhost(image, mask, params)
      if (cancelled) return
      setEncoded(result)
      setStates({
        white: compositePreview(result, '#FFFFFF', true),
        black: compositePreview(result, '#050505', false),
      })
    }, 120)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [tool, params, maskVersion, image, maskCanvas])

  const finish = async () => {
    const mask = maskFromCanvas(maskCanvas)
    const result = encoded ?? (await workerEncodeGhost(image, mask, params))
    onDone({
      ...project,
      ghost: { ...ghost, mask, params },
      encoded: result,
    })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <StepHeader step={2} title="Edit" onBack={onBack} />

      <div className="mx-auto w-full max-w-md flex-1 px-4" style={{ paddingBottom: '46dvh' }}>
        {tool === 'paint' ? (
          <>
            <div
              ref={frameRef}
              role="application"
              aria-label="Painting canvas. One finger paints the visible teaser, two fingers zoom and pan."
              className="relative w-full overflow-hidden rounded-2xl bg-checker-b"
              style={{
                aspectRatio: `${image.width} / ${image.height}`,
                touchAction: 'none',
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div
                ref={stageRef}
                className="absolute inset-0"
                style={{ transformOrigin: '0 0' }}
              >
                <canvas ref={baseRef} className="absolute inset-0 h-full w-full" aria-hidden />
                <canvas ref={veilRef} className="absolute inset-0 h-full w-full" aria-hidden />
              </div>
            </div>
            <p className="mx-auto max-w-64 pt-3 text-center text-xs text-fg-dim">
              Paint what stays visible in the timeline. Dark areas become the secret.
            </p>
          </>
        ) : states ? (
          <>
            <HoldPreview
              white={states.white}
              black={states.black}
              hint="Press and hold to check the reveal"
              className="overflow-hidden rounded-2xl"
            />
            <p className="pt-3 text-center text-xs text-fg-dim">
              Exactly what X will show — timeline on white, reveal on black.
            </p>
          </>
        ) : (
          <div
            className="checker w-full animate-pulse rounded-2xl"
            style={{ aspectRatio: `${image.width} / ${image.height}` }}
            aria-label="Encoding preview"
          />
        )}
      </div>

      {/* Brush cursor ring */}
      {cursor && tool === 'paint' && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-40 rounded-full border-2"
          style={{
            left: cursor.x - brushCss / 2,
            top: cursor.y - brushCss / 2,
            width: brushCss,
            height: brushCss,
            borderColor: erasing ? '#FF5C5C' : '#FFC833',
          }}
        />
      )}

      {/* Floating undo/redo above the sheet */}
      {tool === 'paint' && (
        <div className="fixed right-4 z-40 flex flex-col gap-2" style={{ bottom: 'calc(45dvh + 16px)' }}>
          <button
            type="button"
            onClick={undo}
            disabled={historyLen === 0}
            aria-label="Undo"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-fg/15 bg-ink/80 text-fg backdrop-blur-sm transition-colors duration-150 disabled:opacity-30"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M8 5L4 9l4 4M4 9h8a4 4 0 010 8h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={redoAction}
            disabled={redoLen === 0}
            aria-label="Redo"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-fg/15 bg-ink/80 text-fg backdrop-blur-sm transition-colors duration-150 disabled:opacity-30"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M12 5l4 4-4 4M16 9H8a4 4 0 000 8h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        collapsedLabel={
          tool === 'paint' ? (erasing ? 'Eraser' : 'Brush') : 'Preview'
        }
      >
        <div role="tablist" aria-label="Tool" className="grid grid-cols-2 gap-2 pb-3">
          {(['paint', 'preview'] as Tool[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tool === t}
              onClick={() => setTool(t)}
              className={`min-h-11 rounded-xl text-sm font-medium capitalize transition-colors duration-150 ${
                tool === t ? 'bg-torch text-ink' : 'bg-fg/10 text-fg'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tool === 'paint' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Brush mode">
              {[
                { v: false, label: 'Paint teaser' },
                { v: true, label: 'Erase' },
              ].map(({ v, label }) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={erasing === v}
                  onClick={() => setErasing(v)}
                  className={`min-h-11 rounded-xl text-sm font-medium transition-colors duration-150 ${
                    erasing === v ? 'bg-fg text-ink' : 'bg-fg/10 text-fg'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <LabeledSlider
              label="Brush size"
              min={12}
              max={96}
              value={brushCss}
              onChange={setBrushCss}
              format={(v) => `${v}px`}
            />
            <LabeledSlider
              label="Hide strength"
              min={0}
              max={100}
              value={Math.round(params.hideStrength * 100)}
              onChange={(v) => setParams({ hideStrength: v / 100 })}
              format={(v) => `${v}%`}
            />
          </div>
        ) : (
          <LabeledSlider
            label="Hide strength"
            min={0}
            max={100}
            value={Math.round(params.hideStrength * 100)}
            onChange={(v) => setParams({ hideStrength: v / 100 })}
            format={(v) => `${v}%`}
          />
        )}
        <div className="pt-3">
          <PrimaryButton onClick={() => void finish()}>Preview result</PrimaryButton>
        </div>
      </BottomSheet>
    </div>
  )
}
