import { useState } from 'react'
import { Briefcase, ExternalLink, MapPin, Plus, Search, Users } from 'lucide-react'
import {
  apiPatch,
  apiPost,
  type Opportunity,
  type Role,
  type StudentCandidate,
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

type Application = {
  id: string
  status: string
  coverNote: string | null
  createdAt: string
  student: { id: string; name: string; headline: string | null; studentProfile: { department: string | null; course: string | null; graduationYear: number | null; skills: string | null } | null }
}

export function StudentOpportunities({ consented }: { consented: boolean }) {
  const list = useApi<{ data: Opportunity[] }>('/opportunities?pageSize=24')
  const [applying, setApplying] = useState<Opportunity | null>(null)
  const action = useAction()

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Career opportunities"
        hint="Published by verified company accounts. Applying requires company visibility consent in your profile."
      />
      {!consented && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[12px] text-amber-100">
          Company visibility is off. You can browse listings, but applications need consent. Enable it in your Portfolio tab before applying.
        </div>
      )}
      {action.error && <ErrorNote message={action.error} />}
      {action.success && <SuccessNote message={action.success} />}
      {list.loading && <Loading rows={3} />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.data && list.data.data.length === 0 && <EmptyState title="No open opportunities" hint="Companies publish internships and jobs here." icon={<Briefcase className="h-5 w-5" />} />}

      <div className="grid gap-3 md:grid-cols-2">
        {list.data?.data.map((opportunity) => (
          <Card key={opportunity.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.09em] text-brand-300">{opportunity.type.replace('_', ' ')}</p>
                <h3 className="mt-1 font-display text-base font-semibold text-cream">{opportunity.title}</h3>
                <p className="text-[11.5px] text-mist">{opportunity.company.name}</p>
              </div>
              {opportunity.myApplication ? <Badge tone="mint">{opportunity.myApplication.status}</Badge> : <Badge tone="neutral">{opportunity.remote ? 'Remote' : 'On-site'}</Badge>}
            </div>
            <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-mist">{opportunity.description}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-ash">
              {opportunity.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {opportunity.location}</span>}
              {opportunity.deadline && <span>Apply by {formatDate(opportunity.deadline)}</span>}
              {opportunity.skills && <span>{opportunity.skills}</span>}
            </div>
            <div className="mt-4">
              {opportunity.myApplication ? (
                <Badge tone="mint">Application {opportunity.myApplication.status.toLowerCase()}</Badge>
              ) : (
                <Btn size="sm" disabled={!consented} onClick={() => setApplying(opportunity)}>Apply</Btn>
              )}
            </div>
          </Card>
        ))}
      </div>

      {applying && (
        <ApplyModal
          opportunity={applying}
          pending={action.pending}
          error={action.error}
          onClose={() => setApplying(null)}
          onSubmit={async (coverNote) => {
            const result = await action.run(() => apiPost(`/opportunities/${applying.id}/apply`, { coverNote }), 'Application submitted. The company can review your consented profile.')
            if (result) {
              setApplying(null)
              list.reload()
            }
          }}
        />
      )}
    </div>
  )
}

