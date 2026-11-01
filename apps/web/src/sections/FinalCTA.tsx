import { ArrowRight, Sparkles } from 'lucide-react'
import { Reveal } from '../components/Reveal'

export function FinalCTA() {
  return (
    <section id="cta" className="relative overflow-hidden py-16 sm:py-24">
      <div className="shell">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-[rgba(242,149,89,0.2)] bg-ink-900 px-6 py-14 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(242,149,89,0.35),transparent_55%),radial-gradient(ellipse_at_85%_100%,rgba(242,212,146,0.22),transparent_55%),radial-gradient(ellipse_at_60%_40%,rgba(184,176,141,0.16),transparent_60%)]"
            />
            <div aria-hidden="true" className="absolute inset-0 grid-lines opacity-40" />

            <div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-400/10 animate-spin-slow"
            />
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-azure-400/15 animate-spin-reverse"
            />

            <div className="relative mx-auto max-w-2xl">
              <span className="eyebrow">
                <Sparkles className="h-3 w-3 text-mint-300" />
                Connect. Collaborate. Build. Grow.
              </span>

              <h2 className="mt-5 text-[2rem] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[2.9rem]">
                Your next opportunity starts with
                <br className="hidden sm:block" /> a <span className="gradient-text">connection.</span>
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-[13.5px] leading-relaxed text-mist sm:text-[14.5px]">
                Join a growing ecosystem where alumni share experience, students solve real-world problems and
                companies discover demonstrated talent — with consent at the centre.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a href="/register" className="btn-primary group w-full sm:w-auto">
                  Join AlumniConnect
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </a>
                <a href="#features" className="btn-secondary w-full sm:w-auto">
                  Explore the Platform
                </a>
              </div>

              <p className="mt-5 text-[10.5px] text-ash">
                Accounts open with the authenticated build. No payment is required to join.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
