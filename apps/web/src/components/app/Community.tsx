import { useEffect, useState } from 'react'
import {
  Bookmark,
  BookOpen,
  CalendarDays,
  CheckCheck,
  ExternalLink,
  MapPin,
  Plus,
  Search,
  Users,
  Video,
} from 'lucide-react'
import {
  apiDelete,
  apiPost,
  apiPut,
  type EventRecord,
  type NotificationRecord,
  type Resource,
  type Role,
} from '../../lib/apiClient'
import {
  currentPushSubscription,
  disablePush,
  enablePush,
  pushSupported,
  subscriptionUsesKey,
  type PushStatus,
} from '../../lib/push'
import { formatDate, formatDateTime, relativeTime } from '../../lib/format'
import { useI18n } from '../../lib/i18n'
import { useAction, useApi } from '../../lib/useApi'
import {
  Badge,
  Btn,
  Card,
  DemoBadge,
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

export function EventsPanel({ role }: { role: Role }) {
  const [past, setPast] = useState(false)
  const events = useApi<{ data: EventRecord[] }>(`/events?pageSize=24&past=${past}`, [past])
  const [creating, setCreating] = useState(false)
  const action = useAction()

  const register = async (event: EventRecord) => {
    const result = await action.run(() => apiPost(`/events/${event.id}/register`), 'Registration confirmed.')
    if (result) events.reload()
  }
  const unregister = async (event: EventRecord) => {
    const result = await action.run(() => apiDelete(`/events/${event.id}/register`), 'Registration cancelled.')
    if (result) events.reload()
  }

  const canCreate = role === 'ALUMNI' || role === 'ADMIN'

  return (
    <div className="space-y-4">
      <SectionHeading
        title={past ? 'Past events' : 'Upcoming events'}
        hint="Registration is stored against your account. Attendance is recorded separately by the host — entering a page or a virtual room does not count as attendance."
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" size="sm" onClick={() => setPast((value) => !value)}>
              {past ? 'Upcoming' : 'Past events'}
            </Btn>
            {canCreate && (
              <Btn size="sm" onClick={() => setCreating(true)}>
                <Plus className="h-3.5 w-3.5" /> New event
              </Btn>
            )}
          </div>
        }
      />

      {action.error && <ErrorNote message={action.error} />}
      {action.success && <SuccessNote message={action.success} />}
      {events.loading && <Loading rows={3} />}
      {events.error && <ErrorNote message={events.error} onRetry={events.reload} />}
      {events.data && events.data.data.length === 0 && <EmptyState title="No events scheduled" hint="Check back soon or ask your alumni network to host one." icon={<CalendarDays className="h-5 w-5" />} />}

      <div className="grid gap-3 md:grid-cols-2">
        {events.data?.data.map((event) => (
          <Card key={event.id} className="flex flex-col">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.09em] text-brand-300">{event.category}</p>
                <h3 className="mt-1 font-display text-base font-semibold text-cream">{event.title}</h3>
                <p className="mt-1 text-[11.5px] text-mist">Hosted by {event.host.name}</p>
              </div>
              <Badge tone={event.mode === 'METAVERSE' ? 'brand' : event.mode === 'CAMPUS' ? 'azure' : 'neutral'}>{event.mode}</Badge>
            </div>
            <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-mist">{event.description}</p>
            <div className="mt-3 space-y-1 text-[11.5px] text-mist">
              <p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {formatDateTime(event.startsAt)}</p>
              <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {event.location ?? 'Online'}</p>
              <p className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {event.registrationCount} registered{event.capacity ? ` of ${event.capacity}` : ''}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {!past && event.myRegistration && <Badge tone="mint">Registered</Badge>}
              {!past && event.myRegistration && (
                <Btn size="sm" variant="ghost" onClick={() => void unregister(event)}>Cancel registration</Btn>
              )}
              {!past && !event.myRegistration && (
                <Btn size="sm" onClick={() => void register(event)} disabled={action.pending}>Register</Btn>
              )}
              {event.mode === 'METAVERSE' && (
                <a href="/metaverse/index.html" className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mist hover:text-cream">
                  <Video className="h-3.5 w-3.5" /> Open campus
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>

      {creating && (
        <EventCreateModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            events.reload()
          }}
        />
      )}
    </div>
  )
}

function EventCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const action = useAction()
  const start = new Date(Date.now() + 7 * 86400000)
  start.setMinutes(0, 0, 0)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Webinar',
    mode: 'ONLINE' as 'ONLINE' | 'CAMPUS' | 'METAVERSE',
    location: '',
    metaverseRoom: 'mentor-room',
    startsAt: start.toISOString().slice(0, 16),
    capacity: '50',
  })

  const submit = async () => {
    const result = await action.run(
      () =>
        apiPost('/events', {
          title: form.title,
          description: form.description,
          category: form.category,
          mode: form.mode,
          location: form.location || undefined,
          metaverseRoom: form.mode === 'METAVERSE' ? form.metaverseRoom : undefined,
          startsAt: new Date(form.startsAt).toISOString(),
          capacity: form.capacity ? Number(form.capacity) : undefined,
        }),
      'Event published.',
    )
    if (result) onCreated()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Create an event"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={action.pending || form.title.length < 4 || form.description.length < 20} onClick={() => void submit()}>
            {action.pending ? 'Publishing…' : 'Publish event'}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {action.error && <ErrorNote message={action.error} />}
        <Field label="Title"><input className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
        <Field label="Description"><textarea className={`${fieldClass} min-h-20`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category"><input className={fieldClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></Field>
          <Field label="Mode">
            <select className={fieldClass} value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value as typeof form.mode })}>
              <option value="ONLINE">Online</option>
              <option value="CAMPUS">Campus</option>
              <option value="METAVERSE">Metaverse</option>
            </select>
          </Field>
        </div>
        {form.mode === 'METAVERSE' ? (
          <Field label="Metaverse room">
            <select className={fieldClass} value={form.metaverseRoom} onChange={(event) => setForm({ ...form, metaverseRoom: event.target.value })}>
              <option value="mentor-room">Mentorship Room</option>
              <option value="career-hall">Career Hall</option>
              <option value="innovation-lab">Innovation Lab</option>
            </select>
          </Field>
        ) : (
          <Field label="Location"><input className={fieldClass} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Room or online link" /></Field>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Starts at"><input type="datetime-local" className={fieldClass} value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></Field>
          <Field label="Capacity"><input type="number" min={1} className={fieldClass} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></Field>
        </div>
      </div>
    </Modal>
  )
}

