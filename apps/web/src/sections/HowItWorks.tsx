import { useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { steps } from '../data/content'
import { motion } from '../animations/config'
import { gsap, useMotionScene } from '../animations/useMotionScene'

export function HowItWorks() {
  const root = useRef<HTMLElement>(null)

  useMotionScene(root, () => {
    gsap.fromTo(
      '[data-connector]',
      { scaleX: 0, scaleY: 0 },
      {
        scaleX: 1,
        scaleY: 1,
        transformOrigin: 'left top',
        duration: motion.duration.draw,
        ease: motion.ease.inOut,
        scrollTrigger: { trigger: root.current, start: 'top 70%', once: true },
      },
    )
  })

  return (
    <section ref={root} id="workflow" className="section-pad relative">
      <div className="shell">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="How it works"
            title={
              <>
                From real-world problems to
                <br className="hidden sm:block" /> <span className="gradient-text">real opportunities.</span>
              </>
            }
            description="One connected workflow transforms alumni experience into practical student learning and professional recognition."
          />
        </Reveal>

        <div className="relative mt-14">
          <div
            aria-hidden="true"
            data-connector
            className="absolute left-[21px] top-2 h-[calc(100%-2rem)] w-px bg-gradient-to-b from-brand-500/60 via-azure-500/30 to-transparent lg:left-0 lg:top-[22px] lg:h-px lg:w-full lg:bg-gradient-to-r lg:from-brand-500/50 lg:via-azure-500/35 lg:to-mint-400/50"
          />

          <ol className="grid gap-7 sm:grid-cols-2 lg:grid-cols-6 lg:gap-3">
            {steps.map((step, index) => (
              <li key={step.num}>
                <Reveal delay={index * 70}>
                  <div className="group relative flex gap-4 lg:block">
                    <div className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[rgba(242,149,89,0.25)] bg-ink-900 text-brand-300 transition group-hover:border-brand-500/70 group-hover:bg-ink-800">
                      <step.icon className="h-4 w-4" />
                      <span className="absolute -right-1.5 -top-1.5 rounded-md bg-ink-950 px-1 font-mono text-[8px] text-ash">
                        {step.num}
                      </span>
                    </div>
                    <div className="pb-1 lg:mt-6 lg:pb-0">
                      <h3 className="text-[14px] font-semibold leading-snug text-cream">{step.title}</h3>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-mist">{step.description}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>

        <Reveal delay={120}>
          <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[rgba(242,149,89,0.15)] bg-gradient-to-r from-brand-500/[0.09] via-azure-500/[0.05] to-mint-400/[0.07] p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-[13.5px] font-semibold text-cream">One record, six handoffs</p>
              <p className="mt-1 text-[12px] text-mist">
                The challenge, the submission, the score and the certificate are the same records at every
                step — nothing is re-entered.
              </p>
            </div>
            <a href="#challenges" className="btn-secondary group shrink-0 !px-4 !py-2 !text-[12.5px]">
              See sample challenges
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
