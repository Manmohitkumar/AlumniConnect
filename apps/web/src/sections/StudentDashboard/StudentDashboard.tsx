import { useRef, useEffect } from 'react'
import { Home, List, MessageSquare, User } from 'lucide-react'

export function StudentDashboard() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // Scroll reveal trigger
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              const target = entry.target as HTMLElement
              target.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
              target.style.opacity = '1'
              target.style.transform = 'translateY(0)'
            }, index * 100)
          }
        })
      },
      { threshold: 0.1 }
    )

    const panels = rootRef.current?.querySelectorAll('[data-reveal]')
    panels?.forEach((panel) => observer.observe(panel as Element))

    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={rootRef}
      className="relative py-24 sm:py-32 lg:py-40"
    >
      <div className="max-w-7xl mx-auto px-4">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <Home className="h-6 w-6 text-brand-400" />
            <span className="text-2xl sm:text-3xl font-display font-semibold text-cream">Student Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <User className="h-6 w-6 text-mist" />
            <span className="text-sm text-mist capitalize">Welcome, Student</span>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Available Challenges Card */}
          <div
            data-reveal
            className="reveal card elevated-card border border-[rgba(242,149,89,0.15)] rounded-2xl p-6 hover:shadow-card transition-shadow"
          >
            <List className="h-6 w-6 text-mint-400 mb-4" />
            <h3 className="text-lg font-display font-semibold text-cream mb-3">Available Challenges</h3>
            <p className="text-mist mb-4">Browse and join real-world industry problems</p>
            <a href="#challenges" className="text-[11px] uppercase tracking-[0.1em] text-brand-400/70 hover:text-brand-400 transition-colors">
              View Challenges
            </a>
            <span className="inline-block mt-3 h-6 w-6 rounded-full bg-brand-500/[0.1] backdrop-blur animate-pulse-soft" />
          </div>

          {/* Joined Challenges Card */}
          <div
            data-reveal
            className="reveal card elevated-card border border-[rgba(242,149,89,0.15)] rounded-2xl p-6 hover:shadow-card transition-shadow"
          >
            <MessageSquare className="h-6 w-6 text-azure-400 mb-4" />
            <h3 className="text-lg font-display font-semibold text-cream mb-3">Joined Challenges</h3>
            <p className="text-mist mb-4">Your active participations</p>
            <a href="#my-challenges" className="text-[11px] uppercase tracking-[0.1em] text-azure-400/70 hover:text-azure-400 transition-colors">
              View My Challenges
            </a>
            <span className="inline-block mt-3 h-6 w-6 rounded-full bg-azure-500/[0.1] backdrop-blur animate-pulse-soft" />
          </div>

          {/* Portfolio Card */}
          <div
            data-reveal
            className="reveal card elevated-card border border-[rgba(242,149,89,0.15)] rounded-2xl p-6 hover:shadow-card transition-shadow"
          >
            <User className="h-6 w-6 text-mint-300 mb-4" />
            <h3 className="text-lg font-display font-semibold text-cream mb-3">My Portfolio</h3>
            <p className="text-mist mb-4">Showcase your demonstrated skills</p>
            <a href="#portfolio" className="text-[11px] uppercase tracking-[0.1em] text-mint-400/70 hover:text-mint-400 transition-colors">
              View Portfolio
            </a>
            <span className="inline-block mt-3 h-6 w-6 rounded-full bg-mint-500/[0.1] backdrop-blur animate-pulse-soft" />
          </div>

          {/* Mentorship Card */}
          <div
            data-reveal
            className="reveal card elevated-card border border-[rgba(242,149,89,0.15)] rounded-2xl p-6 hover:shadow-card transition-shadow"
          >
            <MessageSquare className="h-6 w-6 text-mint-300 mb-4" />
            <h3 className="text-lg font-display font-semibold text-cream mb-3">Mentorship</h3>
            <p className="text-mist mb-4">Request guidance from alumni</p>
            <a href="#mentorship" className="text-[11px] uppercase tracking-[0.1em] text-mint-400/70 hover:text-mint-400 transition-colors">
              Request Mentorship
            </a>
            <span className="inline-block mt-3 h-6 w-6 rounded-full bg-mint-500/[0.1] backdrop-blur animate-pulse-soft" />
          </div>
        </div>

        {/* Quick stats row */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="reveal p-4 border rounded-xl border-border-bg bg-ink-800/50">
            <span className="text-3xl font-display font-bold text-brand-400">24</span>
            <p className="text-[11px] uppercase tracking-[0.1em] text-mist mt-1">Active Challenges</p>
          </div>
          <div className="reveal p-4 border rounded-xl border-border-bg bg-ink-800/50">
            <span className="text-3xl font-display font-bold text-azure-400">156</span>
            <p className="text-[11px] uppercase tracking-[0.1em] text-mist mt-1">Submissions</p>
          </div>
          <div className="reveal p-4 border rounded-xl border-border-bg bg-ink-800/50">
            <span className="text-3xl font-display font-bold text-mint-400">42</span>
            <p className="text-[11px] uppercase tracking-[0.1em] text-mist mt-1">Certificates</p>
          </div>
          <div className="reveal p-4 border rounded-xl border-border-bg bg-ink-800/50">
            <span className="text-3xl font-display font-bold text-brand-500">18</span>
            <p className="text-[11px] uppercase tracking-[0.1em] text-mist mt-1">Mentorship Sessions</p>
          </div>
        </div>
      </div>
    </section>
  )
}