export function ResourcesPanel({ role }: { role: Role }) {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [category, setCategory] = useState('')
  const [reading, setReading] = useState<Resource | null>(null)
  const [creating, setCreating] = useState(false)

  const params = new URLSearchParams({ pageSize: '24' })
  if (applied) params.set('q', applied)
  if (category) params.set('category', category)
  const list = useApi<{ data: Resource[] }>(`/resources?${params.toString()}`, [applied, category])
  const detail = useApi<{ data: Resource }>(reading ? `/resources/${reading.id}` : null, [reading?.id])
  const action = useAction()

  const toggleBookmark = async (resource: Resource) => {
    const result = await action.run(() => apiPost<{ bookmarked: boolean }>(`/resources/${resource.id}/bookmark`))
    if (result) {
      list.reload()
      if (reading) detail.reload()
    }
  }

  const canPublish = role === 'ALUMNI' || role === 'ADMIN'

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Knowledge Vault"
        hint="Alumni guides, articles and templates. Every resource is attributed to its author."
        action={canPublish ? <Btn size="sm" onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5" /> Publish resource</Btn> : undefined}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
          <input
            className={`${fieldClass} pl-9`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && setApplied(query)}
            placeholder="Search titles, summaries and tags"
            aria-label="Search resources"
          />
        </div>
        <select className={`${fieldClass} sm:w-52`} value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          <option value="Career guidance">Career guidance</option>
          <option value="Industry insights">Industry insights</option>
          <option value="Tutorials">Tutorials</option>
          <option value="Mentorship">Mentorship</option>
        </select>
        <Btn variant="secondary" onClick={() => setApplied(query)}>Search</Btn>
      </div>

      {action.error && <ErrorNote message={action.error} />}
      {list.loading && <Loading rows={3} />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.data && list.data.data.length === 0 && <EmptyState title="No resources found" hint="Try a different search term or category." icon={<BookOpen className="h-5 w-5" />} />}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.data?.data.map((resource) => (
          <Card key={resource.id} className="flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.09em] text-brand-300">{resource.category}</p>
                <h3 className="mt-1 font-display text-sm font-semibold text-cream">{resource.title}</h3>
              </div>
              <button
                onClick={() => void toggleBookmark(resource)}
                className={`rounded-lg p-1.5 ${resource.bookmarked ? 'text-brand-300' : 'text-ash hover:text-cream'}`}
                aria-label={resource.bookmarked ? 'Remove bookmark' : 'Save resource'}
              >
                <Bookmark className="h-4 w-4" fill={resource.bookmarked ? 'currentColor' : 'none'} />
              </button>
            </div>
            <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-mist">{resource.summary}</p>
            <p className="mt-auto pt-3 text-[10.5px] text-ash">{resource.author.name} · {formatDate(resource.createdAt)} · {resource.views} views</p>
            <div className="mt-3 flex gap-2">
              <Btn size="sm" variant="secondary" onClick={() => setReading(resource)}>Read</Btn>
              {resource.url && (
                <a href={resource.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-azure-300 hover:bg-white/5">
                  External <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={Boolean(reading)} onClose={() => setReading(null)} title={detail.data?.data.title ?? 'Resource'}>
        {detail.loading && <Loading rows={3} />}
        {detail.error && <ErrorNote message={detail.error} onRetry={detail.reload} />}
        {detail.data && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{detail.data.data.category}</Badge>
              <Badge tone="neutral">{detail.data.data.type}</Badge>
              <span className="text-[11px] text-ash">{detail.data.data.views} views</span>
            </div>
            <p className="text-[12.5px] font-medium text-cream">{detail.data.data.summary}</p>
            <div className="max-h-[50vh] overflow-y-auto whitespace-pre-line text-[12.5px] leading-relaxed text-mist">{detail.data.data.body}</div>
            <p className="text-[10.5px] text-ash">By {detail.data.data.author.name} · {formatDate(detail.data.data.createdAt)}</p>
          </div>
        )}
      </Modal>

      {creating && <ResourceCreateModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); list.reload() }} />}
    </div>
  )
}

function ResourceCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const action = useAction()
  const [form, setForm] = useState({ title: '', summary: '', body: '', category: 'Career guidance', tags: '', type: 'ARTICLE', url: '' })

  const submit = async () => {
    const result = await action.run(
      () => apiPost('/resources', { ...form, url: form.url || undefined }),
      'Resource published.',
    )
    if (result) onCreated()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Publish a resource"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={action.pending || form.title.length < 5 || form.summary.length < 20 || form.body.length < 50} onClick={() => void submit()}>
            {action.pending ? 'Publishing…' : 'Publish'}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {action.error && <ErrorNote message={action.error} />}
        <Field label="Title"><input className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
        <Field label="Summary"><textarea className={`${fieldClass} min-h-16`} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></Field>
        <Field label="Body" hint="Plain text. At least 50 characters."><textarea className={`${fieldClass} min-h-32`} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category"><input className={fieldClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></Field>
          <Field label="Type">
            <select className={fieldClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              <option value="ARTICLE">Article</option>
              <option value="GUIDE">Guide</option>
              <option value="VIDEO">Video</option>
              <option value="TEMPLATE">Template</option>
            </select>
          </Field>
        </div>
        <Field label="Tags" hint="Comma separated."><input className={fieldClass} value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} /></Field>
        <Field label="External URL" hint="Optional link to a video or template."><input className={fieldClass} value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://" /></Field>
      </div>
    </Modal>
  )
}

