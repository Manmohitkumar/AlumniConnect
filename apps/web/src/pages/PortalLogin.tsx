import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { roleHome, type Role } from '../lib/auth'
import { LocaleSelect, useI18n } from '../lib/i18n'

const PORTALS = [
  { key: 'student', label: 'Student', role: 'STUDENT' as Role, hint: 'Students and current learners' },
  { key: 'alumni', label: 'Alumni', role: 'ALUMNI' as Role, hint: 'Graduates and mentors' },
  { key: 'university', label: 'University', role: 'UNIVERSITY' as Role, hint: 'Institution representatives' },
  { key: 'admin', label: 'Admin', role: 'ADMIN' as Role, hint: 'Platform administrators' },
]

export function PortalLogin({ portal }: { portal?: string }) {
  const { login, user } = useAuth()
  const { t, locale, setLocale } = useI18n()
  const locked = PORTALS.find((item) => item.key === portal)
  const [active, setActive] = useState(locked?.key ?? 'student')
  const current = PORTALS.find((item) => item.key === active) ?? PORTALS[0]

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const next = await login(email, password, current.key, current.key === 'admin' && user?.totpEnabled ? mfaCode : undefined)
      window.location.href = roleHome[next.role]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setIsLoading(false)
    }
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-ink-900 via-ink-800 to-ink-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-ink-800/80 rounded-2xl p-8 border border-border-bg backdrop-blur-sm">
        <div className="mb-4 flex justify-end">
          <LocaleSelect
            value={locale}
            onChange={(code) => setLocale(code, { persist: false })}
            className="rounded-xl border border-border-bg bg-ink-900/70 px-2 py-1.5 text-[11px] text-cream outline-none focus:ring-2 focus:ring-brand-400/30"
          />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-display font-bold text-brand-400 mb-2">{t('Sign in')}</h1>
          <p className="text-mist text-sm">{t('Choose your portal and continue to AlumniConnect.')}</p>
        </div>

        {!locked && (
          <div className="grid grid-cols-2 gap-2 mb-6">
            {PORTALS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActive(item.key)}
                className={`rounded-xl border px-3 py-2 text-start text-xs transition ${
                  active === item.key
                    ? 'border-brand-400/60 bg-brand-500/10 text-cream'
                    : 'border-border-bg bg-ink-800/40 text-mist hover:text-cream'
                }`}
              >
                <span className="block font-semibold">{t(item.label)}</span>
                <span className="block text-[10px] opacity-80">{t(item.hint)}</span>
              </button>
            ))}
          </div>
        )}

        {locked && (
          <div className="mb-6 rounded-xl border border-brand-400/30 bg-brand-500/10 px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.1em] text-brand-300">
              {t(locked.label)} {t('portal')}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-brand-500/10 border border-brand-500/30">
            <p className="text-[11px] uppercase tracking-[0.1em] text-brand-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.08em] text-mist mb-2">{t('Email Address')}</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.08em] text-mist mb-2">{t('Password')}</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              />
              <button
                type="button"
                className="absolute end-3 top-1/2 -translate-y-1/2 text-mist hover:text-brand-400"
                onClick={() => setShowPw((s) => !s)}
                aria-label={t('Toggle password visibility')}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {current.key === 'admin' && user?.totpEnabled && (
            <div>
              <label className="block text-[10px] uppercase tracking-[0.08em] text-mist mb-2">{t('Authenticator code')}</label>
              <input
                type="text"
                name="mfaCode"
                inputMode="numeric"
                maxLength={8}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                placeholder={t('6-digit code')}
                className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-mist">
            <span />
            <a href="/forgot-password" className="text-brand-400 hover:underline">{t('Forgot Password?')}</a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 text-[12px] uppercase tracking-[0.1em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-brand-500 text-ink-900 rounded-xl font-semibold hover:bg-brand-400"
          >
            {isLoading ? t('Signing in...') : t(`Sign in to ${current.label}`)}
          </button>

          <p className="mt-4 text-[10px] uppercase tracking-[0.08em] text-mist text-center">
            {t('New here?')}{' '}
            <a href="/register" className="text-brand-400 hover:underline ms-1">{t('Create an account')}</a>
          </p>
        </form>
      </div>
    </section>
  )
}
