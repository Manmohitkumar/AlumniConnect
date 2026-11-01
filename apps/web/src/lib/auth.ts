export type Role = 'STUDENT' | 'ALUMNI' | 'UNIVERSITY' | 'COMPANY' | 'ADMIN'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: Role
  emailVerified: boolean
  mustChangePassword?: boolean
  totpEnabled?: boolean
  mfaVerified?: boolean
  avatarUrl?: string | null
}

type ApiUser = AuthUser

type AuthResponse = { data: ApiUser; token: string; verification?: { required: boolean; delivered: boolean; previewUrl: string | null } }

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

/** Where each role belongs after sign-in. */
export const roleHome: Record<Role, string> = {
  STUDENT: '/student/dashboard',
  ALUMNI: '/alumni/dashboard',
  UNIVERSITY: '/university/dashboard',
  COMPANY: '/',
  ADMIN: '/admin/dashboard',
}

class ApiError extends Error {
  status: number
  code: string
  constructor(message: string, status: number, code = 'error') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      (payload as { message?: string }).message ??
      (response.status === 429 ? 'Too many attempts. Please wait a few minutes.' : 'Request failed.')
    throw new ApiError(message, response.status, (payload as { error?: string }).error ?? 'error')
  }
  return payload as T
}

export async function login(credentials: { email: string; password: string; portal?: string; mfaCode?: string }): Promise<AuthUser> {
  const result = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
  return result.data
}

export async function register(credentials: {
  email: string
  password: string
  name: string
  role: 'STUDENT' | 'ALUMNI'
  universityId?: string | null
  universityName?: string | null
  registrationNumber?: string | null
  department?: string | null
  course?: string | null
  currentYear?: number | null
  semester?: number | null
  graduationYear?: number | null
  termsAccepted?: boolean
}): Promise<{ user: AuthUser; verification?: AuthResponse['verification'] }> {
  const result = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...credentials, termsAccepted: true }),
  })
  return { user: result.data, verification: result.verification }
}

export async function fetchSession(): Promise<AuthUser | null> {
  try {
    const result = await request<{ data: ApiUser }>('/auth/me')
    return result.data
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/auth/logout', { method: 'POST' })
  } catch {
    // Cookie is httpOnly; navigate anyway.
  }
}

export async function verifyEmail(token: string): Promise<void> {
  await request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) })
}

export async function resendVerification(): Promise<{ delivered: boolean; previewUrl: string | null }> {
  const result = await request<{ data: { delivered: boolean; previewUrl: string | null } }>('/auth/resend-verification', { method: 'POST' })
  return result.data
}

export async function forgotPassword(email: string): Promise<{ delivered: boolean; previewUrl: string | null; message: string }> {
  const result = await request<{ data: { message: string; delivered: boolean; previewUrl: string | null } }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  return result.data
}

export async function resetPassword(token: string, password: string): Promise<{ role: string }> {
  const result = await request<{ data: { reset: boolean; role: string } }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
  return { role: result.data.role }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) })
}

export async function fetchUniversities(): Promise<Array<{ id: string; name: string; shortName: string | null; city: string | null }>> {
  const result = await request<{ data: Array<{ id: string; name: string; shortName: string | null; city: string | null }> }>('/universities')
  return result.data
}

export { ApiError }
