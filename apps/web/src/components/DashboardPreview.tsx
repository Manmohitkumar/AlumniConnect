import {
  Award,
  BarChart3,
  Bell,
  FolderKanban,
  LayoutDashboard,
  MessagesSquare,
  Search,
  Target,
  UploadCloud,
} from 'lucide-react'
import { demoChallenges, demoMetrics } from '../data/content'
import { Counter } from './Counter'
import { QrPattern } from './QrPattern'

const toneHex: Record<string, string> = {
  brand: '#F29559',
  azure: '#B8B08D',
  mint: '#F2D492',
}

function Spark({ tone }: { tone: string }) {
  const color = toneHex[tone] ?? '#F29559'
  const points = tone === 'mint' ? '0,18 10,14 20,16 30,9 40,11 50,5' : '0,16 10,17 20,11 30,13 40,7 50,9'
  return (
    <svg viewBox="0 0 50 22" className="h-5 w-12 shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <polygon points={`${points} 50,22 0,22`} fill={color} opacity="0.1" />
    </svg>
  )
}

const sidebar = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Challenges', icon: Target },
  { label: 'Submissions', icon: UploadCloud },
  { label: 'Portfolio', icon: FolderKanban },
  { label: 'Mentorship', icon: MessagesSquare },
  { label: 'Analytics', icon: BarChart3 },
]

const submissions = [
  { name: 'Aarav Mehta', title: 'Energy Monitor', score: 92, initials: 'AM', tone: 'from-brand-500 to-azure-500' },
  { name: 'Riya Shah', title: 'Complaint Analyzer', score: 88, initials: 'RS', tone: 'from-mint-400 to-azure-500' },
  { name: 'Kabir Patel', title: 'Attendance System', score: 84, initials: 'KP', tone: 'from-brand-400 to-brand-600' },
]

