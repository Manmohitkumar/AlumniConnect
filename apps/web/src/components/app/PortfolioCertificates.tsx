import { useEffect, useRef, useState } from 'react'
import {
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react'
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  apiUpload,
  type CertificateRecord,
  type Me,
  type PortfolioProject,
  type PublicPortfolio,
  type Role,
  type VerifiedCertificate,
} from '../../lib/apiClient'
import { formatDate } from '../../lib/format'
import { LocaleSelect, useI18n } from '../../lib/i18n'
import { useAction, useApi } from '../../lib/useApi'
import { fetchUniversities } from '../../lib/auth'
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Loading,
  Modal,
  SectionHeading,
  StatusBadge,
  SuccessNote,
  fieldClass,
} from './ui'

/* ------------------------------------------------------------------ profile */

type ProfileForm = {
  name: string
  headline: string
  bio: string
  location: string
  universityId: string
  universityName: string
  registrationNumber: string
  department: string
  course: string
  currentYear: string
  semester: string
  graduationYear: string
  skills: string
  careerInterests: string
  company: string
  designation: string
  industry: string
  expertise: string
  mentorshipTopics: string
  availability: string
  timezone: string
  yearsExperience: string
}

function toForm(me: Me): ProfileForm {
  return {
    name: me.name,
    headline: me.headline ?? '',
    bio: me.bio ?? '',
    location: me.location ?? '',
    universityId: me.studentProfile?.universityId ?? me.alumniProfile?.universityId ?? '',
    universityName: me.studentProfile?.universityName ?? me.studentProfile?.university?.name ?? me.alumniProfile?.universityName ?? me.alumniProfile?.university?.name ?? '',
    registrationNumber: me.studentProfile?.registrationNumber ?? me.alumniProfile?.registrationNumber ?? '',
    department: me.studentProfile?.department ?? '',
    course: me.studentProfile?.course ?? '',
    currentYear: me.studentProfile?.currentYear ? String(me.studentProfile.currentYear) : '',
    semester: me.studentProfile?.semester ? String(me.studentProfile.semester) : '',
    graduationYear: me.studentProfile?.graduationYear ? String(me.studentProfile.graduationYear) : me.alumniProfile?.graduationYear ? String(me.alumniProfile.graduationYear) : '',
    skills: me.studentProfile?.skills ?? '',
    careerInterests: me.studentProfile?.careerInterests ?? '',
    company: me.alumniProfile?.company ?? '',
    designation: me.alumniProfile?.designation ?? '',
    industry: me.alumniProfile?.industry ?? '',
    expertise: me.alumniProfile?.expertise ?? '',
    mentorshipTopics: me.alumniProfile?.mentorshipTopics ?? '',
    availability: me.alumniProfile?.availability ?? '',
    timezone: me.alumniProfile?.timezone ?? '',
    yearsExperience: me.alumniProfile?.yearsExperience ? String(me.alumniProfile.yearsExperience) : '',
  }
}

