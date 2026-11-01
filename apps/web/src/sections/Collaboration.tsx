import { Fragment, useRef } from 'react'
import {
  ArrowRight,
  Award,
  Briefcase,
  Code2,
  FolderKanban,
  GraduationCap,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { motion } from '../animations/config'
import { gsap, useMotionScene } from '../animations/useMotionScene'

type Node = { label: string; sub: string; icon: LucideIcon; tone: string }

const nodes: Node[] = [
  { label: 'Alumni', sub: 'Experience & expertise', icon: GraduationCap, tone: 'text-brand-300' },
  { label: 'Challenges', sub: 'Real-world problems', icon: Target, tone: 'text-azure-300' },
  { label: 'Solutions', sub: 'Student work', icon: Code2, tone: 'text-mint-300' },
  { label: 'Recognition', sub: 'Scores & feedback', icon: Award, tone: 'text-azure-400' },
  { label: 'Portfolios', sub: 'Verified proof', icon: FolderKanban, tone: 'text-brand-400' },
  { label: 'Opportunities', sub: 'Consent-based access', icon: Briefcase, tone: 'text-mint-400' },
]

function ChainNode({ node }: { node: Node }) {
  return (
    <div className="group flex flex-col items-center text-center">
      <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-[rgba(242,149,89,0.2)] bg-ink-900/90 shadow-card transition group-hover:-translate-y-1 group-hover:border-brand-500/60">
        <node.icon className={`h-5 w-5 ${node.tone}`} />
        <span className="absolute inset-0 rounded-2xl bg-brand-500/[0.12] opacity-0 blur-lg transition group-hover:opacity-100" />
      </div>
      <p className="mt-3 text-[12.5px] font-semibold text-cream">{node.label}</p>
      <p className="mt-0.5 text-[10.5px] leading-snug text-ash">{node.sub}</p>
    </div>
  )
}

export function Collaboration() {
  const root = useRef<HTMLElement>(null)

  useMotionScene(root, () => {
    gsap.fromTo(
      '[data-chain-line]',
      { scaleX: 0 },
      {
        scaleX: 1,
        transformOrigin: 'left center',
        duration: motion.duration.draw,
        ease: motion.ease.inOut,
        scrollTrigger: { trigger: root.current, start: 'top 68%', once: true },
      },
    )
  })

  return (
    <section ref={root} className="section-pad relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/[0.09] blur-[130px]"
      />

      <div className="shell relative">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Collaboration loop"
            title={
              <>
                Where experience meets <span className="gradient-text">innovation.</span>
              </>
            }
            description="Alumni expertise and student creativity come together to solve practical problems — and every result feeds the next opportunity."
          />
        </Reveal>

        <Reveal delay={100}>
          <div className="relative mt-12 overflow-hidden rounded-3xl border border-[rgba(242,149,89,0.15)] bg-ink-900/50 p-6 backdrop-blur sm:p-10">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/50 to-transparent" />

            <div className="relative hidden items-center gap-2 lg:flex">
              <div
                aria-hidden="true"
                data-chain-line
                className="absolute left-[8%] right-[8%] top-7 -z-0 h-px bg-gradient-to-r from-brand-500/30 via-azure-500/40 to-mint-400/40"
              />
              {nodes.map((node, index) => (
                <Fragment key={node.label}>
                  <div className="relative z-10 flex-1">
                    <ChainNode node={node} />
                  </div>
                  {index < nodes.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand-400/70" aria-hidden="true" />
                  )}
                </Fragment>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:hidden">
              {nodes.map((node) => (
                <ChainNode key={node.label} node={node} />
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-white/[0.06] bg-ink-950/50 px-4 py-3 text-center">
              {['Alumni', 'Real-world challenges', 'Student solutions', 'Alumni recognition', 'Student portfolios', 'Company opportunities'].map(
                (item, index, list) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <span className="text-[11px] text-mist">{item}</span>
                    {index < list.length - 1 && <ArrowRight className="h-3 w-3 text-brand-500/70" />}
                  </span>
                ),
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
