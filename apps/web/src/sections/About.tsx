import { ArrowRight, Check } from 'lucide-react'
import { NetworkOrbit } from '../components/NetworkOrbit'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'

const benefits = [
  'Connect with experienced alumni.',
  'Work on practical industry challenges.',
  'Build a portfolio through demonstrated skills and achievements.',
]

export function About() {
  return (
    <section id="about" className="section-pad relative overflow-hidden">
      <div className="shell grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
        <div>
          <Reveal>
            <SectionHeading
              eyebrow="About AlumniConnect"
              title={
                <>
                  One connected ecosystem.
                  <br />
                  <span className="gradient-text">Endless possibilities.</span>
                </>
              }
              description="AlumniConnect brings alumni, students, universities and companies together through one centralized digital ecosystem. Alumni share real-world problems, students demonstrate their abilities through practical solutions, and universities strengthen their alumni engagement."
            />
          </Reveal>

          <Reveal delay={100}>
            <ul className="mt-8 space-y-3">
              {benefits.map((benefit, index) => (
                <li key={benefit} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-mint-400/25 bg-mint-400/[0.08]">
                    <Check className="h-3.5 w-3.5 text-mint-300" />
                  </span>
                  <div>
                    <p className="text-[13.5px] font-medium text-cream">{benefit}</p>
                    <p className="mt-0.5 text-[12px] text-ash">
                      {[
                        'A searchable network of professionals who opted in to mentor and collaborate.',
                        'Scoped challenges with clear deliverables, deadlines and published evaluation criteria.',
                        'Work, feedback and recognition collected in one shareable record — not scattered files.',
                      ][index]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={160}>
            <a href="#features" className="btn-secondary group mt-8">
              Discover our platform
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </a>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <NetworkOrbit />
        </Reveal>
      </div>
    </section>
  )
}
