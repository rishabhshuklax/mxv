import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

const HOLD_MS = 350
const WIPE_MS = 250

export interface HoldPreviewProps {
  /** Pre-rendered "timeline on white" state. */
  white: HTMLCanvasElement | null
  /** Pre-rendered "revealed on black" state. */
  black: HTMLCanvasElement | null
  className?: string
  /** Show the accessible toggle button (default true). */
  showToggle?: boolean
  /** Optional hint chip rendered over the idle state. */
  hint?: string
  ariaLabel?: string
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const cb = () => setReduced(mq.matches)
    mq.addEventListener('change', cb)
    return () => mq.removeEventListener('change', cb)
  }, [])
  return reduced
}

/**
 * The brand interaction. Shows the on-white timeline state; press and hold
 * anywhere → a torch progress ring charges for ~350ms, then a flashlight wipe
 * reveals the on-black state from the touch point. Release returns.
 *
 * Both states arrive pre-rendered, so the flip never computes pixels
 * mid-gesture. Space toggles for keyboard users; a small button toggles for
 * anyone who can't hold.
 */
export default function HoldPreview({
  white,
  black,
  className = '',
  showToggle = true,
  hint,
  ariaLabel = 'Hidden image preview. Press and hold to reveal.',
}: HoldPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const whiteRef = useRef<HTMLCanvasElement>(null)
  const blackRef = useRef<HTMLCanvasElement>(null)
  const holdTimer = useRef<number | null>(null)
  const reducedMotion = usePrefersReducedMotion()

  const [holding, setHolding] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  const [touched, setTouched] = useState(false)

  const aspect = useMemo(() => {
    const src = white ?? black
    return src ? `${src.width} / ${src.height}` : '1 / 1'
  }, [white, black])

  useEffect(() => {
    for (const [src, ref] of [
      [white, whiteRef],
      [black, blackRef],
    ] as const) {
      const el = ref.current
      if (!el || !src) continue
      el.width = src.width
      el.height = src.height
      el.getContext('2d')!.drawImage(src, 0, 0)
    }
  }, [white, black])

  const clearHoldTimer = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  const startHold = (e: ReactPointerEvent) => {
    if (!e.isPrimary || pinned) return
    const rect = containerRef.current!.getBoundingClientRect()
    setPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setHolding(true)
    setTouched(true)
    try {
      containerRef.current?.setPointerCapture(e.pointerId)
    } catch {
      /* pointer may already be gone */
    }
    clearHoldTimer()
    holdTimer.current = window.setTimeout(() => {
      setRevealed(true)
      if (!reducedMotion && 'vibrate' in navigator) navigator.vibrate(10)
    }, HOLD_MS)
  }

  const endHold = useCallback(() => {
    clearHoldTimer()
    setHolding(false)
    if (!pinned) setRevealed(false)
  }, [pinned])

  useEffect(() => () => clearHoldTimer(), [])

  const togglePinned = () => {
    clearHoldTimer()
    setHolding(false)
    setTouched(true)
    setPoint(null)
    setPinned((p) => {
      setRevealed(!p)
      return !p
    })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      togglePinned()
    }
  }

  const showBlack = revealed
  const origin = point ?? { x: 0, y: 0 }
  const rect = containerRef.current?.getBoundingClientRect()
  const radius = rect
    ? Math.hypot(
        Math.max(origin.x, rect.width - origin.x),
        Math.max(origin.y, rect.height - origin.y),
      )
    : 1200

  const blackStyle = reducedMotion
    ? {
        opacity: showBlack ? 1 : 0,
        transition: `opacity ${WIPE_MS}ms ease-out`,
      }
    : point
      ? {
          clipPath: showBlack
            ? `circle(${Math.ceil(radius)}px at ${origin.x}px ${origin.y}px)`
            : `circle(0px at ${origin.x}px ${origin.y}px)`,
          transition: `clip-path ${WIPE_MS}ms ease-out`,
        }
      : {
          opacity: showBlack ? 1 : 0,
          transition: `opacity 180ms ease-out`,
        }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-pressed={revealed}
        onKeyDown={onKeyDown}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerCancel={endHold}
        onContextMenu={(e) => e.preventDefault()}
        className="relative w-full overflow-hidden select-none"
        style={{
          aspectRatio: aspect,
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          cursor: 'pointer',
        }}
      >
        <canvas
          ref={whiteRef}
          aria-hidden
          className="absolute inset-0 h-full w-full"
        />
        <canvas
          ref={blackRef}
          aria-hidden
          className="absolute inset-0 h-full w-full"
          style={blackStyle}
        />
        {hint && !touched && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="rounded-full bg-ink/70 px-3 py-1.5 text-xs font-medium text-fg backdrop-blur-sm">
              {hint}
            </span>
          </div>
        )}
        {holding && !revealed && point && !reducedMotion && (
          <svg
            className="pointer-events-none absolute"
            style={{ left: point.x - 28, top: point.y - 28 }}
            width="56"
            height="56"
            viewBox="0 0 56 56"
            aria-hidden
          >
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="#FFC833"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 24}
              strokeDashoffset={2 * Math.PI * 24}
              transform="rotate(-90 28 28)"
              style={{
                animation: `hr-ring ${HOLD_MS}ms linear forwards`,
              }}
            />
            <style>{`@keyframes hr-ring { to { stroke-dashoffset: 0; } }`}</style>
          </svg>
        )}
      </div>
      {showToggle && (
        <button
          type="button"
          onClick={togglePinned}
          aria-pressed={pinned}
          className="absolute top-2 right-2 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-ink/70 px-3 text-xs font-medium text-fg backdrop-blur-sm transition-colors duration-150 hover:bg-ink/90"
        >
          {pinned ? 'Back to timeline' : 'Toggle view'}
        </button>
      )}
    </div>
  )
}
