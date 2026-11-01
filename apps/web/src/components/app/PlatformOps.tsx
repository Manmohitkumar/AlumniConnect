import { useState } from 'react'
import { Activity, Database, KeyRound, LifeBuoy, ShieldCheck, Trash2, Webhook } from 'lucide-react'
import { apiDelete, apiPatch, apiPost } from '../../lib/apiClient'
import { formatDateTime } from '../../lib/format'
import { useAction, useApi } from '../../lib/useApi'
import { Badge, Btn, Card, ErrorNote, Field, Loading, SectionHeading, fieldClass } from './ui'

type OpsStatus = {
  data: {
    service: { status: string; uptimeSeconds: number; nodeEnv: string }
    database: { ok: boolean; latencyMs: number }
    runtime: { memoryUsedMb: number; heapUsedMb: number }
    ai: { provider: string; externalEnabled: boolean; usage: { localRequests: number; externalCalls: number; externalFailures: number } }
    backup: { latestManifestAgeHours: number | null }
    queues: { openFeedback: number; pendingDataRequests: number; upcomingSessions: number }
    activity: { activeUsers7d: number; notifications7d: number; auditEvents7d: number }
    warnings: string[]
    generatedAt: string
  }
}

type ApiKeyRow = { id: string; name: string; keyPrefix: string; scopes: string; lastUsedAt: string | null; revokedAt: string | null; createdAt: string; createdBy: { name: string } }

type DataRequestRow = {
  id: string
  type: string
  status: string
  note: string | null
  response: string | null
  createdAt: string
  user: { name: string; email: string; role: string }
}

type GovernanceSummary = {
  data: {
    dataRequests: { byStatus: Record<string, number>; byType: Record<string, number> }
    safeguards: { openSupportReports: number; suspendedAccounts: number; lastAuditEvent: { action: string; createdAt: string } | null }
    policies: Array<{ key: string; title: string; detail: string }>
  }
}

export function ReliabilityPanel() {
  const status = useApi<OpsStatus>('/ops/status')
  if (status.loading) return <Loading rows={4} label="Checking platform health" />
  if (status.error) return <ErrorNote message={status.error} onRetry={status.reload} />
  if (!status.data) return null
  const data = status.data.data
  const tone = data.service.status === 'healthy' ? 'mint' : 'danger'

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Reliability"
        hint="Live checks from the API process: database latency, queues, AI usage and backup freshness."
        action={<Badge tone={tone}>{data.service.status}</Badge>}
      />
      {data.warnings.length > 0 && (
        <Card className="border-rose-400/30">
          <ul className="space-y-1 text-[12.5px] text-rose-200">
            {data.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Database className="h-4 w-4" />} label="Database" value={data.database.ok ? `${data.database.latencyMs} ms` : 'down'} hint="SELECT 1 latency" />
        <Metric icon={<Activity className="h-4 w-4" />} label="Uptime" value={`${Math.floor(data.service.uptimeSeconds / 3600)}h`} hint={`${data.service.nodeEnv} · ${data.runtime.memoryUsedMb} MB RSS`} />
        <Metric icon={<LifeBuoy className="h-4 w-4" />} label="Open support" value={String(data.queues.openFeedback)} hint={`${data.queues.upcomingSessions} upcoming sessions`} />
        <Metric icon={<ShieldCheck className="h-4 w-4" />} label="Backup" value={data.backup.latestManifestAgeHours === null ? 'none' : `${data.backup.latestManifestAgeHours}h`} hint="Manifest age on this machine" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <SectionHeading title="AI provider" hint="External calls stay disabled unless configured." />
          <p className="text-[13px] text-cream">{data.ai.provider === 'openai' ? 'OpenAI-compatible provider' : 'Local deterministic engine'}</p>
          <p className="mt-1 text-[11.5px] text-mist">
            {data.ai.usage.localRequests} local requests · {data.ai.usage.externalCalls} external calls · {data.ai.usage.externalFailures} failures
          </p>
        </Card>
        <Card>
          <SectionHeading title="Last 7 days" hint="Operational activity counts." />
          <p className="text-[13px] text-cream">{data.activity.activeUsers7d} active accounts</p>
          <p className="mt-1 text-[11.5px] text-mist">
            {data.activity.notifications7d} notifications · {data.activity.auditEvents7d} audit events
          </p>
        </Card>
      </div>
      <p className="text-[10.5px] text-ash">Generated {formatDateTime(data.generatedAt)}. Counters reset when the API restarts.</p>
    </div>
  )
}

function Metric({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-ash">
        {icon}
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em]">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-cream">{value}</p>
      <p className="mt-1 text-[10.5px] text-ash">{hint}</p>
    </Card>
  )
}

