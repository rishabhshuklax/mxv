import { useId, useRef, useState, type ReactNode } from 'react'

/* ---------- Button ---------- */

export function PrimaryButton({
  children,
  onClick,
  disabled,
  progress,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  /** 0..1 — morphs the button into a progress bar. */
  progress?: number | null
  className?: string
}) {
  const busy = progress != null
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`relative h-14 w-full overflow-hidden rounded-2xl bg-torch font-display text-base font-bold text-ink transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-40 ${className}`}
    >
      {busy && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-ink/20 transition-[width] duration-200 ease-out"
          style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  )
}

export function GhostButton({
  children,
  onClick,
  className = '',
  ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border border-fg/15 px-4 text-sm font-medium text-fg transition-colors duration-150 hover:border-fg/30 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  )
}

/* ---------- Slider with floating value badge ---------- */

export function LabeledSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  format = (v) => String(v),
}: {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  const id = useId()
  const [dragging, setDragging] = useState(false)
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="relative">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        <span className="tabular-nums text-sm text-fg-dim">{format(value)}</span>
      </div>
      <div className="relative">
        {dragging && (
          <span
            aria-hidden
            className="tabular-nums pointer-events-none absolute -top-7 z-10 -translate-x-1/2 rounded-lg bg-torch px-2 py-0.5 text-xs font-bold text-ink"
            style={{ left: `clamp(20px, ${pct}%, calc(100% - 20px))` }}
          >
            {format(value)}
          </span>
        )}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={() => setDragging(true)}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onBlur={() => setDragging(false)}
        />
      </div>
    </div>
  )
}

/* ---------- Bottom sheet ---------- */

export function BottomSheet({
  collapsedLabel,
  children,
  open,
  onOpenChange,
}: {
  collapsedLabel: ReactNode
  children: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const startY = useRef<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const onHandlePointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onHandlePointerUp = (e: React.PointerEvent) => {
    if (startY.current === null) return
    const dy = e.clientY - startY.current
    startY.current = null
    if (dy < -24) onOpenChange(true)
    else if (dy > 24) onOpenChange(false)
    else onOpenChange(!open)
  }

  return (
    <div
      ref={sheetRef}
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-fg/10 bg-[#0E0E10] shadow-[0_-8px_32px_rgba(0,0,0,0.6)] transition-transform duration-200 ease-out"
      style={{
        maxHeight: '45dvh',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Collapse tools' : 'Expand tools'}
        onPointerDown={onHandlePointerDown}
        onPointerUp={onHandlePointerUp}
        onClick={() => onOpenChange(!open)}
        className="flex h-16 w-full flex-col items-center justify-center gap-1.5"
        style={{ touchAction: 'none' }}
      >
        <span aria-hidden className="h-1 w-10 rounded-full bg-fg/25" />
        <span className="text-xs font-medium text-fg-dim">{collapsedLabel}</span>
      </button>
      {open && (
        <div className="animate-fade-up overflow-y-auto px-5 pb-5" style={{ maxHeight: 'calc(45dvh - 64px)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ---------- Step header ---------- */

export function StepHeader({
  step,
  title,
  onBack,
}: {
  step: number // 1..4
  title: string
  onBack: () => void
}) {
  return (
    <header
      className="flex items-center gap-3 px-3 py-2"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="flex h-11 w-11 items-center justify-center rounded-full text-fg transition-colors duration-150 hover:bg-fg/10"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M12.5 4L6.5 10L12.5 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <h1 className="font-display flex-1 text-lg font-bold">{title}</h1>
      <div className="flex items-center gap-1.5 pr-2" aria-label={`Step ${step} of 4`}>
        {[1, 2, 3, 4].map((s) => (
          <span
            key={s}
            aria-hidden
            className={`h-1.5 rounded-full transition-all duration-200 ${
              s === step ? 'w-5 bg-torch' : s < step ? 'w-1.5 bg-fg/60' : 'w-1.5 bg-fg/20'
            }`}
          />
        ))}
      </div>
    </header>
  )
}
