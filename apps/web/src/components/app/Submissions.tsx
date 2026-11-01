import { useState } from 'react'
import { Award, ClipboardCheck, ExternalLink, Pencil, Send, Trash2 } from 'lucide-react'
import { apiPatch, apiPost, apiUpload, type Role, type Submission } from '../../lib/apiClient'
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

type Response = { data: Submission[]; meta?: { total: number } }

export function SubmissionsPanel({ role }: { role: Role }) {
  const isStudent = role === 'STUDENT'
  const list = useApi<Response>(isStudent ? '/submissions/mine?pageSize=50' : '/submissions/received?pageSize=50')
  const action = useAction()
  const [editing, setEditing] = useState<Submission | null>(null)
  const [evaluating, setEvaluating] = useState<Submission | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const withdraw = async (submission: Submission) => {
    if (!window.confirm('Withdraw this submission? The challenge author will see it as withdrawn.')) return
    const result = await action.run(
      () => apiPatch(`/submissions/${submission.id}`, { withdraw: true }),
      'Submission withdrawn.',
    )
    if (result) list.reload()
  }

  const issue = async (submission: Submission, kind: 'CHALLENGE_COMPLETION' | 'CHALLENGE_WINNER') => {
    const result = await action.run(
      () => apiPost('/certificates', { submissionId: submission.id, kind }),
      'Certificate issued and the student notified.',
    )
    if (result) setNotice('Certificate issued and the student notified.')
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title={isStudent ? 'My submissions' : 'Submissions to review'}
        hint={
          isStudent
            ? 'One submission per challenge. You can edit or withdraw until the work is evaluated or the deadline passes.'
            : 'Evaluate submissions and issue recognition. A certificate can only be issued for evaluated work.'
        }
      />

      {notice && <SuccessNote message={notice} />}
      {action.error && <ErrorNote message={action.error} />}
      {action.success && <SuccessNote message={action.success} />}
      {list.loading && <Loading rows={3} label="Loading submissions" />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}

      {list.data && list.data.data.length === 0 && (
        <EmptyState
          title={isStudent ? 'No submissions yet' : 'Nothing to review'}
          hint={
            isStudent
              ? 'Join a challenge and submit your work. Your evaluation appears here when it is recorded.'
              : 'Submissions from students appear here once they submit to one of your challenges.'
          }
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
      )}

      <div className="space-y-3">
        {list.data?.data.map((submission) => (
          <Card key={submission.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-sm font-semibold text-cream">{submission.title}</h3>
                  <StatusBadge status={submission.status} />
                  {submission.score !== null && <Badge tone="mint">{submission.score}/100</Badge>}
                </div>
                <p className="mt-1 text-[11.5px] text-mist">
                  {submission.challenge?.title}
                  {!isStudent && submission.student ? ` · ${submission.student.name}` : ''}
                  {submission.createdAt ? ` · submitted ${formatDate(submission.createdAt)}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isStudent && submission.status !== 'EVALUATED' && submission.status !== 'WITHDRAWN' && (
                  <>
                    <Btn size="sm" variant="secondary" onClick={() => setEditing(submission)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Btn>
                    <Btn size="sm" variant="danger" onClick={() => void withdraw(submission)}>
                      <Trash2 className="h-3.5 w-3.5" /> Withdraw
                    </Btn>
                  </>
                )}
                {!isStudent && submission.status !== 'WITHDRAWN' && (
                  <>
                    <Btn size="sm" variant="secondary" onClick={() => setEvaluating(submission)}>
                      {submission.status === 'EVALUATED' ? 'Re-evaluate' : 'Evaluate'}
                    </Btn>
                    {submission.status === 'EVALUATED' && (
                      <Btn size="sm" variant="mint" onClick={() => void issue(submission, 'CHALLENGE_COMPLETION')}>
                        <Award className="h-3.5 w-3.5" /> Issue certificate
                      </Btn>
                    )}
                  </>
                )}
              </div>
            </div>

            {submission.summary && <p className="mt-2 text-[12px] leading-relaxed text-mist">{submission.summary}</p>}

            <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
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
              {!isStudent && submission.student?.studentProfile && (
                <span className="text-ash">
                  {submission.student.studentProfile.department ?? 'Department not set'}
                  {submission.student.studentProfile.graduationYear ? ` · ${submission.student.studentProfile.graduationYear}` : ''}
                </span>
              )}
            </div>

            {submission.evaluations && submission.evaluations.length > 0 && (
              <div className="mt-3 rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-mist">Latest evaluation</p>
                {submission.evaluations.slice(0, 1).map((evaluation) => (
                  <div key={evaluation.id} className="mt-1">
                    <p className="text-[12px] text-cream">{evaluation.score}/100</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-mist">{evaluation.feedback}</p>
                  </div>
                ))}
              </div>
            )}

            {submission.feedback && (!submission.evaluations || submission.evaluations.length === 0) && (
              <p className="mt-3 rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2 text-[11.5px] text-mist">
                {submission.feedback}
              </p>
            )}
          </Card>
        ))}
      </div>

      {editing && (
        <EditSubmissionModal
          submission={editing}
          pending={action.pending}
          error={action.error}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            const result = await action.run(() => apiPatch(`/submissions/${editing.id}`, values), 'Submission updated.')
            if (result) {
              setEditing(null)
              list.reload()
            }
          }}
        />
      )}

      {evaluating && (
        <EvaluateModal
          submission={evaluating}
          pending={action.pending}
          error={action.error}
          onClose={() => setEvaluating(null)}
          onSubmit={async (score, feedback, aiAssisted) => {
            const result = await action.run(
              () =>
                apiPost(
                  aiAssisted
                    ? `/ai/submissions/${evaluating.id}/evaluation-draft/approve`
                    : `/submissions/${evaluating.id}/evaluations`,
                  { score, feedback },
                ),
              aiAssisted ? 'AI draft approved and recorded under your name.' : 'Evaluation recorded and the student notified.',
            )
            if (result) {
              setEvaluating(null)
              setNotice(aiAssisted ? 'AI draft approved and recorded under your name.' : 'Evaluation recorded and the student notified.')
              list.reload()
            }
          }}
        />
      )}
    </div>
  )
}

function EditSubmissionModal({
  submission,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  submission: Submission
  onClose: () => void
  onSubmit: (values: { title: string; summary: string; repoUrl: string; demoUrl: string; fileUrl?: string }) => Promise<void>
  pending: boolean
  error: string | null
}) {
  const [values, setValues] = useState({
    title: submission.title,
    summary: submission.summary ?? '',
    repoUrl: submission.repoUrl ?? '',
    demoUrl: submission.demoUrl ?? '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

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
      open
      onClose={onClose}
      title={`Edit — ${submission.title}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={pending || uploading || values.title.trim().length < 4} onClick={() => void submit()}>
            {uploading ? 'Uploading…' : pending ? 'Saving…' : 'Save changes'}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {error && <ErrorNote message={error} />}
        <Field label="Title">
          <input className={fieldClass} value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} />
        </Field>
        <Field label="Summary">
          <textarea className={`${fieldClass} min-h-24`} value={values.summary} onChange={(event) => setValues({ ...values, summary: event.target.value })} />
        </Field>
        <Field label="Repository URL">
          <input className={fieldClass} value={values.repoUrl} onChange={(event) => setValues({ ...values, repoUrl: event.target.value })} placeholder="https://" />
        </Field>
        <Field label="Demo URL">
          <input className={fieldClass} value={values.demoUrl} onChange={(event) => setValues({ ...values, demoUrl: event.target.value })} placeholder="https://" />
        </Field>
        <Field
          label="Project file"
          hint={
            submission.fileUrl
              ? 'A file is already attached. Choosing a new one replaces the link on this submission.'
              : 'Optional. ZIP, PDF or image up to 20 MB. Only the challenge author can download it.'
          }
        >
          <input
            type="file"
            accept=".zip,application/zip,.pdf,application/pdf,image/png,image/jpeg,image/webp,image/gif"
            className="block w-full text-[12px] text-mist file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-cream"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null)
              setFileError(null)
            }}
          />
          {submission.fileUrl && !file && (
            <a href={submission.fileUrl} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex items-center gap-1 text-[11px] text-azure-300 hover:underline">
              Current attachment <ExternalLink className="h-3 w-3" />
            </a>
          )}
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

function EvaluateModal({
  submission,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  submission: Submission
  onClose: () => void
  onSubmit: (score: number, feedback: string, aiAssisted: boolean) => Promise<void>
  pending: boolean
  error: string | null
}) {
  const [score, setScore] = useState(submission.score ?? 80)
  const [feedback, setFeedback] = useState('')
  const [aiAssisted, setAiAssisted] = useState(false)
  const [draftBusy, setDraftBusy] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  async function generateDraft() {
    setDraftBusy(true)
    setDraftError(null)
    try {
      const result = await apiPost<{ data: { score: number; feedback: string } }>(`/ai/submissions/${submission.id}/evaluation-draft`)
      setScore(result.data.score)
      setFeedback(result.data.feedback)
      setAiAssisted(true)
    } catch (cause) {
      setDraftError(cause instanceof Error ? cause.message : 'Could not generate a draft')
    } finally {
      setDraftBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Evaluate — ${submission.student?.name ?? submission.title}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={pending || feedback.trim().length < 10} onClick={() => void onSubmit(score, feedback, aiAssisted)}>
            {pending ? 'Saving…' : aiAssisted ? 'Approve & record' : 'Record evaluation'}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorNote message={error} />}
        {draftError && <ErrorNote message={draftError} />}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-500/25 bg-brand-500/5 px-3 py-2.5">
          <p className="text-[11.5px] leading-relaxed text-mist">
            Optional: draft feedback from the submission, then edit it. AI never records a score without your approval.
          </p>
          <Btn size="sm" variant="secondary" disabled={draftBusy} onClick={() => void generateDraft()}>
            {draftBusy ? 'Drafting…' : aiAssisted ? 'Regenerate draft' : 'Generate AI draft'}
          </Btn>
        </div>
        {aiAssisted && (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            This draft is marked AI-assisted. Review every sentence before approving; the evaluation is recorded under your name.
          </p>
        )}
        <div>
          <div className="mb-2 flex items-center justify-between text-[12px] text-mist">
            <span>Score</span>
            <span className="font-display text-xl font-semibold text-brand-300">{score}/100</span>
          </div>
          <input type="range" min={0} max={100} value={score} onChange={(event) => setScore(Number(event.target.value))} className="w-full accent-brand-500" aria-label="Score out of 100" />
        </div>
        <Field label="Written feedback" hint="At least 10 characters. This is shared with the student.">
          <textarea className={`${fieldClass} min-h-28`} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="What worked, what to improve, one concrete next step." />
        </Field>
        <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-mist">
          <Send className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
          The student is notified of the score and feedback. Evaluations are kept as a permanent record.
        </p>
      </div>
    </Modal>
  )
}
