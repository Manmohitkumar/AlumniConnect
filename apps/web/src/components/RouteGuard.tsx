import type { ReactNode } from 'react'
import { Logo } from './Logo'
import { useAuth } from '../context/AuthContext'
import { roleHome, type Role } from '../lib/auth'

function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div aria-hidden="true" className="absolute inset-0 grid-lines" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/[0.12] blur-[120px]"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border-bg bg-ink-800/80 p-8 text-center backdrop-blur-sm">
        {children}
      </div>
    </main>
  )
}

function LoadingScreen() {
  return (
    <Screen>
      <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-400" />
      <p className="text-[12px] uppercase tracking-[0.1em] text-mist" role="status">
        Checking your session…
      </p>
    </Screen>
  )
}

/**
 * Client-side route guard. This is a usability layer only — every protected API
 * route also enforces authentication and role on the server.
 */
export function ProtectedRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading, logout } = useAuth()

  if (loading) return <LoadingScreen />

  if (!user) {
    const next = encodeURIComponent(window.location.pathname)
    window.location.replace(`/login?next=${next}`)
    return <LoadingScreen />
  }

  if (!roles.includes(user.role)) {
    return (
      <Screen>
        <a href="/" className="inline-flex rounded-lg" aria-label="AlumniConnect home">
          <Logo />
        </a>
        <h1 className="mt-8 text-2xl font-display font-semibold text-white">Access denied</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-mist">
          Your account role is <span className="text-brand-300">{user.role.toLowerCase()}</span>, which cannot open
          this workspace. If you believe this is wrong, contact your university administrator.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <a href="/student/dashboard" className="btn-primary">
            Go to my dashboard
          </a>
          <button
            type="button"
            onClick={() => void logout().then(() => window.location.assign('/login'))}
            className="btn-secondary"
          >
            Sign in with another account
          </button>
        </div>
      </Screen>
    )
  }

  return <>{children}</>
}

/** Keeps signed-in users away from the auth screens. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) {
    window.location.replace(roleHome[user.role])
    return <LoadingScreen />
  }
  return <>{children}</>
}
