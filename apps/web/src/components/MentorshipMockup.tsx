import { BookOpen, CalendarClock, FileText, GraduationCap, Play, Video } from 'lucide-react'

const resources = [
  { type: 'Case study', title: 'Scoping a real-world project', icon: FileText },
  { type: 'Lecture', title: 'Data storytelling for decision makers', icon: Play },
  { type: 'Insight', title: 'From campus project to first role', icon: BookOpen },
]

export function MentorshipMockup() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_70%_20%,rgba(242,149,89,0.22),transparent_60%),radial-gradient(circle_at_20%_80%,rgba(184,176,141,0.16),transparent_60%)] blur-xl"
      />

      <div className="space-y-3">
        <div className="rounded-2xl border border-[rgba(242,149,89,0.18)] bg-ink-800/80 p-4 shadow-card backdrop-blur">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-azure-500 font-display text-[13px] font-bold text-ink-950">
              AN
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-cream">Alumnus Name</p>
              <p className="text-[10px] text-ash">Senior Product Engineer · Industry mentor</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {['Product', 'Data', 'Career guidance'].map((tag) => (
                  <span key={tag} className="chip !text-[8.5px]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-mint-400/10 px-1.5 py-0.5 text-[8px] font-medium text-mint-300">
              <span className="h-1 w-1 rounded-full bg-mint-400" /> 2 slots
            </span>
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-lg border border-brand-500/30 bg-brand-500/10 py-1.5 text-[10px] font-semibold text-brand-200"
          >
            Request a session
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[rgba(242,149,89,0.18)] bg-ink-800/70 p-3.5">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-ash">
                <CalendarClock className="h-3 w-3" /> Next session
              </p>
              <span className="rounded bg-azure-500/10 px-1.5 py-0.5 text-[7.5px] font-medium text-azure-300">
                Online
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium leading-snug text-cream">Portfolio review & feedback</p>
            <p className="mt-0.5 text-[9px] text-ash">Date to be announced · 45 min</p>
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[7px] font-bold text-cream">
                SN
              </span>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[7px] font-bold text-cream">
                AN
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-[8px] text-mint-300">
                <Video className="h-2.5 w-2.5" /> Join link
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(242,149,89,0.18)] bg-ink-800/70 p-3.5">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-ash">
                <GraduationCap className="h-3 w-3" /> Career talk
              </p>
              <span className="rounded bg-brand-500/10 px-1.5 py-0.5 text-[7.5px] font-medium text-brand-300">
                Group
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium leading-snug text-cream">Designing work worth reviewing</p>
            <p className="mt-0.5 text-[9px] text-ash">Date to be announced · 30 seats</p>
            <div className="mt-2.5 flex items-center gap-1">
              {[0, 1, 2, 3].map((index) => (
                <span key={index} className="h-4 w-4 rounded-full border border-ink-800 bg-gradient-to-br from-brand-400 to-azure-500" />
              ))}
              <span className="ml-1 text-[8px] text-ash">+26 registered</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[rgba(242,149,89,0.18)] bg-ink-800/70 p-3.5">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-ash">
              <BookOpen className="h-3 w-3" /> Knowledge Vault
            </p>
            <span className="text-[8px] text-brand-300">Approved resources</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {resources.map((resource) => (
              <div key={resource.title} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-ink-900/60 px-2 py-1.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-500/10 text-brand-300">
                  <resource.icon className="h-3 w-3" />
                </span>
                <p className="min-w-0 flex-1 truncate text-[9.5px] text-cream">{resource.title}</p>
                <span className="shrink-0 text-[7.5px] uppercase tracking-wide text-ash">{resource.type}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[7.5px] leading-snug text-ash">
            AI Alumni Twin is a future capability: an assistant answering only from alumni-approved resources —
            never a stand-in for the alumnus.
          </p>
        </div>
      </div>
    </div>
  )
}
