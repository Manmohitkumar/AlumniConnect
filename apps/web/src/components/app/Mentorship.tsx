import { useState } from 'react'
import { CalendarPlus, Check, Clock, GraduationCap, MessageSquare, Star, Video, X } from 'lucide-react'
import {
  apiPatch,
  apiPost,
  type MentorshipRequest,
  type Mentor,
  type Role,
} from '../../lib/apiClient'
import { formatDateTime } from '../../lib/format'
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
  Stat,
  StatusBadge,
  SuccessNote,
  fieldClass,
} from './ui'

type Analytics = {
  data: {
    requestsReceived?: number
    requestsSent?: number
    pending: number
    accepted: number
    completedRequests: number
    sessionsCompleted: number
    sessionsUpcoming: number
    averageRating: number | null
    ratingCount: number
  }
}

export function MentorshipPanel({ role }: { role: Role }) {
  const isStudent = role === 'STUDENT'
  const [query, setQuery] = useState('')
  const [openOnly, setOpenOnly] = useState(true)
  const mentors = useApi<{ data: Mentor[] }>(
    isStudent ? `/mentors?pageSize=12&q=${encodeURIComponent(query)}&mentorshipOpen=${openOnly}` : null,
    [isStudent, query, openOnly],
  )
  const requests = useApi<{ data: MentorshipRequest[] }>('/mentorship/requests')
  const analytics = useApi<Analytics>('/mentorship/analytics')

  const [requestFor, setRequestFor] = useState<Mentor | null>(null)
  const [scheduling, setScheduling] = useState<MentorshipRequest | null>(null)
  const [completing, setCompleting] = useState<{ request: MentorshipRequest; sessionId: string } | null>(null)
  const action = useAction()

  const respond = async (request: MentorshipRequest, decision: 'ACCEPT' | 'DECLINE' | 'CANCEL') => {
    const result = await action.run(
      () => apiPatch(`/mentorship/requests/${request.id}`, { action: decision }),
      decision === 'ACCEPT' ? 'Request accepted. You can schedule a session now.' : decision === 'DECLINE' ? 'Request declined.' : 'Request cancelled.',
    )
    if (result) {
      requests.reload()
      analytics.reload()
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title={isStudent ? 'Mentorship' : 'Mentorship requests'}
        hint={
          isStudent
            ? 'Find an alumni mentor, send a request and schedule a session. Ratings are visible only in aggregate.'
            : 'Respond to student requests and schedule sessions. Keep topics within your stated expertise.'
        }
      />

      {analytics.data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={isStudent ? 'Requests sent' : 'Requests received'} value={isStudent ? analytics.data.data.requestsSent ?? 0 : analytics.data.data.requestsReceived ?? 0} icon={<MessageSquare className="h-4 w-4" />} />
          <Stat label="Pending" value={analytics.data.data.pending} tone="azure" icon={<Clock className="h-4 w-4" />} />
          <Stat label="Sessions completed" value={analytics.data.data.sessionsCompleted} tone="mint" icon={<Check className="h-4 w-4" />} />
          <Stat
            label="Average rating"
            value={analytics.data.data.averageRating ?? '—'}
            hint={`${analytics.data.data.ratingCount} ratings`}
            tone="mint"
            icon={<Star className="h-4 w-4" />}
          />
        </div>
      )}

      {action.error && <ErrorNote message={action.error} />}
      {action.success && <SuccessNote message={action.success} />}

      {isStudent && (
        <Card>
          <SectionHeading title="Find a mentor" hint="Only alumni who opted into mentorship appear here." />
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or headline"
              className={fieldClass}
              aria-label="Search mentors"
            />
            <label className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11.5px] text-mist">
              <input type="checkbox" checked={openOnly} onChange={(event) => setOpenOnly(event.target.checked)} className="h-4 w-4" />
              Open only
            </label>
          </div>

          {mentors.loading && <Loading rows={2} />}
          {mentors.error && <ErrorNote message={mentors.error} onRetry={mentors.reload} />}
          {mentors.data && mentors.data.data.length === 0 && <EmptyState title="No mentors match" hint="Try a broader search or include mentors who are not currently open." icon={<GraduationCap className="h-5 w-5" />} />}

          <div className="grid gap-3 md:grid-cols-2">
            {mentors.data?.data.map((mentor) => (
              <div key={mentor.id} className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-cream">{mentor.name}</p>
                    <p className="text-[11.5px] text-mist">{mentor.headline}</p>
                    <p className="mt-1 text-[11px] text-ash">
                      {mentor.alumniProfile?.designation}
                      {mentor.alumniProfile?.company ? ` · ${mentor.alumniProfile.company}` : ''}
                    </p>
                  </div>
                  {mentor.alumniProfile?.mentorshipOpen ? <Badge tone="mint">Open</Badge> : <Badge tone="neutral">Closed</Badge>}
                </div>
                {mentor.alumniProfile?.mentorshipTopics && (
                  <p className="mt-2 text-[11.5px] text-mist"><span className="text-ash">Topics:</span> {mentor.alumniProfile.mentorshipTopics}</p>
                )}
                {mentor.alumniProfile?.availability && (
                  <p className="mt-1 text-[11px] text-ash">{mentor.alumniProfile.availability} · {mentor.alumniProfile.timezone}</p>
                )}
                <div className="mt-3">
                  <Btn size="sm" disabled={!mentor.alumniProfile?.mentorshipOpen} onClick={() => setRequestFor(mentor)}>
                    Request mentorship
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionHeading title={isStudent ? 'My requests' : 'Incoming requests'} hint="Every request stores its full history, including scheduled and completed sessions." />
        {requests.loading && <Loading rows={2} />}
        {requests.error && <ErrorNote message={requests.error} onRetry={requests.reload} />}
        {requests.data && requests.data.data.length === 0 && (
          <EmptyState title="No mentorship requests yet" hint={isStudent ? 'Send your first request above.' : 'Students will appear here when they request your time.'} icon={<GraduationCap className="h-5 w-5" />} />
        )}

        <div className="space-y-3">
          {requests.data?.data.map((request) => {
            const counterpart = isStudent ? request.mentor : request.student
            const canAccept = !isStudent && request.status === 'PENDING'
            const canSchedule = request.status === 'ACCEPTED'
            const canCancel = isStudent && ['PENDING', 'ACCEPTED'].includes(request.status)
            return (
              <div key={request.id} className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-cream">{request.topic}</p>
                    <p className="text-[11.5px] text-mist">with {counterpart.name}</p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-mist">{request.message}</p>

                {request.sessions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {request.sessions.map((session) => (
                      <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-ink-950/40 px-3 py-2">
                        <div>
                          <p className="text-[12px] text-cream">{formatDateTime(session.scheduledAt)} · {session.durationMins} min</p>
                          <p className="text-[10.5px] text-ash">
                            {session.roomKey ? `Metaverse room: ${session.roomKey}` : 'Online'}
                            {session.rating ? ` · rated ${session.rating}/5` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={session.status} />
                          {session.status === 'SCHEDULED' && new Date(session.scheduledAt).getTime() < Date.now() && (
                            <Btn size="sm" variant="secondary" onClick={() => setCompleting({ request, sessionId: session.id })}>
                              {isStudent ? 'Complete & rate' : 'Mark completed'}
                            </Btn>
                          )}
                          {session.status === 'SCHEDULED' && (
                            <Btn size="sm" variant="ghost" onClick={() => void action.run(() => apiPatch(`/mentorship/sessions/${session.id}`, { action: 'CANCEL' }), 'Session cancelled.').then(() => requests.reload())}>
                              Cancel
                            </Btn>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {canAccept && (
                    <>
                      <Btn size="sm" variant="mint" onClick={() => void respond(request, 'ACCEPT')}><Check className="h-3.5 w-3.5" /> Accept</Btn>
                      <Btn size="sm" variant="secondary" onClick={() => void respond(request, 'DECLINE')}><X className="h-3.5 w-3.5" /> Decline</Btn>
                    </>
                  )}
                  {canSchedule && (
                    <>
                      <Btn size="sm" onClick={() => setScheduling(request)}><CalendarPlus className="h-3.5 w-3.5" /> Schedule session</Btn>
                      <a href="/metaverse/index.html" className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mist hover:text-cream">
                        <Video className="h-3.5 w-3.5" /> Mentorship room
                      </a>
                    </>
                  )}
                  {canCancel && (
                    <Btn size="sm" variant="ghost" onClick={() => void respond(request, 'CANCEL')}>Cancel request</Btn>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {requestFor && (
        <RequestModal
          mentor={requestFor}
          pending={action.pending}
          error={action.error}
          onClose={() => setRequestFor(null)}
          onSubmit={async (topic, message) => {
            const result = await action.run(() => apiPost('/mentorship/requests', { mentorId: requestFor.id, topic, message }), 'Request sent. You will be notified when the mentor responds.')
            if (result) {
              setRequestFor(null)
              requests.reload()
              analytics.reload()
            }
          }}
        />
      )}

      {scheduling && (
        <ScheduleModal
          request={scheduling}
          pending={action.pending}
          error={action.error}
          onClose={() => setScheduling(null)}
          onSubmit={async (scheduledAt, durationMins, notes) => {
            const result = await action.run(
              () => apiPost(`/mentorship/requests/${scheduling.id}/sessions`, { scheduledAt, durationMins, notes }),
              'Session scheduled. Both participants have been notified.',
            )
            if (result) {
              setScheduling(null)
              requests.reload()
              analytics.reload()
            }
          }}
        />
      )}

      {completing && (
        <CompleteModal
          allowRating={isStudent}
          pending={action.pending}
          error={action.error}
          onClose={() => setCompleting(null)}
          onSubmit={async (rating, feedback) => {
            const result = await action.run(
              () => apiPatch(`/mentorship/sessions/${completing.sessionId}`, { action: 'COMPLETE', rating, feedback }),
              'Session marked completed.',
            )
            if (result) {
              setCompleting(null)
              requests.reload()
              analytics.reload()
            }
          }}
        />
      )}
    </div>
  )
}

function RequestModal({
  mentor,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  mentor: Mentor
  onClose: () => void
  onSubmit: (topic: string, message: string) => Promise<void>
  pending: boolean
  error: string | null
}) {
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')

  return (
    <Modal
      open
      onClose={onClose}
      title={`Request mentorship from ${mentor.name}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={pending || topic.trim().length < 3 || message.trim().length < 20} onClick={() => void onSubmit(topic, message)}>
            {pending ? 'Sending…' : 'Send request'}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {error && <ErrorNote message={error} />}
        <Field label="Topic">
          <input className={fieldClass} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Portfolio review for internships" />
        </Field>
        <Field label="Message" hint="At least 20 characters. Be specific about what you need.">
          <textarea className={`${fieldClass} min-h-28`} value={message} onChange={(event) => setMessage(event.target.value)} />
        </Field>
        <p className="text-[11px] leading-relaxed text-ash">
          Your name and message are shared with this mentor only. Mentors can decline, and you can cancel before a session is completed.
        </p>
      </div>
    </Modal>
  )
}

function ScheduleModal({
  request,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  request: MentorshipRequest
  onClose: () => void
  onSubmit: (scheduledAt: string, durationMins: number, notes: string) => Promise<void>
  pending: boolean
  error: string | null
}) {
  const defaultDate = new Date(Date.now() + 2 * 86400000)
  defaultDate.setMinutes(0, 0, 0)
  const [when, setWhen] = useState(defaultDate.toISOString().slice(0, 16))
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState('')

  return (
    <Modal
      open
      onClose={onClose}
      title={`Schedule — ${request.topic}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={pending} onClick={() => void onSubmit(new Date(when).toISOString(), duration, notes)}>
            {pending ? 'Scheduling…' : 'Schedule session'}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {error && <ErrorNote message={error} />}
        <Field label="Date and time" hint="Times use your device time zone. Overlapping sessions for either participant are rejected.">
          <input type="datetime-local" className={fieldClass} value={when} onChange={(event) => setWhen(event.target.value)} />
        </Field>
        <Field label="Duration">
          <select className={fieldClass} value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </Field>
        <Field label="Agenda notes" hint="Optional. Visible to both participants.">
          <textarea className={`${fieldClass} min-h-20`} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

function CompleteModal({
  allowRating,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  allowRating: boolean
  onClose: () => void
  onSubmit: (rating?: number, feedback?: string) => Promise<void>
  pending: boolean
  error: string | null
}) {
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState('')

  return (
    <Modal
      open
      onClose={onClose}
      title="Complete session"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={pending || (allowRating && rating < 4 && feedback.trim().length < 5)} onClick={() => void onSubmit(allowRating ? rating : undefined, feedback || undefined)}>
            {pending ? 'Saving…' : 'Mark completed'}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {error && <ErrorNote message={error} />}
        <p className="text-[12px] leading-relaxed text-mist">
          Only mark the session completed if it actually took place. Completion is stored in both participants' mentorship history.
        </p>
        {allowRating && (
          <>
            <Field label="Rating">
              <select className={fieldClass} value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>{value} / 5</option>
                ))}
              </select>
            </Field>
            <Field label="Feedback" hint={rating < 4 ? 'Required for ratings below 4.' : 'Optional note for your mentor.'}>
              <textarea className={`${fieldClass} min-h-20`} value={feedback} onChange={(event) => setFeedback(event.target.value)} />
            </Field>
          </>
        )}
      </div>
    </Modal>
  )
}
