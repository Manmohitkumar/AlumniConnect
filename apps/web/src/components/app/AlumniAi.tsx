import { useEffect, useState } from 'react'
import { Bot, Flag, GraduationCap, MessageSquare, ShieldCheck, UserRound } from 'lucide-react'
import { apiDelete, apiPatch, apiPost, apiPut } from '../../lib/apiClient'
import { useAction, useApi } from '../../lib/useApi'
import { Badge, Btn, Card, EmptyState, ErrorNote, Field, Loading, SectionHeading, SuccessNote, fieldClass } from './ui'

type Assistant = {
  alumniId: string
  name: string
  headline: string | null
  company: string | null
  designation: string | null
  topics: string
  yearsExperience: number | null
  permissionLevel: number
  disclosure: string
}

type AiMessage = { id: string; role: string; content: string; sources: string | null; flagged: boolean; createdAt: string }

export function AlumniAiPanel() {
  const assistants = useApi<{ data: Assistant[] }>('/alumni-ai/assistants')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ name: string; disclosure: string; suggestedQuestions: string[]; sources: Array<{ id: string; type: string; title: string }> } | null>(null)
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const action = useAction()

  useEffect(() => {
    if (!selectedId) return
    let active = true
    setLoadingDetail(true)
    Promise.all([
      fetch(`/api/alumni-ai/${selectedId}`, { credentials: 'include' }).then((response) => (response.ok ? response.json() : Promise.reject(new Error('Assistant unavailable')))),
      fetch(`/api/alumni-ai/${selectedId}/conversation`, { credentials: 'include' }).then((response) => (response.ok ? response.json() : { data: { messages: [] } })),
    ])
      .then(([info, conversation]) => {
        if (!active) return
        setDetail(info.data)
        setMessages(conversation.data?.messages ?? [])
      })
      .catch(() => {
        if (active) setNotice('This AI representative is currently unavailable.')
      })
      .finally(() => {
        if (active) setLoadingDetail(false)
      })
    return () => {
      active = false
    }
  }, [selectedId])

  const selected = assistants.data?.data.find((row) => row.alumniId === selectedId) ?? null

  const send = async (text: string) => {
    if (!selectedId || !text.trim()) return
    const message = text.trim()
    setInput('')
    setMessages((current) => [
      ...current,
      { id: `local-${Date.now()}`, role: 'STUDENT', content: message, sources: null, flagged: false, createdAt: new Date().toISOString() },
    ])
    const result = await action.run(() => apiPost<{ data: { message: AiMessage } }>(`/alumni-ai/${selectedId}/chat`, { message }), undefined)
    if (result) {
      setMessages((current) => [...current, result.data.message])
    }
  }

  const escalate = async () => {
    if (!selectedId) return
    const result = await action.run(() => apiPost<{ data: { alreadyRequested: boolean } }>(`/alumni-ai/${selectedId}/escalate`, {}), undefined)
    if (result) {
      setNotice(result.data.alreadyRequested ? 'A human mentorship request is already pending.' : 'Human mentorship request sent. The alumnus will decide whether to accept.')
    }
  }

  const report = async (id: string) => {
    const result = await action.run(() => apiPost(`/alumni-ai/messages/${id}/report`), 'Reported for review.')
    if (result) setMessages((current) => current.map((row) => (row.id === id ? { ...row, flagged: true } : row)))
  }

  const clearConversation = async () => {
    if (!selectedId) return
    const result = await action.run(() => apiDelete(`/alumni-ai/${selectedId}/conversation`), 'Conversation cleared from your account.')
    if (result) setMessages([])
  }

  if (assistants.loading) return <Loading rows={3} label="Loading AI representatives" />
  if (assistants.error) return <ErrorNote message={assistants.error} onRetry={assistants.reload} />
  const list = assistants.data?.data ?? []

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Alumni AI"
        hint="Chat with an AI assistant that represents an alumnus using only knowledge they have approved. The alumnus is not personally present."
        action={<Bot className="h-4 w-4 text-ash" />}
      />

      {list.length === 0 && (
        <EmptyState title="No AI representatives available" hint="An alumnus must verify their profile and explicitly enable the assistant before it appears here." />
      )}

      {list.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((assistant) => (
            <button
              key={assistant.alumniId}
              type="button"
              onClick={() => {
                setSelectedId(assistant.alumniId)
                setNotice(null)
              }}
              className={`rounded-xl border p-3 text-left transition ${
                selectedId === assistant.alumniId ? 'border-brand-500/40 bg-brand-500/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-brand-300" />
                <p className="text-[12.5px] font-semibold text-cream">{assistant.name}</p>
                <Badge tone="azure">Level {assistant.permissionLevel}</Badge>
              </div>
              <p className="mt-1 text-[11px] text-mist">{assistant.headline ?? assistant.designation ?? 'Alumni mentor'}</p>
              <p className="text-[10.5px] text-ash">{assistant.topics}</p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Card>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
            {detail?.disclosure ?? selected.disclosure}
          </div>
          {action.error && <div className="mt-2"><ErrorNote message={action.error} /></div>}
          {notice && <div className="mt-2"><SuccessNote message={notice} /></div>}

          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-ink-950/40 p-3">
            {loadingDetail && <Loading rows={2} label="Loading conversation" />}
            {!loadingDetail && messages.length === 0 && (
              <p className="text-[12px] text-mist">Ask a career question to begin. Suggested questions are below.</p>
            )}
            {messages.map((row) => {
              const sources = row.sources ? (JSON.parse(row.sources) as Array<{ title: string }>) : []
              return (
                <div key={row.id} className={row.role === 'STUDENT' ? 'text-right' : 'text-left'}>
                  <div className={`inline-block max-w-[92%] whitespace-pre-wrap rounded-xl px-3 py-2 text-[11.5px] ${row.role === 'STUDENT' ? 'bg-brand-500/20 text-cream' : 'bg-white/5 text-mist'}`}>
                    {row.content}
                  </div>
                  {row.role === 'ASSISTANT' && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-ash">
                      <span>AI assistant · not the alumnus</span>
                      {sources.map((source) => <Badge key={source.title} tone="neutral">{source.title}</Badge>)}
                      {!row.id.startsWith('local-') && (
                        <button type="button" className="inline-flex items-center gap-1 text-ash hover:text-cream" onClick={() => void report(row.id)}>
                          <Flag className="h-3 w-3" /> {row.flagged ? 'Reported' : 'Report'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {(detail?.suggestedQuestions ?? []).map((question) => (
              <button key={question} type="button" className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10.5px] text-mist hover:text-cream" onClick={() => void send(question)}>
                {question}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1">
              <Field label="Your question">
                <input
                  className={fieldClass}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void send(input)
                    }
                  }}
                  placeholder="What skills should I learn for this career?"
                  maxLength={1200}
                />
              </Field>
            </div>
            <Btn disabled={action.pending || input.trim().length < 2} onClick={() => void send(input)}>Send</Btn>
            <Btn variant="secondary" onClick={() => void escalate()} disabled={action.pending}>
              <GraduationCap className="h-3.5 w-3.5" /> Request human mentorship
            </Btn>
            <Btn variant="ghost" onClick={() => void clearConversation()} disabled={action.pending || messages.length === 0}>
              Clear conversation
            </Btn>
          </div>
          <p className="mt-2 text-[10.5px] text-ash">
            The assistant cannot promise referrals, interviews, meetings or certificates. Requests are confirmed only after the alumnus responds.
          </p>
        </Card>
      )}
    </div>
  )
}

type AiSettings = {
  enabled: boolean
  paused: boolean
  permissionLevel: number
  useProfile: boolean
  useExperience: boolean
  useResources: boolean
  useApprovedAnswers: boolean
  usePrivateMessages: boolean
  alumnusVerified: boolean
}

type KnowledgeRow = { id: string; type: string; title: string; content: string; approved: boolean; revokedAt: string | null; createdAt: string }

export function AlumniAiControlPanel() {
  const settings = useApi<{ data: AiSettings }>('/alumni-ai/settings')
  const knowledge = useApi<{ data: KnowledgeRow[] }>('/alumni-ai/knowledge')
  const analytics = useApi<{ data: { totalConversations: number; messagesLast7d: number; flaggedMessages: number } }>('/alumni-ai/conversations')
  const action = useAction()
  const [type, setType] = useState('EXPERIENCE')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const save = async (patch: Partial<AiSettings>) => {
    const result = await action.run(() => apiPut('/alumni-ai/settings', patch), 'AI representative settings saved.')
    if (result) settings.reload()
  }

  const addSource = async () => {
    const result = await action.run(
      () => apiPost('/alumni-ai/knowledge', { type, title, content }),
      'Source added. Approve it before the assistant can use it.',
    )
    if (result) {
      setTitle('')
      setContent('')
      knowledge.reload()
    }
  }

  const approve = async (row: KnowledgeRow, approved: boolean) => {
    const result = await action.run(
      () => apiPatch(`/alumni-ai/knowledge/${row.id}`, { approved, revoked: !approved }),
      approved ? 'Source approved for the assistant.' : 'Source revoked.',
    )
    if (result) knowledge.reload()
  }

  const remove = async (id: string) => {
    const result = await action.run(() => apiDelete(`/alumni-ai/knowledge/${id}`), 'Source deleted.')
    if (result) knowledge.reload()
  }

  if (settings.loading) return <Loading rows={3} label="Loading AI settings" />
  if (settings.error) return <ErrorNote message={settings.error} onRetry={settings.reload} />
  if (!settings.data) return null
  const data = settings.data.data

  return (
    <div className="space-y-5">
      <SectionHeading
        title="AI representative"
        hint="Students can chat with an AI assistant that uses only the sources you approve. It never represents itself as you and cannot make commitments."
        action={<ShieldCheck className="h-4 w-4 text-ash" />}
      />
      {action.error && <ErrorNote message={action.error} />}
      {action.success && <SuccessNote message={action.success} />}
      {!data.alumnusVerified && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
          Your alumni profile must be verified by your institution before the AI representative can be enabled.
        </div>
      )}

      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Assistant status">
            <select className={fieldClass} value={data.enabled ? 'on' : 'off'} onChange={(event) => void save({ enabled: event.target.value === 'on' })} disabled={!data.alumnusVerified && !data.enabled}>
              <option value="off">Disabled</option>
              <option value="on">Enabled</option>
            </select>
          </Field>
          <Field label="Permission level" hint="Level 3 actions are not offered until permission controls are proven.">
            <select className={fieldClass} value={data.permissionLevel} onChange={(event) => void save({ permissionLevel: Number(event.target.value) })}>
              <option value={1}>Level 1 — knowledge only</option>
              <option value={2}>Level 2 — personalized mentorship</option>
            </select>
          </Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[12px] text-mist">
          <input type="checkbox" checked={data.paused} onChange={(event) => void save({ paused: event.target.checked })} />
          Pause the assistant (students see it as unavailable)
        </label>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            ['useProfile', 'Use my professional profile', data.useProfile],
            ['useExperience', 'Use my approved career experiences', data.useExperience],
            ['useResources', 'Use my published resources', data.useResources],
            ['useApprovedAnswers', 'Use my approved answers', data.useApprovedAnswers],
          ].map(([key, label, value]) => (
            <label key={String(key)} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11.5px] text-mist">
              <input type="checkbox" checked={Boolean(value)} onChange={(event) => void save({ [String(key)]: event.target.checked } as Partial<AiSettings>)} />
              {String(label)}
            </label>
          ))}
        </div>
        <p className="mt-2 text-[10.5px] text-ash">Private messages are never ingested. Disabling the assistant does not delete your approved sources.</p>
      </Card>

      <Card>
        <SectionHeading title="Approved knowledge" hint="Only approved, non-revoked sources are retrieved when a student asks a question." />
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Type">
            <select className={fieldClass} value={type} onChange={(event) => setType(event.target.value)}>
              {['PROFILE', 'EXPERIENCE', 'RESOURCE', 'APPROVED_ANSWER', 'FAQ', 'PROJECT', 'CERTIFICATION', 'ACHIEVEMENT'].map((option) => (
                <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </Field>
          <Field label="Title"><input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} /></Field>
          <Field label="Content"><input className={fieldClass} value={content} onChange={(event) => setContent(event.target.value)} maxLength={4000} /></Field>
        </div>
        <div className="mt-2 flex justify-end">
          <Btn disabled={action.pending || title.trim().length < 3 || content.trim().length < 10} onClick={() => void addSource()}>Add source</Btn>
        </div>
        <div className="mt-3 space-y-2">
          {knowledge.data?.data.length === 0 && <p className="text-[12px] text-mist">No sources yet.</p>}
          {knowledge.data?.data.map((row) => (
            <div key={row.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[12.5px] font-semibold text-cream">{row.title}</p>
                  <p className="text-[10.5px] text-ash">{row.type} · {row.revokedAt ? 'revoked' : row.approved ? 'approved' : 'pending approval'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Btn size="sm" variant={row.approved && !row.revokedAt ? 'ghost' : 'secondary'} onClick={() => void approve(row, !(row.approved && !row.revokedAt))}>
                    {row.approved && !row.revokedAt ? 'Revoke' : 'Approve'}
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={() => void remove(row.id)}>Delete</Btn>
                </div>
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] text-mist">{row.content}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading title="Conversation analytics" hint="Privacy-preserving counts only. Student conversation content is not shown to alumni." action={<MessageSquare className="h-4 w-4 text-ash" />} />
        {analytics.data ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-ash">Conversations</p>
              <p className="text-lg font-semibold text-cream">{analytics.data.data.totalConversations}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-ash">Messages (7d)</p>
              <p className="text-lg font-semibold text-cream">{analytics.data.data.messagesLast7d}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-ash">Flagged</p>
              <p className="text-lg font-semibold text-cream">{analytics.data.data.flaggedMessages}</p>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-mist">No conversation data yet.</p>
        )}
      </Card>
    </div>
  )
}