export function ProfilePanel({ role }: { role: Role }) {
  const me = useApi<{ data: Me }>('/profile/me')
  const { t } = useI18n()
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [universities, setUniversities] = useState<Array<{ id: string; name: string; shortName: string | null; city: string | null }>>([])
  const action = useAction()
  const avatarInput = useRef<HTMLInputElement>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  useEffect(() => {
    if (me.data && !form) setForm(toForm(me.data.data))
  }, [me.data, form])

  useEffect(() => {
    fetchUniversities().then(setUniversities).catch(() => setUniversities([]))
  }, [])

  const save = async () => {
    if (!form) return
    const result = await action.run(
      () =>
        apiPut('/profile/me/profile', {
          name: form.name,
          headline: form.headline || null,
          bio: form.bio || null,
          location: form.location || null,
          ...(role === 'STUDENT'
            ? {
                universityId: form.universityId || null,
                universityName: form.universityName || null,
                registrationNumber: form.registrationNumber || null,
                department: form.department || null,
                course: form.course || null,
                currentYear: form.currentYear ? Number(form.currentYear) : null,
                semester: form.semester ? Number(form.semester) : null,
                graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
                skills: form.skills || null,
                careerInterests: form.careerInterests || null,
              }
            : {}),
          ...(role === 'ALUMNI'
            ? {
                universityId: form.universityId || null,
                universityName: form.universityName || null,
                registrationNumber: form.registrationNumber || null,
                graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
                company: form.company || null,
                designation: form.designation || null,
                industry: form.industry || null,
                expertise: form.expertise || null,
                mentorshipTopics: form.mentorshipTopics || null,
                availability: form.availability || null,
                timezone: form.timezone || null,
                yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
              }
            : {}),
        }),
      'Profile saved.',
    )
    if (result) me.reload()
  }

  const uploadAvatar = async (file: File) => {
    setAvatarBusy(true)
    setAvatarError(null)
    try {
      const uploaded = await apiUpload(file, 'avatar')
      await apiPut('/profile/me/profile', { avatarUrl: uploaded.url })
      me.reload()
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'The photo could not be uploaded.')
    } finally {
      setAvatarBusy(false)
    }
  }

  const toggleConsent = async (key: 'portfolioVisible' | 'visibleToCompanies', value: boolean) => {    const result = await action.run(
      () => apiPut('/profile/me/profile', { [key]: value }),
      value ? 'Consent recorded.' : 'Visibility turned off.',
    )
    if (result) me.reload()
  }

  if (me.loading) return <Loading rows={4} label="Loading profile" />
  if (me.error) return <ErrorNote message={me.error} onRetry={me.reload} />
  if (!form || !me.data) return null

  const account = me.data.data

  return (
    <div className="space-y-5">
      <SectionHeading
        title={t('Your profile')}
        hint="Only the fields you save here are shown to other signed-in users. Email address is never published."
      />

      {action.error && <ErrorNote message={action.error} />}
      {action.success && <SuccessNote message={action.success} />}

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-ink-900">
            {account.avatarUrl ? (
              <img src={account.avatarUrl} alt={`${account.name} profile photo`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ash">
                <UserRound className="h-7 w-7" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <Btn size="sm" variant="secondary" type="button" disabled={avatarBusy} onClick={() => avatarInput.current?.click()}>
              {avatarBusy ? 'Uploading…' : 'Upload photo'}
            </Btn>
            <input
              ref={avatarInput}
              type="file"
              aria-label="Choose a profile photo"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              disabled={avatarBusy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void uploadAvatar(file)
              }}
            />
            <p className="mt-2 text-[11px] text-ash">
              PNG, JPEG, WebP or GIF up to 5 MB. Your photo is visible to signed-in members.
            </p>
            {avatarError && <p className="mt-1 text-[11px] text-brand-300">{avatarError}</p>}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name">
            <input className={fieldClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Headline" hint="One line describing what you do.">
            <input className={fieldClass} value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} />
          </Field>
          <Field label="Location">
            <input className={fieldClass} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          </Field>
          <Field label="Account email" hint="Used to sign in. It is not shown on your public profile.">
            <input className={`${fieldClass} opacity-60`} value={account.email} readOnly />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="About" hint="Optional. Keep it factual and avoid sensitive personal information.">
            <textarea className={`${fieldClass} min-h-24`} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
          </Field>
        </div>
      </Card>

      <LocaleRegionCard account={account} onSaved={me.reload} />

      <CareerPathwaysCard />

      <ConsentCard />

      <DataRightsCard />

      <Card>
        <SectionHeading title={t('University identity verification')} hint="Your institution's representative approves this. Email verification is required first." />
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[12px] text-mist">
            Status: <span className="text-cream">{role === 'STUDENT' ? (account.studentProfile?.verificationStatus ?? 'UNVERIFIED') : (account.alumniProfile?.verificationStatus ?? 'UNVERIFIED')}</span>
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              try {
                await apiPost('/profile/me/verification-request')
                me.reload()
              } catch (err) {
                window.alert(err instanceof Error ? err.message : 'Request failed')
              }
            }}
          >
            Request verification
          </button>
        </div>
      </Card>

      {role === 'STUDENT' && (
        <Card>
          <SectionHeading title="Study details" hint="Shared with mentors and, if you consent, with companies." />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="University">
              <select className={fieldClass} value={form.universityId} onChange={(event) => setForm({ ...form, universityId: event.target.value })}>
                <option value="">Not linked to a university</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}{u.city ? ` - ${u.city}` : ''}</option>
                ))}
              </select>
            </Field>
            <Field label="University name (free text)" hint="Used if your institution is not listed.">
              <input className={fieldClass} value={form.universityName} onChange={(event) => setForm({ ...form, universityName: event.target.value })} />
            </Field>
            <Field label="Registration / student ID">
              <input className={fieldClass} value={form.registrationNumber} onChange={(event) => setForm({ ...form, registrationNumber: event.target.value })} />
            </Field>
            <Field label="Current year">
              <input type="number" min={1} max={8} className={fieldClass} value={form.currentYear} onChange={(event) => setForm({ ...form, currentYear: event.target.value })} />
            </Field>
            <Field label="Semester">
              <input type="number" min={1} max={12} className={fieldClass} value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} />
            </Field>
            <Field label="Department">
              <input className={fieldClass} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
            </Field>
            <Field label="Course">
              <input className={fieldClass} value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })} />
            </Field>
            <Field label="Graduation year">
              <input type="number" min={1950} max={2100} className={fieldClass} value={form.graduationYear} onChange={(event) => setForm({ ...form, graduationYear: event.target.value })} />
            </Field>
            <Field label="Skills" hint="Comma separated. Used for transparent recommendations.">
              <input className={fieldClass} value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} />
            </Field>
            <Field label="Career interests" hint="Comma separated.">
              <input className={fieldClass} value={form.careerInterests} onChange={(event) => setForm({ ...form, careerInterests: event.target.value })} />
            </Field>
          </div>

          <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-ink-900/50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-mist">Visibility and consent</p>
            <ConsentRow
              enabled={account.studentProfile?.portfolioVisible ?? false}
              title="Publish my portfolio on the platform"
              body="Lets signed-in alumni and companies open your portfolio page. You can turn this off at any time."
              onToggle={(value) => void toggleConsent('portfolioVisible', value)}
            />
            <ConsentRow
              enabled={account.studentProfile?.visibleToCompanies ?? false}
              title="Share my student profile with verified companies"
              body="Required before applying to opportunities. Companies see your study details and skills, never your email address."
              onToggle={(value) => void toggleConsent('visibleToCompanies', value)}
            />
            <p className="text-[10.5px] leading-relaxed text-ash">
              Consent is stored with a timestamp. Turning a switch off hides the data from new views immediately; it does not
              delete applications you already submitted.
            </p>
          </div>
        </Card>
      )}

      {role === 'ALUMNI' && (
        <Card>
          <SectionHeading title="Professional details" hint="Mentorship availability is shown to students before they send a request." />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="University">
              <select className={fieldClass} value={form.universityId} onChange={(event) => setForm({ ...form, universityId: event.target.value })}>
                <option value="">Not linked to a university</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}{u.city ? ` - ${u.city}` : ''}</option>
                ))}
              </select>
            </Field>
            <Field label="University name (free text)">
              <input className={fieldClass} value={form.universityName} onChange={(event) => setForm({ ...form, universityName: event.target.value })} />
            </Field>
            <Field label="Alumni / registration ID">
              <input className={fieldClass} value={form.registrationNumber} onChange={(event) => setForm({ ...form, registrationNumber: event.target.value })} />
            </Field>
            <Field label="Company">
              <input className={fieldClass} value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} />
            </Field>
            <Field label="Designation">
              <input className={fieldClass} value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} />
            </Field>
            <Field label="Industry">
              <input className={fieldClass} value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} />
            </Field>
            <Field label="Years of experience">
              <input type="number" min={0} max={70} className={fieldClass} value={form.yearsExperience} onChange={(event) => setForm({ ...form, yearsExperience: event.target.value })} />
            </Field>
            <Field label="Graduation year">
              <input type="number" min={1950} max={2100} className={fieldClass} value={form.graduationYear} onChange={(event) => setForm({ ...form, graduationYear: event.target.value })} />
            </Field>
            <Field label="Time zone">
              <input className={fieldClass} value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} placeholder="Asia/Kolkata" />
            </Field>
          </div>
          <div className="mt-3 grid gap-3">
            <Field label="Expertise" hint="Shown in mentor discovery.">
              <input className={fieldClass} value={form.expertise} onChange={(event) => setForm({ ...form, expertise: event.target.value })} />
            </Field>
            <Field label="Mentorship topics">
              <input className={fieldClass} value={form.mentorshipTopics} onChange={(event) => setForm({ ...form, mentorshipTopics: event.target.value })} />
            </Field>
            <Field label="Availability" hint="e.g. Weekday evenings, 30-minute slots.">
              <input className={fieldClass} value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value })} />
            </Field>
          </div>
          <div className="mt-4">
            <ConsentRow
              enabled={account.alumniProfile?.mentorshipOpen ?? false}
              title="Accept mentorship requests"
              body="Students can send you requests. Turning this off keeps existing conversations but blocks new requests."
              onToggle={(value) =>
                void apiPut('/profile/me/profile', { mentorshipOpen: value }).then(() => me.reload()).catch(() => null)
              }
            />
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Btn disabled={action.pending || form.name.trim().length < 2} onClick={() => void save()}>
          {action.pending ? 'Saving…' : 'Save profile'}
        </Btn>
      </div>
    </div>
  )
}

