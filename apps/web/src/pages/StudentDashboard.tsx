import { Award, BookOpen, CalendarDays, ClipboardCheck, GraduationCap, Sparkles, Users } from 'lucide-react'
import { AppShell, navByRole, useTab } from '../components/app/AppShell'
import { StudentChallenges } from '../components/app/Challenges'
import { MentorshipPanel } from '../components/app/Mentorship'
import { EventsPanel, NotificationHistory, ResourcesPanel } from '../components/app/Community'
import { StudentOpportunities } from '../components/app/Career'
import { SubmissionsPanel } from '../components/app/Submissions'
import { CertificatesPanel, PortfolioPanel, ProfilePanel } from '../components/app/PortfolioCertificates'
import { CompletenessPrompt } from '../components/app/CompletenessPrompt'
import { SupportPanel } from '../components/app/Support'
import { AiAssistant } from '../components/app/AiAssistant'
import { AlumniAiPanel } from '../components/app/AlumniAi'
import { Badge, Btn, Card, ErrorNote, Loading, SectionHeading, Stat } from '../components/app/ui'
import { useAuth } from '../context/AuthContext'
import type { EventRecord, Me, MentorshipRequest } from '../lib/apiClient'
import { formatDate, formatDateTime } from '../lib/format'
import { useApi } from '../lib/useApi'

type Recommendations = {
  data: {
    mentors: Array<{ id: string; name: string; headline: string | null; company: string | null; industry: string | null; reason: string }>
    challenges: Array<{
      id: string
      slug: string
      title: string
      category: string
      deadline: string | null
      isPaid: boolean
      author: string
      submissions: number
      reason: string
    }>
    events: Array<{ id: string; title: string; category: string; mode: string; startsAt: string; reason: string }>
    resources: Array<{ id: string; title: string; category: string; type: string; author: string; reason: string }>
    method: string
  }
}

const TABS = navByRole.STUDENT.map((item) => item.id)

export function StudentDashboard() {
  const [tab, setTab] = useTab('overview', TABS)
  const { user } = useAuth()

  return (
    <AppShell
      title="Student workspace"
      subtitle={user ? `${user.name} · Demo University` : ''}
      nav={navByRole.STUDENT}
      active={tab}
      onNavigate={setTab}
    >
      {tab === 'overview' && <Overview onNavigate={setTab} />}
      {tab === 'ai' && <AiAssistant role="STUDENT" />}
      {tab === 'mentor-ai' && <AlumniAiPanel />}
      {tab === 'challenges' && <StudentChallenges />}
      {tab === 'submissions' && <SubmissionsPanel role="STUDENT" />}
      {tab === 'mentorship' && <MentorshipPanel role="STUDENT" />}
      {tab === 'portfolio' && <PortfolioPanel />}
      {tab === 'certificates' && <CertificatesPanel role="STUDENT" />}
      {tab === 'events' && <EventsPanel role="STUDENT" />}
      {tab === 'opportunities' && <OpportunitiesTab />}
      {tab === 'resources' && <ResourcesPanel role="STUDENT" />}
      {tab === 'support' && <SupportPanel />}
      {tab === 'notifications' && <NotificationHistory />}
      {tab === 'profile' && <ProfilePanel role="STUDENT" />}
    </AppShell>
  )
}

function OpportunitiesTab() {
  const me = useApi<{ data: Me }>('/profile/me')
  if (me.loading) return <Loading rows={3} label="Loading consent settings" />
  if (me.error) return <ErrorNote message={me.error} onRetry={me.reload} />
  return <StudentOpportunities consented={me.data?.data.studentProfile?.visibleToCompanies ?? false} />
}

