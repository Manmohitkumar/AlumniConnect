import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchUniversities } from '../lib/auth'
import { roleHome } from '../lib/auth'

type University = { id: string; name: string; shortName: string | null; city: string | null }

type BaseForm = { email: string; password: string; name: string }
type StudentForm = BaseForm & { universityId: string; registrationNumber: string; department: string; course: string; currentYear: string; semester: string; graduationYear: string; skills: string }
type AlumniForm = BaseForm & { universityId: string; registrationNumber: string; graduationYear: string; currentOrganization: string; jobTitle: string; industry: string; professionalProfile: string }

const emptyBase = { email: '', password: '', name: '' }

const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30'

export function RegisterPage() {
  const { register } = useAuth()
  const [role, setRole] = useState<'STUDENT' | 'ALUMNI'>('STUDENT')
  const [student, setStudent] = useState<StudentForm>({ ...emptyBase, universityId: '', registrationNumber: '', department: '', course: '', currentYear: '', semester: '', graduationYear: '', skills: '' })
  const [alumni, setAlumni] = useState<AlumniForm>({ ...emptyBase, universityId: '', registrationNumber: '', graduationYear: '', currentOrganization: '', jobTitle: '', industry: '', professionalProfile: '' })
  const [showPw, setShowPw] = useState(false)
  const [terms, setTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [universities, setUniversities] = useState<University[]>([])

  useEffect(() => {
    fetchUniversities().then(setUniversities).catch(() => setUniversities([]))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!terms) {
      setError('Accept the terms to continue.')
      return
    }
    setIsLoading(true)
    setError(null)
    setNotice(null)
    try {
      if (role === 'STUDENT') {
        const result = await register(student.email, student.password, student.name, 'STUDENT', {
          universityId: student.universityId || null,
          registrationNumber: student.registrationNumber || null,
          department: student.department || null,
          course: student.course || null,
          currentYear: student.currentYear ? Number(student.currentYear) : null,
          semester: student.semester ? Number(student.semester) : null,
          graduationYear: student.graduationYear ? Number(student.graduationYear) : null,
          skills: student.skills || null,
        })
        if (result.verification?.previewUrl) setNotice(`Email verification preview: ${result.verification.previewUrl}`)
        window.location.href = roleHome[result.user.role]
      } else {
        const result = await register(alumni.email, alumni.password, alumni.name, 'ALUMNI', {
          universityId: alumni.universityId || null,
          registrationNumber: alumni.registrationNumber || null,
          graduationYear: alumni.graduationYear ? Number(alumni.graduationYear) : null,
        })
        if (result.verification?.previewUrl) setNotice(`Email verification preview: ${result.verification.previewUrl}`)
        window.location.href = roleHome[result.user.role]
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
      setIsLoading(false)
    }
  }

  const s = (field: keyof StudentForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setStudent((prev) => ({ ...prev, [field]: e.target.value }))
  const a = (field: keyof AlumniForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAlumni((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <section className="min-h-screen bg-gradient-to-b from-ink-900 via-ink-800 to-ink-700 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-ink-800/80 rounded-2xl p-8 border border-border-bg backdrop-blur-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-display font-bold text-brand-400 mb-2">Create account</h1>
          <p className="text-mist text-sm">Students and alumni can self-register. University, company and admin accounts are provisioned by an administrator.</p>
        </div>

        <div className="flex gap-2 mb-6">
          {(['STUDENT', 'ALUMNI'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRole(item)}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                role === item ? 'border-brand-400/60 bg-brand-500/10 text-cream' : 'border-border-bg bg-ink-800/40 text-mist'
              }`}
            >
              {item === 'STUDENT' ? 'Student' : 'Alumni'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-brand-500/10 border border-brand-500/30">
            <p className="text-[11px] uppercase tracking-[0.1em] text-brand-400">{error}</p>
          </div>
        )}
        {notice && (
          <div className="mb-4 p-3 rounded-xl bg-mint-500/10 border border-mint-500/30">
            <p className="text-[11px] text-mist break-all">{notice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="name" placeholder="Full name" value={role === 'STUDENT' ? student.name : alumni.name} onChange={role === 'STUDENT' ? s('name') : a('name')} required className={inputClass} />
          <input name="email" type="email" placeholder="Email address" value={role === 'STUDENT' ? student.email : alumni.email} onChange={role === 'STUDENT' ? s('email') : a('email')} required className={inputClass} />
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password (8+ chars, letters and numbers)"
              value={role === 'STUDENT' ? student.password : alumni.password}
              onChange={role === 'STUDENT' ? s('password') : a('password')}
              required
              className={inputClass}
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-brand-400" onClick={() => setShowPw((v) => !v)}>
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <select value={role === 'STUDENT' ? student.universityId : alumni.universityId} onChange={role === 'STUDENT' ? s('universityId') : a('universityId')} className={inputClass}>
            <option value="">Select your university (optional)</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>{u.name}{u.city ? ` - ${u.city}` : ''}</option>
            ))}
          </select>

          <input placeholder="Registration / alumni ID (optional)" value={role === 'STUDENT' ? student.registrationNumber : alumni.registrationNumber} onChange={role === 'STUDENT' ? s('registrationNumber') : a('registrationNumber')} className={inputClass} />

          {role === 'STUDENT' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Department" value={student.department} onChange={s('department')} className={inputClass} />
                <input placeholder="Course / degree" value={student.course} onChange={s('course')} className={inputClass} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input placeholder="Current year" type="number" min={1} max={8} value={student.currentYear} onChange={s('currentYear')} className={inputClass} />
                <input placeholder="Semester" type="number" min={1} max={12} value={student.semester} onChange={s('semester')} className={inputClass} />
                <input placeholder="Graduation year" type="number" value={student.graduationYear} onChange={s('graduationYear')} className={inputClass} />
              </div>
              <input placeholder="Skills (comma separated)" value={student.skills} onChange={s('skills')} className={inputClass} />
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Graduation year" type="number" value={alumni.graduationYear} onChange={a('graduationYear')} className={inputClass} />
                <input placeholder="Current organization" value={alumni.currentOrganization} onChange={a('currentOrganization')} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Job title" value={alumni.jobTitle} onChange={a('jobTitle')} className={inputClass} />
                <input placeholder="Industry" value={alumni.industry} onChange={a('industry')} className={inputClass} />
              </div>
            </>
          )}

          <label className="flex items-start gap-2 text-[11px] text-mist">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1" />
            <span>I accept the terms and consent to the platform's data handling and profile visibility rules.</span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 text-[12px] uppercase tracking-[0.1em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-brand-500 text-ink-900 rounded-xl font-semibold hover:bg-brand-400"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="mt-2 text-[10px] uppercase tracking-[0.08em] text-mist text-center">
            Already have an account?{' '}
            <a href="/login" className="text-brand-400 hover:underline ml-1">Sign in</a>
          </p>
        </form>
      </div>
    </section>
  )
}
