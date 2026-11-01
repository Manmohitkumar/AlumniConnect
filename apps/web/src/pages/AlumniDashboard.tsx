import { CalendarDays, ClipboardCheck, GraduationCap, Sparkles, Star, Users } from 'lucide-react'
import { AppShell, navByRole, useTab } from '../components/app/AppShell'
import { AlumniChallenges } from '../components/app/Challenges'
import { MentorshipPanel } from '../components/app/Mentorship'
import { EventsPanel, NotificationHistory, ResourcesPanel } from '../components/app/Community'
import { TalentDiscovery } from '../components/app/Career'
import { SubmissionsPanel } from '../components/app/Submissions'
import { CertificatesPanel, ProfilePanel } from '../components/app/PortfolioCertificates'
import { CompletenessPrompt } from '../components/app/CompletenessPrompt'
import { SupportPanel } from '../components/app/Support'
import { AiAssistant } from '../components/app/AiAssistant'
import { AlumniAiControlPanel } from '../components/app/AlumniAi'
import { Badge, Btn, Card, ErrorNote, Loading, SectionHeading, Stat } from '../components/app/ui'
import { useAuth } from '../context/AuthContext'
import type { Challenge, Me, MentorshipRequest, Submission } from '../lib/apiClient'
import { formatDate, formatDateTime } from '../lib/format'
import { useApi } from '../lib/useApi'

type Analytics = {
  data: {
    requestsReceived?: number
    pending: number
    accepted: number
    completedRequests: number
    sessionsCompleted: number
    sessionsUpcoming: number
    averageRating: number | null
    ratingCount: number
  }
}

const TABS = navByRole.ALUMNI.map((item) => item.id)

export function AlumniDashboard() {
  const [tab, setTab] = useTab('overview', TABS)
  const { user } = useAuth()

  return (
    <AppShell
      title="Alumni workspace"
      subtitle={user ? `${user.name} · Mentor and challenge publisher` : ''}
      nav={navByRole.ALUMNI}
      active={tab}
      onNavigate={setTab}
    >
      {tab === 'overview' && <Overview onNavigate={setTab} />}
      {tab === 'ai' && <AiAssistant role="ALUMNI" />}
      {tab === 'ai-rep' && <AlumniAiControlPanel />}
      {tab === 'challenges' && <AlumniChallenges />}
      {tab === 'submissions' && <SubmissionsPanel role="ALUMNI" />}
      {tab === 'mentorship' && <MentorshipPanel role="ALUMNI" />}
      {tab === 'resources' && <ResourcesPanel role="ALUMNI" />}
      {tab === 'events' && <EventsPanel role="ALUMNI" />}
      {tab === 'certificates' && <CertificatesPanel role="ALUMNI" />}
      {tab === 'discovery' && <TalentDiscovery role="ALUMNI" />}
      {tab === 'support' && <SupportPanel />}
      {tab === 'notifications' && <NotificationHistory />}
      {tab === 'profile' && <ProfilePanel role="ALUMNI" />}
    </AppShell>
  )
}

