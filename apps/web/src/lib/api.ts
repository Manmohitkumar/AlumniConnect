export type ChallengeCard = {
  title: string
  category: string
  skills: string[]
  deliverables: string
  days: number
  submissions: number
  tone: 'brand' | 'azure' | 'mint'
  summary?: string
  paid?: boolean
  slug?: string
}

type ApiChallenge = {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  deliverables: string
  durationDays: number
  isPaid: boolean
  deadline: string | null
  skills: string[]
  submissions: number
  author: {
    name: string
    company: string | null
    designation: string | null
  }
}

type ChallengesResponse = {
  data: ApiChallenge[]
  meta: {
    count: number
    source: string
    seededDemo: boolean
    generatedAt: string
  }
}

const tones: ChallengeCard['tone'][] = ['brand', 'azure', 'mint']

type ChallengeResult =
  | { ok: true; items: ChallengeCard[] }
  | { ok: false; reason: string }

/**
 * Reads the local Express API through the Vite proxy. Returns a discriminated
 * result instead of throwing so the UI can fall back to static samples when the
 * API is not running.
 */
export async function fetchChallenges(signal?: AbortSignal): Promise<ChallengeResult> {
  try {
    const response = await fetch('/api/challenges', {
      signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return { ok: false, reason: `HTTP ${response.status}` }
    }

    const payload = (await response.json()) as ChallengesResponse
    if (!Array.isArray(payload.data)) {
      return { ok: false, reason: 'Malformed payload' }
    }

    const items = payload.data.map((challenge, index) => ({
      title: challenge.title,
      category: challenge.category,
      skills: challenge.skills,
      deliverables: challenge.deliverables,
      days: challenge.durationDays,
      submissions: challenge.submissions,
      tone: tones[index % tones.length],
      summary: challenge.summary,
      paid: challenge.isPaid,
      slug: challenge.slug,
    }))

    return { ok: true, items }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, reason: 'aborted' }
    }
    return { ok: false, reason: 'API unreachable' }
  }
}

export async function fetchHealth(signal?: AbortSignal) {
  const response = await fetch('/api/health', { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as {
    status: string
    database: string
    counts: { challenges: number; users: number; submissions: number }
  }
}
