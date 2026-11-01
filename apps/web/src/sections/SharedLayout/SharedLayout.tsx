import { useRef, useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

type SharedLayoutProps = {
  title: string
  sidebarLinks: Array<{ name: string; href: string; icon: React.ReactElement }>
  children: React.ReactNode
}

export function SharedLayout({ title, sidebarLinks, children }: SharedLayoutProps) {
  const [showSidebar, setShowSidebar] = useState(false)
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            target.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
            target.style.opacity = '1'
            target.style.transform = 'translateY(0)'
          }
        })
      },
      { threshold: 0.1 }
    )
    const panels = rootRef.current?.querySelectorAll('[data-reveal]')
    panels?.forEach((panel) => observer.observe(panel as Element))
    return () => observer.disconnect()
  }, [])

  const sidebarClass = showSidebar
    ? 'fixed left-0 top-16 bottom-0 w-64 bg-ink-800/95 border-r border-border-bg transform transition-transform duration-300 translate-x-0 z-40'
    : 'fixed left-0 top-16 bottom-0 w-64 bg-ink-800/95 border-r border-border-bg transform transition-transform duration-300 -translate-x-full sm:translate-x-0 z-40'

  return (
    <section ref={rootRef} className="relative min-h-screen bg-ink-900 text-cream">
      <header className="border-b border-border-bg bg-ink-950/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <button
                className="sm:hidden p-2 rounded-xl hover:bg-ink-800/50 transition-colors"
                onClick={() => setShowSidebar((s) => !s)}
                aria-label="Toggle sidebar"
              >
                {showSidebar ? <X className="h-5 w-5 text-mist" /> : <Menu className="h-5 w-5 text-mist" />}
              </button>
              <span className="text-xl font-display font-semibold tracking-wider text-brand-400">AlumniConnect</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-mist capitalize">{title}</span>
            </div>
          </div>
        </div>
      </header>

      <aside className={sidebarClass}>
        <div className="h-full p-4 flex flex-col">
          <div className="mb-6">
            <span className="text-xl font-display font-semibold tracking-wider text-brand-400">AlumniConnect</span>
          </div>
          <nav className="flex-1">
            {sidebarLinks.map((link, index) => (
              <button
                key={index}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-mist hover:text-brand-400 hover:bg-ink-800/50 transition-colors"
                onClick={() => setShowSidebar(false)}
              >
                <span className="hidden md:inline-block h-4 w-4">{link.icon}</span>
                <span>{link.name}</span>
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-4 border-t border-border-bg">
            <button
              className="w-full flex items-center justify-center py-2.5 text-[11px] uppercase tracking-[0.1em] text-mist border border-border-bg rounded-xl hover:bg-ink-800/50 transition-colors"
              onClick={() => (window.location.href = '/')}
            >
              Return to Home
            </button>
          </div>
        </div>
      </aside>

      <main className="sm:ml-64 relative flex-1 p-4">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </section>
  )
}