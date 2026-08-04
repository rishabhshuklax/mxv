import { useCallback, useEffect, useRef, useState } from 'react'
import { StepHeader, PrimaryButton } from '../components/ui'
import { fileToImageData, imageDataToCanvas, UploadError } from '../lib/image'
import { GHOST_DEFAULTS, SWAP_DEFAULTS } from '../lib/encoding'
import type { Mode, Project } from '../state'

interface Slot {
  key: 'single' | 'cover' | 'hidden'
  label: string
  sub: string
}

const SLOTS: Record<Mode, Slot[]> = {
  ghost: [{ key: 'single', label: 'Your photo', sub: 'Choose a photo to hide' }],
  swap: [
    { key: 'cover', label: 'Cover photo', sub: 'What the timeline sees' },
    { key: 'hidden', label: 'Hidden photo', sub: 'Revealed on press-and-hold' },
  ],
}

function Thumb({ data }: { data: ImageData }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.width = data.width
    el.height = data.height
    el.getContext('2d')!.drawImage(imageDataToCanvas(data), 0, 0)
  }, [data])
  return <canvas ref={ref} aria-hidden className="h-full w-full object-cover" />
}

export default function ChooseScreen({
  onBack,
  onReady,
}: {
  onBack: () => void
  onReady: (p: Project) => void
}) {
  const [mode, setMode] = useState<Mode>('ghost')
  const [images, setImages] = useState<Partial<Record<Slot['key'], ImageData>>>({})
  const [error, setError] = useState<string | null>(null)
  const [busySlot, setBusySlot] = useState<Slot['key'] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingSlot = useRef<Slot['key']>('single')

  const acceptFile = useCallback(
    async (file: File, slot: Slot['key']) => {
      setError(null)
      setBusySlot(slot)
      try {
        const data = await fileToImageData(file)
        setImages((prev) => ({ ...prev, [slot]: data }))
      } catch (e) {
        setError(e instanceof UploadError ? e.message : "Couldn't read that file — try another")
      } finally {
        setBusySlot(null)
      }
    },
    [],
  )

  const firstEmptySlot = useCallback((): Slot['key'] => {
    for (const s of SLOTS[mode]) if (!images[s.key]) return s.key
    return SLOTS[mode][0].key
  }, [mode, images])

  // Desktop conveniences: drag-drop and paste-from-clipboard.
  useEffect(() => {
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer?.files?.[0]
      if (file && file.type.startsWith('image/')) void acceptFile(file, firstEmptySlot())
    }
    const onDragOver = (e: DragEvent) => e.preventDefault()
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith('image/'),
      )
      const file = item?.getAsFile()
      if (file) void acceptFile(file, firstEmptySlot())
    }
    window.addEventListener('drop', onDrop)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('paste', onPaste)
    }
  }, [acceptFile, firstEmptySlot])

  const ready = SLOTS[mode].every((s) => images[s.key])

  const continueNext = () => {
    if (!ready) return
    if (mode === 'ghost') {
      const image = images.single!
      onReady({
        mode,
        ghost: {
          image,
          mask: new Uint8Array(image.width * image.height),
          params: { ...GHOST_DEFAULTS },
        },
      })
    } else {
      onReady({
        mode,
        swap: {
          cover: images.cover!,
          hiddenSource: images.hidden!,
          crop: { offsetX: 0.5, offsetY: 0.5, zoom: 1 },
          params: { ...SWAP_DEFAULTS },
        },
      })
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <StepHeader step={1} title="Choose" onBack={onBack} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void acceptFile(file, pendingSlot.current)
          e.target.value = ''
        }}
      />

      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-28">
        {/* Mode cards */}
        <div role="radiogroup" aria-label="Mode" className="grid grid-cols-2 gap-3 pt-2">
          {(
            [
              { m: 'ghost' as Mode, name: 'Ghost reveal', sub: 'One photo. Paint the part that stays visible.' },
              { m: 'swap' as Mode, name: 'A/B swap', sub: 'Two photos. Timeline sees one, hold reveals the other.' },
            ]
          ).map(({ m, name, sub }) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => {
                setMode(m)
                setError(null)
              }}
              className={`min-h-28 rounded-2xl border p-4 text-left transition-colors duration-150 ${
                mode === m
                  ? 'border-torch bg-torch/10'
                  : 'border-fg/15 hover:border-fg/30'
              }`}
            >
              <span className="font-display block text-base leading-tight font-bold">
                {name}
              </span>
              <span className="block pt-1.5 text-xs leading-snug text-fg-dim">{sub}</span>
            </button>
          ))}
        </div>

        {/* Upload slots */}
        <div className="space-y-3 pt-4">
          {SLOTS[mode].map((slot) => {
            const img = images[slot.key]
            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => {
                  pendingSlot.current = slot.key
                  inputRef.current?.click()
                }}
                aria-label={img ? `${slot.label} — chosen, tap to replace` : `${slot.label} — ${slot.sub}`}
                className="checker relative block h-40 w-full overflow-hidden rounded-2xl border border-fg/15 transition-colors duration-150 hover:border-fg/35"
              >
                {img ? (
                  <>
                    <Thumb data={img} />
                    <span className="absolute right-2 bottom-2 rounded-full bg-ink/70 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                      Replace
                    </span>
                  </>
                ) : (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <span className="font-display text-base font-bold">
                      {busySlot === slot.key ? 'Reading photo…' : slot.label}
                    </span>
                    <span className="text-xs text-fg-dim">{slot.sub}</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {error && (
          <p role="alert" className="pt-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <p className="pt-4 text-center text-xs text-fg-dim/70">
          Everything happens on your device — photos are never uploaded.
        </p>
      </div>

      {/* Thumb-zone primary action */}
      <div
        className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/95 to-transparent px-4 pt-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div className="mx-auto max-w-md">
          <PrimaryButton onClick={continueNext} disabled={!ready}>
            {ready ? 'Start editing' : mode === 'swap' ? 'Add both photos' : 'Add a photo'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
