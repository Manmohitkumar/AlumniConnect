import { Search } from 'lucide-react'

type SidebarLink = {
  name: string
  href: string
  icon: React.ReactElement
  description?: string
}

type SidebarProps = {
  isOpen: boolean
  onToggle: () => void
  currentPage: string
  links: SidebarLink[]
  onPageSelect: (page: string) => void
}

export function Sidebar({ isOpen, onToggle, currentPage, links, onPageSelect }: SidebarProps) {
  const asideClass = isOpen
    ? 'fixed left-0 top-16 bottom-0 w-64 bg-ink-800/95 border-r border-border-bg transform transition-transform duration-300 translate-x-0 sm:translate-x-0 z-40'
    : 'fixed left-0 top-16 bottom-0 w-64 bg-ink-800/95 border-r border-border-bg transform transition-transform duration-300 -translate-x-full sm:translate-x-0 z-40'

  return (
    <aside className={asideClass}>
      <div className="h-full p-4 flex flex-col">
        <div className="mb-6">
          <span className="text-xl font-display font-semibold tracking-wider text-brand-400">AlumniConnect</span>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2.5 w-full rounded-xl border border-border-bg bg-ink-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30"
            />
          </div>
        </div>

        <nav className="flex-1">
          {links.map((link, index) => {
            const isActive = currentPage === link.name.toLowerCase().replace(/ /g, '-')
            const btnClass = isActive
              ? 'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 transition-colors'
              : 'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-mist hover:text-brand-400 hover:bg-ink-800/50 transition-colors'
            return (
              <button
                key={index}
                className={btnClass}
                onClick={() => {
                  onPageSelect(link.name)
                  onToggle()
                }}
              >
                <span className="hidden md:inline-block h-4 w-4">{link.icon}</span>
                <span>{link.name}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-border-bg">
          <button className="w-full flex items-center justify-center py-2.5 text-[11px] uppercase tracking-[0.1em] text-mist border border-border-bg rounded-xl hover:bg-ink-800/50 transition-colors" onClick={() => window.location.href = '/'}>
            Return to Home
          </button>
        </div>
      </div>
    </aside>
  )
}