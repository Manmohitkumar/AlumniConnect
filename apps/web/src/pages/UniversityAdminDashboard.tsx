import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Award,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LifeBuoy,
  Megaphone,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { AppShell, navByRole, useTab } from '../components/app/AppShell'
import { EventsPanel, NotificationHistory } from '../components/app/Community'
import { ProfilePanel } from '../components/app/PortfolioCertificates'
import { AdminAiPanel } from '../components/app/AiOps'
import { GovernancePanel, ReliabilityPanel } from '../components/app/PlatformOps'
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Loading,
  SectionHeading,
  Stat,
  StatusBadge,
  SuccessNote,
  fieldClass,
} from '../components/app/ui'
import { useAuth } from '../context/AuthContext'
import {
  apiDelete,
  apiPatch,
  apiPost,
  type AdminAnalytics,
  type AdoptionAnalytics,
  type Challenge,
  type FeedbackRecord,
  type Resource,
} from '../lib/apiClient'
import { formatDateTime, relativeTime, titleCase } from '../lib/format'
import { useAction, useApi } from '../lib/useApi'

const TABS = navByRole.ADMIN.map((item) => item.id)

export function UniversityAdminDashboard() {
  const [tab, setTab] = useTab('overview', TABS)
  const { user } = useAuth()

  return (
    <AppShell
      title="University admin"
      subtitle={user ? `${user.name} · Platform operations` : ''}
      nav={navByRole.ADMIN}
      active={tab}
      onNavigate={setTab}
    >
      {tab === 'overview' && <AnalyticsPanel />}
      {tab === 'ai' && <AdminAiPanel />}
      {tab === 'reliability' && <ReliabilityPanel />}
      {tab === 'governance' && <GovernancePanel />}
      {tab === 'adoption' && <AdoptionPanel />}
      {tab === 'users' && <UsersPanel />}
      {tab === 'universities' && <UniversitiesPanel />}
      {tab === 'provision' && <ProvisionPanel />}
      {tab === 'content' && <ContentPanel />}
      {tab === 'events' && <EventsPanel role="ADMIN" />}
      {tab === 'audit' && <AuditPanel />}
      {tab === 'announce' && <AnnouncementPanel />}
      {tab === 'support' && <AdminSupportPanel />}
      {tab === 'notifications' && <NotificationHistory />}
      {tab === 'profile' && <ProfilePanel role="ADMIN" />}
    </AppShell>
  )
}