function Overview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const me = useApi<{ data: Me }>('/profile/me')
  const analytics = useApi<Analytics>('/mentorship/analytics')
  const submissions = useApi<{ data: Submission[] }>('/submissions/received?pageSize=50')
  const challenges = useApi<{ data: Challenge[] }>('/challenges?mine=true&status=ALL&pageSize=50')
  const requests = useApi<{ data: MentorshipRequest[] }>('/mentorship/requests')

  const pendingReview = (submissions.data?.data ?? []).filter((submission) => submission.status === 'SUBMITTED' || submission.status === 'UNDER_REVIEW')
  const openChallenges = (challenges.data?.data ?? []).filter((challenge) => challenge.status === 'OPEN')

  const upcoming = (requests.data?.data ?? [])
    .flatMap((request) =>
      request.sessions
        .filter((session) => session.status === 'SCHEDULED' && new Date(session.scheduledAt).getTime() > Date.now())
        .map((session) => ({ id: session.id, with: request.student.name, topic: request.topic, when: session.scheduledAt })),
    )
    .sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime())
    .slice(0, 4)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.1em] text-ash">Overview</p>
          <h1 className="mt-1 font-display text-xl font-semibold text-cream">Your alumni workspace</h1>
          <p className="mt-1 text-[12.5px] text-mist">
            Publish scoped challenges, review student work and offer mentorship. Recognition you issue is platform-level, not a
            university credential.
          </p>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" onClick={() => onNavigate('challenges')}>
            <Sparkles className="h-3.5 w-3.5" /> New challenge
          </Btn>
          <Btn size="sm" variant="secondary" onClick={() => onNavigate('mentorship')}>
            <GraduationCap className="h-3.5 w-3.5" /> Mentorship
          </Btn>
        </div>
      </div>

      {me.loading && <Loading rows={2} />}
      {me.error && <ErrorNote message={me.error} onRetry={me.reload} />}

      {me.data && <CompletenessPrompt me={me.data.data} onNavigate={onNavigate} />}

      {me.data && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Open challenges" value={openChallenges.length} hint={`${challenges.data?.data.length ?? 0} published in total`} icon={<Sparkles className="h-4 w-4" />} />
          <Stat label="Awaiting review" value={pendingReview.length} tone="azure" hint="Submitted but not evaluated" icon={<ClipboardCheck className="h-4 w-4" />} />
          <Stat label="Mentorship pending" value={analytics.data?.data.pending ?? 0} tone="mint" hint={`${analytics.data?.data.sessionsUpcoming ?? 0} sessions upcoming`} icon={<GraduationCap className="h-4 w-4" />} />
          <Stat
            label="Average rating"
            value={analytics.data?.data.averageRating ?? '—'}
            tone="mint"
            hint={`${analytics.data?.data.ratingCount ?? 0} session ratings`}
            icon={<Star className="h-4 w-4" />}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <SectionHeading
            title="Submissions needing review"
            hint="Evaluate honestly and record what would improve the work. Students see your written feedback."
            action={<Badge tone={pendingReview.length > 0 ? 'warning' : 'mint'}>{pendingReview.length} waiting</Badge>}
          />
          {submissions.loading && <Loading rows={2} />}
          {submissions.error && <ErrorNote message={submissions.error} onRetry={submissions.reload} />}
          {!submissions.loading && pendingReview.length === 0 && (
            <p className="text-[12.5px] text-mist">Everything submitted so far has been evaluated.</p>
          )}
          <div className="space-y-2">
            {pendingReview.slice(0, 5).map((submission) => (
              <div key={submission.id} className="rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2">
                <p className="text-[12.5px] font-semibold text-cream">{submission.title}</p>
                <p className="text-[11px] text-mist">
                  {submission.student?.name} · {submission.challenge?.title} · {formatDate(submission.createdAt)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Btn size="sm" variant="secondary" onClick={() => onNavigate('submissions')}>Open review queue</Btn>
            <Btn size="sm" variant="ghost" onClick={() => onNavigate('challenges')}>Manage challenges</Btn>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionHeading title="Upcoming sessions" />
            {requests.loading && <Loading rows={2} />}
            {upcoming.length === 0 && !requests.loading && <p className="text-[12px] text-mist">No sessions scheduled.</p>}
            <div className="space-y-2">
              {upcoming.map((session) => (
                <div key={session.id} className="rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2">
                  <p className="text-[12px] font-semibold text-cream">with {session.with}</p>
                  <p className="text-[10.5px] text-mist">{session.topic}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-ash">
                    <CalendarDays className="h-3 w-3" /> {formatDateTime(session.when)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeading title="Talent discovery" hint="Students who opted into portfolio visibility." />
            <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-mist">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-300" />
              Suggested students are ranked by overlap with the skills in your open challenges. Each suggestion states its reason.
            </div>
            <Btn size="sm" variant="secondary" className="mt-3" onClick={() => onNavigate('discovery')}>
              View student talent
            </Btn>
          </Card>
        </div>
      </div>
    </div>
  )
}