function Overview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const me = useApi<{ data: Me }>('/profile/me')
  const recommendations = useApi<Recommendations>('/discover/recommendations')
  const requests = useApi<{ data: MentorshipRequest[] }>('/mentorship/requests')
  const events = useApi<{ data: EventRecord[] }>('/events?pageSize=4')

  const counts = me.data?.data.counts

  const upcomingSessions = (requests.data?.data ?? [])
    .flatMap((request) =>
      request.sessions
        .filter((session) => session.status === 'SCHEDULED' && new Date(session.scheduledAt).getTime() > Date.now())
        .map((session) => ({
          id: session.id,
          title: `Mentorship with ${request.mentor.name}`,
          when: session.scheduledAt,
          detail: request.topic,
        })),
    )
    .sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime())
    .slice(0, 3)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.1em] text-ash">Overview</p>
        <h1 className="mt-1 font-display text-xl font-semibold text-cream">
          Welcome back{me.data ? `, ${me.data.data.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-[12.5px] text-mist">
          Your challenges, mentorship and recognition in one place. Demo data is labelled; anything you do here is stored in the
          database.
        </p>
      </div>

      {me.loading && <Loading rows={2} label="Loading your summary" />}
      {me.error && <ErrorNote message={me.error} onRetry={me.reload} />}

      {me.data && <CompletenessPrompt me={me.data.data} onNavigate={onNavigate} />}

      {counts && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Challenges joined" value={counts.challengesJoined} icon={<Sparkles className="h-4 w-4" />} hint="Participation is not the same as completion" />
          <Stat label="Submissions" value={counts.submissions} tone="azure" icon={<ClipboardCheck className="h-4 w-4" />} />
          <Stat label="Mentorship" value={counts.mentorship} tone="mint" icon={<GraduationCap className="h-4 w-4" />} hint="Requests and sessions with alumni" />
          <Stat label="Certificates" value={counts.certificates} tone="mint" icon={<Award className="h-4 w-4" />} hint="Platform recognition only" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <SectionHeading
            title="Suggested for you"
            hint="Rule-based suggestions from your skills and interests — no machine-learning model is used."
            action={<Badge tone="neutral">Transparent</Badge>}
          />
          {recommendations.loading && <Loading rows={3} />}
          {recommendations.error && <ErrorNote message={recommendations.error} onRetry={recommendations.reload} />}
          {recommendations.data && (
            <div className="space-y-3">
              {recommendations.data.data.challenges.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-mist">Challenges</p>
                  <div className="space-y-2">
                    {recommendations.data.data.challenges.slice(0, 3).map((challenge) => (
                      <a
                        key={challenge.id}
                        href={`/challenges/${challenge.slug}`}
                        className="block rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2 transition-colors hover:border-brand-400/40"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[12.5px] font-semibold text-cream">{challenge.title}</p>
                          <Badge tone={challenge.isPaid ? 'mint' : 'neutral'}>{challenge.isPaid ? 'Paid' : 'Unpaid'}</Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-mist">{challenge.reason}</p>
                        <p className="mt-1 text-[10.5px] text-ash">by {challenge.author} · closes {formatDate(challenge.deadline)}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {recommendations.data.data.mentors.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-mist">Mentors</p>
                  <div className="space-y-2">
                    {recommendations.data.data.mentors.slice(0, 3).map((mentor) => (
                      <div key={mentor.id} className="rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2">
                        <p className="text-[12.5px] font-semibold text-cream">{mentor.name}</p>
                        <p className="text-[11px] text-mist">{mentor.headline}</p>
                        <p className="mt-1 text-[10.5px] text-ash">{mentor.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recommendations.data.data.challenges.length === 0 && recommendations.data.data.mentors.length === 0 && (
                <p className="text-[12.5px] text-mist">
                  Add skills and career interests to your profile to receive relevant, explainable suggestions.
                </p>
              )}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn size="sm" onClick={() => onNavigate('challenges')}>Browse challenges</Btn>
            <Btn size="sm" variant="secondary" onClick={() => onNavigate('mentorship')}>Find a mentor</Btn>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionHeading title="Next up" hint="Scheduled mentorship sessions and upcoming events." />
            {requests.loading && <Loading rows={2} />}
            {upcomingSessions.length === 0 && !requests.loading && (
              <p className="text-[12px] text-mist">No mentorship sessions scheduled.</p>
            )}
            <div className="space-y-2">
              {upcomingSessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2">
                  <p className="text-[12px] font-semibold text-cream">{session.title}</p>
                  <p className="text-[10.5px] text-mist">{formatDateTime(session.when)} · {session.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              {events.data?.data.slice(0, 3).map((event) => (
                <a key={event.id} href="#" onClick={(clickEvent) => { clickEvent.preventDefault(); onNavigate('events') }} className="flex items-start gap-2 rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2 hover:border-brand-400/40">
                  <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
                  <span>
                    <span className="block text-[12px] font-semibold text-cream">{event.title}</span>
                    <span className="block text-[10.5px] text-mist">{formatDateTime(event.startsAt)} · {event.mode}</span>
                  </span>
                </a>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeading title="Quick links" />
            <div className="grid grid-cols-2 gap-2">
              <Btn size="sm" variant="secondary" onClick={() => onNavigate('portfolio')}>Portfolio</Btn>
              <Btn size="sm" variant="secondary" onClick={() => onNavigate('certificates')}>Certificates</Btn>
              <Btn size="sm" variant="secondary" onClick={() => onNavigate('opportunities')}>Opportunities</Btn>
              <Btn size="sm" variant="secondary" onClick={() => onNavigate('resources')}>Knowledge Vault</Btn>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-mist">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-300" />
              Company visibility is off until you consent. You can change it any time from My profile.
            </div>
            <a href="/metaverse/index.html" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">
              <BookOpen className="h-3.5 w-3.5" /> Open the metaverse campus
            </a>
          </Card>
        </div>
      </div>
    </div>
  )
}