function AnalyticsPanel() {
  const [days, setDays] = useState(30)
  const state = useApi<{ data: AdminAnalytics }>(`/admin/analytics?days=${days}`, [days])

  if (state.loading) return <Loading rows={4} label="Loading analytics" />
  if (state.error) return <ErrorNote message={state.error} onRetry={state.reload} />
  if (!state.data) return null
  const data = state.data.data

  const series = [
    { label: 'Submissions', tone: 'bg-brand-500', points: data.series.submissions },
    { label: 'Mentorship requests', tone: 'bg-azure-500', points: data.series.mentorshipRequests },
    { label: 'Metaverse visits', tone: 'bg-mint-500', points: data.series.roomVisits },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.1em] text-ash">Platform analytics</p>
          <h1 className="mt-1 font-display text-xl font-semibold text-cream">Activity over the last {data.rangeDays} days</h1>
          <p className="mt-1 text-[12.5px] text-mist">
            Counts come from this database. The seed dataset is sample content, so early numbers describe the demo cohort, not a
            market claim.
          </p>
        </div>
        <select className={`${fieldClass} sm:w-44`} value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Analytics range">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 180 days</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Accounts" value={data.users.total} hint={`${data.users.byRole.students} students · ${data.users.byRole.alumni} alumni`} icon={<Users className="h-4 w-4" />} />
        <Stat label="Active students" value={data.users.activeStudents} hint="Submitted in this window" tone="mint" icon={<GraduationCap className="h-4 w-4" />} />
        <Stat label="Evaluated submissions" value={data.submissions.evaluated} hint={`${data.submissions.total} submitted in range`} tone="azure" icon={<ClipboardCheck className="h-4 w-4" />} />
        <Stat label="Certificates issued" value={data.recognition.certificates} hint="Platform recognition records" tone="mint" icon={<Award className="h-4 w-4" />} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Open challenges" value={data.challenges.open} hint={`${data.challenges.participations} joins in range`} icon={<Sparkles className="h-4 w-4" />} />
        <Stat label="Mentorship sessions" value={data.mentorship.sessionsCompleted} hint={`${data.mentorship.requests} requests in range`} tone="mint" icon={<GraduationCap className="h-4 w-4" />} />
        <Stat label="Event registrations" value={data.events.registrations} hint={`${data.events.attended} attended`} tone="azure" icon={<CalendarDays className="h-4 w-4" />} />
        <Stat label="Metaverse visits" value={data.metaverse.visits} hint={`${data.metaverse.byRoom.length} rooms used`} icon={<BookOpen className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {series.map((item) => {
          const max = Math.max(...item.points.map((point) => point.count), 1)
          return (
            <Card key={item.label}>
              <SectionHeading title={item.label} hint={`${item.points.reduce((sum, point) => sum + point.count, 0)} in range`} />
              <div className="flex h-28 items-end gap-[2px]" role="img" aria-label={`${item.label} trend`}>
                {item.points.map((point) => (
                  <div
                    key={point.date}
                    title={`${point.date}: ${point.count}`}
                    className={`${item.tone} min-h-[2px] flex-1 rounded-t-sm opacity-80`}
                    style={{ height: `${Math.max((point.count / max) * 100, 2)}%` }}
                  />
                ))}
              </div>
              <p className="mt-2 text-[10px] text-ash">{item.points[0]?.date} → {item.points[item.points.length - 1]?.date}</p>
            </Card>
          )
        })}
      </div>

      <Card>
        <SectionHeading title="System notes" />
        <ul className="space-y-2 text-[11.5px] text-mist">
          <li>• Source: SQLite database via Prisma. No external analytics service is connected.</li>
          <li>• Email delivery, payments and file storage are not enabled in this environment.</li>
          <li>• Rate limiting is in-memory; a multi-instance deployment needs a shared store such as Redis.</li>
        </ul>
      </Card>
    </div>
  )
}

const STAGE_LABELS: Record<string, string> = {
  registered: 'Registered',
  email_verified: 'Email verified',
  profile_complete: 'Profile complete',
  first_action: 'First meaningful action',
  active_last_7d: 'Active in last 7 days',
}

