/**
 * AI provider abstraction.
 *
 * The default provider is a deterministic local engine so every recommendation
 * works offline and never sends platform data to a third party. An OpenAI-
 * compatible endpoint can be enabled explicitly with environment variables;
 * callers always keep a deterministic fallback and must label AI output.
 */

export type AiProviderName = 'local' | 'openai'

const provider = (process.env.AI_PROVIDER ?? 'local').toLowerCase()
const baseUrl = (process.env.AI_BASE_URL ?? '').replace(/\/+$/, '')
const apiKey = process.env.AI_API_KEY ?? ''
const model = process.env.AI_MODEL ?? ''
const timeoutMs = Number(process.env.AI_TIMEOUT_MS ?? 20_000) || 20_000

const externalEnabled = provider === 'openai' && baseUrl.length > 0 && apiKey.length > 0 && model.length > 0

const usage = {
  localRequests: 0,
  externalCalls: 0,
  externalFailures: 0,
  startedAt: new Date().toISOString(),
}

export function aiStatus() {
  return {
    provider: (externalEnabled ? 'openai' : 'local') as AiProviderName,
    externalEnabled,
    model: externalEnabled ? model : null,
    timeoutMs,
    privacy: externalEnabled
      ? 'External provider receives anonymised skill/summary text only when a feature opts in. Names, emails and ids are never sent.'
      : 'All AI features run locally with deterministic scoring. No data leaves the server.',
    usage,
  }
}

export function aiUsageSnapshot() {
  return { ...usage }
}

/**
 * Ask the configured provider for text. Returns null when the provider is not
 * enabled, times out, returns a non-2xx status or an empty completion. Callers
 * must treat null as "use the deterministic fallback".
 */
export async function aiComplete(system: string, prompt: string): Promise<string | null> {
  usage.localRequests += 1
  if (!externalEnabled) return null
  usage.externalCalls += 1
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!response.ok) {
      usage.externalFailures += 1
      return null
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const text = payload.choices?.[0]?.message?.content?.trim()
    return text && text.length > 0 ? text.slice(0, 4000) : null
  } catch {
    usage.externalFailures += 1
    return null
  } finally {
    clearTimeout(timer)
  }
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'your', 'you', 'our', 'are', 'was', 'were', 'this', 'that', 'from',
  'have', 'has', 'into', 'about', 'their', 'they', 'them', 'will', 'can', 'all', 'any', 'not',
  'but', 'use', 'using', 'used', 'more', 'most', 'some', 'how', 'what', 'when', 'where', 'which',
  'who', 'why', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'as', 'is', 'it', 'or', 'be',
])

export function tokenize(text: string | null | undefined): string[] {
  if (!text) return []
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .map((token) => token.replace(/^\.+|\.+$/g, ''))
        .filter((token) => token.length > 2 && token.length < 32 && !STOPWORDS.has(token)),
    ),
  )
}

/** Jaccard similarity between two token sets, 0..1. */
export function similarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const left = new Set(a)
  const right = new Set(b)
  let intersection = 0
  for (const token of left) if (right.has(token)) intersection += 1
  const union = left.size + right.size - intersection
  return union === 0 ? 0 : intersection / union
}

/** Tokens present in both lists, used to explain recommendations. */
export function sharedTokens(a: string[], b: string[]): string[] {
  const right = new Set(b)
  return Array.from(new Set(a.filter((token) => right.has(token)))).slice(0, 4)
}

/** Split a comma-separated field into clean phrases (skills, languages...). */
export function splitList(value: string | null | undefined, limit = 30): string[] {
  if (!value) return []
  return value
    .split(/[,;|/]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, limit)
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'hi', label: 'हिन्दी', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
] as const

export function isSupportedLocale(value: string | null | undefined): boolean {
  return SUPPORTED_LOCALES.some((locale) => locale.code === value)
}
