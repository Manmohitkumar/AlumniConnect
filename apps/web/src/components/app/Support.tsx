import { useState, type FormEvent } from 'react'
import { LifeBuoy, Send } from 'lucide-react'
import { apiPost, type FeedbackRecord } from '../../lib/apiClient'
import { relativeTime } from '../../lib/format'
import { useAction, useApi } from '../../lib/useApi'
import { Badge, Btn, Card, EmptyState, ErrorNote, Field, Loading, SectionHeading, SuccessNote, fieldClass, type BadgeTone } from './ui'

const CATEGORIES = [
  { value: 'BUG', label: 'Something is broken' },
  { value: 'ACCOUNT', label: 'Account or sign-in' },
  { value: 'VERIFICATION', label: 'Institution verification' },
  { value: 'MENTORSHIP', label: 'Mentorship' },
  { value: 'CHALLENGE', label: 'Challenge or submission' },
  { value: 'PRIVACY', label: 'Privacy or visibility' },
  { value: 'ACCESSIBILITY', label: 'Accessibility' },
  { value: 'OTHER', label: 'Something else' },
]

const STATUS_TONE: Record<string, BadgeTone> = {
  OPEN: 'warning',
  IN_REVIEW: 'azure',
  RESOLVED: 'mint',
  CLOSED: 'neutral',
}

export function SupportPanel() {
  const list = useApi<{ data: FeedbackRecord[] }>('/feedback')
  const action = useAction()
  const [category, setCategory] = useState('BUG')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const result = await action.run(
      () =>
        apiPost<{ data: FeedbackRecord }>('/feedback', {
          category,
          subject,
          message,
          pagePath: window.location.pathname + window.location.search,
        }),
      'Report submitted. You can follow its status below.',
    )
    if (result) {
      setSubject('')
      setMessage('')
      list.reload()
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <SectionHeading
          title="Report a problem or send feedback"
          hint="The platform team reviews every report. Include the page you were on and what you expected to happen."
        />
        <form className="space-y-4" onSubmit={submit}>
          <Field label="What is this about">
            <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject">
            <input
              className={fieldClass}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              minLength={4}
              maxLength={120}
              required
              placeholder="Short summary, e.g. Certificate download fails"
            />
          </Field>
          <Field label="Details">
            <textarea
              className={`${fieldClass} min-h-32`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              minLength={10}
              maxLength={4000}
              required
              placeholder="What happened, what you expected, and any steps to reproduce it."
            />
          </Field>
          {action.error && <ErrorNote message={action.error} />}
          {action.success && <SuccessNote message={action.success} />}
          <Btn type="submit" disabled={action.pending}>
            <Send className="h-4 w-4" /> {action.pending ? 'Sending…' : 'Submit report'}
          </Btn>
        </form>
        <p className="mt-4 text-[11px] leading-relaxed text-ash">
          During the pilot there is no guaranteed response time. Security and privacy reports are reviewed first.
          Never include passwords or one-time codes in a report.
        </p>
      </Card>

      <Card>
        <SectionHeading title="Your reports" hint="Status updates from the platform team appear here and in notifications." />
        {list.loading && <Loading rows={3} label="Loading your reports" />}
        {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
        {list.data && list.data.data.length === 0 && (
          <EmptyState icon={<LifeBuoy className="h-5 w-5" />} title="No reports yet" hint="Anything you submit will be listed here with its current status." />
        )}
        {list.data && list.data.data.length > 0 && (
          <ul className="space-y-3">
            {list.data.data.map((item) => (
              <li key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={STATUS_TONE[item.status] ?? 'neutral'}>{item.status.replace('_', ' ')}</Badge>
                  <span className="text-[10.5px] text-ash">
                    {item.category.replace('_', ' ')} · {relativeTime(item.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-medium text-cream">{item.subject}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-mist">{item.message}</p>
                {item.adminNote && (
                  <p className="mt-2 rounded-lg border border-brand-400/20 bg-brand-500/[0.06] px-2.5 py-2 text-[11.5px] text-brand-200">
                    Team note: {item.adminNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
