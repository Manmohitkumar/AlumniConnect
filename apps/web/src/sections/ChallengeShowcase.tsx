import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Clock, Filter, Target, Users } from 'lucide-react'
import { Modal } from '../components/Modal'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { demoChallenges } from '../data/content'
import { fetchChallenges, type ChallengeCard } from '../lib/api'

type Challenge = ChallengeCard
type ApiState = 'connecting' | 'live' | 'offline'

const filters = ['All', 'Data', 'Web app', 'Design'] as const

const toneMap: Record<string, string> = {
  azure: 'from-azure-500/20',
  brand: 'from-brand-500/20',
  mint: 'from-mint-400/20',
}

export function ChallengeShowcase() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const [selected, setSelected] = useState<Challenge | null>(null)
  const [remote, setRemote] = useState<ChallengeCard[] | null>(null)
  const [apiState, setApiState] = useState<ApiState>('connecting')

  // Live read from the local Express API. Falls back to static sample cards
  // when the API is not running, so the page never depends on the backend.
  useEffect(() => {
    const controller = new AbortController()

    fetchChallenges(controller.signal).then((result) => {
      if (controller.signal.aborted) return
      if (result.ok && result.items.length > 0) {
        setRemote(result.items)
        setApiState('live')
        return
      }
      setApiState('offline')
    })

    return () => controller.abort()
  }, [])

  const list = remote ?? demoChallenges

  const visible = useMemo(
    () => (filter === 'All' ? list : list.filter((challenge) => challenge.category === filter)),
    [filter, list],
  )

  const statusCopy =
    apiState === 'live'
      ? 'Live local API · seeded demo data'
      : apiState === 'connecting'
        ? 'Connecting to local API…'
        : 'API offline · showing sample challenges'

  return (
    <section id="challenges" className="section-pad relative">
      <div className="shell">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <SectionHeading
              eyebrow="Alumni Challenge Hub"
              title={
                <>
                  Real industry problems.
                  <br />
                  Built into <span className="gradient-text">student opportunities.</span>
                </>
              }
              description="Alumni bring challenges from their professional experience, while students gain practical opportunities to demonstrate their knowledge and creativity."
            />
          </Reveal>

          <Reveal delay={80}>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter sample challenges">
              <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] text-ash">
                <Filter className="h-3.5 w-3.5" /> Filter
              </span>
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  aria-pressed={filter === item}
                  className={`rounded-xl border px-3 py-1.5 text-[11.5px] font-medium transition ${
                    filter === item
                      ? 'border-brand-500/60 bg-brand-500/15 text-cream'
                      : 'border-[rgba(242,149,89,0.15)] bg-white/[0.02] text-mist hover:border-brand-500/40 hover:text-cream'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="demo-note">
            <span
              className={`h-1 w-1 rounded-full ${
                apiState === 'live'
                  ? 'bg-mint-400'
                  : apiState === 'connecting'
                    ? 'bg-azure-400 animate-pulse-soft'
                    : 'bg-amber-400'
              }`}
            />
            {statusCopy}
          </span>
          {apiState === 'live' && (
            <span className="text-[10px] text-ash">
              {visible.length} record{visible.length === 1 ? '' : 's'} served from SQLite
            </span>
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((challenge, index) => (
            <Reveal key={challenge.title} delay={index * 60}>
              <button
                type="button"
                onClick={() => setSelected(challenge)}
                className="card card-hover group flex h-full w-full flex-col p-5 text-left"
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${toneMap[challenge.tone]} to-transparent blur-2xl`}
                />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="chip !text-[10px]">{challenge.category}</span>
                    {challenge.paid !== undefined && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[8.5px] font-semibold ${
                          challenge.paid ? 'bg-mint-400/10 text-mint-300' : 'bg-ink-950/55 text-ash'
                        }`}
                      >
                        {challenge.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    )}
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-ash transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-300" />
                </div>

                <h3 className="relative mt-4 text-[15.5px] font-semibold leading-snug">{challenge.title}</h3>

                <div className="relative mt-3 flex flex-wrap gap-1.5">
                  {challenge.skills.map((skill) => (
                    <span key={skill} className="chip !text-[9.5px]">
                      {skill}
                    </span>
                  ))}
                </div>

                <p className="relative mt-3 line-clamp-2 text-[11.5px] leading-relaxed text-ash">
                  Deliverables: {challenge.deliverables}
                </p>

                <div className="relative mt-auto flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] text-mist">
                    <Clock className="h-3 w-3 text-brand-300" /> {challenge.days} days
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] text-mist">
                    <Users className="h-3 w-3 text-mint-300" /> {challenge.submissions} entries
                  </span>
                </div>
              </button>
            </Reveal>
          ))}
        </div>

        <Reveal delay={100}>
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            <p className="text-[11px] leading-relaxed text-ash">
              Paid and unpaid tasks are labelled before work begins. In the MVP, agreed scope and completion are
              recorded; money transfers are intentionally outside the platform.
            </p>
          </div>
        </Reveal>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ''}
        subtitle="Sample challenge · demonstration only"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <span className="chip">{selected.category}</span>
              {selected.paid !== undefined && (
                <span className={`chip ${selected.paid ? '!border-mint-400/30 !text-mint-300' : ''}`}>
                  {selected.paid ? 'Paid task' : 'Unpaid · appreciation'}
                </span>
              )}
              {selected.skills.map((skill) => (
                <span key={skill} className="chip">
                  {skill}
                </span>
              ))}
            </div>

            <p className="text-[13px] leading-relaxed text-mist">
              {selected.summary ??
                'A scoped, real-world problem posted by a verified alumnus. Students can participate individually or as a team, submit work before the deadline, and receive rubric-based feedback from the alumnus who posted it.'}
            </p>

            <dl className="grid gap-2 sm:grid-cols-2">
              {[
                { term: 'Deliverables', detail: selected.deliverables },
                { term: 'Deadline', detail: `${selected.days} days from publishing` },
                { term: 'Submissions', detail: `${selected.submissions} sample entries` },
                { term: 'Evaluation', detail: 'Published rubric, challenge-specific ranking' },
              ].map((row) => (
                <div key={row.term} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                  <dt className="text-[9.5px] uppercase tracking-[0.12em] text-ash">{row.term}</dt>
                  <dd className="mt-1 text-[11.5px] text-cream">{row.detail}</dd>
                </div>
              ))}
            </dl>

            <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.07] p-3">
              <p className="text-[11px] leading-relaxed text-mist">
                Participating requires a student account. This marketing preview does not accept submissions or
                store files.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <a href="/login" className="btn-primary flex-1 !py-2.5 !text-[12.5px]">
                Sign in to participate
              </a>
              <a href="/register" className="btn-secondary flex-1 !py-2.5 !text-[12.5px]">
                Create an account
              </a>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