function AdoptionPanel() {
  const state = useApi<{ data: AdoptionAnalytics }>('/admin/adoption')

  if (state.loading) return <Loading rows={4} label="Loading adoption metrics" />
  if (state.error) return <ErrorNote message={state.error} onRetry={state.reload} />
  if (!state.data) return null
  const data = state.data.data
  const activity = data.engagement.activitiesLast30d

  const funnelCard = (title: string, stages: AdoptionAnalytics['funnel']['students']) => {
    const base = Math.max(stages[0]?.count ?? 0, 1)
    return (
      <Card>
        <SectionHeading title={title} hint="Registration → first action → retention" />
        <ol className="mt-3 space-y-3">
          {stages.map((stage) => (
            <li key={stage.stage}>
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="text-mist">{STAGE_LABELS[stage.stage] ?? stage.stage}</span>
                <span className="font-mono text-cream">
                  {stage.count}
                  {stage.conversionFromPrevious !== null && (
                    <span className="ml-2 text-[10.5px] text-ash">{stage.conversionFromPrevious}% of previous</span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5" role="img" aria-label={`${title} ${stage.stage}`}>
                <div className="h-full rounded-full bg-brand-500/80" style={{ width: `${Math.round((stage.count / base) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.1em] text-ash">Adoption analytics</p>
        <h1 className="mt-1 font-display text-xl font-semibold text-cream">Measured activity, not registration counts</h1>
        <p className="mt-1 max-w-3xl text-[12.5px] text-mist">
          Every number is computed from platform records at request time. Seed accounts on{' '}
          {data.exclusions.demoDomains.map((domain) => `@${domain}`).join(', ')} are excluded ({data.exclusions.excludedUsers}{' '}
          accounts), so these figures describe real signed-up users only.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Real accounts"
          value={data.registrations.total}
          hint={`${data.registrations.byRole.students} students · ${data.registrations.byRole.alumni} alumni · ${data.registrations.newLast7d} new in 7d`}
          icon={<Users className="h-4 w-4" />}
        />
        <Stat
          label="Active last 7 days"
          value={data.engagement.activeLast7d}
          hint={`${data.engagement.activeLast30d} in 30d · WAU/MAU ${data.engagement.wauMauRatio ?? '—'}`}
          tone="mint"
          icon={<Activity className="h-4 w-4" />}
        />
        <Stat
          label="Activated students"
          value={data.activation.students.activated}
          hint={data.activation.students.rate !== null ? `${data.activation.students.rate}% of students` : 'No students yet'}
          tone="azure"
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <Stat
          label="Verified members"
          value={data.verification.totalVerified}
          hint={`${data.verification.totalPending} awaiting institution review`}
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {funnelCard('Student funnel', data.funnel.students)}
        {funnelCard('Alumni funnel', data.funnel.alumni)}
      </div>

      <Card>
        <SectionHeading title="Engagement in the last 30 days" hint="Each count uses non-demo accounts only" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            { label: 'Challenge joins', value: activity.challengeJoins },
            { label: 'Submissions', value: activity.submissions },
            { label: 'Mentorship requests', value: activity.mentorshipRequests },
            { label: 'Sessions completed', value: activity.sessionsCompleted },
            { label: 'Event registrations', value: activity.eventRegistrations },
            { label: 'Certificates issued', value: activity.certificatesIssued },
            { label: 'Resources published', value: activity.resourcesPublished },
            { label: 'Applications', value: activity.applications },
            { label: 'Metaverse visits', value: activity.metaverseVisits },
            { label: 'Returning users (7d)', value: data.engagement.returningLast7d },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-ash">{item.label}</p>
              <p className="mt-1 font-mono text-lg text-cream">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeading title="Institutions" hint="Tenant onboarding state" />
          <dl className="mt-3 grid grid-cols-2 gap-3 text-[12.5px]">
            <div>
              <dt className="text-ash">Institutions</dt>
              <dd className="text-cream">{data.institutions.total} ({data.institutions.verified} verified)</dd>
            </div>
            <div>
              <dt className="text-ash">Representatives</dt>
              <dd className="text-cream">{data.institutions.representatives} active · {data.institutions.representativesActive30d} in 30d</dd>
            </div>
            <div>
              <dt className="text-ash">Student verification</dt>
              <dd className="text-cream">{data.verification.students.verified} verified · {data.verification.students.pending} pending</dd>
            </div>
            <div>
              <dt className="text-ash">Alumni verification</dt>
              <dd className="text-cream">{data.verification.alumni.verified} verified · {data.verification.alumni.pending} pending</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <SectionHeading title="How these metrics are defined" hint="No external analytics service" />
          <details className="mt-3 text-[11.5px] text-mist">
            <summary className="cursor-pointer text-cream">Show metric definitions</summary>
            <ul className="mt-2 space-y-1.5">
              {Object.entries(data.definitions).map(([key, value]) => (
                <li key={key}>
                  <span className="text-cream">{titleCase(key)}:</span> {value}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10.5px] text-ash">
              Generated {formatDateTime(data.generatedAt)}. Presence is stamped at most once per five minutes per user.
            </p>
          </details>
        </Card>
      </div>
    </div>
  )
}

type AdminUser = {
  id: string
  name: string
  email: string
  role: 'STUDENT' | 'ALUMNI' | 'UNIVERSITY' | 'COMPANY' | 'ADMIN'
  status: string
  emailVerified: boolean
  createdAt: string
  lastActiveAt: string | null
  _count: { submissions: number; certificates: number }
}

function UsersPanel() {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [applied, setApplied] = useState({ query: '', role: '', status: '' })

  const params = new URLSearchParams({ pageSize: '50' })
  if (applied.query) params.set('q', applied.query)
  if (applied.role) params.set('role', applied.role)
  if (applied.status) params.set('status', applied.status)

  const list = useApi<{ data: AdminUser[] }>(`/admin/users?${params.toString()}`, [applied])
  const action = useAction()
  const [notice, setNotice] = useState<string | null>(null)

  const update = async (user: AdminUser, body: Record<string, unknown>, message: string) => {
    const result = await action.run(() => apiPatch(`/admin/users/${user.id}`, body), message)
    if (result) {
      setNotice(message)
      list.reload()
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Accounts"
        hint="Role changes take effect on the user's next request. Suspension blocks sign-in and API access immediately."
      />

      {notice && <SuccessNote message={notice} />}
      {action.error && <ErrorNote message={action.error} />}

      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
          <input className={`${fieldClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && setApplied({ query, role, status })} placeholder="Search name or email" aria-label="Search accounts" />
        </div>
        <select className={`${fieldClass} lg:w-40`} value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filter role">
          <option value="">All roles</option>
          <option value="STUDENT">Student</option>
          <option value="ALUMNI">Alumni</option>
          <option value="COMPANY">Company</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select className={`${fieldClass} lg:w-40`} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter status">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <Btn variant="secondary" onClick={() => setApplied({ query, role, status })}>Apply</Btn>
      </div>

      {list.loading && <Loading rows={4} />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.data && list.data.data.length === 0 && <EmptyState title="No accounts match" hint="Adjust the filters." icon={<Users className="h-5 w-5" />} />}

      <div className="space-y-2">
        {list.data?.data.map((user) => (
          <Card key={user.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-sm font-semibold text-cream">{user.name}</p>
                  <StatusBadge status={user.status} />
                  <Badge tone={user.emailVerified ? 'mint' : 'warning'}>{user.emailVerified ? 'Email verified' : 'Unverified'}</Badge>
                </div>
                <p className="text-[11.5px] text-mist">{user.email}</p>
                <p className="text-[10.5px] text-ash">
                  Joined {formatDateTime(user.createdAt)} · {user._count.submissions} submissions · {user._count.certificates} certificates
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={`${fieldClass} w-36 py-1.5 text-[11.5px]`}
                  value={user.role}
                  onChange={(event) => void update(user, { role: event.target.value }, `${user.name} is now ${titleCase(event.target.value)}.`)}
                  aria-label={`Role for ${user.name}`}
                >
                  <option value="STUDENT">Student</option>
                  <option value="ALUMNI">Alumni</option>
                  <option value="UNIVERSITY">University</option>
                  <option value="COMPANY">Company</option>
                  <option value="ADMIN">Admin</option>
                </select>
                {user.status === 'ACTIVE' ? (
                  <Btn size="sm" variant="danger" onClick={() => void update(user, { status: 'SUSPENDED' }, `${user.name} suspended.`)}>Suspend</Btn>
                ) : (
                  <Btn size="sm" variant="mint" onClick={() => void update(user, { status: 'ACTIVE' }, `${user.name} reactivated.`)}>Reactivate</Btn>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ContentPanel() {
  const challenges = useApi<{ data: Challenge[] }>('/challenges?status=ALL&pageSize=50')
  const resources = useApi<{ data: Resource[] }>('/resources?pageSize=50')
  const action = useAction()
  const [notice, setNotice] = useState<string | null>(null)

  const archive = async (challenge: Challenge) => {
    const result = await action.run(() => apiPatch(`/challenges/${challenge.id}`, { status: 'ARCHIVED' }), 'Challenge archived.')
    if (result) {
      setNotice('Challenge archived. It remains visible to its author and administrators.')
      challenges.reload()
    }
  }

  const remove = async (resource: Resource) => {
    if (!window.confirm(`Remove "${resource.title}" from the Knowledge Vault?`)) return
    const result = await action.run(() => apiDelete(`/resources/${resource.id}`), 'Resource removed.')
    if (result !== null) {
      setNotice('Resource removed from public listings.')
      resources.reload()
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeading title="Content moderation" hint="Archive challenges or remove published resources. Every action is written to the audit log." />
      {notice && <SuccessNote message={notice} />}
      {action.error && <ErrorNote message={action.error} />}

      <Card>
        <SectionHeading title="Challenges" hint={`${challenges.data?.data.length ?? 0} total`} />
        {challenges.loading && <Loading rows={3} />}
        {challenges.error && <ErrorNote message={challenges.error} onRetry={challenges.reload} />}
        <div className="space-y-2">
          {challenges.data?.data.map((challenge) => (
            <div key={challenge.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-cream">{challenge.title}</p>
                <p className="text-[10.5px] text-mist">{challenge.author.name} · {challenge.category} · {challenge.submissions} submissions</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={challenge.status} />
                {challenge.status !== 'ARCHIVED' && (
                  <Btn size="sm" variant="ghost" onClick={() => void archive(challenge)}>
                    <AlertTriangle className="h-3.5 w-3.5" /> Archive
                  </Btn>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading title="Knowledge Vault" hint={`${resources.data?.data.length ?? 0} published resources`} />
        {resources.loading && <Loading rows={3} />}
        {resources.error && <ErrorNote message={resources.error} onRetry={resources.reload} />}
        <div className="space-y-2">
          {resources.data?.data.map((resource) => (
            <div key={resource.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-cream">{resource.title}</p>
                <p className="text-[10.5px] text-mist">{resource.author.name} · {resource.category} · {resource.views} views</p>
              </div>
              <Btn size="sm" variant="danger" onClick={() => void remove(resource)}>Remove</Btn>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

type AuditEntry = {
  id: string
  action: string
  entity: string
  entityId: string | null
  meta: string | null
  ip: string | null
  createdAt: string
  actor: { id: string; name: string; email: string } | null
}

function AuditPanel() {
  const [entity, setEntity] = useState('')
  const state = useApi<{ data: AuditEntry[] }>(`/admin/audit?pageSize=50${entity ? `&entity=${encodeURIComponent(entity)}` : ''}`, [entity])

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Audit log"
        hint="Append-only record of state-changing actions: profile updates, submissions, evaluations, certificates, admin changes."
        action={
          <select className={`${fieldClass} w-44`} value={entity} onChange={(event) => setEntity(event.target.value)} aria-label="Filter audit entity">
            <option value="">All entities</option>
            <option value="User">User</option>
            <option value="Challenge">Challenge</option>
            <option value="Submission">Submission</option>
            <option value="MentorshipRequest">Mentorship</option>
            <option value="MentorshipSession">Session</option>
            <option value="Certificate">Certificate</option>
            <option value="Opportunity">Opportunity</option>
            <option value="Application">Application</option>
            <option value="KnowledgeResource">Resource</option>
            <option value="Event">Event</option>
            <option value="Notification">Notification</option>
          </select>
        }
      />
      {state.loading && <Loading rows={5} />}
      {state.error && <ErrorNote message={state.error} onRetry={state.reload} />}
      {state.data && state.data.data.length === 0 && <EmptyState title="No audit entries" hint="Actions taken in the app appear here." icon={<ClipboardCheck className="h-5 w-5" />} />}

      <div className="space-y-2">
        {state.data?.data.map((entry) => (
          <Card key={entry.id} className="p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-cream">{entry.action}</p>
                <p className="text-[10.5px] text-mist">
                  {entry.actor ? `${entry.actor.name} (${entry.actor.email})` : 'System'} · {entry.entity}
                  {entry.entityId ? ` · ${entry.entityId.slice(0, 10)}…` : ''}
                </p>
              </div>
              <p className="text-[10px] text-ash">{relativeTime(entry.createdAt)} · {entry.ip ?? 'no ip'}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function AnnouncementPanel() {
  const [form, setForm] = useState({ title: '', body: '', role: 'ALL' })
  const action = useAction()
  const [sent, setSent] = useState<string | null>(null)

  const send = async () => {
    setSent(null)
    const result = await action.run(
      () => apiPost<{ recipients: number }>('/admin/announcements', form),
      'Announcement queued for delivery.',
    )
    if (result) {
      setSent(`Delivered to ${result.recipients} active account${result.recipients === 1 ? '' : 's'} as an in-app notification.`)
      setForm({ title: '', body: '', role: 'ALL' })
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Announcements"
        hint="In-app notifications only. Email delivery is not configured in this environment, so nothing is sent outside the platform."
      />
      {sent && <SuccessNote message={sent} />}
      {action.error && <ErrorNote message={action.error} />}

      <Card className="max-w-2xl">
        <div className="space-y-3">
          <Field label="Audience">
            <select className={fieldClass} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="ALL">All active accounts</option>
              <option value="STUDENT">Students</option>
              <option value="ALUMNI">Alumni</option>
              <option value="UNIVERSITY">University reps</option>
              <option value="COMPANY">Companies</option>
            </select>
          </Field>
          <Field label="Title">
            <input className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </Field>
          <Field label="Message" hint="At least 10 characters. Be factual; do not promise outcomes the platform cannot guarantee.">
            <textarea className={`${fieldClass} min-h-32`} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
          </Field>
          <div className="flex justify-end">
            <Btn disabled={action.pending || form.title.trim().length < 4 || form.body.trim().length < 10} onClick={() => void send()}>
              <Megaphone className="h-3.5 w-3.5" /> {action.pending ? 'Sending…' : 'Send announcement'}
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  )
}
type UniversityRow = { id: string; name: string; shortName: string | null; domain: string | null; city: string | null; country: string | null; region: string | null; website: string | null; defaultLocale: string | null; languages: string | null; timeZone: string | null; verified: boolean; counts: { representatives: number; students: number; alumni: number; events: number } }

function UniversitiesPanel() {
  const list = useApi<{ data: UniversityRow[] }>('/admin/universities')
  const action = useAction()
  const [form, setForm] = useState({ name: '', shortName: '', domain: '', city: '', country: '', region: '', website: '', defaultLocale: 'en', languages: '', timeZone: 'UTC' })
  const [notice, setNotice] = useState<string | null>(null)

  const create = async () => {
    const result = await action.run(() => apiPost<{ data: UniversityRow }>('/admin/universities', form), 'University created.')
    if (result) {
      setNotice(`${result.data.name} created.`)
      setForm({ name: '', shortName: '', domain: '', city: '', country: '', region: '', website: '', defaultLocale: 'en', languages: '', timeZone: 'UTC' })
      list.reload()
    }
  }

  const toggleVerified = async (university: UniversityRow) => {
    const result = await action.run(() => apiPatch<{ data: UniversityRow }>(`/admin/universities/${university.id}`, { verified: !university.verified }), 'University updated.')
    if (result) list.reload()
  }

  return (
    <div className="space-y-4">
      <SectionHeading title="Universities" hint="Institutions that students, alumni and representatives belong to." />
      {notice && <SuccessNote message={notice} />}
      {action.error && <ErrorNote message={action.error} />}

      <Card className="max-w-2xl">
        <SectionHeading title="Create institution" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><input className={fieldClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Short name"><input className={fieldClass} value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} /></Field>
          <Field label="Email domain"><input className={fieldClass} value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="example.edu" /></Field>
          <Field label="City"><input className={fieldClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="Country"><input className={fieldClass} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="India" /></Field>
          <Field label="Region / state"><input className={fieldClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Maharashtra" /></Field>
          <Field label="Website"><input className={fieldClass} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" /></Field>
          <Field label="Default language" hint="Short code such as en, hi, es, fr or ar.">
            <input className={fieldClass} value={form.defaultLocale} onChange={(e) => setForm({ ...form, defaultLocale: e.target.value })} />
          </Field>
          <Field label="Supported languages" hint="Comma-separated codes.">
            <input className={fieldClass} value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="en, hi" />
          </Field>
          <Field label="Institution time zone" hint="IANA name, e.g. Asia/Kolkata.">
            <input className={fieldClass} value={form.timeZone} onChange={(e) => setForm({ ...form, timeZone: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3 flex justify-end">
          <Btn disabled={action.pending || form.name.trim().length < 2} onClick={() => void create()}>
            {action.pending ? 'Creating...' : 'Create university'}
          </Btn>
        </div>
      </Card>

      {list.loading && <Loading rows={4} />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      <div className="space-y-2">
        {list.data?.data.map((university) => (
          <Card key={university.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-sm font-semibold text-cream">{university.name}</p>
                <p className="text-[11.5px] text-mist">{university.shortName ?? '-'} · {university.city ?? '-'} · {university.domain ?? 'no domain'}</p>
                <p className="text-[11px] text-ash">
                  {[university.country, university.region, university.timeZone].filter(Boolean).join(' · ') || 'No region configured'}
                  {university.defaultLocale ? ` · default ${university.defaultLocale}` : ''}
                  {university.languages ? ` · languages ${university.languages}` : ''}
                </p>
                <p className="text-[10.5px] text-ash">
                  {university.counts.representatives} reps · {university.counts.students} students · {university.counts.alumni} alumni · {university.counts.events} events
                </p>
              </div>
              <Btn size="sm" variant={university.verified ? 'mint' : 'secondary'} onClick={() => void toggleVerified(university)}>
                {university.verified ? 'Verified' : 'Unverified'}
              </Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ProvisionPanel() {
  const universities = useApi<{ data: Array<{ id: string; name: string }> }>('/admin/universities')
  const action = useAction()
  const [role, setRole] = useState<'UNIVERSITY' | 'COMPANY' | 'ADMIN'>('UNIVERSITY')
  const [form, setForm] = useState({ email: '', name: '', universityId: '', designation: '', department: '', permissions: '' })
  const [result, setResult] = useState<string | null>(null)

  const provision = async () => {
    setResult(null)
    const payload: Record<string, unknown> = {
      email: form.email,
      name: form.name,
      role,
      designation: form.designation || null,
      department: form.department || null,
    }
    if (role === 'UNIVERSITY') {
      payload.universityId = form.universityId
      payload.permissions = form.permissions ? form.permissions.split(',').map((item) => item.trim()).filter(Boolean) : undefined
    }
    const response = await action.run(() => apiPost<{ data: { id: string; email: string; role: string; temporaryPassword: string } }>('/admin/users/provision', payload), 'Account provisioned.')
    if (response) {
      setResult(`Temporary password for ${response.data.email}: ${response.data.temporaryPassword}`)
      setForm({ email: '', name: '', universityId: '', designation: '', department: '', permissions: '' })
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeading title="Provision privileged accounts" hint="University, company and administrator accounts cannot be self-registered. The one-time password is shown only once." />
      {action.error && <ErrorNote message={action.error} />}
      {result && <SuccessNote message={result} />}

      <Card className="max-w-2xl">
        <div className="space-y-3">
          <Field label="Role">
            <select className={fieldClass} value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="UNIVERSITY">University representative</option>
              <option value="COMPANY">Company account</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </Field>
          <Field label="Full name"><input className={fieldClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><input type="email" className={fieldClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          {role === 'UNIVERSITY' && (
            <>
              <Field label="Institution">
                <select className={fieldClass} value={form.universityId} onChange={(e) => setForm({ ...form, universityId: e.target.value })}>
                  <option value="">Select institution</option>
                  {universities.data?.data.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
              <Field label="Designation"><input className={fieldClass} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
              <Field label="Department"><input className={fieldClass} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
              <Field label="Permissions (comma separated)" hint="Defaults to all when empty."><input className={fieldClass} value={form.permissions} onChange={(e) => setForm({ ...form, permissions: e.target.value })} placeholder="VERIFY_STUDENTS,VERIFY_ALUMNI,ANNOUNCE,EVENTS,ANALYTICS,PROFILE" /></Field>
            </>
          )}
          <div className="flex justify-end">
            <Btn disabled={action.pending || !form.email || !form.name || (role === 'UNIVERSITY' && !form.universityId)} onClick={() => void provision()}>
              {action.pending ? 'Provisioning...' : 'Provision account'}
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  )
}

const SUPPORT_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'] as const
const SUPPORT_CATEGORIES = ['BUG', 'ACCOUNT', 'VERIFICATION', 'MENTORSHIP', 'CHALLENGE', 'PRIVACY', 'ACCESSIBILITY', 'OTHER'] as const
const SUPPORT_TONE: Record<string, 'warning' | 'azure' | 'mint' | 'neutral'> = {
  OPEN: 'warning',
  IN_REVIEW: 'azure',
  RESOLVED: 'mint',
  CLOSED: 'neutral',
}

type TicketDraft = { status: string; priority: string; adminNote: string }

function AdminSupportPanel() {
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState({ status: '', category: '', query: '' })
  const [drafts, setDrafts] = useState<Record<string, TicketDraft>>({})

  const params = new URLSearchParams({ pageSize: '50' })
  if (applied.status) params.set('status', applied.status)
  if (applied.category) params.set('category', applied.category)
  if (applied.query) params.set('q', applied.query)

  const list = useApi<{ data: FeedbackRecord[]; meta: { counts: { open: number; inReview: number; resolved: number; closed: number } } }>(
    `/admin/feedback?${params.toString()}`,
    [applied],
  )
  const action = useAction()

  const draftOf = (item: FeedbackRecord): TicketDraft =>
    drafts[item.id] ?? { status: item.status, priority: item.priority, adminNote: item.adminNote ?? '' }
  const patchDraft = (item: FeedbackRecord, patch: Partial<TicketDraft>) =>
    setDrafts((prev) => ({ ...prev, [item.id]: { ...draftOf(item), ...patch } }))

  const save = async (item: FeedbackRecord) => {
    const result = await action.run(() => apiPatch(`/admin/feedback/${item.id}`, draftOf(item)), 'Ticket updated')
    if (result) {
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
      list.reload()
    }
  }

  const counts = list.data?.meta.counts
  const tickets = list.data?.data ?? []

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Support queue"
        hint="Reports submitted from every portal. Only platform administrators see this queue; reply through the user's ticket status and note."
      />

      {counts && (
        <div className="flex flex-wrap gap-2">
          <Badge tone="warning">{counts.open} open</Badge>
          <Badge tone="azure">{counts.inReview} in review</Badge>
          <Badge tone="mint">{counts.resolved} resolved</Badge>
          <Badge tone="neutral">{counts.closed} closed</Badge>
        </div>
      )}

      <form
        className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault()
          setApplied({ status, category, query })
        }}
      >
        <input
          className={fieldClass}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search subject or message"
          aria-label="Search tickets"
        />
        <select className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Ticket status">
          <option value="">All statuses</option>
          {SUPPORT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Ticket category">
          <option value="">All categories</option>
          {SUPPORT_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item.replace('_', ' ')}
            </option>
          ))}
        </select>
        <Btn type="submit" variant="secondary">
          Filter
        </Btn>
      </form>

      {action.error && <ErrorNote message={action.error} />}
      {action.success && <SuccessNote message={action.success} />}
      {list.loading && <Loading rows={3} label="Loading tickets" />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {!list.loading && !list.error && tickets.length === 0 && (
        <EmptyState icon={<LifeBuoy className="h-5 w-5" />} title="No tickets in this view" hint="Reports arrive here as soon as a user submits the support form." />
      )}

      <div className="space-y-3">
        {tickets.map((item) => {
          const draft = draftOf(item)
          return (
            <Card key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={SUPPORT_TONE[item.status] ?? 'neutral'}>{item.status.replace('_', ' ')}</Badge>
                    <Badge tone="neutral">{item.category}</Badge>
                    <span className="text-[10.5px] text-ash">
                      {item.user?.email ?? 'unknown user'} · {item.user?.role ?? ''} · {relativeTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] font-medium text-cream">{item.subject}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-mist">{item.message}</p>
                  {item.pagePath && <p className="mt-1 font-mono text-[10px] text-ash">Filed from {item.pagePath}</p>}
                </div>
                <div className="w-full space-y-2 sm:w-64">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className={fieldClass}
                      value={draft.status}
                      onChange={(event) => patchDraft(item, { status: event.target.value })}
                      aria-label={`Status for ${item.subject}`}
                    >
                      {SUPPORT_STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {option.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <select
                      className={fieldClass}
                      value={draft.priority}
                      onChange={(event) => patchDraft(item, { priority: event.target.value })}
                      aria-label={`Priority for ${item.subject}`}
                    >
                      {['LOW', 'NORMAL', 'HIGH'].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    className={`${fieldClass} min-h-20`}
                    value={draft.adminNote}
                    onChange={(event) => patchDraft(item, { adminNote: event.target.value })}
                    placeholder="Note shown to the reporter"
                    aria-label={`Admin note for ${item.subject}`}
                  />
                  <Btn size="sm" onClick={() => save(item)} disabled={action.pending}>
                    Save ticket
                  </Btn>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
