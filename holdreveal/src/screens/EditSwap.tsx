import { useEffect, useMemo, useRef, useState } from 'react'
import HoldPreview from '../components/HoldPreview'
import { BottomSheet, LabeledSlider, PrimaryButton, StepHeader } from '../components/ui'
import { compositePreview, coverFit, imageDataToCanvas } from '../lib/image'
import { workerEncodeSwap } from '../lib/worker-client'
import type { SwapParams } from '../lib/encoding'
import type { Project } from '../state'

type Tool = 'balance' | 'crop'

export default function EditSwap({
  project,
  onBack,
  onDone,
}: {
  project: Project
  onBack: () => void
  onDone: (p: Project) => void
}) {
  const swap = project.swap!
  const [params, setParams] = useState<SwapParams>(swap.params)
  const [crop, setCrop] = useState(swap.crop)
  const [tool, setTool] = useState<Tool>('balance')
  const [sheetOpen, setSheetOpen] = useState(true)
  const [encoded, setEncoded] = useState<ImageData | null>(null)
  const [states, setStates] = useState<{
    white: HTMLCanvasElement
    black: HTMLCanvasElement
  } | null>(null)

  const croppedHidden = useMemo(
    () =>
      coverFit(
        swap.hiddenSource,
        swap.cover.width,
        swap.cover.height,
        crop.offsetX,
        crop.offsetY,
        crop.zoom,
      ),
    [swap.hiddenSource, swap.cover.width, swap.cover.height, crop],
  )

  // Debounced worker encode; pre-render both HoldPreview states off-gesture.
  useEffect(() => {
    let cancelled = false
    const t = window.setTimeout(async () => {
      const result = await workerEncodeSwap(swap.cover, croppedHidden, params)
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
  }, [swap.cover, croppedHidden, params])

  return (
    <div className="flex min-h-dvh flex-col">
      <StepHeader step={2} title="Edit" onBack={onBack} />

      <div className="mx-auto w-full max-w-md flex-1 px-4" style={{ paddingBottom: '46dvh' }}>
        {tool === 'balance' ? (
          states ? (
            <HoldPreview
              white={states.white}
              black={states.black}
              hint="Press and hold to check the reveal"
              className="overflow-hidden rounded-2xl"
            />
          ) : (
            <div
              className="checker w-full animate-pulse rounded-2xl"
              style={{ aspectRatio: `${swap.cover.width} / ${swap.cover.height}` }}
              aria-label="Encoding preview"
            />
          )
        ) : (
          <CropCanvas
            hidden={croppedHidden}
            aspect={`${swap.cover.width} / ${swap.cover.height}`}
            onPan={(dx, dy, cssW, cssH) => {
              const scaleX = swap.cover.width / cssW
              const scaleY = swap.cover.height / cssH
              const s =
                Math.max(
                  swap.cover.width / swap.hiddenSource.width,
                  swap.cover.height / swap.hiddenSource.height,
                ) * crop.zoom
              const overflowX = swap.cover.width - swap.hiddenSource.width * s
              const overflowY = swap.cover.height - swap.hiddenSource.height * s
              setCrop((c) => ({
                ...c,
                offsetX:
                  overflowX < 0
                    ? Math.min(1, Math.max(0, c.offsetX + (dx * scaleX) / overflowX))
                    : c.offsetX,
                offsetY:
                  overflowY < 0
                    ? Math.min(1, Math.max(0, c.offsetY + (dy * scaleY) / overflowY))
                    : c.offsetY,
              }))
            }}
          />
        )}
        <p className="mx-auto max-w-64 pt-3 text-center text-xs text-fg-dim">
          {tool === 'balance'
            ? 'Both photos go monochrome — that is what makes the illusion solvable.'
            : 'Drag to position the hidden photo inside the cover frame.'}
        </p>
      </div>

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        collapsedLabel={tool === 'balance' ? 'Balance' : 'Crop'}
      >
        <div role="tablist" aria-label="Tool" className="grid grid-cols-2 gap-2 pb-3">
          {(['balance', 'crop'] as Tool[]).map((t) => (
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
        {tool === 'balance' ? (
          <div className="space-y-3">
            <LabeledSlider
              label="Cover brightness"
              min={110}
              max={190}
              value={params.coverFloor}
              onChange={(v) => setParams((p) => ({ ...p, coverFloor: v }))}
            />
            <LabeledSlider
              label="Hidden darkness"
              min={60}
              max={150}
              value={params.hiddenCeil}
              onChange={(v) => setParams((p) => ({ ...p, hiddenCeil: v }))}
            />
            <p className="text-xs leading-relaxed text-fg-dim">
              Trade fidelity between the two views: brighter cover hides better on
              white, darker hidden pops more on black.
            </p>
          </div>
        ) : (
          <LabeledSlider
            label="Zoom"
            min={100}
            max={300}
            value={Math.round(crop.zoom * 100)}
            onChange={(v) => setCrop((c) => ({ ...c, zoom: v / 100 }))}
            format={(v) => `${v}%`}
          />
        )}
        <div className="pt-3">
          <PrimaryButton
            disabled={!encoded}
            onClick={() =>
              encoded &&
              onDone({
                ...project,
                swap: { ...swap, params, crop },
                encoded,
              })
            }
          >
            Preview result
          </PrimaryButton>
        </div>
      </BottomSheet>
    </div>
  )
}

function CropCanvas({
  hidden,
  aspect,
  onPan,
}: {
  hidden: ImageData
  aspect: string
  onPan: (dx: number, dy: number, cssW: number, cssH: number) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const last = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.width = hidden.width
    el.height = hidden.height
    const ctx = el.getContext('2d')!
    ctx.drawImage(imageDataToCanvas(hidden), 0, 0)
    // Rule-of-thirds guides
    ctx.strokeStyle = 'rgba(255,200,51,0.35)'
    ctx.lineWidth = Math.max(1, hidden.width / 400)
    for (const f of [1 / 3, 2 / 3]) {
      ctx.beginPath()
      ctx.moveTo(hidden.width * f, 0)
      ctx.lineTo(hidden.width * f, hidden.height)
      ctx.moveTo(0, hidden.height * f)
      ctx.lineTo(hidden.width, hidden.height * f)
      ctx.stroke()
    }
  }, [hidden])

  return (
    <canvas
      ref={ref}
      aria-label="Crop position. Drag to move the hidden photo."
      className="w-full rounded-2xl"
      style={{ aspectRatio: aspect, touchAction: 'none' }}
      onPointerDown={(e) => {
        last.current = { x: e.clientX, y: e.clientY }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!last.current) return
        const rect = e.currentTarget.getBoundingClientRect()
        onPan(e.clientX - last.current.x, e.clientY - last.current.y, rect.width, rect.height)
        last.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={() => (last.current = null)}
      onPointerCancel={() => (last.current = null)}
    />
  )
}
