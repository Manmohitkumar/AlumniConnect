import { useState } from 'react'
import {
  Award,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Filter,
  Plus,
  Search,
  Send,
  Sparkles,
  Users,
} from 'lucide-react'
import {
  apiPatch,
  apiPost,
  apiUpload,
  type Challenge,
  type Role,
  type Submission,
} from '../../lib/apiClient'
import { formatDate } from '../../lib/format'
import { useAction, useApi } from '../../lib/useApi'
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

type ListResponse = { data: Challenge[]; meta: { total: number; seededDemo?: boolean } }

function ChallengeMeta({ challenge }: { challenge: Challenge }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-mist">
      <span className="inline-flex items-center gap-1">
        <CalendarDays className="h-3.5 w-3.5" /> {formatDate(challenge.deadline)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Users className="h-3.5 w-3.5" /> {challenge.participants} joined
      </span>
      <span>{challenge.durationDays} days</span>
      {challenge.isPaid ? <Badge tone="mint">Paid task</Badge> : <Badge tone="neutral">Unpaid</Badge>}
      {challenge.maxParticipants && <span>Limit {challenge.maxParticipants}</span>}
    </div>
  )
}

export function StudentChallenges() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [applied, setApplied] = useState({ query: '', category: '' })
  const [detail, setDetail] = useState<Challenge | null>(null)
  const [submitFor, setSubmitFor] = useState<Challenge | null>(null)

  const params = new URLSearchParams({ status: 'OPEN', pageSize: '24' })
  if (applied.query) params.set('q', applied.query)
  if (applied.category) params.set('category', applied.category)
  const list = useApi<ListResponse>(`/challenges?${params.toString()}`, [applied.query, applied.category])
  const detailState = useApi<{ data: Challenge }>(detail ? `/challenges/${detail.slug}` : null, [detail?.slug])

  const joinAction = useAction()
  const submitAction = useAction()

  const join = async (challenge: Challenge) => {
    const result = await joinAction.run(() => apiPost(`/challenges/${challenge.id}/join`), 'Joined. You can submit your work now.')
    if (result !== null) {
      list.reload()
      if (detail) detailState.reload()
    }
  }

  return (
    <div>
      <SectionHeading
        title="Open challenges"
        hint="Industry problems published by alumni. Paid and unpaid tasks are labelled — payment is the publisher's responsibility and is not guaranteed by the platform."
      />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && setApplied({ query, category })}
            placeholder="Search by title, summary or category"
            className={`${fieldClass} pl-9`}
            aria-label="Search challenges"
          />
        </div>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className={`${fieldClass} sm:w-48`} aria-label="Filter by category">
          <option value="">All categories</option>
          <option value="Data">Data</option>
          <option value="Web app">Web app</option>
          <option value="Design">Design</option>
          <option value="Backend">Backend</option>
          <option value="Accessibility">Accessibility</option>
        </select>
        <Btn variant="secondary" onClick={() => setApplied({ query, category })}>
          <Filter className="h-3.5 w-3.5" /> Apply
        </Btn>
      </div>

      {joinAction.error && <div className="mb-4"><ErrorNote message={joinAction.error} /></div>}
      {joinAction.success && <div className="mb-4"><SuccessNote message={joinAction.success} /></div>}
      {list.loading && <Loading rows={4} label="Loading challenges" />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}

      {list.data && list.data.data.length === 0 && (
        <EmptyState title="No challenges match those filters" hint="Try clearing the search or choose a different category." icon={<Sparkles className="h-5 w-5" />} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {list.data?.data.map((challenge) => (
          <Card key={challenge.id} className="flex flex-col">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.09em] text-brand-300">{challenge.category}</p>
                <h3 className="mt-1 font-display text-base font-semibold text-cream">{challenge.title}</h3>
                <p className="mt-1 text-[11.5px] text-mist">
                  {challenge.author.name}
                  {challenge.author.company ? ` · ${challenge.author.company}` : ''}
                </p>
              </div>
              <StatusBadge status={challenge.status} />
            </div>

            <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-mist">{challenge.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {challenge.skills.map((skill) => (
                <span key={skill} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10.5px] text-mist">
                  {skill}
                </span>
              ))}
            </div>
            <ChallengeMeta challenge={challenge} />

            {challenge.mySubmission && (
              <div className="mt-3 rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2 text-[11.5px] text-mist">
                Submitted: <span className="text-cream">{challenge.mySubmission.title}</span>{' '}
                <StatusBadge status={challenge.mySubmission.status} />
                {challenge.mySubmission.score !== null && <span className="ml-2 text-mint-300">{challenge.mySubmission.score}/100</span>}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Btn variant="secondary" size="sm" onClick={() => setDetail(challenge)}>
                View details
              </Btn>
              {challenge.status === 'OPEN' && !challenge.isJoined && (
                <Btn size="sm" disabled={joinAction.pending} onClick={() => void join(challenge)}>
                  <Plus className="h-3.5 w-3.5" /> Join
                </Btn>
              )}
              {challenge.isJoined && !challenge.mySubmission && (
                <Btn size="sm" onClick={() => setSubmitFor(challenge)}>
                  <Send className="h-3.5 w-3.5" /> Submit work
                </Btn>
              )}
              {challenge.isJoined && challenge.mySubmission && (
                <Badge tone="mint">Joined</Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.title ?? 'Challenge'}>
        {detailState.loading && <Loading rows={3} />}
        {detailState.error && <ErrorNote message={detailState.error} onRetry={detailState.reload} />}
        {detailState.data && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailState.data.data.status} />
              <Badge tone="brand">{detailState.data.data.category}</Badge>
              {detailState.data.data.isPaid ? <Badge tone="mint">Paid task</Badge> : <Badge tone="neutral">Unpaid</Badge>}
            </div>
            <p className="text-[12.5px] leading-relaxed text-mist">{detailState.data.data.summary}</p>
            {detailState.data.data.objectives && (
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-mist">Objectives</p>
                <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-mist">{detailState.data.data.objectives}</p>
              </div>
            )}
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-mist">Deliverables</p>
              <p className="mt-1 text-[12.5px] text-mist">{detailState.data.data.deliverables}</p>
            </div>
            {detailState.data.data.requirements && (
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-mist">Requirements</p>
                <p className="mt-1 text-[12.5px] text-mist">{detailState.data.data.requirements}</p>
              </div>
            )}
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] leading-relaxed text-amber-100">
              Participation is recorded on the platform. Payment for paid tasks is handled by the publisher and is not
              guaranteed or escrowed by AlumniConnect.
            </div>
            <div className="flex flex-wrap gap-2">
              {detail && !detailState.data.data.isJoined && detailState.data.data.status === 'OPEN' && (
                <Btn onClick={() => void join(detail)} disabled={joinAction.pending}>Join challenge</Btn>
              )}
              {detail && detailState.data.data.isJoined && !detailState.data.data.mySubmission && (
                <Btn onClick={() => { setSubmitFor(detail); setDetail(null) }}>
                  <Send className="h-3.5 w-3.5" /> Submit work
                </Btn>
              )}
            </div>
          </div>
        )}
      </Modal>

      <SubmitModal
        challenge={submitFor}
        onClose={() => setSubmitFor(null)}
        pending={submitAction.pending}
        error={submitAction.error}
        success={submitAction.success}
        onSubmit={async (values) => {
          if (!submitFor) return
          const created = await submitAction.run(
            () => apiPost(`/challenges/${submitFor.id}/submissions`, values),
            'Submission received. You can edit it until the deadline.',
          )
          if (created) {
            setSubmitFor(null)
            list.reload()
          }
        }}
      />
    </div>
  )
}

