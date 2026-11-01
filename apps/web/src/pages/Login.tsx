import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { roleHome } from '../lib/auth'

type LoginForm = {
  email: string
  password: string
  remember: boolean
}

export function LoginPage() {
  const { login } = useAuth()
  const [form, setForm] = useState<LoginForm>({ email: '', password: '', remember: false })
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const user = await login(form.email, form.password)
      window.location.href = roleHome[user.role]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setIsLoading(false)
    }
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-ink-900 via-ink-800 to-ink-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-ink-800/80 rounded-2xl p-8 border border-border-bg backdrop-blur-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-brand-400 mb-2">Welcome Back</h1>
          <p className="text-mist">Log in to continue your AlumniConnect journey</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-brand-500/10 border border-brand-500/30">
            <p className="text-[11px] uppercase tracking-[0.1em] text-brand-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.08em] text-mist mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.08em] text-mist mb-2">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-brand-400"
                onClick={() => setShowPw((s) => !s)}
                aria-label="Toggle password visibility"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-mist">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="remember" checked={form.remember} onChange={handleChange} className="w-4 h-4 rounded border border-border-bg bg-ink-800/60" />
              Remember Me
            </label>
            <a href="#" className="text-brand-400 hover:underline">Forgot Password?</a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 text-[12px] uppercase tracking-[0.1em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-brand-500 text-ink-900 rounded-xl font-semibold hover:bg-brand-400"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="mt-6 text-[10px] uppercase tracking-[0.08em] text-mist text-center">
            Don't have an account?{' '}
            <a href="/register" className="text-brand-400 hover:underline ml-1">Sign Up</a>
          </p>
        </form>
      </div>
    </section>
  )
}