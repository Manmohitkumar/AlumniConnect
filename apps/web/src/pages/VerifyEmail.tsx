import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function VerifyEmailPage() {
  const { verifyEmail } = useAuth()
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification token.')
      return
    }
    verifyEmail(token)
      .then(() => {
        setStatus('success')
        setMessage('Your email is verified. Redirecting...')
        setTimeout(() => (window.location.href = '/login'), 1200)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Verification failed.')
      })
  }, [token, verifyEmail])

  return (
    <section className="min-h-screen bg-gradient-to-b from-ink-900 via-ink-800 to-ink-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-ink-800/80 rounded-2xl p-8 border border-border-bg backdrop-blur-sm text-center">
        <h1 className="text-2xl font-display font-bold text-brand-400 mb-2">Email verification</h1>
        <p className={`text-sm ${status === 'error' ? 'text-brand-400' : 'text-mist'}`}>{message}</p>
        <a href="/login" className="mt-6 inline-block text-[10px] uppercase tracking-[0.08em] text-brand-400 hover:underline">Go to sign in</a>
      </div>
    </section>
  )
}