export function GovernancePanel() {
  const summary = useApi<GovernanceSummary>('/governance/admin/summary')
  const requests = useApi<{ data: DataRequestRow[] }>('/governance/admin/data-requests?pageSize=50')
  const keys = useApi<{ data: ApiKeyRow[] }>('/developer/keys')
  const action = useAction()
  const [keyName, setKeyName] = useState('')
  const [issuedKey, setIssuedKey] = useState<string | null>(null)
  const [response, setResponse] = useState<Record<string, string>>({})

  const createKey = async () => {
    const result = await action.run(
      () => apiPost<{ data: ApiKeyRow & { key: string } }>('/developer/keys', { name: keyName, scopes: ['read'] }),
      'API key created.',
    )
    if (result) {
      setIssuedKey(result.data.key)
      setKeyName('')
      keys.reload()
    }
  }

  const revokeKey = async (id: string) => {
    const result = await action.run(() => apiDelete(`/developer/keys/${id}`), 'Key revoked.')
    if (result) keys.reload()
  }

  const review = async (row: DataRequestRow, status: string) => {
    const result = await action.run(
      () => apiPatch(`/governance/admin/data-requests/${row.id}`, { status, response: response[row.id] || undefined }),
      'Request updated and the account holder notified.',
    )
    if (result) requests.reload()
  }

  return (
    <div className="space-y-5">
      <SectionHeading title="Governance" hint="Data-rights queue, published safeguards and developer API keys." action={<ShieldCheck className="h-4 w-4 text-ash" />} />
      {action.error && <ErrorNote message={action.error} />}
      {action.success && <p className="rounded-xl border border-mint-500/25 bg-mint-500/10 px-3 py-2 text-[12px] text-mint-200">{action.success}</p>}

      {summary.data && (
        <div className="grid gap-3 md:grid-cols-3">
          <Metric icon={<LifeBuoy className="h-4 w-4" />} label="Data requests" value={String(summary.data.data.dataRequests.byStatus.OPEN ?? 0)} hint={`${summary.data.data.dataRequests.byStatus.COMPLETED ?? 0} completed`} />
          <Metric icon={<Activity className="h-4 w-4" />} label="Open support" value={String(summary.data.data.safeguards.openSupportReports)} hint="Reports awaiting resolution" />
          <Metric icon={<ShieldCheck className="h-4 w-4" />} label="Suspended" value={String(summary.data.data.safeguards.suspendedAccounts)} hint="Accounts under review" />
        </div>
      )}

      <Card>
        <SectionHeading title="Data-rights requests" hint="Open requests first. A response is sent to the account holder as a notification." />
        {requests.loading && <Loading rows={2} />}
        {requests.data?.data.length === 0 && <p className="text-[12px] text-mist">No requests yet. Users can file them from their profile settings.</p>}
        <div className="space-y-2">
          {requests.data?.data.map((row) => (
            <div key={row.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[12.5px] font-semibold text-cream">
                    {row.type} · {row.user.name} <span className="text-ash">({row.user.role})</span>
                  </p>
                  <p className="text-[10.5px] text-ash">Filed {formatDateTime(row.createdAt)} · {row.status}</p>
                  {row.note && <p className="mt-1 text-[11px] text-mist">{row.note}</p>}
                </div>
                <Badge tone={row.status === 'COMPLETED' ? 'mint' : row.status === 'REJECTED' ? 'danger' : 'neutral'}>{row.status}</Badge>
              </div>
              {row.status !== 'COMPLETED' && row.status !== 'REJECTED' && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    className={`${fieldClass} min-w-48 flex-1`}
                    placeholder="Response to the account holder (optional)"
                    value={response[row.id] ?? ''}
                    onChange={(event) => setResponse({ ...response, [row.id]: event.target.value })}
                  />
                  <Btn size="sm" variant="secondary" onClick={() => void review(row, 'IN_REVIEW')}>In review</Btn>
                  <Btn size="sm" onClick={() => void review(row, 'COMPLETED')}>Complete</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => void review(row, 'REJECTED')}>Reject</Btn>
                </div>
              )}
              {row.response && <p className="mt-2 text-[11px] text-mint-200">{row.response}</p>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading title="Developer API keys" hint="Read-only keys for /api/v1/public. Raw values are shown once." action={<KeyRound className="h-4 w-4 text-ash" />} />        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-52 flex-1">
            <Field label="Key name"><input className={fieldClass} value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="Analytics integration" /></Field>
          </div>
          <Btn disabled={action.pending || keyName.trim().length < 3} onClick={() => void createKey()}>Create read-only key</Btn>
        </div>
        {issuedKey && (
          <div className="mt-3 rounded-xl border border-brand-500/30 bg-brand-500/10 p-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-brand-200">Copy now — shown once</p>
            <code className="mt-1 block break-all text-[11.5px] text-cream">{issuedKey}</code>
          </div>
        )}
        <div className="mt-3 space-y-2">
          {keys.data?.data.map((key) => (
            <div key={key.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div>
                <p className="text-[12.5px] text-cream">{key.name} <span className="text-ash">· {key.keyPrefix}…</span></p>
                <p className="text-[10.5px] text-ash">
                  {key.revokedAt ? 'Revoked' : key.lastUsedAt ? `Last used ${formatDateTime(key.lastUsedAt)}` : 'Never used'} · created {formatDateTime(key.createdAt)}
                </p>
              </div>
              {!key.revokedAt && (
                <Btn size="sm" variant="ghost" onClick={() => void revokeKey(key.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Revoke
                </Btn>
              )}
            </div>
          ))}
        </div>
      </Card>

      <WebhooksCard />

      <AiModerationCard />

      {summary.data && (
        <Card>
          <SectionHeading title="Published safeguards" hint="Short, factual descriptions of implemented controls." />
          <ul className="space-y-2">
            {summary.data.data.policies.map((policy) => (
              <li key={policy.key} className="text-[12px] text-mist">
                <span className="font-semibold text-cream">{policy.title}: </span>
                {policy.detail}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

type WebhookDeliveryRow = {
  id: string
  event: string
  status: string
  attempts: number
  responseCode: number | null
  error: string | null
  createdAt: string
}

type WebhookRow = {
  id: string
  name: string
  url: string
  events: string
  status: string
  createdAt: string
  deliveries: WebhookDeliveryRow[]
}

function WebhooksCard() {
  const hooks = useApi<{ data: WebhookRow[] }>('/developer/webhooks')
  const action = useAction()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [issuedSecret, setIssuedSecret] = useState<string | null>(null)

  const create = async () => {
    const result = await action.run(
      () => apiPost<{ data: WebhookRow & { secret: string } }>('/developer/webhooks', { name, url }),
      'Webhook registered. Signing secret shown once.',
    )
    if (result) {
      setIssuedSecret(result.data.secret)
      setName('')
      setUrl('')
      hooks.reload()
    }
  }

  const test = async (id: string) => {
    const result = await action.run(() => apiPost(`/developer/webhooks/${id}/test`), 'Test delivery completed. Check the delivery log.')
    if (result) hooks.reload()
  }

  const remove = async (id: string) => {
    const result = await action.run(() => apiDelete(`/developer/webhooks/${id}`), 'Webhook deleted.')
    if (result) hooks.reload()
  }

  return (
    <Card>
      <SectionHeading
        title="Signed webhooks"
        hint="AlumniConnect signs each delivery with HMAC-SHA256 and retries failed deliveries up to three times. Secrets are encrypted at rest and never shown again."
        action={<Webhook className="h-4 w-4 text-ash" />}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Name"><input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="LMS sync" /></Field>
        <Field label="HTTPS endpoint"><input className={fieldClass} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://partner.example/hooks/alumni" /></Field>
      </div>
      <div className="mt-2 flex justify-end">
        <Btn disabled={action.pending || name.trim().length < 3 || !url.startsWith('http')} onClick={() => void create()}>Register webhook</Btn>
      </div>
      {issuedSecret && (
        <div className="mt-3 rounded-xl border border-brand-500/30 bg-brand-500/10 p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-brand-200">Signing secret — copy now</p>
          <code className="mt-1 block break-all text-[11.5px] text-cream">{issuedSecret}</code>
        </div>
      )}
      <div className="mt-3 space-y-2">
        {hooks.data?.data.length === 0 && <p className="text-[12px] text-mist">No webhooks registered.</p>}
        {hooks.data?.data.map((hook) => {
          const last = hook.deliveries[0]
          return (
            <div key={hook.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[12.5px] font-semibold text-cream">{hook.name}</p>
                  <p className="break-all text-[10.5px] text-ash">{hook.url} · {hook.events}</p>
                  <p className="text-[10.5px] text-ash">
                    {last ? `Last ${last.status.toLowerCase()} · ${formatDateTime(last.createdAt)}` : 'No deliveries yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Btn size="sm" variant="secondary" onClick={() => void test(hook.id)} disabled={action.pending}>Send test</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => void remove(hook.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Btn>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

type AiOverview = {
  enabledAssistants: number
  pausedAssistants: number
  approvedSources: number
  conversations: number
  messagesLast7d: number
  flaggedOpen: number
  levels: Array<{ level: number; count: number }>
}

type FlaggedAiMessage = {
  id: string
  content: string
  createdAt: string
  alumni: { id: string; name: string }
  student: { id: string; name: string; role: string }
}

function AiModerationCard() {
  const overview = useApi<{ data: AiOverview }>('/alumni-ai/admin/overview')
  const flagged = useApi<{ data: FlaggedAiMessage[] }>('/alumni-ai/admin/flagged')
  const action = useAction()

  const review = async (id: string, verdict: 'RESOLVE' | 'DISMISS') => {
    const result = await action.run(() => apiPatch(`/alumni-ai/admin/flagged/${id}`, { action: verdict }), 'AI moderation decision recorded.')
    if (result) flagged.reload()
  }

  return (
    <Card>
      <SectionHeading
        title="AI representative moderation"
        hint="Flagged assistant messages waiting for review. Student emails are never included; decisions are audited."
        action={<ShieldCheck className="h-4 w-4 text-ash" />}
      />
      {action.error && <ErrorNote message={action.error} />}
      {overview.data && (
        <div className="mb-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {[
            ['Enabled', overview.data.data.enabledAssistants],
            ['Paused', overview.data.data.pausedAssistants],
            ['Approved sources', overview.data.data.approvedSources],
            ['Conversations', overview.data.data.conversations],
            ['Messages 7d', overview.data.data.messagesLast7d],
            ['Flagged open', overview.data.data.flaggedOpen],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
              <p className="text-[9.5px] uppercase tracking-[0.1em] text-ash">{label}</p>
              <p className="text-[15px] font-semibold text-cream">{String(value)}</p>
            </div>
          ))}
        </div>
      )}
      {flagged.loading && <Loading rows={2} label="Loading flagged messages" />}
      {flagged.data?.data.length === 0 && <p className="text-[12px] text-mist">No flagged AI responses awaiting review.</p>}
      <div className="space-y-2">
        {flagged.data?.data.map((row) => (
          <div key={row.id} className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-semibold text-cream">
                  AI for {row.alumni.name} <span className="text-ash">· student {row.student.name}</span>
                </p>
                <p className="text-[10.5px] text-ash">Flagged {formatDateTime(row.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <Btn size="sm" variant="secondary" onClick={() => void review(row.id, 'DISMISS')}>Dismiss</Btn>
                <Btn size="sm" onClick={() => void review(row.id, 'RESOLVE')}>Resolve</Btn>
              </div>
            </div>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[11px] text-mist">{row.content}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
