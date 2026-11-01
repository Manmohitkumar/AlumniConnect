import { ArrowRight, Award, Eye, FolderKanban, Lock, ShieldCheck } from 'lucide-react'
import { PortfolioMockup } from '../components/PortfolioMockup'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'

const benefits = [
  { text: 'Demonstrate practical experience', icon: FolderKanban },
  { text: 'Showcase completed projects', icon: Eye },
  { text: 'Display alumni recommendations', icon: Award },
  { text: 'Share appreciation certificates', icon: ShieldCheck },
  { text: 'Control portfolio visibility', icon: Lock },
]

export function PortfolioSection() {
  return (
    <section id="portfolio" className="section-pad relative overflow-hidden">
      <div className="shell grid items-center gap-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
        <div>
          <Reveal>
            <SectionHeading
              eyebrow="Student portfolio & company discovery"
              title={
                <>
                  Let your work speak
                  <br />
                  for <span className="gradient-text">your skills.</span>
                </>
              }
              description="Every completed challenge becomes an opportunity to demonstrate what you can actually build. Students showcase projects, practical skills, alumni feedback and recognised achievements in one portfolio."
            />
          </Reveal>

          <Reveal delay={90}>
            <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <li key={benefit.text} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                  <benefit.icon className="h-3.5 w-3.5 shrink-0 text-mint-300" />
                  <span className="text-[11.5px] text-mist">{benefit.text}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={140}>
            <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-3.5 py-3">
              <p className="text-[11px] leading-relaxed text-mist">
                <span className="font-semibold text-cream">Consent first.</span> Companies see only the portfolios
                students have shared. Sharing is not a job guarantee, and access can be revoked at any time.
              </p>
            </div>
          </Reveal>

          <Reveal delay={180}>
            <a href="/p/student-name" className="btn-secondary group mt-6">
              Explore student portfolios
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </a>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <PortfolioMockup />
        </Reveal>
      </div>
    </section>
  )
}
