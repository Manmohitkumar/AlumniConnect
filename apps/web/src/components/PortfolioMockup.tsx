import { BadgeCheck, Eye, Lock, Search, Send } from 'lucide-react'

const skills = ['React', 'Data viz', 'Python', 'UI/UX']

const projects = [
  { title: 'Smart Campus Energy Monitor', meta: 'Alumni challenge · Rank #1', score: 92 },
  { title: 'Complaint Triage Dashboard', meta: 'Alumni challenge · Completed', score: 88 },
]

export function PortfolioMockup() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(242,212,146,0.18),transparent_60%),radial-gradient(circle_at_75%_80%,rgba(242,149,89,0.22),transparent_60%)] blur-xl"
      />

      <div className="gradient-border rounded-3xl bg-ink-900/85 p-2 shadow-panel backdrop-blur">
        <div className="rounded-[18px] bg-ink-850 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-mint-400 font-display text-sm font-bold text-ink-950">
              SN
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[14px] font-semibold text-cream">Student Name</p>
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-mint-400" />
              </div>
              <p className="truncate text-[10.5px] text-ash">Computer Science · Class of 2026</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {skills.map((skill) => (
                  <span key={skill} className="chip !text-[9px]">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-mint-400/20 bg-mint-400/[0.06] px-2.5 py-2">
            <span className="inline-flex items-center gap-1.5 text-[9.5px] font-medium text-mint-300">
              <Eye className="h-3 w-3" /> Portfolio visible to approved recruiters
            </span>
            <span className="relative h-4 w-7 shrink-0 rounded-full bg-mint-400/80">
              <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-ink-950" />
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {projects.map((project) => (
              <div key={project.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[10.5px] font-medium text-cream">{project.title}</p>
                    <p className="truncate text-[9px] text-ash">{project.meta}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-brand-500/15 px-1.5 py-0.5 text-[8.5px] font-semibold text-brand-300">
                    {project.score}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-brand-500/20 bg-gradient-to-r from-brand-500/[0.12] to-azure-500/[0.08] px-2.5 py-2">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-medium text-cream">
              <BadgeCheck className="h-3 w-3 text-mint-300" /> 2 appreciation certificates
            </span>
            <span className="font-mono text-[8px] text-ash">/p/student-name</span>
          </div>
        </div>
      </div>

      <div className="absolute -right-2 -bottom-8 w-[236px] rounded-2xl border border-[rgba(242,149,89,0.22)] bg-ink-800/95 p-3 shadow-card backdrop-blur sm:-right-8">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-cream">Recruiter view</p>
          <span className="inline-flex items-center gap-1 rounded bg-ink-950/60 px-1.5 py-0.5 text-[7.5px] text-ash">
            <Lock className="h-2 w-2" /> Consent-first
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-ink-900/80 px-2 py-1.5">
          <Search className="h-3 w-3 text-ash" />
          <span className="text-[8.5px] text-ash">Filter by skill: React</span>
        </div>
        <div className="mt-2 space-y-1.5">
          {['Student A', 'Student B'].map((name, index) => (
            <div key={name} className="flex items-center gap-2 rounded-lg border border-white/[0.05] px-2 py-1.5">
              <span className="h-4 w-4 rounded-full bg-gradient-to-br from-brand-500 to-azure-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-medium text-cream">{name}</p>
                <p className="text-[7.5px] text-ash">{index === 0 ? 'Rank #1 · 92 score' : 'Verified portfolio'}</p>
              </div>
              <span className="grid h-5 w-5 place-items-center rounded-md bg-mint-400/10 text-mint-300">
                <Send className="h-2.5 w-2.5" />
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[7.5px] leading-snug text-ash">
          Students control access and can revoke it at any time. Sharing does not imply employment.
        </p>
      </div>
    </div>
  )
}
