import { useEffect, useState } from 'react'
import HoldPreview from '../components/HoldPreview'
import { PrimaryButton } from '../components/ui'
import { loadDisplayFont, makeHeroPair, makeStepDemos, type DemoPair } from '../lib/demos'

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Choose what to hide',
    body: 'One photo with a painted teaser, or two photos that swap places.',
  },
  {
    title: 'Tune the illusion',
    body: 'Live preview exactly as X will show it — timeline on white, reveal on black.',
  },
  {
    title: 'Post the PNG',
    body: 'Export a PNG that survives X. Viewers press and hold to see the secret.',
  },
]

export default function Landing({ onStart }: { onStart: () => void }) {
  const [hero, setHero] = useState<DemoPair | null>(null)
  const [demos, setDemos] = useState<[DemoPair, DemoPair, DemoPair] | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      await loadDisplayFont()
      if (!alive) return
      setHero(makeHeroPair())
      setDemos(makeStepDemos())
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <main>
      {/* Hero — itself a working tap-and-hold image */}
      <section
        className="mx-auto max-w-md px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
        aria-label="HoldReveal — press and hold the image to reveal"
      >
        {hero ? (
          <HoldPreview
            white={hero.white}
            black={hero.black}
            hint="Press and hold"
            showToggle
            ariaLabel="Interactive demo. Press and hold, or press Space, to reveal HoldReveal — hide a second picture inside a PNG."
            className="overflow-hidden rounded-3xl"
          />
        ) : (
          <div className="checker aspect-[780/880] w-full rounded-3xl" aria-hidden />
        )}
        <div className="pt-5 pb-2">
          <PrimaryButton onClick={onStart}>Make yours</PrimaryButton>
        </div>
      </section>

      {/* Checkerboard section rhythm */}
      <div className="checker my-10 h-5 w-full" aria-hidden />

      {/* Three steps */}
      <section className="mx-auto max-w-md px-4" aria-label="How it works">
        <ol className="space-y-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-4">
              <div className="w-24 shrink-0">
                {demos ? (
                  <HoldPreview
                    white={demos[i].white}
                    black={demos[i].black}
                    showToggle={false}
                    ariaLabel={`Mini demo for step ${i + 1}: press and hold to preview the reveal.`}
                    className="overflow-hidden rounded-2xl border border-fg/10"
                  />
                ) : (
                  <div className="checker aspect-square w-full rounded-2xl" aria-hidden />
                )}
              </div>
              <div className="min-w-0 pt-1">
                <div className="font-display text-xs font-bold text-torch">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h2 className="font-display pt-1 text-xl leading-tight font-bold">
                  {step.title}
                </h2>
                <p className="pt-1.5 text-sm leading-relaxed text-fg-dim">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="checker my-10 h-5 w-full" aria-hidden />

      {/* Privacy + CTA */}
      <section className="mx-auto max-w-md px-4 pb-12 text-center">
        <p className="text-sm text-fg-dim">
          Runs 100% in your browser — images never leave your device.
        </p>
        <div className="pt-5">
          <PrimaryButton onClick={onStart}>Make yours</PrimaryButton>
        </div>
        <p
          className="pt-10 text-xs text-fg-dim/60"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          HoldReveal · press-and-hold hidden images for X
        </p>
      </section>
    </main>
  )
}
