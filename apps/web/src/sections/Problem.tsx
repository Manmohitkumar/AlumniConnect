import { ArrowRight } from 'lucide-react'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { problems } from '../data/content'

export function Problem() {
  return (
    <section id="problem" className="section-pad relative">
      <div className="shell">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="The problem we solve"
            title={
              <>
                Turning fragmented connections into
                <br className="hidden sm:block" /> <span className="gradient-text">meaningful collaboration.</span>
              </>
            }
            description="The connections exist. The structure does not. AlumniConnect replaces scattered records, informal favours and invisible student work with one accountable workflow."
          />
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {problems.map((problem, index) => (
            <Reveal key={problem.title} delay={index * 70}>
              <article className="card card-hover group h-full p-6 sm:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-brand-500/[0.12] blur-2xl transition group-hover:bg-brand-500/[0.2]"
                />
                <div className="relative flex items-start justify-between gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[rgba(242,149,89,0.18)] bg-white/[0.04] text-brand-300">
                    <problem.icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-[10px] tracking-widest text-ash">0{index + 1}</span>
                </div>

                <h3 className="relative mt-5 text-[17px] font-semibold leading-snug">{problem.title}</h3>
                <p className="relative mt-2 text-[13.5px] leading-relaxed text-mist">{problem.description}</p>

                <div className="relative mt-5 flex items-center gap-2 rounded-xl border border-brand-500/20 bg-gradient-to-r from-brand-500/[0.1] to-transparent px-3 py-2.5">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand-300" />
                  <span className="text-[11.5px] font-medium text-brand-200">{problem.solution}</span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