function ConsentRow({
  enabled,
  title,
  body,
  onToggle,
}: {
  enabled: boolean
  title: string
  body: string
  onToggle: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-ink-950/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-cream">
          {enabled ? <Eye className="h-3.5 w-3.5 text-mint-300" /> : <EyeOff className="h-3.5 w-3.5 text-ash" />}
          {title}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-mist">{body}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        onClick={() => onToggle(!enabled)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-mint-500' : 'bg-white/15'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? 'left-[1.4rem]' : 'left-0.5'}`}
        />
      </button>
    </div>
  )
}

function ConsentCard() {
  const state = useApi<{ data: Array<{ kind: string; granted: boolean; grantedAt: string | null; revokedAt: string | null; source: string }> }>('/consents')
  const action = useAction()

  const labels: Record<string, string> = {
    AI_RECOMMENDATIONS: 'AI recommendations (local engine)',
    EXTERNAL_AI: 'External AI processing',
    PUBLIC_PORTFOLIO: 'Public portfolio visibility',
    RESEARCH_COLLAB: 'Research collaboration',
    PARTNER_SHARING: 'Partner data sharing',
  }

  const toggle = async (kind: string, granted: boolean) => {
    const result = await action.run(() => apiPut(`/consents/${kind}`, { granted }), granted ? 'Consent granted.' : 'Consent withdrawn.')
    if (result) state.reload()
  }

  return (
    <Card>
      <SectionHeading
        title="Consent & sharing"
        hint="Each choice is recorded with a timestamp. Withdrawing consent for the public portfolio also hides it from public view."
      />
      {action.error && <ErrorNote message={action.error} />}
      {action.success && <SuccessNote message={action.success} />}
      {state.loading && <Loading rows={2} label="Loading consents" />}
      {state.data && (
        <ul className="space-y-2">
          {state.data.data.map((row) => (
            <li key={row.kind} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div>
                <p className="text-[12.5px] font-semibold text-cream">{labels[row.kind] ?? row.kind}</p>
                <p className="text-[10.5px] text-ash">
                  {row.granted ? 'Granted' : 'Withdrawn'}
                  {row.grantedAt ? ` · ${formatDate(row.grantedAt)}` : ''}
                  {row.revokedAt ? ` · withdrawn ${formatDate(row.revokedAt)}` : ''}
                  {row.source === 'default' ? ' · default' : ''}
                </p>
              </div>
              <button
                type="button"
                className={row.granted ? 'btn-secondary px-3 py-1.5 text-[10.5px] uppercase tracking-[0.08em]' : 'btn-primary px-3 py-1.5 text-[10.5px] uppercase tracking-[0.08em]'}
                onClick={() => void toggle(row.kind, !row.granted)}
                disabled={action.pending}
              >
                {row.granted ? 'Withdraw' : 'Grant'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

type Pathway = {
  id: string
  title: string
  rationale: string
  steps: string[]
  evidence: { evaluatedChallenges: number; certificates: number; skills: number }
}

function CareerPathwaysCard() {
  const state = useApi<{ data: { generatedFrom: string; pathways: Pathway[] } }>('/career/pathways')

  return (
    <Card>
      <SectionHeading
        title="Career pathways"
        hint="Suggestions are generated from your own profile, evaluated challenges and active certificates. They are guidance, not guarantees."
      />
      {state.loading && <Loading rows={2} label="Loading pathways" />}
      {state.error && <ErrorNote message={state.error} onRetry={state.reload} />}
      {state.data && (
        <div className="space-y-3">
          {state.data.data.pathways.slice(0, 3).map((pathway) => (
            <div key={pathway.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-300" />
                <p className="text-[12.5px] font-semibold text-cream">{pathway.title}</p>
                <Badge tone="azure">{pathway.evidence.evaluatedChallenges} evaluated · {pathway.evidence.certificates} certificates</Badge>
              </div>
              <p className="mt-1 text-[11px] text-mist">{pathway.rationale}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] text-mist">
                {pathway.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function DataRightsCard() {
  const requests = useApi<{ data: Array<{ id: string; type: string; status: string; createdAt: string; response: string | null }> }>('/governance/privacy/requests/mine')
  const [type, setType] = useState<'EXPORT' | 'CORRECTION' | 'DELETION'>('EXPORT')
  const [note, setNote] = useState('')
  const action = useAction()

  const submit = async () => {
    const result = await action.run(
      () => apiPost('/governance/privacy/requests', { type, note: note || undefined }),
      'Request filed. An administrator will review it.',
    )
    if (result) {
      setNote('')
      requests.reload()
    }
  }

  return (
    <Card>
      <SectionHeading
        title="Privacy & data rights"
        hint="Export and delete run from your account immediately. Use this queue for correction requests or if you need an administrator to review a deletion."
      />
      {action.error && <ErrorNote message={action.error} />}
      {action.success && <SuccessNote message={action.success} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Request type">
          <select className={fieldClass} value={type} onChange={(event) => setType(event.target.value as typeof type)}>
            <option value="EXPORT">Export my data</option>
            <option value="CORRECTION">Correct my data</option>
            <option value="DELETION">Delete my data</option>
          </select>
        </Field>
        <Field label="What should be reviewed?" hint="Optional. Do not include passwords or identity documents.">
          <input className={fieldClass} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <a href="/api/privacy/me/export" className="btn-secondary inline-flex items-center px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
          Download my export now
        </a>
        <Btn onClick={() => void submit()} disabled={action.pending}>{action.pending ? 'Filing…' : 'File request'}</Btn>
      </div>
      {(requests.data?.data.length ?? 0) > 0 && (
        <ul className="mt-4 space-y-1.5">
          {requests.data!.data.map((row) => (
            <li key={row.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11.5px] text-mist">
              <span className="font-semibold text-cream">{row.type}</span> · {row.status} · {formatDate(row.createdAt)}
              {row.response ? <span className="block text-[11px] text-mint-200">{row.response}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function LocaleRegionCard({ account, onSaved }: { account: Me; onSaved: () => void }) {
  const { t, locale, setLocale } = useI18n()
  const [timeZone, setTimeZone] = useState(account.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await apiPatch('/profile/me/preferences', { locale, timeZone })
      setNotice(t('Preferences saved.'))
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save preferences')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <SectionHeading
        title={t('Language & region')}
        hint={t('The interface updates immediately. Your institution may still publish content in other languages.')}
      />
      {error && <ErrorNote message={error} />}
      {notice && <SuccessNote message={notice} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Interface language')} hint={t('Used for dates, numbers and reminders you receive.')}>
          <LocaleSelect id="profile-locale" className={fieldClass} value={locale} onChange={(code) => setLocale(code)} />
        </Field>
        <Field label={t('Time zone')} hint="IANA name, for example Asia/Kolkata or Europe/Berlin.">
          <input
            className={fieldClass}
            value={timeZone}
            onChange={(event) => setTimeZone(event.target.value)}
            list="ac-time-zones"
            placeholder="Asia/Kolkata"
          />
          <datalist id="ac-time-zones">
            {['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore', 'Australia/Sydney', 'UTC'].map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </Field>
      </div>
      <div className="mt-3 flex justify-end">
        <Btn onClick={() => void save()} disabled={saving || timeZone.trim().length < 3}>
          {saving ? 'Saving…' : t('Save preferences')}
        </Btn>
      </div>
    </Card>
  )
}

/* --------------------------------------------------------------- portfolio */

type ProjectForm = {
  title: string
  summary: string
  url: string
  skills: string
  visibility: 'PRIVATE' | 'PLATFORM' | 'PUBLIC'
}

const emptyProject: ProjectForm = {
  title: '',
  summary: '',
  url: '',
  skills: '',
  visibility: 'PLATFORM',
}

export function PortfolioPanel() {
  const list = useApi<{ data: PortfolioProject[] }>('/portfolio/mine')
  const [editing, setEditing] = useState<{ project?: PortfolioProject } | null>(null)
  const action = useAction()

  const remove = async (project: PortfolioProject) => {
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return
    const result = await action.run(() => apiDelete(`/portfolio/projects/${project.id}`), 'Project deleted.')
    if (result !== null) list.reload()
  }

  const cycleVisibility = async (project: PortfolioProject) => {
    const order: Array<PortfolioProject['visibility']> = ['PRIVATE', 'PLATFORM', 'PUBLIC']
    const next = order[(order.indexOf(project.visibility) + 1) % order.length]
    const result = await action.run(
      () => apiPatch(`/portfolio/projects/${project.id}`, { visibility: next }),
      `Visibility set to ${next.toLowerCase()}.`,
    )
    if (result) list.reload()
  }

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Portfolio"
        hint="Projects you own. PRIVATE is visible only to you, PLATFORM to signed-in members, PUBLIC to anyone with the link."
        action={<Btn size="sm" onClick={() => setEditing({})}><Plus className="h-3.5 w-3.5" /> Add project</Btn>}
      />

      {action.error && <ErrorNote message={action.error} />}
      {action.success && <SuccessNote message={action.success} />}
      {list.loading && <Loading rows={3} />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.data && list.data.data.length === 0 && (
        <EmptyState
          title="No portfolio projects yet"
          hint="Add a project you can explain end to end. Recruiters and mentors read the summary, not just the link."
          icon={<UserRound className="h-5 w-5" />}
          action={<Btn onClick={() => setEditing({})}>Add your first project</Btn>}
        />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {list.data?.data.map((project) => (
          <Card key={project.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-sm font-semibold text-cream">{project.title}</h3>
              <Badge tone={project.visibility === 'PUBLIC' ? 'mint' : project.visibility === 'PLATFORM' ? 'azure' : 'neutral'}>
                {project.visibility === 'PUBLIC' ? <Globe2 className="h-3 w-3" /> : project.visibility === 'PRIVATE' ? <Lock className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                {project.visibility}
              </Badge>
            </div>
            <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-mist">{project.summary}</p>
            {project.skills && <p className="mt-2 text-[11px] text-ash">{project.skills}</p>}
            <p className="mt-2 text-[10.5px] text-ash">Added {formatDate(project.createdAt)}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-3">
              <Btn size="sm" variant="secondary" onClick={() => setEditing({ project })}>Edit</Btn>
              <Btn size="sm" variant="ghost" onClick={() => void cycleVisibility(project)}>Change visibility</Btn>
              {project.url && (
                <a href={project.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-azure-300 hover:bg-white/5">
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <Btn size="sm" variant="danger" onClick={() => void remove(project)} aria-label={`Delete ${project.title}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <ProjectModal
          project={editing.project}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            list.reload()
          }}
        />
      )}
    </div>
  )
}

function ProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project?: PortfolioProject
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ProjectForm>(
    project
      ? {
          title: project.title,
          summary: project.summary,
          url: project.url ?? '',
          skills: project.skills ?? '',
          visibility: project.visibility,
        }
      : emptyProject,
  )
  const action = useAction()

  const save = async () => {
    const payload = { ...form, url: form.url || undefined }
    const result = await action.run(
      () => (project ? apiPatch(`/portfolio/projects/${project.id}`, payload) : apiPost('/portfolio/projects', payload)),
      project ? 'Project updated.' : 'Project added.',
    )
    if (result) onSaved()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={project ? 'Edit project' : 'Add project'}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={action.pending || form.title.trim().length < 3 || form.summary.trim().length < 10} onClick={() => void save()}>
            {action.pending ? 'Saving…' : 'Save project'}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {action.error && <ErrorNote message={action.error} />}
        <Field label="Title">
          <input className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </Field>
        <Field label="Summary" hint="What problem, what you built, what you would improve. At least 10 characters.">
          <textarea className={`${fieldClass} min-h-28`} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
        </Field>
        <Field label="Skills">
          <input className={fieldClass} value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="React, SQL, accessibility" />
        </Field>
        <Field label="Project URL" hint="Optional. Public link only.">
          <input className={fieldClass} value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://" />
        </Field>
        <Field label="Visibility" hint="You can change this later.">
          <select className={fieldClass} value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as ProjectForm['visibility'] })}>
            <option value="PRIVATE">Private — only me</option>
            <option value="PLATFORM">Platform — signed-in members</option>
            <option value="PUBLIC">Public — anyone with the link</option>
          </select>
        </Field>
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------------- certificates */

export function CertificatesPanel({ role }: { role: Role }) {
  const mine = useApi<{ data: CertificateRecord[] }>('/certificates/mine')
  const issued = useApi<{ data: CertificateRecord[] }>(role === 'ALUMNI' || role === 'ADMIN' ? '/certificates/issued' : null)
  const action = useAction()
  const [verifying, setVerifying] = useState('')

  const revoke = async (certificate: CertificateRecord) => {
    if (!window.confirm(`Revoke ${certificate.code}? The verification page will show it as revoked.`)) return
    const result = await action.run(() => apiPost(`/certificates/${certificate.id}/revoke`), 'Certificate revoked.')
    if (result) {
      mine.reload()
      issued.reload()
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Certificates"
        hint="Recognition records are signed with an integrity hash and can be verified by code. They are not university degrees, credits or licences."
      />

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Verify a certificate" hint="Enter the code printed on the record, e.g. DEMO-0001.">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
                <input className={`${fieldClass} pl-9`} value={verifying} onChange={(event) => setVerifying(event.target.value)} placeholder="AC-2026-XXXXXXXX" />
              </div>
            </Field>
          </div>
          <a
            href={verifying.trim() ? `/verify?code=${encodeURIComponent(verifying.trim())}` : '/verify'}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-950 hover:bg-brand-600"
          >
            <ShieldCheck className="h-4 w-4" /> Verify
          </a>
        </div>
      </Card>

      {action.error && <ErrorNote message={action.error} />}
      {action.success && <SuccessNote message={action.success} />}

      <div>
        <SectionHeading title="My certificates" />
        {mine.loading && <Loading rows={2} />}
        {mine.error && <ErrorNote message={mine.error} onRetry={mine.reload} />}
        {mine.data && mine.data.data.length === 0 && (
          <EmptyState title="No certificates yet" hint="Certificates are issued after a submission is evaluated and the publisher chooses to recognise it." icon={<Award className="h-5 w-5" />} />
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {mine.data?.data.map((certificate) => (
            <Card key={certificate.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.09em] text-brand-300">{certificate.kind.replace(/_/g, ' ')}</p>
                  <h3 className="mt-1 font-display text-sm font-semibold text-cream">{certificate.title}</h3>
                </div>
                {certificate.revokedAt ? <Badge tone="danger">Revoked</Badge> : <Badge tone="mint">Valid</Badge>}
              </div>
              <p className="mt-2 text-[11.5px] text-mist">
                {certificate.challenge?.title ?? 'Alumni appreciation'} · {formatDate(certificate.issuedAt)}
              </p>
              <p className="mt-1 font-mono text-[10.5px] text-ash">{certificate.code}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <a href={`/verify?code=${encodeURIComponent(certificate.code)}`} className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mist hover:text-cream">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verify
                </a>
                <a href={`/api/certificates/${encodeURIComponent(certificate.code)}/file`} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-azure-300 hover:bg-white/5">
                  <Download className="h-3.5 w-3.5" /> Record
                </a>
                <a href={`/api/certificates/${encodeURIComponent(certificate.code)}/pdf`} className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mint-300 hover:bg-white/5">
                  <Download className="h-3.5 w-3.5" /> PDF
                </a>
                <a href={`/api/certificates/${encodeURIComponent(certificate.code)}/credential`} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:bg-white/5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Credential
                </a>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {(role === 'ALUMNI' || role === 'ADMIN') && issued.data && (
        <div>
          <SectionHeading title="Certificates I issued" hint="Revoking keeps the record visible but marks it invalid on the verification page." />
          {issued.data.data.length === 0 ? (
            <EmptyState title="Nothing issued yet" hint="Issue recognition from the submissions review screen after evaluating work." icon={<Sparkles className="h-5 w-5" />} />
          ) : (
            <div className="space-y-2">
              {issued.data.data.map((certificate) => (
                <Card key={certificate.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-cream">{certificate.title}</p>
                    <p className="text-[11px] text-mist">
                      {certificate.user?.name} · <span className="font-mono">{certificate.code}</span> · {formatDate(certificate.issuedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {certificate.revokedAt ? <Badge tone="danger">Revoked</Badge> : <Btn size="sm" variant="danger" onClick={() => void revoke(certificate)}>Revoke</Btn>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- public views */

export function PublicPortfolioPage({ userId }: { userId: string }) {
  const state = useApi<{ data: PublicPortfolio }>(`/portfolio/${userId}`, [userId])

  if (state.loading) {
    return (
      <div className="shell py-16">
        <Loading rows={4} label="Loading portfolio" />
      </div>
    )
  }

  if (state.error || !state.data) {
    return (
      <div className="shell py-16">
        <EmptyState
          title="This portfolio is not available"
          hint="The student may not have published it, or the link is incorrect. Portfolios are only shared with explicit consent."
          icon={<Lock className="h-5 w-5" />}
        />
      </div>
    )
  }

  const { student, projects, certificates, evaluatedSubmissions, visibilityApplied } = state.data.data

  return (
    <div className="shell py-12">
      <a href="/" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">← AlumniConnect</a>
      <header className="mt-6 rounded-2xl border border-white/10 bg-ink-800/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-ash">Student portfolio</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-cream">{student.name}</h1>
            <p className="mt-1 text-[12.5px] text-mist">{student.headline ?? 'Student at Demo University'}</p>
            {student.profile && (
              <p className="mt-1 text-[11.5px] text-ash">
                {[student.profile.department, student.profile.course, student.profile.graduationYear ? `Class of ${student.profile.graduationYear}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {student.bio && <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-mist">{student.bio}</p>}
          </div>
          <Badge tone="brand">Visibility: {visibilityApplied.join(' · ')}</Badge>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-cream">Projects</h2>
        {projects.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-mist">No projects are published at this visibility level.</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-sm font-semibold text-cream">{project.title}</h3>
                  <Badge tone={project.visibility === 'PUBLIC' ? 'mint' : 'azure'}>{project.visibility}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-mist">{project.summary}</p>
                {project.skills && <p className="mt-2 text-[11px] text-ash">{project.skills}</p>}
                {project.url && (
                  <a href={project.url} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-azure-300 hover:underline">
                    Open project <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-cream">Recognition</h2>
          {certificates.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-mist">No public recognition records.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {certificates.map((certificate) => (
                <Card key={certificate.id} className="p-4">
                  <p className="text-[12.5px] font-semibold text-cream">{certificate.title}</p>
                  <p className="text-[11px] text-mist">{formatDate(certificate.issuedAt)} · <span className="font-mono">{certificate.code}</span></p>
                  <a href={`/verify?code=${encodeURIComponent(certificate.code)}`} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">
                    <ShieldCheck className="h-3 w-3" /> Verify record
                  </a>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-cream">Evaluated challenge work</h2>
          {evaluatedSubmissions.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-mist">No evaluated challenge submissions yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {evaluatedSubmissions.map((submission) => (
                <Card key={submission.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-[12.5px] font-semibold text-cream">{submission.title}</p>
                    <p className="text-[11px] text-mist">{submission.challenge.title} · {submission.challenge.category}</p>
                  </div>
                  {submission.score !== null && <Badge tone="mint">{submission.score}/100</Badge>}
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export function VerifyPage({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode)
  const [submitted, setSubmitted] = useState(initialCode.trim())
  const [result, setResult] = useState<VerifiedCertificate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!submitted) return
    let active = true
    setLoading(true)
    setError(null)
    setResult(null)
    apiGet<{ data: VerifiedCertificate }>(`/certificates/verify/${encodeURIComponent(submitted)}`)
      .then((response) => {
        if (active) setResult(response.data)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Verification failed.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [submitted])

  return (
    <div className="shell max-w-3xl py-12">
      <a href="/" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">← AlumniConnect</a>
      <h1 className="mt-5 font-display text-2xl font-semibold text-cream">Verify a recognition record</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-mist">
        Enter the code printed on an AlumniConnect certificate. Verification checks the stored record and its integrity hash.
        A valid record confirms an AlumniConnect achievement only — not a university degree, credit or professional licence.
      </p>

      <form
        className="mt-6 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(code.trim())
        }}
      >
        <input
          className={fieldClass}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="AC-2026-XXXXXXXX"
          aria-label="Certificate code"
        />
        <Btn type="submit" disabled={code.trim().length < 3}>Verify</Btn>
      </form>

      {loading && <div className="mt-6"><Loading rows={2} label="Verifying" /></div>}
      {error && <div className="mt-6"><ErrorNote message={error} /></div>}

      {result && (
        <Card className="mt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-ash">Recognition record</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-cream">{result.title}</h2>
              <p className="mt-1 text-[12.5px] text-mist">{result.recipientName}</p>
            </div>
            {result.revokedAt ? <Badge tone="danger">Revoked</Badge> : <Badge tone="mint"><CheckCircle2 className="h-3 w-3" /> Valid</Badge>}
          </div>

          <dl className="mt-4 grid gap-2 text-[12px] sm:grid-cols-2">
            <div><dt className="text-ash">Issued by</dt><dd className="text-cream">{result.issuerName}</dd></div>
            <div><dt className="text-ash">Issued on</dt><dd className="text-cream">{formatDate(result.issuedAt)}</dd></div>
            <div><dt className="text-ash">Certificate code</dt><dd className="font-mono text-cream">{result.code}</dd></div>
            <div><dt className="text-ash">Type</dt><dd className="text-cream">{result.kind.replace(/_/g, ' ').toLowerCase()}</dd></div>
            {result.challenge && <div className="sm:col-span-2"><dt className="text-ash">Challenge</dt><dd className="text-cream">{result.challenge.title}</dd></div>}
          </dl>

          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11.5px] leading-relaxed text-amber-100">
            {result.statement}
          </div>

          <p className="mt-3 break-all font-mono text-[10px] text-ash">SHA-256 integrity: {result.integrity}</p>

          <a
            href={`/api/certificates/${encodeURIComponent(result.code)}/file`}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-azure-300 hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> Open printable record
          </a>
        </Card>
      )}
    </div>
  )
}

export function CertificateBlocked() {
  return (
    <Card>
      <StatusBadge status="RESTRICTED" />
    </Card>
  )
}