function SubmitModal({
  challenge,
  onClose,
  onSubmit,
  pending,
  error,
  success,
}: {
  challenge: Challenge | null
  onClose: () => void
  onSubmit: (values: { title: string; summary: string; repoUrl: string; demoUrl: string; fileUrl?: string }) => Promise<void>
  pending: boolean
  error: string | null
  success: string | null
}) {
  const [values, setValues] = useState({ title: '', summary: '', repoUrl: '', demoUrl: '' })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const close = () => {
    setFile(null)
    setFileError(null)
    onClose()
  }

  const submit = async () => {
    setFileError(null)
    let fileUrl: string | undefined
    if (file) {
      setUploading(true)
      try {
        const uploaded = await apiUpload(file, 'submission')
        fileUrl = uploaded.url
      } catch (uploadError) {
        setFileError(uploadError instanceof Error ? uploadError.message : 'The attachment could not be uploaded.')
        setUploading(false)
        return
      }
      setUploading(false)
    }
    await onSubmit({ ...values, fileUrl })
  }

  return (
    <Modal
      open={Boolean(challenge)}
      onClose={close}
      title={`Submit to ${challenge?.title ?? ''}`}
      footer={
        <>
          <Btn variant="ghost" onClick={close}>Cancel</Btn>
          <Btn disabled={pending || uploading || values.title.trim().length < 4} onClick={() => void submit()}>
            {uploading ? 'Uploading…' : pending ? 'Sending…' : 'Submit work'}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {error && <ErrorNote message={error} />}
        {success && <SuccessNote message={success} />}
        <Field label="Submission title">
          <input className={fieldClass} value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} placeholder="What did you build?" />
        </Field>
        <Field label="Summary" hint="Explain the approach and what is working. Do not include personal data about others.">
          <textarea className={`${fieldClass} min-h-24`} value={values.summary} onChange={(event) => setValues({ ...values, summary: event.target.value })} />
        </Field>
        <Field label="Repository URL" hint="Optional. Public links only.">
          <input className={fieldClass} value={values.repoUrl} onChange={(event) => setValues({ ...values, repoUrl: event.target.value })} placeholder="https://" />
        </Field>
        <Field label="Demo URL" hint="Optional.">
          <input className={fieldClass} value={values.demoUrl} onChange={(event) => setValues({ ...values, demoUrl: event.target.value })} placeholder="https://" />
        </Field>
        <Field label="Project file" hint="Optional. ZIP, PDF or image up to 20 MB. Only the challenge author can download it.">
          <input
            type="file"
            accept=".zip,application/zip,.pdf,application/pdf,image/png,image/jpeg,image/webp,image/gif"
            className="block w-full text-[12px] text-mist file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-cream"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null)
              setFileError(null)
            }}
          />
          {file && (
            <p className="mt-1 text-[11px] text-ash">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          )}
          {fileError && <p className="mt-1 text-[11px] text-brand-300">{fileError}</p>}
        </Field>
      </div>
    </Modal>
  )
}

