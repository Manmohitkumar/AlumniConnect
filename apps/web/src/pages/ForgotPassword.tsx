import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setNotice(null)
    try {
      const result = await forgotPassword(email)
      setNotice(result.previewUrl ? `Reset preview link: ${result.previewUrl}` : result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-ink-900 via-ink-800 to-ink-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-ink-800/80 rounded-2xl p-8 border border-border-bg backdrop-blur-sm">
        <h1 className="text-2xl font-display font-bold text-brand-400 mb-2 text-center">Forgot password</h1>
        <p className="text-mist text-sm text-center mb-6">We will generate a single-use reset link if the account exists.</p>
        {error && <p className="mb-4 text-[11px] uppercase tracking-[0.1em] text-brand-400">{error}</p>}
        {notice && <p className="mb-4 text-[11px] text-mist break-all">{notice}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email address" className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30" />
          <button type="submit" disabled={isLoading} className="w-full py-3 text-[12px] uppercase tracking-[0.1em] bg-brand-500 text-ink-900 rounded-xl font-semibold hover:bg-brand-400 disabled:opacity-50">
            {isLoading ? 'Sending...' : 'Request reset link'}
          </button>
        </form>
        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.08em] text-mist">
          <a href="/login" className="text-brand-400 hover:underline">Back to sign in</a>
        </p>
      </div>
    </section>
  )
}
