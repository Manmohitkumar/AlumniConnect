import { ArrowRight, Info } from 'lucide-react'
import { AdminMockup } from '../components/AdminMockup'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'

export function University() {
  return (
    <section id="university" className="section-pad relative overflow-hidden">
      <div className="shell grid items-center gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10">
        <div>
          <Reveal>
            <SectionHeading
              eyebrow="University engagement"
              title={
                <>
                  One centralized view of
                  <br />
                  alumni <span className="gradient-text">engagement.</span>
                </>
              }
              description="Understand and strengthen alumni relationships through centralized information and measurable collaboration — built from the same records students and alumni create."
            />
          </Reveal>

          <Reveal delay={90}>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {[
                'Alumni records & profile updates',
                'Challenges posted and completed',
                'Student participation',
                'Mentorship activity',
                'Verified appreciation records',
                'Exportable engagement reports',
              ].map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-mist">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={140}>
            <div className="mt-6 flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-azure-300" />
              <p className="text-[11px] leading-relaxed text-ash">
                Reports support institutional documentation. They do not guarantee accreditation scores,
                rankings or outcomes.
              </p>
            </div>
          </Reveal>

          <Reveal delay={180}>
            <a href="#contact" className="btn-secondary group mt-6">
              Discuss university access
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </a>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <AdminMockup />
        </Reveal>
      </div>
    </section>
  )
}
