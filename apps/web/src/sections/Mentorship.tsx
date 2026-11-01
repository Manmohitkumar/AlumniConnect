import { ArrowRight, CalendarClock, GraduationCap, MessagesSquare, Sparkles } from 'lucide-react'
import { MentorshipMockup } from '../components/MentorshipMockup'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'

const capabilities = [
  { title: 'Mentorship requests', description: 'Find alumni by expertise and request a session.', icon: MessagesSquare },
  { title: 'Career guidance & project reviews', description: 'Structured sessions with an agenda and outcomes.', icon: GraduationCap },
  { title: 'Talks and roundtables', description: 'Group sessions, career talks and reviews.', icon: CalendarClock },
  { title: 'Knowledge Vault', description: 'Approved lectures, case studies and industry insights.', icon: Sparkles },
]

export function Mentorship() {
  return (
    <section id="mentorship" className="section-pad relative">
      <div className="shell grid items-center gap-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
        <Reveal delay={80} className="order-2 lg:order-1">
          <MentorshipMockup />
        </Reveal>

        <div className="order-1 lg:order-2">
          <Reveal>
            <SectionHeading
              eyebrow="Mentorship & Knowledge Vault"
              title={
                <>
                  Learn from experience.
                  <br />
                  Grow through <span className="gradient-text">guidance.</span>
                </>
              }
              description="Connect with alumni who can share industry knowledge, guide career decisions, review projects and help students develop professionally."
            />
          </Reveal>

          <Reveal delay={90}>
            <ul className="mt-7 space-y-3">
              {capabilities.map((capability) => (
                <li key={capability.title} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[rgba(242,149,89,0.18)] bg-white/[0.03] text-brand-300">
                    <capability.icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-medium text-cream">{capability.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-ash">{capability.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={140}>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="/login" className="btn-secondary group">
                Explore mentorship
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </a>
              <span className="text-[10.5px] text-ash">Mentors are alumni who opt in to be discoverable.</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
