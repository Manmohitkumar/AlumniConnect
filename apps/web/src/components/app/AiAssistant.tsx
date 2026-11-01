import { useState, type FormEvent } from 'react'
import {
  Bot,
  Compass,
  Lightbulb,
  LifeBuoy,
  Search,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import { apiGet, apiPost } from '../../lib/apiClient'
import { formatDate } from '../../lib/format'
import { useApi } from '../../lib/useApi'
import { Badge, Btn, Card, EmptyState, ErrorNote, Loading, Progress, SectionHeading } from './ui'

type MentorMatch = {
  id: string
  name: string
  headline: string | null
  avatarUrl: string | null
  location: string | null
  score: number
  reasons: string[]
  alumniProfile: {
    company: string | null
    designation: string | null
    industry: string | null
    graduationYear: number | null
    yearsExperience: number | null
    languages: string | null
    country: string | null
    timezone: string | null
    university: { id: string; name: string; country: string | null } | null
  } | null
}

type ChallengeMatch = {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  durationDays: number
  isPaid: boolean
  deadline: string | null
  authorName: string
  skills: string[]
  joined: boolean
  score: number
  reasons: string[]
}

type SearchGroup = {
  type: 'challenge' | 'mentor' | 'resource' | 'event' | 'opportunity'
  items: Array<{ id: string; title: string; snippet: string; meta: string; href: string; score: number }>
}

type Guidance = {
  strengths: string[]
  gaps: string[]
  suggestions: string[]
  checklist: Array<{ item: string; ok: boolean }>
}

type SupportAnswer = {
  matched: boolean
  answer: string
  sources: Array<{ id: string; title: string; href: string }>
  suggestedHref: string
}

const GROUP_LABEL: Record<SearchGroup['type'], string> = {
  challenge: 'Challenges',
  mentor: 'Mentors',
  resource: 'Knowledge',
  event: 'Events',
  opportunity: 'Opportunities',
}

function MatchScore({ score }: { score: number }) {
  return (
    <div className="w-24 shrink-0">
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-ash">
        <span>Match</span>
        <span className="text-cream">{score}</span>
      </div>
      <Progress value={score} />
    </div>
  )
}

export function AiAssistant({ role }: { role: 'STUDENT' | 'ALUMNI' }) {
  const mentors = useApi<{ data: MentorMatch[]; meta: { provider: string } }>('/ai/mentors/matches')
  const challenges = useApi<{ data: ChallengeMatch[]; meta: { provider: string } }>('/ai/challenges/matches')

  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<SearchGroup[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [project, setProject] = useState({ title: '', summary: '', skills: '', url: '' })
  const [guidance, setGuidance] = useState<Guidance | null>(null)
  const [guidanceBusy, setGuidanceBusy] = useState(false)
  const [guidanceError, setGuidanceError] = useState<string | null>(null)

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<SupportAnswer | null>(null)
  const [askBusy, setAskBusy] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)

  const provider = mentors.data?.meta.provider ?? challenges.data?.meta.provider ?? 'local'

  async function runSearch(event: FormEvent) {
    event.preventDefault()
    if (query.trim().length < 2) return
    setSearching(true)
    setSearchError(null)
    try {
      const result = await apiGet<{ data: SearchGroup[] }>(`/ai/search?q=${encodeURIComponent(query.trim())}`)
      setGroups(result.data)
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function runGuidance(event: FormEvent) {
    event.preventDefault()
    setGuidanceBusy(true)
    setGuidanceError(null)
    try {
      const result = await apiPost<{ data: Guidance }>('/ai/portfolio/guidance', {
        title: project.title,
        summary: project.summary,
        skills: project.skills || undefined,
        url: project.url || undefined,
      })
      setGuidance(result.data)
    } catch (error) {
      setGuidanceError(error instanceof Error ? error.message : 'Guidance request failed')
    } finally {
      setGuidanceBusy(false)
    }
  }

  async function askHelp(event: FormEvent) {
    event.preventDefault()
    if (question.trim().length < 3) return
    setAskBusy(true)
    setAskError(null)
    try {
      const result = await apiPost<{ data: SupportAnswer }>('/ai/support/ask', { question: question.trim() })
      setAnswer(result.data)
    } catch (error) {
      setAskError(error instanceof Error ? error.message : 'Assistant is unavailable')
    } finally {
      setAskBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card className="border-brand-500/25 bg-gradient-to-br from-brand-500/10 via-ink-800/70 to-ink-900/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-ink-950">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-cream">AI assistant</h2>
              <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-mist">
                Recommendations and guidance derived from your profile and published platform content. Scores are advisory,
                deterministic and never decide an evaluation on their own.
              </p>
            </div>
          </div>
          <Badge tone={provider === 'openai' ? 'azure' : 'neutral'}>
            {provider === 'openai' ? 'External AI configured' : 'Local engine'}
          </Badge>
        </div>
      </Card>

      <section>
        <SectionHeading
          title="Recommended mentors"
          hint="Matched on skills, interests, industry and shared mentorship languages."
          action={<Users className="h-4 w-4 text-ash" />}
        />
        {mentors.loading && <Loading rows={2} />}
        {mentors.error && <ErrorNote message={mentors.error} onRetry={mentors.reload} />}
        {!mentors.loading && !mentors.error && (mentors.data?.data.length ?? 0) === 0 && (
          <EmptyState
            title="No open mentors yet"
            hint="Alumni who enable mentorship will appear here with a transparent match score."
            icon={<Users className="h-5 w-5" />}
          />
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {(mentors.data?.data ?? []).map((mentor) => (
            <Card key={mentor.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-[15px] font-semibold text-cream">{mentor.name}</p>
                <p className="truncate text-[12px] text-mist">
                  {[mentor.alumniProfile?.designation, mentor.alumniProfile?.company].filter(Boolean).join(' · ') || mentor.headline || 'Alumni mentor'}
                </p>
                <p className="mt-1 text-[11px] text-ash">
                  {[mentor.alumniProfile?.university?.name, mentor.alumniProfile?.country, mentor.alumniProfile?.timezone].filter(Boolean).join(' · ')}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {mentor.reasons.slice(0, 3).map((reason) => (
                    <span key={reason} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-mist">
                      {reason}
                    </span>
                  ))}
                </div>
                <a
                  href={role === 'STUDENT' ? '/student/dashboard?tab=mentorship' : '/alumni/dashboard?tab=discovery'}
                  className="mt-3 inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline"
                >
                  {role === 'STUDENT' ? 'Request mentorship' : 'View mentor network'}
                </a>
              </div>
              <MatchScore score={mentor.score} />
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Challenges for you"
          hint="Open challenges that overlap your skills. Challenges you have already submitted to are hidden."
          action={<Target className="h-4 w-4 text-ash" />}
        />
        {challenges.loading && <Loading rows={2} />}
        {challenges.error && <ErrorNote message={challenges.error} onRetry={challenges.reload} />}
        {!challenges.loading && !challenges.error && (challenges.data?.data.length ?? 0) === 0 && (
          <EmptyState title="No matching challenges" hint="New challenges appear as alumni publish them." icon={<Target className="h-5 w-5" />} />
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {(challenges.data?.data ?? []).map((challenge) => (
            <Card key={challenge.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-[15px] font-semibold text-cream">{challenge.title}</p>
                <p className="mt-0.5 text-[11px] text-ash">
                  {challenge.category} · {challenge.durationDays} days · {challenge.authorName}
                  {challenge.deadline ? ` · closes ${formatDate(challenge.deadline)}` : ''}
                </p>
                <p className="mt-1 line-clamp-2 text-[12px] text-mist">{challenge.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {challenge.reasons.slice(0, 3).map((reason) => (
                    <span key={reason} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-mist">
                      {reason}
                    </span>
                  ))}
                </div>
                <a
                  href={`/challenges/${challenge.slug}`}
                  className="mt-3 inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline"
                >
                  {challenge.joined ? 'Continue' : 'View challenge'}
                </a>
              </div>
              <MatchScore score={challenge.score} />
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Search everything" hint="Challenges, mentors, knowledge, events and opportunities in one query." action={<Search className="h-4 w-4 text-ash" />} />
        <form onSubmit={runSearch} className="mb-4 flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try “data engineering”, “design systems”, “remote internship”"
            aria-label="Search challenges, mentors, knowledge, events and opportunities"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-900/70 px-4 py-2.5 text-[13px] text-cream placeholder:text-ash focus:border-brand-500/50 focus:outline-none"
          />
          <Btn type="submit" disabled={searching || query.trim().length < 2}>
            {searching ? 'Searching…' : 'Search'}
          </Btn>
        </form>
        {searchError && <ErrorNote message={searchError} />}
        {groups && groups.length === 0 && (
          <EmptyState title="No results" hint="Try broader terms such as an industry, skill or event category." icon={<Search className="h-5 w-5" />} />
        )}
        <div className="space-y-4">
          {(groups ?? []).map((group) => (
            <div key={group.type}>
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ash">{GROUP_LABEL[group.type]}</p>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <a key={`${group.type}-${item.id}`} href={item.href} className="block rounded-xl border border-white/10 bg-ink-800/60 p-3 transition hover:border-brand-500/40">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] font-semibold text-cream">{item.title}</p>
                      <span className="text-[10px] text-ash">{item.score}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-mist">{item.snippet}</p>
                    {item.meta && <p className="mt-1 text-[10.5px] text-ash">{item.meta}</p>}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div>
          <SectionHeading title="Portfolio guidance" hint="Feedback on presentation and evidence — nothing is published automatically." action={<Lightbulb className="h-4 w-4 text-ash" />} />
          <form onSubmit={runGuidance} className="space-y-2">
            <input
              value={project.title}
              onChange={(event) => setProject({ ...project, title: event.target.value })}
              placeholder="Project title"
              aria-label="Project title"
              required
              className="w-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-2.5 text-[13px] text-cream placeholder:text-ash focus:border-brand-500/50 focus:outline-none"
            />
            <textarea
              value={project.summary}
              onChange={(event) => setProject({ ...project, summary: event.target.value })}
              placeholder="What problem did you solve, what did you build, and what changed?"
              aria-label="Project summary"
              rows={4}
              required
              className="w-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-2.5 text-[13px] text-cream placeholder:text-ash focus:border-brand-500/50 focus:outline-none"
            />
            <input
              value={project.skills}
              onChange={(event) => setProject({ ...project, skills: event.target.value })}
              placeholder="Skills (comma separated)"
              aria-label="Project skills"
              className="w-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-2.5 text-[13px] text-cream placeholder:text-ash focus:border-brand-500/50 focus:outline-none"
            />
            <input
              value={project.url}
              onChange={(event) => setProject({ ...project, url: event.target.value })}
              placeholder="Repository or demo link"
              aria-label="Repository or demo link"
              className="w-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-2.5 text-[13px] text-cream placeholder:text-ash focus:border-brand-500/50 focus:outline-none"
            />
            <Btn type="submit" disabled={guidanceBusy}>
              {guidanceBusy ? 'Reviewing…' : 'Review my project'}
            </Btn>
          </form>
          {guidanceError && <div className="mt-3"><ErrorNote message={guidanceError} /></div>}
          {guidance && (
            <div className="mt-4 space-y-3">
              {guidance.strengths.length > 0 && (
                <Card>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-mint-300">Strengths</p>
                  <ul className="mt-2 space-y-1 text-[12px] text-mist">
                    {guidance.strengths.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </Card>
              )}
              <Card>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand-300">Improve next</p>
                <ul className="mt-2 space-y-1 text-[12px] text-mist">
                  {[...guidance.gaps, ...guidance.suggestions].map((item) => <li key={item}>• {item}</li>)}
                </ul>
                <div className="mt-3 space-y-1.5">
                  {guidance.checklist.map((item) => (
                    <p key={item.item} className="flex items-center gap-2 text-[11.5px] text-mist">
                      <span className={item.ok ? 'text-mint-300' : 'text-amber-300'}>{item.ok ? '✓' : '○'}</span>
                      {item.item}
                    </p>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>

        <div>
          <SectionHeading title="Ask the help assistant" hint="Answers only from published help content. Account-specific issues go to support." action={<LifeBuoy className="h-4 w-4 text-ash" />} />
          <form onSubmit={askHelp} className="mb-3 flex flex-wrap gap-2">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="e.g. How do I request verification?"
              aria-label="Ask the help assistant"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-900/70 px-4 py-2.5 text-[13px] text-cream placeholder:text-ash focus:border-brand-500/50 focus:outline-none"
            />
            <Btn type="submit" disabled={askBusy || question.trim().length < 3}>
              {askBusy ? 'Checking…' : 'Ask'}
            </Btn>
          </form>
          {askError && <ErrorNote message={askError} />}
          {answer && (
            <Card>
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-brand-300" />
                <Badge tone={answer.matched ? 'mint' : 'warning'}>{answer.matched ? 'Grounded answer' : 'Needs a human'}</Badge>
              </div>
              <p className="mt-3 whitespace-pre-line text-[12.5px] leading-relaxed text-mist">{answer.answer}</p>
              {answer.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {answer.sources.map((source) => (
                    <a key={source.id} href={source.href} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10.5px] text-mist hover:text-cream">
                      {source.title}
                    </a>
                  ))}
                </div>
              )}
              <a href={answer.suggestedHref} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">
                <Sparkles className="h-3 w-3" /> Open related page
              </a>
            </Card>
          )}
        </div>
      </section>
    </div>
  )
}
