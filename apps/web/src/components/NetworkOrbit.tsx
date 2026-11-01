import { useRef } from 'react'
import { Building2, GraduationCap, Landmark, Sparkles } from 'lucide-react'
import { motion } from '../animations/config'
import { gsap, useMotionScene } from '../animations/useMotionScene'

const nodes = [
  { label: 'Alumni', icon: GraduationCap, position: 'left-1/2 top-[3%] -translate-x-1/2', tone: 'text-brand-300', ring: 'border-brand-500/40', glow: 'bg-brand-500/20' },
  { label: 'Companies', icon: Building2, position: 'right-[1%] top-1/2 -translate-y-1/2', tone: 'text-azure-300', ring: 'border-azure-500/40', glow: 'bg-azure-500/20' },
  { label: 'Students', icon: Sparkles, position: 'left-1/2 bottom-[3%] -translate-x-1/2', tone: 'text-mint-300', ring: 'border-mint-400/40', glow: 'bg-mint-400/20' },
  { label: 'Universities', icon: Landmark, position: 'left-[1%] top-1/2 -translate-y-1/2', tone: 'text-brand-400', ring: 'border-brand-400/40', glow: 'bg-brand-400/20' },
]

export function NetworkOrbit() {
  const root = useRef<HTMLDivElement>(null)

  useMotionScene(root, () => {
    gsap.fromTo(
      '[data-orbit-line]',
      { strokeDasharray: 260, strokeDashoffset: 260, autoAlpha: 0.25 },
      {
        strokeDashoffset: 0,
        autoAlpha: 0.6,
        duration: motion.duration.draw,
        ease: motion.ease.inOut,
        stagger: 0.1,
        scrollTrigger: { trigger: root.current, start: 'top 82%', once: true },
      },
    )

    gsap.from('[data-orbit-ring]', {
      autoAlpha: 0,
      duration: motion.duration.slow,
      ease: motion.ease.soft,
      stagger: 0.12,
      scrollTrigger: { trigger: root.current, start: 'top 82%', once: true },
    })
  })

  return (
    <div ref={root} className="relative mx-auto aspect-square w-full max-w-[470px]">
      <div
        aria-hidden="true"
        className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(242,149,89,0.22),transparent_65%)] blur-2xl"
      />

      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="orbit-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F29559" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#B8B08D" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#F2D492" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <g stroke="url(#orbit-line)" strokeWidth="1" fill="none">
          <circle data-orbit-ring cx="200" cy="200" r="128" strokeOpacity="0.25" strokeDasharray="2 8" />
          <circle data-orbit-ring cx="200" cy="200" r="92" strokeOpacity="0.18" />
          <circle data-orbit-ring cx="200" cy="200" r="160" strokeOpacity="0.12" strokeDasharray="1 10" />
          <line data-orbit-line x1="200" y1="200" x2="200" y2="46" strokeOpacity="0.5" />
          <line data-orbit-line x1="200" y1="200" x2="354" y2="200" strokeOpacity="0.5" />
          <line data-orbit-line x1="200" y1="200" x2="200" y2="354" strokeOpacity="0.5" />
          <line data-orbit-line x1="200" y1="200" x2="46" y2="200" strokeOpacity="0.5" />
        </g>
        {[0, 1, 2, 3].map((index) => (
          <circle key={index} r="2.5" fill="#F2D492" opacity="0.9">
            <animateMotion
              dur={`${9 + index * 2}s`}
              repeatCount="indefinite"
              path={
                [
                  'M 200 200 L 200 46 L 200 200',
                  'M 200 200 L 354 200 L 200 200',
                  'M 200 200 L 200 354 L 200 200',
                  'M 200 200 L 46 200 L 200 200',
                ][index]
              }
            />
          </circle>
        ))}
      </svg>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative grid h-[104px] w-[104px] place-items-center rounded-full border border-brand-400/40 bg-ink-900/90 shadow-glow backdrop-blur">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(242,149,89,0.35),transparent_70%)] animate-pulse-soft" />
          <div className="relative text-center">
            <span className="mx-auto grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 via-azure-500 to-mint-400 font-display text-[11px] font-bold text-ink-950">
              AC
            </span>
            <p className="mt-1.5 text-[9.5px] font-semibold leading-tight text-cream">Alumni</p>
            <p className="text-[9.5px] font-semibold leading-tight text-cream">Connect</p>
          </div>
        </div>
      </div>

      {nodes.map((node) => (
        <div key={node.label} className={`absolute ${node.position}`}>
          <div
            className={`flex items-center gap-2 rounded-2xl border ${node.ring} bg-ink-800/85 px-3 py-2 shadow-card backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-ink-700/90`}
          >
            <span className={`grid h-7 w-7 place-items-center rounded-lg ${node.glow}`}>
              <node.icon className={`h-3.5 w-3.5 ${node.tone}`} />
            </span>
            <span className="text-[11.5px] font-medium text-cream">{node.label}</span>
          </div>
        </div>
      ))}

      {[
        'left-[18%] top-[20%]',
        'right-[14%] top-[26%]',
        'left-[26%] bottom-[18%]',
        'right-[20%] bottom-[24%]',
        'left-[8%] bottom-[42%]',
        'right-[6%] top-[56%]',
      ].map((position, index) => (
        <span
          key={position}
          className={`absolute ${position} h-1 w-1 rounded-full bg-brand-300 animate-pulse-soft`}
          style={{ animationDelay: `${index * 0.7}s` }}
        />
      ))}
    </div>
  )
}
