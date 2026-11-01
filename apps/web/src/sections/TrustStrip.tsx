import { Briefcase, Building2, GraduationCap, Landmark, Lightbulb, Users } from 'lucide-react'
import { Reveal } from '../components/Reveal'

const placeholders = [
  { label: 'University Partners', icon: Landmark },
  { label: 'Alumni Chapters', icon: GraduationCap },
  { label: 'Industry Partners', icon: Building2 },
  { label: 'Career Services', icon: Briefcase },
  { label: 'Innovation Cells', icon: Lightbulb },
  { label: 'Recruiter Network', icon: Users },
]

export function TrustStrip() {
  return (
    <section aria-label="Ecosystem" className="relative border-y border-[rgba(242,149,89,0.1)] bg-ink-900/40">
      <div className="shell py-12 sm:py-14">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-semibold sm:text-2xl">
              Connecting universities, alumni, students and industry
            </h2>
            <p className="mt-2 text-[13px] text-mist">
              Building a collaborative ecosystem where professional experience meets student innovation.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[rgba(242,149,89,0.12)] bg-[rgba(242,149,89,0.08)] sm:grid-cols-3 lg:grid-cols-6">
            {placeholders.map((placeholder) => (
              <div
                key={placeholder.label}
                className="group flex items-center justify-center gap-2 bg-ink-950/80 px-3 py-4 transition hover:bg-ink-800/70"
              >
                <placeholder.icon className="h-4 w-4 shrink-0 text-ash transition group-hover:text-brand-300" />
                <span className="truncate text-[11px] font-medium text-mist transition group-hover:text-cream">
                  {placeholder.label}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[10.5px] text-ash">
            Placeholder ecosystem — no university or company affiliation is implied. Verified partner logos
            appear only once an affiliation is confirmed.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
