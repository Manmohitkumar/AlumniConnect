import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const result = await resetPassword(token, password)
      setNotice('Password updated. Redirecting to sign in...')
      setTimeout(() => {
        window.location.href = `/login?portal=${result.role.toLowerCase()}`
      }, 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-ink-900 via-ink-800 to-ink-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-ink-800/80 rounded-2xl p-8 border border-border-bg backdrop-blur-sm">
        <h1 className="text-2xl font-display font-bold text-brand-400 mb-2 text-center">Reset password</h1>
        <p className="text-mist text-sm text-center mb-6">Choose a new password for your account.</p>
        {!token && <p className="mb-4 text-[11px] uppercase tracking-[0.1em] text-brand-400">Missing reset token.</p>}
        {error && <p className="mb-4 text-[11px] uppercase tracking-[0.1em] text-brand-400">{error}</p>}
        {notice && <p className="mb-4 text-[11px] text-mist">{notice}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="New password" className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30" />
          <button type="submit" disabled={isLoading || !token} className="w-full py-3 text-[12px] uppercase tracking-[0.1em] bg-brand-500 text-ink-900 rounded-xl font-semibold hover:bg-brand-400 disabled:opacity-50">
            {isLoading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </section>
  )
}