type ChallengeForm = {
  title: string
  summary: string
  category: string
  objectives: string
  deliverables: string
  requirements: string
  durationDays: string
  isPaid: boolean
  maxParticipants: string
  skills: string
}

const emptyChallenge: ChallengeForm = {
  title: '',
  summary: '',
  category: 'Data',
  objectives: '',
  deliverables: '',
  requirements: '',
  durationDays: '14',
  isPaid: false,
  maxParticipants: '',
  skills: '',
}

export function AlumniChallenges() {
  const list = useApi<ListResponse>('/challenges?mine=true&status=ALL&pageSize=50')
  const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; challenge?: Challenge } | null>(null)
  const [reviewing, setReviewing] = useState<Challenge | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const action = useAction()

  const toggleStatus = async (challenge: Challenge) => {
    const next = challenge.status === 'OPEN' ? 'CLOSED' : 'OPEN'
    const result = await action.run(() => apiPatch(`/challenges/${challenge.id}`, { status: next }), `Challenge ${next.toLowerCase()}.`)
    if (result) list.reload()
  }

  return (
    <div>
      <SectionHeading
        title="My challenges"
        hint="Publish a challenge, review submissions and issue recognition. Certificates require an evaluated submission."
        action={
          <Btn onClick={() => setEditor({ mode: 'create' })}>
            <Plus className="h-3.5 w-3.5" /> New challenge
          </Btn>
        }
      />

      {notice && <div className="mb-4"><SuccessNote message={notice} /></div>}
      {action.error && <div className="mb-4"><ErrorNote message={action.error} /></div>}
      {list.loading && <Loading rows={3} />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.data && list.data.data.length === 0 && (
        <EmptyState title="You have not published a challenge yet" hint="Start with a small, well-scoped problem and a clear deadline." icon={<Sparkles className="h-5 w-5" />} action={<Btn onClick={() => setEditor({ mode: 'create' })}>Create the first one</Btn>} />
      )}

      <div className="space-y-3">
        {list.data?.data.map((challenge) => (
          <Card key={challenge.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-semibold text-cream">{challenge.title}</h3>
                  <StatusBadge status={challenge.status} />
                </div>
                <p className="mt-1 text-[12px] text-mist">
                  {challenge.category} · {challenge.submissions} submissions · {challenge.participants} participants · deadline {formatDate(challenge.deadline)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn variant="secondary" size="sm" onClick={() => setReviewing(challenge)}>Review submissions</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setEditor({ mode: 'edit', challenge })}>Edit</Btn>
                <Btn variant="ghost" size="sm" onClick={() => void toggleStatus(challenge)}>
                  {challenge.status === 'OPEN' ? 'Close' : 'Reopen'}
                </Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editor && (
        <ChallengeEditor
          mode={editor.mode}
          initial={editor.challenge}
          onClose={() => setEditor(null)}
          onSaved={(message) => {
            setEditor(null)
            setNotice(message)
            list.reload()
          }}
        />
      )}

      {reviewing && (
        <ReviewDrawer
          challenge={reviewing}
          onClose={() => setReviewing(null)}
          onIssued={(message) => setNotice(message)}
        />
      )}
    </div>
  )
}

function ChallengeEditor({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  initial?: Challenge
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [form, setForm] = useState<ChallengeForm>(
    initial
      ? {
          title: initial.title,
          summary: initial.summary,
          category: initial.category,
          objectives: initial.objectives ?? '',
          deliverables: initial.deliverables,
          requirements: initial.requirements ?? '',
          durationDays: String(initial.durationDays),
          isPaid: initial.isPaid,
          maxParticipants: initial.maxParticipants ? String(initial.maxParticipants) : '',
          skills: initial.skills.join(', '),
        }
      : emptyChallenge,
  )
  const action = useAction()

  const save = async () => {
    const payload = {
      title: form.title,
      summary: form.summary,
      category: form.category,
      objectives: form.objectives || undefined,
      deliverables: form.deliverables,
      requirements: form.requirements || undefined,
      durationDays: Number(form.durationDays),
      isPaid: form.isPaid,
      maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
      skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
    }
    const result = await action.run(
      () => (mode === 'create' ? apiPost('/challenges', payload) : apiPatch(`/challenges/${initial?.id}`, payload)),
      mode === 'create' ? 'Challenge published.' : 'Challenge updated.',
    )
    if (result) onSaved(mode === 'create' ? 'Challenge published.' : 'Challenge updated.')
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'Publish a challenge' : 'Edit challenge'}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={action.pending || form.title.length < 6 || form.summary.length < 20 || !form.deliverables} onClick={() => void save()}>
            {action.pending ? 'Saving…' : mode === 'create' ? 'Publish' : 'Save changes'}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {action.error && <ErrorNote message={action.error} />}
        <Field label="Title">
          <input className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </Field>
        <Field label="Summary" hint="At least 20 characters. Students see this in the challenge list.">
          <textarea className={`${fieldClass} min-h-20`} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category">
            <input className={fieldClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          </Field>
          <Field label="Duration (days)">
            <input type="number" min={1} max={180} className={fieldClass} value={form.durationDays} onChange={(event) => setForm({ ...form, durationDays: event.target.value })} />
          </Field>
        </div>
        <Field label="Objectives" hint="Optional. What should a good submission demonstrate?">
          <textarea className={`${fieldClass} min-h-16`} value={form.objectives} onChange={(event) => setForm({ ...form, objectives: event.target.value })} />
        </Field>
        <Field label="Deliverables">
          <input className={fieldClass} value={form.deliverables} onChange={(event) => setForm({ ...form, deliverables: event.target.value })} placeholder="Prototype, source code, short report" />
        </Field>
        <Field label="Requirements" hint="Optional. Tools, constraints and participation rules.">
          <textarea className={`${fieldClass} min-h-16`} value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} />
        </Field>
        <Field label="Skills" hint="Comma separated, up to 12.">
          <input className={fieldClass} value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="React, SQL, Accessibility" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Maximum participants" hint="Optional.">
            <input type="number" min={1} className={fieldClass} value={form.maxParticipants} onChange={(event) => setForm({ ...form, maxParticipants: event.target.value })} />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-[12.5px] text-mist">
            <input type="checkbox" checked={form.isPaid} onChange={(event) => setForm({ ...form, isPaid: event.target.checked })} className="h-4 w-4 rounded border-white/20 bg-ink-900" />
            This is a paid task
          </label>
        </div>
        {form.isPaid && (
          <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-100">
            Marking a task paid means it will be labelled as paid to students. AlumniConnect does not process or guarantee payment.
          </p>
        )}
      </div>
    </Modal>
  )
}

function ReviewDrawer({
  challenge,
  onClose,
  onIssued,
}: {
  challenge: Challenge
  onClose: () => void
  onIssued: (message: string) => void
}) {
  const submissions = useApi<{ data: Submission[] }>(`/submissions/challenge/${challenge.id}`, [challenge.id])
  const [evaluating, setEvaluating] = useState<Submission | null>(null)
  const evaluateAction = useAction()
  const issueAction = useAction()
  const [localNotice, setLocalNotice] = useState<string | null>(null)

  const issue = async (submission: Submission, kind: 'CHALLENGE_COMPLETION' | 'CHALLENGE_WINNER') => {
    const result = await issueAction.run(
      () => apiPost('/certificates', { submissionId: submission.id, kind }),
      'Certificate issued and the student was notified.',
    )
    if (result) {
      setLocalNotice('Certificate issued and the student was notified.')
      onIssued('Certificate issued.')
    }
  }

  return (
    <Modal open onClose={onClose} title={`Submissions — ${challenge.title}`}>
      <div className="space-y-3">
        {localNotice && <SuccessNote message={localNotice} />}
        {evaluateAction.error && <ErrorNote message={evaluateAction.error} />}
        {issueAction.error && <ErrorNote message={issueAction.error} />}
        {submissions.loading && <Loading rows={3} />}
        {submissions.error && <ErrorNote message={submissions.error} onRetry={submissions.reload} />}
        {submissions.data && submissions.data.data.length === 0 && (
          <EmptyState title="No submissions yet" hint="Students will appear here after they submit through the challenge page." />
        )}
        {submissions.data?.data.map((submission) => (
          <Card key={submission.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-cream">{submission.title}</p>
                <p className="text-[11.5px] text-mist">
                  {submission.student?.name}
                  {submission.student?.studentProfile ? ` · ${submission.student.studentProfile.department ?? ''}` : ''}
                </p>
              </div>
              <StatusBadge status={submission.status} />
            </div>
            {submission.summary && <p className="mt-2 line-clamp-3 text-[12px] text-mist">{submission.summary}</p>}
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ash">
              {submission.repoUrl && (
                <a href={submission.repoUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-azure-300 hover:underline">
                  Repository <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {submission.demoUrl && (
                <a href={submission.demoUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-azure-300 hover:underline">
                  Demo <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {submission.fileUrl && (
                <a href={submission.fileUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-azure-300 hover:underline">
                  Attachment <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {submission.score !== null && <span className="text-mint-300">Score {submission.score}/100</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn size="sm" variant="secondary" onClick={() => setEvaluating(submission)}>
                {submission.status === 'EVALUATED' ? 'Re-evaluate' : 'Evaluate'}
              </Btn>
              {submission.status === 'EVALUATED' && (
                <>
                  <Btn size="sm" variant="mint" disabled={issueAction.pending} onClick={() => void issue(submission, 'CHALLENGE_COMPLETION')}>
                    <Award className="h-3.5 w-3.5" /> Issue completion
                  </Btn>
                  <Btn size="sm" variant="ghost" disabled={issueAction.pending} onClick={() => void issue(submission, 'CHALLENGE_WINNER')}>
                    Winner certificate
                  </Btn>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {evaluating && (
        <EvaluationModal
          submission={evaluating}
          pending={evaluateAction.pending}
          error={evaluateAction.error}
          onClose={() => setEvaluating(null)}
          onSubmit={async (score, feedback) => {
            const result = await evaluateAction.run(
              () => apiPost(`/submissions/${evaluating.id}/evaluations`, { score, feedback }),
              'Evaluation recorded.',
            )
            if (result) {
              setEvaluating(null)
              setLocalNotice('Evaluation recorded and the student was notified.')
              submissions.reload()
            }
          }}
        />
      )}
    </Modal>
  )
}

function EvaluationModal({
  submission,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  submission: Submission
  onClose: () => void
  onSubmit: (score: number, feedback: string) => Promise<void>
  pending: boolean
  error: string | null
}) {
  const [score, setScore] = useState(submission.score ?? 80)
  const [feedback, setFeedback] = useState('')

  return (
    <Modal
      open
      onClose={onClose}
      title={`Evaluate — ${submission.student?.name ?? 'submission'}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={pending || feedback.trim().length < 10} onClick={() => void onSubmit(score, feedback)}>
            {pending ? 'Saving…' : 'Record evaluation'}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorNote message={error} />}
        <div>
          <div className="mb-2 flex items-center justify-between text-[12px] text-mist">
            <span>Score</span>
            <span className="font-display text-xl font-semibold text-brand-300">{score}/100</span>
          </div>
          <input type="range" min={0} max={100} value={score} onChange={(event) => setScore(Number(event.target.value))} className="w-full accent-brand-500" aria-label="Score out of 100" />
        </div>
        <Field label="Written feedback" hint="At least 10 characters. Shared with the student.">
          <textarea className={`${fieldClass} min-h-28`} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="What worked, what to improve, and one concrete next step." />
        </Field>
        <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-mist">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-300" />
          Evaluations are permanent records. A second evaluation supersedes the displayed score but both are kept in the history.
        </p>
      </div>
    </Modal>
  )
}

export function challengeRoleHint(role: Role) {
  return role === 'STUDENT' ? 'Browse, join and submit' : 'Publish and evaluate'
}
