export type Role = 'STUDENT' | 'ALUMNI' | 'UNIVERSITY' | 'COMPANY' | 'ADMIN'

export class ApiError extends Error {
  status: number
  code: string
  constructor(message: string, status: number, code = 'error') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      (payload as { message?: string }).message ??
      (response.status === 401 ? 'Please sign in to continue.' : 'Something went wrong.')
    if (response.status === 401) window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    throw new ApiError(message, response.status, (payload as { error?: string }).error ?? 'error')
  }
  return payload as T
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return readResponse<T>(response)
}

export type UploadedFile = {
  id: string
  url: string
  mimeType: string
  bytes: number
  sha256: string
  kind: string
}

/** Sends one file to /api/uploads; the server sniffs the content type. */
export async function apiUpload(file: File, kind: 'avatar' | 'submission' | 'general' = 'general'): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(`${API_BASE}/api/uploads?kind=${kind}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  const payload = await readResponse<{ data: UploadedFile }>(response)
  return payload.data
}

export const apiGet = <T>(path: string) => api<T>(path)
export const apiPost = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body })
export const apiPut = <T>(path: string, body?: unknown) => api<T>(path, { method: 'PUT', body })
export const apiPatch = <T>(path: string, body?: unknown) => api<T>(path, { method: 'PATCH', body })
export const apiDelete = <T>(path: string, body?: unknown) => api<T>(path, { method: 'DELETE', body })

export type Me = {
  id: string
  email: string
  name: string
  role: Role
  status: string
  emailVerified: boolean
  mustChangePassword: boolean
  headline: string | null
  bio: string | null
  location: string | null
  avatarUrl: string | null
  locale: string | null
  timeZone: string | null
  notificationPrefs: { mentorship: boolean; challenges: boolean; events: boolean; marketing: boolean; support?: boolean }
  createdAt: string
  studentProfile: StudentProfile | null
  alumniProfile: AlumniProfile | null
  universityProfile: UniversityProfile | null
  counts: { unread: number; submissions: number; mentorship: number; certificates: number; challengesJoined: number }
}

export type StudentProfile = {
  id: string
  universityId: string | null
  universityName: string | null
  university?: { id: string; name: string; shortName: string | null } | null
  registrationNumber: string | null
  department: string | null
  course: string | null
  currentYear: number | null
  semester: number | null
  graduationYear: number | null
  skills: string | null
  careerInterests: string | null
  verificationStatus: string
  portfolioVisible: boolean
  visibleToCompanies: boolean
  consentAt: string | null
}

export type AlumniProfile = {
  id: string
  universityId: string | null
  universityName: string | null
  university?: { id: string; name: string; shortName: string | null } | null
  registrationNumber: string | null
  graduationYear: number | null
  company: string | null
  designation: string | null
  industry: string | null
  location: string | null
  expertise: string | null
  mentorshipTopics: string | null
  availability: string | null
  timezone: string | null
  yearsExperience: number | null
  verificationStatus: string
  mentorshipOpen: boolean
}

export type University = { id: string; name: string; shortName: string | null; city: string | null }

export type UniversityProfile = {
  designation: string | null
  department: string | null
  permissions: string[]
  verified: boolean
  university: University
}

export type Challenge = {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  objectives: string | null
  deliverables: string
  requirements: string | null
  durationDays: number
  isPaid: boolean
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED'
  deadline: string | null
  publishedAt: string
  maxParticipants: number | null
  skills: string[]
  submissions: number
  participants: number
  author: { id: string; name: string; company: string | null; designation: string | null; industry: string | null }
  isJoined?: boolean
  mySubmission?: { id: string; status: string; score: number | null; title: string } | null
}

export type Submission = {
  id: string
  challengeId: string
  title: string
  summary: string | null
  status: string
  score: number | null
  feedback: string | null
  repoUrl: string | null
  demoUrl: string | null
  fileUrl: string | null
  createdAt: string
  challenge?: { id: string; slug: string; title: string; category: string; deadline: string | null; status: string }
  student?: {
    id: string
    name: string
    email: string
    headline: string | null
    studentProfile?: { department: string | null; course: string | null; graduationYear: number | null; skills: string | null } | null
  }
  evaluations?: Array<{ id: string; score: number; feedback: string; createdAt: string }>
  canEvaluate?: boolean
}

export type Mentor = {
  id: string
  name: string
  headline: string | null
  location: string | null
  avatarUrl: string | null
  alumniProfile: AlumniProfile | null
}

export type MentorshipSession = {
  id: string
  requestId: string
  scheduledAt: string
  durationMins: number
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  roomKey: string | null
  notes: string | null
  rating: number | null
  feedback: string | null
}

export type MentorshipRequest = {
  id: string
  studentId: string
  mentorId: string
  topic: string
  message: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED'
  respondedAt: string | null
  createdAt: string
  student: { id: string; name: string; email: string; headline: string | null }
  mentor: { id: string; name: string; email: string; headline: string | null }
  sessions: MentorshipSession[]
}

export type CertificateRecord = {
  id: string
  code: string
  title: string
  kind: string
  issuedAt: string
  revokedAt: string | null
  integrity: string
  challenge?: { id: string; title: string; slug?: string } | null
  issuer?: { id: string; name: string }
  user?: { id: string; name: string }
}

export type EventRecord = {
  id: string
  title: string
  description: string
  category: string
  mode: 'ONLINE' | 'CAMPUS' | 'METAVERSE'
  location: string | null
  metaverseRoom: string | null
  startsAt: string
  endsAt: string | null
  capacity: number | null
  registrationCount: number
  host: { id: string; name: string; headline: string | null }
  myRegistration: { registeredAt: string; attendedAt: string | null } | null
}

export type NotificationRecord = {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  readAt: string | null
  createdAt: string
}

export type Resource = {
  id: string
  title: string
  summary: string
  body?: string
  category: string
  tags: string | null
  type: string
  url: string | null
  views: number
  createdAt: string
  author: { id: string; name: string; headline: string | null; alumniProfile?: { company: string | null } | null }
  bookmarks: number
  bookmarked?: boolean
}

export type Opportunity = {
  id: string
  title: string
  description: string
  type: string
  location: string | null
  remote: boolean
  skills: string | null
  deadline: string | null
  status: string
  createdAt: string
  company: { id: string; name: string; headline: string | null }
  applicationCount: number
  myApplication: { id: string; status: string } | null
}

export type StudentCandidate = {
  id: string
  name: string
  headline: string | null
  department: string | null
  graduationYear: number | null
  reason?: string
}

export type AdminAnalytics = {
  rangeDays: number
  users: { total: number; byRole: { students: number; alumni: number; companies: number; admins: number; university?: number }; activeStudents: number }
  institutions?: { universities: number; pendingStudentVerifications: number; pendingAlumniVerifications: number }
  challenges: { open: number; participations: number }
  submissions: { total: number; evaluated: number }
  mentorship: { requests: number; accepted: number; sessionsCompleted: number }
  recognition: { certificates: number }
  events: { created: number; registrations: number; attended: number }
  metaverse: { visits: number; byRoom: Array<{ roomKey: string; count: number }> }
  careers: { openOpportunities: number; applications: number }
  resources: number
  series: {
    submissions: Array<{ date: string; count: number }>
    mentorshipRequests: Array<{ date: string; count: number }>
    roomVisits: Array<{ date: string; count: number }>
  }
  meta: { source: string; seededDemo: boolean }
}

export type AdoptionAnalytics = {
  generatedAt: string
  exclusions: { demoDomains: string[]; excludedUsers: number }
  definitions: Record<string, string>
  registrations: {
    total: number
    byRole: { students: number; alumni: number; university: number; companies: number; admins: number }
    newLast7d: number
    newLast30d: number
    emailVerified: number
    emailVerificationRate: number | null
  }
  verification: {
    students: { verified: number; pending: number; unverified: number; rejected: number }
    alumni: { verified: number; pending: number; unverified: number; rejected: number }
    totalVerified: number
    totalPending: number
  }
  institutions: { total: number; verified: number; representatives: number; representativesActive30d: number }
  activation: {
    students: { activated: number; registered: number; rate: number | null }
    alumni: { activated: number; registered: number; rate: number | null }
  }
  engagement: {
    activeLast7d: number
    activeLast30d: number
    wauMauRatio: number | null
    returningLast7d: number
    newActiveLast7d: number
    activitiesLast30d: {
      challengeJoins: number
      submissions: number
      mentorshipRequests: number
      sessionsCompleted: number
      eventRegistrations: number
      certificatesIssued: number
      resourcesPublished: number
      applications: number
      metaverseVisits: number
    }
  }
  funnel: {
    students: FunnelStage[]
    alumni: FunnelStage[]
  }
  meta: { source: string; seededDemoExcluded: boolean }
}

export type FunnelStage = {
  stage: string
  count: number
  conversionFromPrevious: number | null
}

export type FeedbackRecord = {
  id: string
  category: string
  subject: string
  message: string
  pagePath: string | null
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'
  priority: 'LOW' | 'NORMAL' | 'HIGH'
  adminNote: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; name: string; email: string; role: string }
}

export type PortfolioProject = {
  id: string
  studentId: string
  title: string
  summary: string
  url: string | null
  skills: string | null
  visibility: 'PRIVATE' | 'PLATFORM' | 'PUBLIC'
  createdAt: string
  updatedAt: string
}

export type PublicPortfolio = {
  student: {
    id: string
    name: string
    headline: string | null
    bio: string | null
    avatarUrl: string | null
    profile: StudentProfile | null
  }
  projects: PortfolioProject[]
  certificates: CertificateRecord[]
  evaluatedSubmissions: Array<{
    id: string
    title: string
    score: number | null
    createdAt: string
    challenge: { title: string; category: string }
  }>
  visibilityApplied: string[]
}

export type VerifiedCertificate = {
  code: string
  title: string
  kind: string
  issuedAt: string
  revokedAt: string | null
  recipientName: string
  issuerName: string
  challenge: { title: string; slug: string } | null
  integrity: string
  statement: string
}

export type ProfileView = {
  id: string
  name: string
  role: Role
  headline: string | null
  bio: string | null
  location: string | null
  avatarUrl: string | null
  joinedAt: string
  alumniProfile: AlumniProfile | null
  studentProfile: StudentProfile | null
  studentProfileRestricted: boolean
}

type Paginated<T> = { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number; unread?: number } }

export const apiTypes = { paginated: null as unknown as Paginated<never> }
