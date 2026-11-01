import { X } from 'lucide-react'

type NavbarProps = {
  isAuthenticated: boolean
  role: 'student' | 'alumni' | 'company' | 'admin' | null
  onLogin: () => void
  onLogout: () => void
  onRoleSelect: (role: string) => void
}

export function Navbar({ isAuthenticated, role, onLogin, onLogout, onRoleSelect }: NavbarProps) {
  return (
    <header className="border-b border-border-bg bg-ink-950/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <span className="text-xl font-display font-semibold tracking-wider text-brand-400">AlumniConnect</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden sm:flex items-center gap-8">
            <a href="/#features" className="text-mist hover:text-brand-400 transition-colors text-sm font-medium">Features</a>
            <a href="/#challenges" className="text-mist hover:text-brand-400 transition-colors text-sm font-medium">Challenges</a>
            <a href="/#metaverse" className="text-mist hover:text-brand-400 transition-colors text-sm font-medium">Metaverse</a>
            <a href="/about" className="text-mist hover:text-brand-400 transition-colors text-sm font-medium">About</a>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-mist capitalize">Welcome, {role || 'User'}</span>
                <button onClick={onLogout} className="flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] border border-brand-500/30 rounded-full hover:bg-brand-500/10 transition-colors">
                  <X className="h-4 w-4" /> Sign Out
                </button>
              </>
            ) : (
              <>
                <button onClick={onLogin} className="btn-primary px-4 py-2 text-[11px] uppercase tracking-[0.1em]">
                  Login
                </button>
                <button onClick={() => onRoleSelect('student')} className="btn-secondary px-4 py-2 text-[11px] uppercase tracking-[0.1em] ml-2">
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}