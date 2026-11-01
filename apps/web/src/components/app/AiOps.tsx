import { useState } from 'react'
import { BellRing, Brain, ShieldCheck } from 'lucide-react'
import { apiPost } from '../../lib/apiClient'
import { useApi } from '../../lib/useApi'
import { Badge, Btn, Card, ErrorNote, Loading, SectionHeading } from './ui'

type Insight = { tone: 'info' | 'action' | 'risk'; text: string; href?: string }

type InsightsPayload = {
  data: {
    scope: string
    university: { id: string; name: string; country: string | null; region: string | null; defaultLocale: string | null; timeZone: string | null } | null
    metrics: Record<string, unknown>
    insights: Insight[]
    generatedAt: string
  }
  meta: { provider: string; note: string }
}

export function UniversityInsightsPanel({ universityId }: { universityId?: string }) {
  const insights = useApi<InsightsPayload>(`/ai/university/insights${universityId ? `?universityId=${encodeURIComponent(universityId)}` : ''}`)

  return (
    <div className="space-y-5">
      <SectionHeading
        title="AI insights"
        hint="Counts are read directly from the database. Suggestions are rule-based advice, not predictions."
        action={<Badge tone={insights.data?.meta.provider === 'openai' ? 'azure' : 'neutral'}>{insights.data?.meta.provider === 'openai' ? 'External AI' : 'Local engine'}</Badge>}
      />
      {insights.loading && <Loading rows={2} />}
      {insights.error && <ErrorNote message={insights.error} onRetry={insights.reload} />}
      {insights.data && (
        <>
          {insights.data.data.university && (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-[15px] font-semibold text-cream">{insights.data.data.university.name}</p>
                  <p className="text-[11.5px] text-ash">
                    {[insights.data.data.university.country, insights.data.data.university.region, insights.data.data.university.timeZone]
                      .filter(Boolean)
                      .join(' · ') || 'No region configured'}
                  </p>
                </div>
                <Badge tone="neutral">{insights.data.data.university.defaultLocale ?? 'en'}</Badge>
              </div>
            </Card>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {insights.data.data.insights.map((insight) => (
              <Card key={insight.text} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                    insight.tone === 'risk'
                      ? 'bg-rose-500/15 text-rose-300'
                      : insight.tone === 'action'
                        ? 'bg-brand-500/15 text-brand-200'
                        : 'bg-mint-500/15 text-mint-300'
                  }`}
                >
                  <Brain className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[12.5px] leading-relaxed text-mist">{insight.text}</p>
                  {insight.href && (
                    <a href={insight.href} className="mt-1 inline-block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">
                      Open
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <p className="text-[10.5px] text-ash">{insights.data.meta.note}</p>
        </>
      )}
    </div>
  )
}

type Status = {
  provider: 'local' | 'openai'
  externalEnabled: boolean
  model: string | null
  privacy: string
  usage: { localRequests: number; externalCalls: number; externalFailures: number; startedAt: string }
}

export function AdminAiPanel() {
  const status = useApi<{ data: Status }>('/ai/status')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runReminders() {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const response = await apiPost<{ data: { sent: number; skippedDuplicates: number; scanned: { sessions: number; events: number; challenges: number } } }>(
        '/ai/reminders/run',
      )
      setResult(
        `Sent ${response.data.sent} reminder${response.data.sent === 1 ? '' : 's'} · skipped ${response.data.skippedDuplicates} duplicate${
          response.data.skippedDuplicates === 1 ? '' : 's'
        } · scanned ${response.data.scanned.sessions} sessions, ${response.data.scanned.events} events, ${response.data.scanned.challenges} challenges.`,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Reminder run failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="AI operations"
        hint="Provider configuration, usage counters, institutional insights and reminder automation."
        action={<ShieldCheck className="h-4 w-4 text-ash" />}
      />
      {status.loading && <Loading rows={1} />}
      {status.error && <ErrorNote message={status.error} onRetry={status.reload} />}
      {status.data && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ash">Provider</p>
              <p className="font-display text-lg font-semibold text-cream">{status.data.data.provider === 'openai' ? status.data.data.model ?? 'OpenAI-compatible' : 'Local deterministic engine'}</p>
            </div>
            <Badge tone={status.data.data.externalEnabled ? 'azure' : 'mint'}>{status.data.data.externalEnabled ? 'External enabled' : 'No external calls'}</Badge>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-mist">{status.data.data.privacy}</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-ash">Requests</p>
              <p className="font-display text-lg text-cream">{status.data.data.usage.localRequests}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-ash">External calls</p>
              <p className="font-display text-lg text-cream">{status.data.data.usage.externalCalls}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-ash">External failures</p>
              <p className="font-display text-lg text-cream">{status.data.data.usage.externalFailures}</p>
            </div>
          </div>
          <p className="mt-2 text-[10.5px] text-ash">Counters reset when the API restarts. They are operational telemetry, not billing records.</p>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-[15px] font-semibold text-cream">Automation reminders</p>
            <p className="text-[12px] text-mist">Sends deduplicated reminders for mentorship sessions (24h), events (48h) and challenge deadlines (72h).</p>
          </div>
          <Btn onClick={() => void runReminders()} disabled={running}>
            <BellRing className="h-4 w-4" /> {running ? 'Running…' : 'Run now'}
          </Btn>
        </div>
        {error && <div className="mt-3"><ErrorNote message={error} /></div>}
        {result && <p className="mt-3 rounded-xl border border-mint-500/25 bg-mint-500/10 px-3 py-2 text-[12px] text-mint-200">{result}</p>}
      </Card>

      <UniversityInsightsPanel />
    </div>
  )
}
