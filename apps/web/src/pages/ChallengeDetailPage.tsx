import { useState } from 'react'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, ExternalLink, Send, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiPost, type Challenge, type Me } from '../lib/apiClient'
import { formatDate } from '../lib/format'
import { useAction, useApi } from '../lib/useApi'
import { Badge, Btn, Card, ErrorNote, Field, Loading, Modal, StatusBadge, SuccessNote, fieldClass } from '../components/app/ui'

type Detail = { data: Challenge }

export function ChallengeDetailPage({ slug }: { slug: string }) {
  const { user, loading: authLoading } = useAuth()
  const state = useApi<Detail>(`/challenges/${encodeURIComponent(slug)}`, [slug])
  const me = useApi<{ data: Me }>(user ? '/profile/me' : null)
  const action = useAction()
  const [submitting, setSubmitting] = useState(false)

  if (state.loading || authLoading) {
    return (
      <div className="shell py-16">
        <Loading rows={4} label="Loading challenge" />
      </div>
    )
  }

  if (state.error || !state.data) {
    return (
      <div className="shell py-16">
        <Card>
          <h1 className="font-display text-xl font-semibold text-cream">Challenge not found</h1>
          <p className="mt-2 text-[12.5px] text-mist">The link may be wrong or the challenge was removed.</p>
          <a href="/" className="mt-4 inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">
            Back to AlumniConnect
          </a>
        </Card>
      </div>
    )
  }

  const challenge = state.data.data
  const isStudent = user?.role === 'STUDENT'
  const canSubmit = isStudent && Boolean(challenge.isJoined) && challenge.status === 'OPEN' && !challenge.mySubmission

  const join = async () => {
    if (!user) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    const result = await action.run(() => apiPost(`/challenges/${challenge.id}/join`), 'Joined. You can submit your work now.')
    if (result !== null) state.reload()
  }

  return (
    <div className="shell py-10">
      <a href="/#challenges" className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> All challenges
      </a>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{challenge.category}</Badge>
            <StatusBadge status={challenge.status} />
            {challenge.isPaid ? <Badge tone="mint">Paid task</Badge> : <Badge tone="neutral">Unpaid</Badge>}
          </div>
          <h1 className="mt-3 font-display text-2xl font-semibold leading-tight text-cream sm:text-3xl">{challenge.title}</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-mist">{challenge.summary}</p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Card className="p-3">
              <p className="text-[10px] uppercase tracking-[0.09em] text-ash">Deadline</p>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-cream"><CalendarDays className="h-3.5 w-3.5 text-brand-300" /> {formatDate(challenge.deadline)}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] uppercase tracking-[0.09em] text-ash">Duration</p>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-cream"><Clock className="h-3.5 w-3.5 text-brand-300" /> {challenge.durationDays} days</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] uppercase tracking-[0.09em] text-ash">Participants</p>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-cream"><Users className="h-3.5 w-3.5 text-brand-300" /> {challenge.participants} joined</p>
            </Card>
          </div>

          <div className="mt-6 space-y-4">
            {challenge.objectives && (
              <Card>
                <h2 className="font-display text-sm font-semibold text-cream">Objectives</h2>
                <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-mist">{challenge.objectives}</p>
              </Card>
            )}
            <Card>
              <h2 className="font-display text-sm font-semibold text-cream">Deliverables</h2>
              <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-mist">{challenge.deliverables}</p>
            </Card>
            {challenge.requirements && (
              <Card>
                <h2 className="font-display text-sm font-semibold text-cream">Requirements</h2>
                <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-mist">{challenge.requirements}</p>
              </Card>
            )}
            <Card>
              <h2 className="font-display text-sm font-semibold text-cream">Skills</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {challenge.skills.map((skill) => (
                  <span key={skill} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10.5px] text-mist">{skill}</span>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="font-display text-sm font-semibold text-cream">Published by</h2>
            <p className="mt-2 text-[12.5px] text-cream">{challenge.author.name}</p>
            <p className="text-[11.5px] text-mist">
              {challenge.author.designation ?? 'Alumni mentor'}
              {challenge.author.company ? ` · ${challenge.author.company}` : ''}
            </p>
            {challenge.author.id && (
              <a href={`/portfolio/${challenge.author.id}`} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">
                View profile <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </Card>

          <Card>
            {action.error && <div className="mb-3"><ErrorNote message={action.error} /></div>}
            {action.success && <div className="mb-3"><SuccessNote message={action.success} /></div>}

            {challenge.mySubmission ? (
              <div>
                <Badge tone="mint"><CheckCircle2 className="h-3 w-3" /> Submitted</Badge>
                <p className="mt-2 text-[12.5px] text-cream">{challenge.mySubmission.title}</p>
                <p className="text-[11px] text-mist">Status: {challenge.mySubmission.status.toLowerCase()}</p>
                {challenge.mySubmission.score !== null && <p className="text-[11px] text-mint-300">Score: {challenge.mySubmission.score}/100</p>}
                <a href="/student/dashboard?tab=submissions" className="mt-3 inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">
                  Manage submission
                </a>
              </div>
            ) : canSubmit ? (
              <div>
                <p className="text-[12.5px] text-mist">You are participating. Submit your work before the deadline.</p>
                <Btn className="mt-3 w-full" onClick={() => setSubmitting(true)}>
                  <Send className="h-3.5 w-3.5" /> Submit work
                </Btn>
              </div>
            ) : challenge.status !== 'OPEN' ? (
              <p className="text-[12.5px] text-mist">This challenge is no longer accepting participation.</p>
            ) : !user ? (
              <div>
                <p className="text-[12.5px] text-mist">Sign in with a student account to join this challenge.</p>
                <Btn className="mt-3 w-full" onClick={() => window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`)}>
                  Sign in to join
                </Btn>
              </div>
            ) : !isStudent ? (
              <p className="text-[12.5px] text-mist">
                Only student accounts can join challenges. Your role is {user.role.toLowerCase()}.
              </p>
            ) : (
              <div>
                <p className="text-[12.5px] text-mist">Join to receive the submission workspace and deadline reminders.</p>
                <Btn className="mt-3 w-full" disabled={action.pending} onClick={() => void join()}>
                  {action.pending ? 'Joining…' : 'Join challenge'}
                </Btn>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[10.5px] leading-relaxed text-amber-100">
              {challenge.isPaid
                ? 'This task is labelled paid by its publisher. AlumniConnect does not process, escrow or guarantee payment.'
                : 'This is an unpaid task. Participation is voluntary and no payment is offered.'}
            </div>
            {me.data?.data.studentProfile && !me.data.data.studentProfile.visibleToCompanies && (
              <p className="mt-3 text-[10.5px] leading-relaxed text-ash">
                Completing a challenge does not automatically share your profile with companies. Company visibility is a separate
                consent switch in your profile.
              </p>
            )}
          </Card>
        </div>
      </div>

      {submitting && (
        <SubmitModal
          challenge={challenge}
          pending={action.pending}
          error={action.error}
          onClose={() => setSubmitting(false)}
          onSubmit={async (values) => {
            const result = await action.run(
              () => apiPost(`/challenges/${challenge.id}/submissions`, values),
              'Submission received.',
            )
            if (result) {
              setSubmitting(false)
              state.reload()
            }
          }}
        />
      )}
    </div>
  )
}

function SubmitModal({
  challenge,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  challenge: Challenge
  onClose: () => void
  onSubmit: (values: { title: string; summary: string; repoUrl: string; demoUrl: string }) => Promise<void>
  pending: boolean
  error: string | null
}) {
  const [values, setValues] = useState({ title: '', summary: '', repoUrl: '', demoUrl: '' })

  return (
    <Modal
      open
      onClose={onClose}
      title={`Submit to ${challenge.title}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={pending || values.title.trim().length < 4} onClick={() => void onSubmit(values)}>
            {pending ? 'Sending…' : 'Submit work'}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {error && <ErrorNote message={error} />}
        <Field label="Submission title">
          <input className={fieldClass} value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} placeholder="What did you build?" />
        </Field>
        <Field label="Summary" hint="Explain your approach. Do not include other people's personal data.">
          <textarea className={`${fieldClass} min-h-24`} value={values.summary} onChange={(event) => setValues({ ...values, summary: event.target.value })} />
        </Field>
        <Field label="Repository URL" hint="Optional, public link only.">
          <input className={fieldClass} value={values.repoUrl} onChange={(event) => setValues({ ...values, repoUrl: event.target.value })} placeholder="https://" />
        </Field>
        <Field label="Demo URL" hint="Optional.">
          <input className={fieldClass} value={values.demoUrl} onChange={(event) => setValues({ ...values, demoUrl: event.target.value })} placeholder="https://" />
        </Field>
      </div>
    </Modal>
  )
}
