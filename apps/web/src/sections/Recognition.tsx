import { useRef } from 'react'
import { Info, Star } from 'lucide-react'
import { CertificateMockup } from '../components/CertificateMockup'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { recognitionPoints } from '../data/content'
import { motion } from '../animations/config'
import { gsap, useMotionScene } from '../animations/useMotionScene'

export function Recognition() {
  const root = useRef<HTMLElement>(null)

  useMotionScene(root, () => {
    gsap.from('[data-certificate]', {
      y: 48,
      rotate: 3,
      autoAlpha: 0,
      duration: motion.duration.slow,
      ease: motion.ease.soft,
      scrollTrigger: { trigger: '[data-certificate]', start: 'top 86%', once: true },
    })
  })

  return (
    <section ref={root} id="recognition" className="section-pad relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-10%] top-1/4 h-[26rem] w-[26rem] rounded-full bg-brand-500/[0.12] blur-[120px]"
      />

      <div className="shell relative">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Recognition"
            title={
              <>
                Every great contribution
                <br className="hidden sm:block" /> deserves <span className="gradient-text">recognition.</span>
              </>
            }
            description="AlumniConnect gives alumni a structured way to recognise student contributions through feedback, recommendations and digital appreciation records."
          />
        </Reveal>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div data-certificate className="relative mx-auto w-full max-w-[430px] self-center">
            <div className="relative">
              <div className="absolute -right-3 -top-4 z-10 rotate-3 rounded-xl border border-mint-400/30 bg-ink-800/95 px-3 py-2 shadow-card backdrop-blur">
                <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-ash">
                  <Star className="h-3 w-3 text-mint-300" /> Evaluation
                </p>
                <p className="font-display text-base font-semibold text-cream">92 / 100</p>
              </div>
              <CertificateMockup className="rotate-[-1.5deg]" />
              <div className="absolute -bottom-5 -left-4 z-10 rounded-xl border border-[rgba(242,149,89,0.22)] bg-ink-800/95 px-3 py-2 shadow-card backdrop-blur">
                <p className="text-[9px] uppercase tracking-[0.12em] text-ash">Status</p>
                <p className="text-[11px] font-semibold text-mint-300">Issued &amp; verifiable</p>
              </div>
            </div>
          </div>

          <div>
            <Reveal delay={80}>
              <div className="grid gap-3 sm:grid-cols-2">
                {recognitionPoints.map((point) => (
                  <div
                    key={point.label}
                    className="rounded-2xl border border-[rgba(242,149,89,0.15)] bg-ink-800/60 p-4 transition hover:border-brand-500/40"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-brand-300">
                      <point.icon className="h-3.5 w-3.5" />
                    </span>
                    <p className="mt-3 text-[9.5px] uppercase tracking-[0.12em] text-ash">{point.label}</p>
                    <p className="mt-1 text-[12.5px] font-medium text-cream">{point.value}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[rgba(242,149,89,0.15)] bg-white/[0.02] p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                <p className="text-[11.5px] leading-relaxed text-mist">
                  These are alumni appreciation records, not official university credentials. Each record carries
                  a unique ID, a QR code and an integrity hash that resolves to a public verification page — and
                  states exactly what it does and does not certify.
                </p>
              </div>
            </Reveal>

            <Reveal delay={180}>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href="/verify" className="btn-secondary !px-4 !py-2.5 !text-[12.5px]">
                  Verify a certificate
                </a>
                <a href="#portfolio" className="btn-secondary !px-4 !py-2.5 !text-[12.5px]">
                  See how it feeds a portfolio
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