type NotificationPrefs = { mentorship: boolean; challenges: boolean; events: boolean; marketing: boolean; support?: boolean }

const prefOptions: Array<{ key: keyof NotificationPrefs; label: string; hint: string }> = [
  { key: 'mentorship', label: 'Mentorship', hint: 'Requests, session changes and reminders.' },
  { key: 'challenges', label: 'Challenges & submissions', hint: 'Announcements, deadlines and evaluation results.' },
  { key: 'events', label: 'Events & announcements', hint: 'Event reminders and institution announcements.' },
  { key: 'marketing', label: 'Opportunities', hint: 'New opportunities shared by alumni and companies.' },
]

export function NotificationSettings() {
  const { t } = useI18n()
  const status = useApi<{ data: PushStatus }>('/notifications/push/status')
  const prefs = useApi<{ data: NotificationPrefs }>('/notifications/preferences')
  const [draft, setDraft] = useState<NotificationPrefs | null>(null)
  const [deviceOn, setDeviceOn] = useState(false)
  const [busy, setBusy] = useState<'push' | 'test' | 'prefs' | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (prefs.data?.data) setDraft({ ...prefs.data.data })
  }, [prefs.data])

  useEffect(() => {
    void currentPushSubscription()
      .then((subscription) => setDeviceOn(Boolean(subscription)))
      .catch(() => setDeviceOn(false))
  }, [])

  const supported = pushSupported()
  const serverEnabled = status.data?.data.enabled ?? false
  const publicKey = status.data?.data.publicKey ?? null

  // Rotated VAPID keys invalidate existing subscriptions. Re-subscribe once the
  // new public key arrives so the device keeps receiving notifications.
  useEffect(() => {
    if (!deviceOn || !publicKey) return
    let cancelled = false
    void currentPushSubscription()
      .then(async (subscription) => {
        if (cancelled || !subscription || subscriptionUsesKey(subscription, publicKey)) return
        const refreshed = await enablePush(publicKey)
        await apiPost('/notifications/push/subscribe', refreshed.toJSON())
        if (!cancelled) setNote(t('Device notifications were refreshed after the server signing key changed.'))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [deviceOn, publicKey])

  const toggleDevice = async () => {
    setBusy('push')
    setError(null)
    setNote(null)
    try {
      if (deviceOn) {
        const endpoint = await disablePush()
        if (endpoint) await apiDelete('/notifications/push/subscribe', { endpoint })
        setDeviceOn(false)
        setNote(t('Device notifications turned off for this browser.'))
      } else {
        if (!publicKey) throw new Error('Device notifications are not configured on this server.')
        const subscription = await enablePush(publicKey)
        await apiPost('/notifications/push/subscribe', subscription.toJSON())
        setDeviceOn(true)
        setNote(t('Device notifications turned on for this browser.'))
      }
      status.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update device notifications.')
    } finally {
      setBusy(null)
    }
  }

  const sendTest = async () => {
    setBusy('test')
    setError(null)
    setNote(null)
    try {
      const result = await apiPost<{ data: { attempted: number; delivered: number }; message: string }>('/notifications/push/test')
      setNote(result.message ?? t('Test notification sent.'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send a test notification.')
    } finally {
      setBusy(null)
    }
  }

  const savePrefs = async () => {
    if (!draft) return
    setBusy('prefs')
    setError(null)
    setNote(null)
    try {
      await apiPut('/notifications/preferences', draft)
      setNote(t('Notification preferences saved.'))
      prefs.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save preferences.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="space-y-4">
      <SectionHeading
        title={t('Notification settings')}
        hint={t('Choose what reaches you in the app, and whether this browser also shows device notifications.')}
      />
      {error && <ErrorNote message={error} />}
      {note && <SuccessNote message={note} />}
      <div className="grid gap-2 sm:grid-cols-2">
        {prefOptions.map((option) => (
          <label key={option.key} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-ink-950/40 px-3 py-2.5">
            <input
              type="checkbox"
              checked={draft?.[option.key] ?? true}
              disabled={!draft || busy === 'prefs'}
              onChange={(event) =>
                setDraft((current) => (current ? { ...current, [option.key]: event.target.checked } : current))
              }
              className="mt-0.5 h-3.5 w-3.5 accent-brand-500"
            />
            <span>
              <span className="block text-[12px] font-semibold text-cream">{t(option.label)}</span>
              <span className="block text-[11px] text-mist">{t(option.hint)}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/40 px-3 py-2.5">
        <div>
          <p className="text-[12px] font-semibold text-cream">{t('Device notifications')}</p>
          <p className="text-[11px] text-mist">
            {!supported
              ? t('This browser does not support push notifications.')
              : !serverEnabled && !deviceOn
                ? t('Push keys are not configured on this server.')
                : deviceOn
                  ? t('On for this browser. In-app notifications are always kept.')
                  : t('Off. Enable to get alerts outside the app on this device.')}
          </p>
        </div>
        <Btn
          size="sm"
          variant={deviceOn ? 'secondary' : 'primary'}
          disabled={busy === 'push' || !supported || (!serverEnabled && !deviceOn)}
          onClick={() => void toggleDevice()}
        >
          {busy === 'push' ? t('Updating…') : deviceOn ? t('Turn off on this device') : t('Enable on this device')}
        </Btn>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Btn size="sm" variant="ghost" disabled={!deviceOn || busy !== null} onClick={() => void sendTest()}>
          {busy === 'test' ? t('Sending…') : t('Send test notification')}
        </Btn>
        <Btn size="sm" disabled={!draft || busy === 'prefs'} onClick={() => void savePrefs()}>
          {busy === 'prefs' ? t('Saving…') : t('Save preferences')}
        </Btn>
      </div>
    </Card>
  )
}

export function NotificationHistory() {
  const { t } = useI18n()
  const list = useApi<{ data: NotificationRecord[]; meta: { unread: number } }>('/notifications?pageSize=50')
  const action = useAction()

  return (
    <div className="space-y-4">
      <NotificationSettings />
      <SectionHeading
        title={t('Notification history')}
        hint={t('In-app notifications are always kept. Device notifications are optional and only appear on browsers you enable.')}
        action={<Btn size="sm" variant="secondary" onClick={() => void action.run(() => apiPost('/notifications/read-all'), t('All notifications marked read.')).then(() => list.reload())}><CheckCheck className="h-3.5 w-3.5" /> {t('Mark all read')}</Btn>}
      />
      {action.error && <ErrorNote message={action.error} />}
      {list.loading && <Loading rows={4} />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.data && list.data.data.length === 0 && <EmptyState title="Nothing here yet" hint="Requests, evaluations and event reminders will appear here." icon={<CalendarDays className="h-5 w-5" />} />}
      <div className="space-y-2">
        {list.data?.data.map((notification) => (
          <Card key={notification.id} className={notification.readAt ? 'p-4 opacity-70' : 'p-4'}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p dir="auto" className="font-display text-sm font-semibold text-cream">{notification.title}</p>
                <p dir="auto" className="mt-1 text-[12px] text-mist">{notification.body}</p>
                <p className="mt-1 text-[10.5px] text-ash">{relativeTime(notification.createdAt)} · {notification.type.replace(/_/g, ' ')}</p>
              </div>
              {!notification.readAt && <Badge tone="brand">{t('Unread')}</Badge>}
            </div>
            <div className="mt-2 flex gap-2">
              {!notification.readAt && (
                <Btn size="sm" variant="ghost" onClick={() => void apiPost(`/notifications/${notification.id}/read`).then(() => list.reload())}>
                  {t('Mark read')}
                </Btn>
              )}
              {notification.link && (
                <a href={notification.link} className="rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:bg-white/5">
                  Open
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function DemoDataNote() {
  return (
    <p className="flex flex-wrap items-center gap-2 text-[11px] text-ash">
      <DemoBadge /> Records marked as sample are seeded for local demonstration. Live actions you take are stored in the database.
      <StatusBadge status="LIVE" />
    </p>
  )
}
