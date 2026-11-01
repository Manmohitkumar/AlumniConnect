import { useRef } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { DashboardPreview } from '../components/DashboardPreview'
import { heroTrust } from '../data/content'
import { motion } from '../animations/config'
import { gsap, useMotionScene } from '../animations/useMotionScene'

const particles = [
  { left: '8%', top: '22%', size: 3, delay: '0s' },
  { left: '16%', top: '62%', size: 2, delay: '1.2s' },
  { left: '27%', top: '34%', size: 2, delay: '2.4s' },
  { left: '38%', top: '12%', size: 3, delay: '0.6s' },
  { left: '63%', top: '18%', size: 2, delay: '1.8s' },
  { left: '74%', top: '52%', size: 3, delay: '0.9s' },
  { left: '86%', top: '30%', size: 2, delay: '2.1s' },
  { left: '92%', top: '68%', size: 2, delay: '0.3s' },
  { left: '56%', top: '74%', size: 2, delay: '2.7s' },
  { left: '12%', top: '84%', size: 2, delay: '1.5s' },
]

export function Hero() {
  const root = useRef<HTMLElement>(null)

  useMotionScene(root, () => {
    const timeline = gsap.timeline({ defaults: { ease: motion.ease.out } })

    timeline
      .from('[data-hero="badge"]', { y: 14, autoAlpha: 0, duration: motion.duration.fast })
      .from(
        '[data-hero="line"]',
        { y: 38, autoAlpha: 0, duration: motion.duration.base, stagger: motion.stagger.base },
        '-=0.35',
      )
      .from('[data-hero="copy"]', { y: 18, autoAlpha: 0, duration: motion.duration.fast }, '-=0.5')
      .from(
        '[data-hero="cta"] > *',
        { y: 12, autoAlpha: 0, duration: motion.duration.fast, stagger: motion.stagger.tight },
        '-=0.45',
      )
      .from(
        '[data-hero="trust"] > li',
        { y: 8, autoAlpha: 0, duration: motion.duration.micro, stagger: motion.stagger.tight },
        '-=0.35',
      )
      .from(
        '[data-hero="dashboard"]',
        { y: 46, scale: 0.97, autoAlpha: 0, duration: motion.duration.slow, ease: motion.ease.soft },
        '-=0.6',
      )

    gsap.to('[data-parallax="orb-a"]', {
      yPercent: 20,
      ease: 'none',
      scrollTrigger: {
        trigger: root.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6,
      },
    })

    gsap.to('[data-parallax="orb-b"]', {
      yPercent: -14,
      ease: 'none',
      scrollTrigger: {
        trigger: root.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.8,
      },
    })
  })

  return (
    <section ref={root} id="top" className="relative overflow-hidden pb-16 pt-28 sm:pt-36">
      <div aria-hidden="true" className="absolute inset-0 grid-lines" />

      <div
        aria-hidden="true"
        data-parallax="orb-a"
        className="pointer-events-none absolute -top-56 left-1/2 h-[46rem] w-[46rem] -translate-x-1/2 rounded-full bg-brand-500/[0.14] blur-[140px]"
      />
      <div
        aria-hidden="true"
        data-parallax="orb-b"
        className="pointer-events-none absolute -top-10 right-[-10%] h-[30rem] w-[30rem] rounded-full bg-azure-500/[0.12] blur-[120px] animate-pulse-soft"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[16rem] h-[36rem] w-[76rem] max-w-[130vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(242,149,89,0.22),rgba(184,176,141,0.1),transparent)]"
      />

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="hero-trail-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F29559" stopOpacity="0" />
            <stop offset="45%" stopColor="#F29559" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#F2D492" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hero-trail-b" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B8B08D" stopOpacity="0" />
            <stop offset="50%" stopColor="#B8B08D" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F29559" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M-80 300 C 220 120, 480 460, 860 240 S 1340 120, 1700 300"
          fill="none"
          stroke="url(#hero-trail-a)"
          strokeWidth="1.2"
          strokeDasharray="5 14"
          className="animate-dash-flow"
        />
        <path
          d="M-60 520 C 320 400, 560 720, 980 470 S 1420 380, 1700 520"
          fill="none"
          stroke="url(#hero-trail-b)"
          strokeWidth="1"
          strokeDasharray="3 16"
          className="animate-dash-flow"
        />
      </svg>

      {particles.map((particle) => (
        <span
          key={`${particle.left}-${particle.top}`}
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full bg-brand-300 animate-pulse-soft"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            animationDelay: particle.delay,
          }}
        />
      ))}

      <div className="shell relative">
        <div className="mx-auto max-w-3xl text-center">
          <span data-hero="badge" dir="auto" className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
            The future of alumni collaboration
          </span>

          <h1 dir="auto" className="mt-6 text-[2.65rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[4.4rem]">
            <span data-hero="line" className="block">
              Real Problems.
            </span>
            <span data-hero="line" className="block gradient-text text-gradient-animated">
              Student Solutions.
            </span>
            <span data-hero="line" className="block">
              Alumni Recognition.
            </span>
          </h1>

          <p
            data-hero="copy"
            dir="auto"
            className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-mist sm:text-[16.5px]"
          >
            One powerful platform connecting alumni, students, universities and companies. Transform real-world
            industry challenges into student innovation, meaningful mentorship, professional recognition and
            career opportunities.
          </p>

          <div
            data-hero="cta"
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <a href="#features" className="btn-primary group w-full sm:w-auto">
              Explore the Platform
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </a>
            <a href="/register" className="btn-secondary w-full sm:w-auto">
              Join AlumniConnect
            </a>
          </div>

          <ul
            data-hero="trust"
            className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-6"
          >
            {heroTrust.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[12px] text-mist">
                <Check className="h-3.5 w-3.5 text-mint-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div data-hero="dashboard" className="mt-14 sm:mt-16">
          <DashboardPreview />
        </div>
      </div>
    </section>
  )
}
