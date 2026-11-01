import { Briefcase, ClipboardCheck, ExternalLink, Search, Users } from 'lucide-react'
import { AppShell, navByRole, useTab } from '../components/app/AppShell'
import { ApplicationsReceived, CompanyOpportunities, TalentDiscovery } from '../components/app/Career'
import { ProfilePanel } from '../components/app/PortfolioCertificates'
import { Badge, Btn, Card, ErrorNote, Loading, SectionHeading, Stat } from '../components/app/ui'
import { useAuth } from '../context/AuthContext'
import type { Opportunity } from '../lib/apiClient'
import { formatDate } from '../lib/format'
import { useApi } from '../lib/useApi'

type Application = {
  id: string
  status: string
  createdAt: string
  student: { id: string; name: string; headline: string | null }
  opportunity: { id: string; title: string; type: string; status: string }
}

type TalentSuggestion = {
  id: string
  name: string
  headline: string | null
  department: string | null
  graduationYear: number | null
  reason: string
}

const TABS = navByRole.COMPANY.map((item) => item.id)

export function CompanyDashboard() {
  const [tab, setTab] = useTab('overview', TABS)
  const { user } = useAuth()

  return (
    <AppShell
      title="Company workspace"
      subtitle={user ? `${user.name} · Verified company account` : ''}
      nav={navByRole.COMPANY}
      active={tab}
      onNavigate={setTab}
    >
      {tab === 'overview' && <Overview onNavigate={setTab} />}
      {tab === 'opportunities' && <CompanyOpportunities />}
      {tab === 'applicants' && <ApplicationsReceived />}
      {tab === 'talent' && <TalentDiscovery role="COMPANY" />}
      {tab === 'profile' && <ProfilePanel role="COMPANY" />}
    </AppShell>
  )
}

function Overview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const opportunities = useApi<{ data: Opportunity[] }>('/opportunities?mine=true&pageSize=50')
  const applications = useApi<{ data: Application[] }>('/applications/received')
  const talent = useApi<{ data: { students: TalentSuggestion[]; method: string } }>('/discover/recommendations')

  const open = (opportunities.data?.data ?? []).filter((opportunity) => opportunity.status === 'OPEN')
  const shortlisted = (applications.data?.data ?? []).filter((application) => application.status === 'SHORTLISTED')
  const recent = (applications.data?.data ?? []).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.1em] text-ash">Overview</p>
          <h1 className="mt-1 font-display text-xl font-semibold text-cream">Hiring and collaboration</h1>
          <p className="mt-1 text-[12.5px] text-mist">
            You only see students who explicitly consented to company discovery. AlumniConnect does not sell or expose contact lists.
          </p>
        </div>
        <Btn size="sm" onClick={() => onNavigate('opportunities')}>
          <Briefcase className="h-3.5 w-3.5" /> Manage opportunities
        </Btn>
      </div>

      {opportunities.loading && <Loading rows={2} />}
      {opportunities.error && <ErrorNote message={opportunities.error} onRetry={opportunities.reload} />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Open opportunities" value={open.length} hint={`${opportunities.data?.data.length ?? 0} published`} icon={<Briefcase className="h-4 w-4" />} />
        <Stat label="Applications" value={applications.data?.data.length ?? 0} tone="azure" icon={<ClipboardCheck className="h-4 w-4" />} />
        <Stat label="Shortlisted" value={shortlisted.length} tone="mint" icon={<Users className="h-4 w-4" />} />
        <Stat label="Consented students" value={talent.data?.data.students.length ?? 0} tone="mint" hint="Recommended from your skill requirements" icon={<Search className="h-4 w-4" />} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <SectionHeading title="Recent applications" action={<Btn size="sm" variant="ghost" onClick={() => onNavigate('applicants')}>View all</Btn>} />
          {applications.loading && <Loading rows={2} />}
          {!applications.loading && recent.length === 0 && <p className="text-[12.5px] text-mist">No applications yet.</p>}
          <div className="space-y-2">
            {recent.map((application) => (
              <div key={application.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2">
                <div>
                  <p className="text-[12.5px] font-semibold text-cream">{application.student.name}</p>
                  <p className="text-[10.5px] text-mist">{application.opportunity.title} · {formatDate(application.createdAt)}</p>
                </div>
                <Badge tone={application.status === 'SHORTLISTED' ? 'mint' : application.status === 'REJECTED' ? 'danger' : 'warning'}>{application.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionHeading title="Suggested talent" hint="Ranked by overlap with the skills in your open opportunities. Each card explains why it matched." />
            {talent.loading && <Loading rows={2} />}
            {talent.error && <ErrorNote message={talent.error} onRetry={talent.reload} />}
            {talent.data && talent.data.data.students.length === 0 && (
              <p className="text-[12px] text-mist">No consented students match your open roles yet.</p>
            )}
            <div className="space-y-2">
              {talent.data?.data.students.slice(0, 4).map((student) => (
                <div key={student.id} className="rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2">
                  <p className="text-[12.5px] font-semibold text-cream">{student.name}</p>
                  <p className="text-[10.5px] text-mist">{student.headline}</p>
                  <p className="mt-1 text-[10.5px] text-ash">{student.reason}</p>
                  <a href={`/portfolio/${student.id}`} className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">
                    Portfolio <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeading title="Transparency" />
            <ul className="space-y-2 text-[11.5px] text-mist">
              <li>• Students opt in to company visibility. Turning it off removes them from discovery immediately.</li>
              <li>• Email addresses are not shared through the platform.</li>
              <li>• Publishing an opportunity does not guarantee a hire; no placement metric is claimed.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
