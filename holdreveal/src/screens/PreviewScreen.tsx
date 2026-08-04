import { useEffect, useMemo, useRef, useState } from 'react'
import HoldPreview from '../components/HoldPreview'
import { PrimaryButton, StepHeader } from '../components/ui'
import { compositePreview } from '../lib/image'
import type { Project } from '../state'

export default function PreviewScreen({
  project,
  onBack,
  onNext,
}: {
  project: Project
  onBack: () => void
  onNext: () => void
}) {
  const encoded = project.encoded!
  const [simulate, setSimulate] = useState(true)

  const states = useMemo(
    () => ({
      white: compositePreview(encoded, '#FFFFFF', simulate),
      black: compositePreview(encoded, '#050505', false),
    }),
    [encoded, simulate],
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <StepHeader step={3} title="Preview" onBack={onBack} />

      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-44">
        <HoldPreview
          white={states.white}
          black={states.black}
          hint="Press and hold — the viewer's gesture on X"
          className="overflow-hidden rounded-2xl"
        />

        <div className="flex items-center justify-between pt-4">
          <label htmlFor="sim" className="text-sm font-medium">
            Simulate X compression
          </label>
          <button
            id="sim"
            type="button"
            role="switch"
            aria-checked={simulate}
            onClick={() => setSimulate((s) => !s)}
            className={`relative h-8 w-14 rounded-full transition-colors duration-150 ${
              simulate ? 'bg-torch' : 'bg-fg/20'
            }`}
          >
            <span
              aria-hidden
              className={`absolute top-1 h-6 w-6 rounded-full bg-ink transition-all duration-150 ${
                simulate ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
        <p className="pt-1 text-xs leading-relaxed text-fg-dim">
          X serves a downscaled JPEG in the timeline — this shows the honest,
          slightly softened version viewers will see.
        </p>

        <h2 className="font-display pt-6 pb-2 text-base font-bold">
          Timeline vs. reveal
        </h2>
        <CompareSlider
          left={states.white}
          right={states.black}
          aspect={`${encoded.width} / ${encoded.height}`}
        />
        <p className="pt-2 text-xs text-fg-dim">Drag the divider to compare.</p>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/95 to-transparent px-4 pt-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div className="mx-auto max-w-md">
          <PrimaryButton onClick={onNext}>Looks right — export</PrimaryButton>
        </div>
      </div>
    </div>
  )
}

function CompareSlider({
  left,
  right,
  aspect,
}: {
  left: HTMLCanvasElement
  right: HTMLCanvasElement
  aspect: string
}) {
  const [pos, setPos] = useState(0.5) // 0..1, fraction shown of the left image
  const leftRef = useRef<HTMLCanvasElement>(null)
  const rightRef = useRef<HTMLCanvasElement>(null)
  const dragging = useRef(false)

  useEffect(() => {
    for (const [src, ref] of [
      [left, leftRef],
      [right, rightRef],
    ] as const) {
      const el = ref.current
      if (!el) continue
      el.width = src.width
      el.height = src.height
      el.getContext('2d')!.drawImage(src, 0, 0)
    }
  }, [left, right])

  const move = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    setPos(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)))
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl select-none"
      style={{ aspectRatio: aspect, touchAction: 'none' }}
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        move(e.clientX, e.currentTarget)
      }}
      onPointerMove={(e) => dragging.current && move(e.clientX, e.currentTarget)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <canvas ref={rightRef} aria-hidden className="absolute inset-0 h-full w-full" />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos * 100}% 0 0)` }}
        aria-hidden
      >
        <canvas ref={leftRef} className="absolute inset-0 h-full w-full" />
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Comparison divider between timeline view and revealed view"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos * 100)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 0.05))
          if (e.key === 'ArrowRight') setPos((p) => Math.min(1, p + 0.05))
        }}
        className="absolute inset-y-0 z-10 flex w-11 -translate-x-1/2 cursor-ew-resize items-center justify-center"
        style={{ left: `${pos * 100}%` }}
      >
        <div className="h-full w-0.5 bg-torch" aria-hidden />
        <div
          aria-hidden
          className="absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-torch text-ink shadow-lg"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M4.5 3L1.5 7l3 4M9.5 3l3 4-3 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}