function ApplyModal({
  opportunity,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  opportunity: Opportunity
  onClose: () => void
  onSubmit: (coverNote: string) => Promise<void>
  pending: boolean
  error: string | null
}) {
  const [note, setNote] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      title={`Apply — ${opportunity.title}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={pending} onClick={() => void onSubmit(note)}>{pending ? 'Sending…' : 'Submit application'}</Btn>
        </>
      }
    >
      <div className="space-y-3">
        {error && <ErrorNote message={error} />}
        <p className="text-[12px] leading-relaxed text-mist">
          The company will see the profile fields you chose to share with companies, plus this note. Your email is not shared
          automatically; the company continues the process through the platform.
        </p>
        <Field label="Cover note" hint="Optional. Keep it specific and free of sensitive personal data.">
          <textarea className={`${fieldClass} min-h-24`} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

export function CompanyOpportunities() {
  const list = useApi<{ data: Opportunity[] }>('/opportunities?mine=true&pageSize=24')
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<Opportunity | null>(null)
  const action = useAction()

  const close = async (opportunity: Opportunity) => {
    const result = await action.run(() => apiPatch(`/opportunities/${opportunity.id}`, { status: opportunity.status === 'OPEN' ? 'CLOSED' : 'OPEN' }), 'Opportunity updated.')
    if (result) list.reload()
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="My opportunities"
        hint="Create and manage internships and jobs. Only consented student profiles are visible to you."
        action={<Btn size="sm" onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5" /> New opportunity</Btn>}
      />
      {action.error && <ErrorNote message={action.error} />}
      {action.success && <SuccessNote message={action.success} />}
      {list.loading && <Loading rows={3} />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.data && list.data.data.length === 0 && <EmptyState title="No opportunities yet" hint="Publish an internship or job to start receiving applications." icon={<Briefcase className="h-5 w-5" />} />}

      <div className="space-y-3">
        {list.data?.data.map((opportunity) => (
          <Card key={opportunity.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-semibold text-cream">{opportunity.title}</h3>
                  <StatusBadge status={opportunity.status} />
                </div>
                <p className="mt-1 text-[11.5px] text-mist">{opportunity.type.replace('_', ' ')} · {opportunity.remote ? 'Remote' : opportunity.location ?? 'On-site'} · {opportunity.applicationCount} applications</p>
              </div>
              <div className="flex gap-2">
                <Btn size="sm" variant="secondary" onClick={() => setViewing(opportunity)}>Applicants</Btn>
                <Btn size="sm" variant="ghost" onClick={() => void close(opportunity)}>{opportunity.status === 'OPEN' ? 'Close' : 'Reopen'}</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {creating && <OpportunityCreateModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); list.reload() }} />}
      {viewing && <ApplicantsModal opportunity={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

function OpportunityCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const action = useAction()
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'INTERNSHIP',
    location: '',
    remote: true,
    skills: '',
    deadline: '',
  })

  const submit = async () => {
    const result = await action.run(
      () =>
        apiPost('/opportunities', {
          ...form,
          location: form.location || undefined,
          deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        }),
      'Opportunity published.',
    )
    if (result) onCreated()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Publish an opportunity"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={action.pending || form.title.length < 4 || form.description.length < 30} onClick={() => void submit()}>
            {action.pending ? 'Publishing…' : 'Publish'}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {action.error && <ErrorNote message={action.error} />}
        <Field label="Title"><input className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
        <Field label="Description" hint="What the role involves, who it suits and what the process looks like.">
          <textarea className={`${fieldClass} min-h-24`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type">
            <select className={fieldClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              <option value="INTERNSHIP">Internship</option>
              <option value="JOB">Job</option>
              <option value="MENTORSHIP_PROGRAM">Mentorship programme</option>
            </select>
          </Field>
          <Field label="Location"><input className={fieldClass} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
        </div>
        <Field label="Skills" hint="Comma separated."><input className={fieldClass} value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Deadline"><input type="date" className={fieldClass} value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></Field>
          <label className="flex items-end gap-2 pb-2 text-[12.5px] text-mist">
            <input type="checkbox" checked={form.remote} onChange={(event) => setForm({ ...form, remote: event.target.checked })} className="h-4 w-4" /> Remote
          </label>
        </div>
      </div>
    </Modal>
  )
}

function ApplicantsModal({ opportunity, onClose }: { opportunity: Opportunity; onClose: () => void }) {
  const applicants = useApi<{ data: Application[] }>(`/opportunities/${opportunity.id}/applications`, [opportunity.id])
  const action = useAction()

  const update = async (application: Application, status: string) => {
    const result = await action.run(() => apiPatch(`/applications/${application.id}`, { status }), 'Application updated.')
    if (result) applicants.reload()
  }

  return (
    <Modal open onClose={onClose} title={`Applicants — ${opportunity.title}`}>
      <div className="space-y-3">
        {action.error && <ErrorNote message={action.error} />}
        {applicants.loading && <Loading rows={2} />}
        {applicants.error && <ErrorNote message={applicants.error} onRetry={applicants.reload} />}
        {applicants.data && applicants.data.data.length === 0 && <EmptyState title="No applications yet" hint="Consented students who apply will appear here." />}
        {applicants.data?.data.map((application) => (
          <Card key={application.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-sm font-semibold text-cream">{application.student.name}</p>
                <p className="text-[11.5px] text-mist">{application.student.headline}</p>
                <p className="text-[11px] text-ash">
                  {application.student.studentProfile?.department}
                  {application.student.studentProfile?.graduationYear ? ` · ${application.student.studentProfile.graduationYear}` : ''}
                </p>
              </div>
              <StatusBadge status={application.status} />
            </div>
            {application.coverNote && <p className="mt-2 text-[12px] text-mist">{application.coverNote}</p>}
            <p className="mt-2 text-[11px] text-ash">Skills: {application.student.studentProfile?.skills ?? '—'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn size="sm" variant="mint" disabled={application.status === 'SHORTLISTED'} onClick={() => void update(application, 'SHORTLISTED')}>Shortlist</Btn>
              <Btn size="sm" variant="ghost" disabled={application.status === 'REJECTED'} onClick={() => void update(application, 'REJECTED')}>Reject</Btn>
            </div>
          </Card>
        ))}
      </div>
    </Modal>
  )
}

type ReceivedApplication = Application & {
  opportunity: { id: string; title: string; type: string; status: string }
}

export function ApplicationsReceived() {
  const list = useApi<{ data: ReceivedApplication[] }>('/applications/received')
  const action = useAction()

  const update = async (application: ReceivedApplication, status: string) => {
    const result = await action.run(() => apiPatch(`/applications/${application.id}`, { status }), 'Application updated.')
    if (result) list.reload()
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Applicants"
        hint="Students who consented to company visibility. Shortlisting and rejection update the student's application status."
      />
      {action.error && <ErrorNote message={action.error} />}
      {action.success && <SuccessNote message={action.success} />}
      {list.loading && <Loading rows={3} />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.data && list.data.data.length === 0 && (
        <EmptyState title="No applications yet" hint="Publish an opportunity; consented students can apply from their dashboard." icon={<Briefcase className="h-5 w-5" />} />
      )}

      <div className="space-y-3">
        {list.data?.data.map((application) => (
          <Card key={application.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-sm font-semibold text-cream">{application.student.name}</h3>
                  <StatusBadge status={application.status} />
                </div>
                <p className="mt-1 text-[11.5px] text-mist">
                  {application.opportunity.title} · {application.opportunity.type.replace('_', ' ')}
                </p>
                <p className="text-[11px] text-ash">
                  {application.student.studentProfile?.department ?? 'Department not set'}
                  {application.student.studentProfile?.graduationYear ? ` · Class of ${application.student.studentProfile.graduationYear}` : ''}
                </p>
                <p className="text-[11px] text-ash">Skills: {application.student.studentProfile?.skills ?? '—'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn size="sm" variant="mint" disabled={application.status === 'SHORTLISTED'} onClick={() => void update(application, 'SHORTLISTED')}>Shortlist</Btn>
                <Btn size="sm" variant="ghost" disabled={application.status === 'REJECTED'} onClick={() => void update(application, 'REJECTED')}>Reject</Btn>
              </div>
            </div>
            {application.coverNote && <p className="mt-2 rounded-lg border border-white/10 bg-ink-900/50 px-3 py-2 text-[12px] text-mist">{application.coverNote}</p>}
            <a href={`/portfolio/${application.student.id}`} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">
              View portfolio <ExternalLink className="h-3 w-3" />
            </a>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function TalentDiscovery({ role }: { role: Role }) {
  const [query, setQuery] = useState('')
  const [skill, setSkill] = useState('')
  const params = new URLSearchParams({ pageSize: '24' })
  if (query) params.set('q', query)
  if (skill) params.set('skill', skill)
  const list = useApi<{ data: StudentCandidate[] }>(`/discover/students?${params.toString()}`, [query, skill])

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Student talent"
        hint={
          role === 'COMPANY'
            ? 'Only students who opted in to company discovery appear here. Contact happens through the platform, not by scraping email addresses.'
            : 'Students who chose to publish their portfolio on the platform.'
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
          <input className={`${fieldClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" aria-label="Search students" />
        </div>
        <input className={`${fieldClass} sm:w-56`} value={skill} onChange={(event) => setSkill(event.target.value)} placeholder="Skill or interest" aria-label="Filter by skill" />
      </div>

      {list.loading && <Loading rows={3} />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.data && list.data.data.length === 0 && <EmptyState title="No consented student profiles yet" hint="Students control this visibility from their own dashboard." icon={<Users className="h-5 w-5" />} />}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.data?.data.map((student) => (
          <Card key={student.id} className="p-4">
            <p className="font-display text-sm font-semibold text-cream">{student.name}</p>
            <p className="text-[11.5px] text-mist">{student.headline}</p>
            <p className="mt-1 text-[11px] text-ash">
              {student.department}
              {student.graduationYear ? ` · Class of ${student.graduationYear}` : ''}
            </p>
            <a href={`/portfolio/${student.id}`} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">
              View portfolio <ExternalLink className="h-3 w-3" />
            </a>
          </Card>
        ))}
      </div>
    </div>
  )
}