export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[3rem] bg-[radial-gradient(ellipse_at_50%_20%,rgba(242,149,89,0.28),transparent_60%),radial-gradient(ellipse_at_75%_85%,rgba(242,212,146,0.14),transparent_55%)] blur-2xl"
      />

      <div className="mb-3 flex items-center justify-between px-1">
        <span className="demo-note">
          <span className="h-1 w-1 rounded-full bg-mint-400" />
          Illustrative product preview · demo data
        </span>
        <span className="hidden items-center gap-1.5 text-[10.5px] text-ash sm:flex">
          <Search className="h-3 w-3" /> Student workspace
        </span>
      </div>

      <div className="gradient-border relative rounded-[26px] bg-ink-950/70 p-1.5 shadow-panel backdrop-blur-xl sm:p-2">
        <div className="overflow-hidden rounded-[20px] border border-white/[0.05] bg-ink-850">
          <div className="flex h-9 items-center justify-between border-b border-white/[0.06] bg-ink-900/60 px-3 sm:px-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#2D3F4F]" />
              <span className="h-2 w-2 rounded-full bg-[#2D3F4F]" />
              <span className="h-2 w-2 rounded-full bg-[#2D3F4F]" />
              <span className="ml-3 hidden rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] text-ash sm:block">
                alumniconnect.app / dashboard
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Bell className="h-3.5 w-3.5 text-ash" />
              <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-azure-500 text-[8px] font-bold text-ink-950">
                AM
              </span>
            </div>
          </div>

          <div className="flex">
            <aside className="hidden w-[148px] shrink-0 flex-col justify-between border-r border-white/[0.06] bg-ink-900/40 p-3 md:flex">
              <div>
                <div className="flex items-center gap-2 px-1">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-mint-400 text-[9px] font-bold text-ink-950">
                    AC
                  </span>
                  <span className="text-[11px] font-semibold text-cream">AlumniConnect</span>
                </div>
                <div className="mt-4 space-y-0.5">
                  {sidebar.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10.5px] ${
                        item.active ? 'bg-white/[0.07] text-cream' : 'text-ash'
                      }`}
                    >
                      <item.icon className={`h-3 w-3 ${item.active ? 'text-brand-400' : ''}`} />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-mint-400/20 bg-mint-400/[0.06] p-2">
                <p className="text-[9px] font-semibold text-mint-300">Portfolio live</p>
                <p className="mt-0.5 text-[8.5px] leading-tight text-ash">Visible to 3 approved recruiters</p>
              </div>
            </aside>

            <div className="min-w-0 flex-1 p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-cream">Welcome back, Aarav</p>
                  <p className="text-[10px] text-ash">Student · Computer Science · Semester 6</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-lg border border-brand-500/25 bg-brand-500/10 px-2 py-1 text-[9.5px] font-medium text-brand-300">
                  <Target className="h-3 w-3" /> Browse challenges
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                {demoMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5">
                    <p className="truncate text-[9px] uppercase tracking-[0.1em] text-ash">{metric.label}</p>
                    <div className="mt-1 flex items-end justify-between gap-1">
                      <Counter
                        value={metric.value}
                        className="font-display text-lg font-semibold leading-none text-cream tabular-nums"
                      />
                      <Spark tone={metric.tone} />
                    </div>
                    <p className="mt-1 text-[8.5px] text-mint-400">{metric.delta}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-2 lg:grid-cols-[1.45fr_1fr]">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10.5px] font-semibold text-cream">Active challenges</p>
                    <span className="text-[8.5px] text-brand-300">View all</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {demoChallenges.slice(0, 2).map((challenge) => (
                      <div
                        key={challenge.title}
                        className="rounded-lg border border-white/[0.05] bg-ink-900/60 p-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[10px] font-medium leading-snug text-cream">{challenge.title}</p>
                          <span className="shrink-0 rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[8px] text-mist">
                            {challenge.days}d left
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1">
                          {challenge.skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[8px] text-ash"
                            >
                              {skill}
                            </span>
                          ))}
                          <span className="ml-auto text-[8px] text-ash">{challenge.submissions} entries</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <p className="text-[10.5px] font-semibold text-cream">Recent submissions</p>
                    <div className="mt-2 space-y-1.5">
                      {submissions.map((submission) => (
                        <div key={submission.name} className="flex items-center gap-2">
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br ${submission.tone} text-[7px] font-bold text-white`}
                          >
                            {submission.initials}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[9.5px] font-medium leading-tight text-cream">
                              {submission.title}
                            </p>
                            <p className="truncate text-[8px] text-ash">{submission.name}</p>
                          </div>
                          <span className="rounded bg-mint-400/10 px-1 py-0.5 text-[8px] font-semibold text-mint-300">
                            {submission.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-brand-500/20 bg-gradient-to-br from-brand-500/15 to-azure-500/5 p-2.5">
                    <div className="rounded-md bg-ink-950 p-1 text-cream">
                      <QrPattern className="h-8 w-8" />
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 text-[9px] font-semibold text-cream">
                        <Award className="h-2.5 w-2.5 text-mint-300" />
                        Certificate issued
                      </p>
                      <p className="truncate font-mono text-[8px] text-ash">AC-2026-0142</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -left-4 top-24 hidden animate-float lg:block" style={{ animationDelay: '0.6s' }}>
        <div className="flex items-center gap-2 rounded-xl border border-[rgba(242,149,89,0.2)] bg-ink-800/95 px-3 py-2 shadow-card backdrop-blur">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-mint-400/15 text-mint-300">
            <UploadCloud className="h-3 w-3" />
          </span>
          <div>
            <p className="text-[10px] font-semibold leading-tight text-cream">New submission</p>
            <p className="text-[9px] text-ash">2 minutes ago</p>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -right-5 bottom-16 hidden animate-float-slow lg:block">
        <div className="flex items-center gap-2 rounded-xl border border-[rgba(242,149,89,0.2)] bg-ink-800/95 px-3 py-2 shadow-card backdrop-blur">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500/15 text-brand-300">
            <Award className="h-3 w-3" />
          </span>
          <div>
            <p className="text-[10px] font-semibold leading-tight text-cream">Verified certificate</p>
            <p className="text-[9px] text-ash">QR + SHA-256 sealed</p>
          </div>
        </div>
      </div>
    </div>
  )
}
