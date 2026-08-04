import { useEffect, useRef, useState } from 'react'
import { GhostButton, PrimaryButton, StepHeader } from '../components/ui'
import { MAX_EXPORT_BYTES, formatBytes } from '../lib/image'
import { workerExportPng } from '../lib/worker-client'
import type { Project } from '../state'

const CHECKLIST: { text: string; danger?: boolean }[] = [
  {
    text: 'Post from a desktop browser at x.com — the X mobile app re-encodes to JPEG and destroys the effect',
    danger: true,
  },
  {
    text: "Don't pass the file through WhatsApp or Instagram first — they strip transparency",
  },
  { text: 'Caption idea: "tap and hold the image 👀"' },
  {
    text: 'Viewers reveal it: open the image full screen, press and hold → "Load in 4K" (iOS) or "Save 4K image" (Android)',
  },
  { text: 'The reveal can be inconsistent on some Android clients' },
]

type ExportState =
  | { phase: 'working'; progress: number }
  | { phase: 'ready'; blob: Blob; url: string }
  | { phase: 'too-big'; size: number }
  | { phase: 'error'; message: string }

export default function ExportScreen({
  project,
  onBack,
  onRestart,
}: {
  project: Project
  onBack: () => void
  onRestart: () => void
}) {
  const encoded = project.encoded!
  const [state, setState] = useState<ExportState>({ phase: 'working', progress: 0 })
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const notify = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    // Quantization runs in the worker; tick the button's progress bar while
    // it works so the wait reads as motion, not a hang.
    setState({ phase: 'working', progress: 0.1 })
    const tick = window.setInterval(() => {
      setState((s) =>
        s.phase === 'working' ? { phase: 'working', progress: Math.min(0.9, s.progress + 0.12) } : s,
      )
    }, 150)
    ;(async () => {
      try {
        const png = await workerExportPng(encoded)
        if (cancelled) return
        if (png.byteLength > MAX_EXPORT_BYTES) {
          setState({ phase: 'too-big', size: png.byteLength })
          return
        }
        const blob = new Blob([png], { type: 'image/png' })
        url = URL.createObjectURL(blob)
        setState({ phase: 'ready', blob, url })
      } catch (e) {
        if (!cancelled)
          setState({
            phase: 'error',
            message: e instanceof Error ? e.message : 'Export failed — try again',
          })
      } finally {
        window.clearInterval(tick)
      }
    })()
    return () => {
      cancelled = true
      window.clearInterval(tick)
      if (url) URL.revokeObjectURL(url)
    }
  }, [encoded])

  const fileName = 'holdreveal.png'

  const savePng = async () => {
    if (state.phase !== 'ready') return
    const file = new File([state.blob], fileName, { type: 'image/png' })
    // On mobile, sharing the file keeps it lossless en route to Photos/Files.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        // fall through to download
      }
    }
    const a = document.createElement('a')
    a.href = state.url
    a.download = fileName
    a.click()
    notify('PNG saved')
  }

  const copyImage = async () => {
    if (state.phase !== 'ready') return
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': state.blob }),
      ])
      notify('Copied — paste it into x.com')
    } catch {
      notify("Copying images isn't supported here — use Save PNG")
    }
  }

  const canCopy = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write

  return (
    <div className="flex min-h-dvh flex-col">
      <StepHeader step={4} title="Export" onBack={onBack} />

      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-32">
        {/* Export card on the brand checkerboard */}
        <div className="checker rounded-2xl p-4">
          {state.phase === 'ready' ? (
            <img
              src={state.url}
              alt="Your exported hidden-image PNG, shown over the transparency checkerboard"
              className="w-full rounded-xl"
            />
          ) : (
            <div
              className="flex w-full items-center justify-center rounded-xl"
              style={{ aspectRatio: `${encoded.width} / ${encoded.height}` }}
            >
              {state.phase === 'too-big' ? (
                <p role="alert" className="max-w-64 text-center text-sm font-medium text-danger">
                  The PNG came out {formatBytes(state.size)} — over X's 4.5MB limit.
                  Go back and raise hide strength, or start from a smaller photo.
                </p>
              ) : state.phase === 'error' ? (
                <p role="alert" className="max-w-64 text-center text-sm font-medium text-danger">
                  {state.message}
                </p>
              ) : (
                <p className="text-sm text-fg-dim">Quantizing PNG-8…</p>
              )}
            </div>
          )}
          {state.phase === 'ready' && (
            <div className="tabular-nums flex items-center justify-between pt-3 text-xs text-fg-dim">
              <span>
                {encoded.width}×{encoded.height} · PNG-8 with alpha
              </span>
              <span>{formatBytes(state.blob.size)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 pt-4">
          <PrimaryButton
            onClick={() => void savePng()}
            disabled={state.phase !== 'ready'}
            progress={state.phase === 'working' ? state.progress : null}
          >
            {state.phase === 'working' ? 'Exporting…' : 'Save PNG'}
          </PrimaryButton>
          {canCopy && (
            <GhostButton onClick={() => void copyImage()} className="w-full">
              Copy image
            </GhostButton>
          )}
        </div>

        {/* Posting checklist */}
        <section
          aria-label="Posting checklist"
          className="mt-6 rounded-2xl border border-fg/10 bg-[#0E0E10] p-5"
        >
          <h2 className="font-display text-lg font-bold">Before you post</h2>
          <ol className="space-y-3 pt-3">
            {CHECKLIST.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span
                  aria-hidden
                  className={`font-display tabular-nums mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    item.danger ? 'bg-danger text-ink' : 'bg-fg/10 text-fg-dim'
                  }`}
                >
                  {i + 1}
                </span>
                <p
                  className={`text-sm leading-relaxed ${
                    item.danger ? 'font-medium text-danger' : 'text-fg'
                  }`}
                >
                  {item.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Send to computer helper */}
        <section className="mt-4 rounded-2xl border border-fg/10 p-5">
          <h2 className="font-display text-base font-bold">Send it to your computer</h2>
          <p className="pt-1.5 text-sm leading-relaxed text-fg-dim">
            Posting happens on desktop, so get the file there losslessly: use Save
            PNG and AirDrop it, or email it to yourself as an attachment. Anything
            that "optimizes" the image will break the trick.
          </p>
        </section>

        <button
          type="button"
          onClick={onRestart}
          className="mt-6 flex min-h-11 w-full items-center justify-center text-sm font-medium text-fg-dim transition-colors duration-150 hover:text-fg"
        >
          Start over
        </button>
      </div>

      {toast && (
        <div
          role="status"
          className="animate-fade-up fixed inset-x-0 z-50 flex justify-center"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
        >
          <span className="rounded-full bg-fg px-4 py-2.5 text-sm font-medium text-ink shadow-xl">
            {toast}
          </span>
        </div>
      )}
    </div>
  )
}
