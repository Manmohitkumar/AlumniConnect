import { ArrowUpRight, Award, Check, Clock, Search, Target, Users } from 'lucide-react'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { QrPattern } from '../components/QrPattern'
import { features } from '../data/content'

function SearchPreview() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-ink-950/60 p-3">
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5">
        <Search className="h-3 w-3 text-ash" />
        <span className="text-[9.5px] text-ash">Search by company, skill or graduation year</span>
      </div>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {[
          { name: 'Alumnus Name', meta: 'Product Engineer · 2018', skill: 'Product' },
          { name: 'Alumna Name', meta: 'Data Lead · 2015', skill: 'Analytics' },
        ].map((person) => (
          <div key={person.name} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5">
            <span className="h-6 w-6 shrink-0 rounded-lg bg-gradient-to-br from-brand-500 to-azure-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] font-medium text-cream">{person.name}</p>
              <p className="truncate text-[8px] text-ash">{person.meta}</p>
            </div>
            <span className="shrink-0 rounded bg-white/[0.05] px-1 py-0.5 text-[7px] text-mist">{person.skill}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChallengePreview() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-ink-950/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium text-cream">Customer Complaint Analyzer</p>
          <p className="mt-0.5 text-[8px] text-ash">Paid task · Team of 2</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-mint-400/10 px-1.5 py-0.5 text-[7.5px] text-mint-300">
          <Clock className="h-2 w-2" /> 14d
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {['Python', 'Data', 'Web'].map((skill) => (
          <span key={skill} className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[7.5px] text-mist">
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-white/[0.05] pt-2">
        <span className="inline-flex items-center gap-1 text-[7.5px] text-ash">
          <Users className="h-2.5 w-2.5" /> 18 submissions
        </span>
        <span className="text-[7.5px] text-brand-300">View details</span>
      </div>
    </div>
  )
}

function CertificatePreview() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-ink-950/60 p-3">
      <div className="rounded-lg bg-cream p-1.5 text-ink-950">
        <QrPattern className="h-10 w-10" seed={4} />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[9.5px] font-semibold text-cream">
          <Award className="h-3 w-3 text-mint-300" /> Appreciation record
        </p>
        <p className="font-mono text-[8px] text-ash">AC-2026-0000 · verified</p>
        <p className="mt-0.5 truncate text-[7.5px] text-ash">Not an official university credential</p>
      </div>
    </div>
  )
}

function AnalyticsPreview() {
  const bars = [48, 66, 54, 82, 72, 92]
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-ink-950/60 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-medium text-cream">Engagement by term</p>
        <span className="demo-note !px-1.5 !py-0.5 !text-[7px]">Demo data</span>
      </div>
      <div className="mt-2 flex h-12 items-end gap-1.5">
        {bars.map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t bg-gradient-to-t from-brand-500/30 to-mint-400/80"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  )
}

const previews = {
  search: SearchPreview,
  challenge: ChallengePreview,
  certificate: CertificatePreview,
  analytics: AnalyticsPreview,
}

export function Features() {
  return (
    <section id="features" className="section-pad relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 h-[30rem] w-[40rem] -translate-x-1/2 rounded-full bg-brand-500/[0.08] blur-[120px]"
      />
      <div className="shell relative">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Platform features"
            title={
              <>
                Everything needed to connect,
                <br className="hidden sm:block" /> collaborate and <span className="gradient-text">grow.</span>
              </>
            }
            description="Powerful tools that transform alumni relationships into practical learning, professional collaboration and meaningful opportunities."
          />
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          {features.map((feature, index) => {
            const Preview = feature.preview ? previews[feature.preview] : null
            const wide = feature.span === 'lg:col-span-7'
            return (
              <Reveal key={feature.name} delay={index * 45} className={`md:col-span-1 ${feature.span}`}>
                <article className="card card-hover group flex h-full flex-col p-5 sm:p-6">
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gradient-to-br ${feature.accent} blur-2xl`}
                  />
                  <div className="relative flex items-start justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-[rgba(242,149,89,0.18)] bg-white/[0.04] text-brand-300 transition group-hover:border-brand-500/50 group-hover:text-brand-200">
                      <feature.icon className="h-[18px] w-[18px]" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 -translate-y-1 translate-x-1 text-ash opacity-0 transition group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
                  </div>

                  <h3 className="relative mt-4 text-[15.5px] font-semibold leading-snug">{feature.name}</h3>
                  <p className="relative mt-2 text-[12.5px] leading-relaxed text-mist">{feature.description}</p>

                  <ul className={`relative mt-4 grid gap-1.5 ${wide ? 'sm:grid-cols-2' : ''}`}>
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-1.5 text-[11px] leading-snug text-mist">
                        <Check className="mt-[1px] h-3 w-3 shrink-0 text-brand-400" />
                        {bullet}
                      </li>
                    ))}
                  </ul>

                  {Preview && (
                    <div className="relative mt-auto pt-4">
                      <Preview />
                    </div>
                  )}
                </article>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={80}>
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] text-ash">
            <Target className="h-3.5 w-3.5 text-brand-400" />
            Every module shares one data model — the same records power the 2D platform, the dashboards and the
            3D campus.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
