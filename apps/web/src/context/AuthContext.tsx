import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  fetchSession,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  verifyEmail as apiVerifyEmail,
  resendVerification as apiResendVerification,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
  changePassword as apiChangePassword,
  type AuthUser,
} from '../lib/auth'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string, portal?: string, mfaCode?: string) => Promise<AuthUser>
  register: (
    email: string,
    password: string,
    name: string,
    role: 'STUDENT' | 'ALUMNI',
    details?: Record<string, unknown>,
  ) => Promise<{ user: AuthUser; verification?: { required: boolean; delivered: boolean; previewUrl: string | null } }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerification: () => Promise<{ delivered: boolean; previewUrl: string | null }>
  forgotPassword: (email: string) => Promise<{ delivered: boolean; previewUrl: string | null; message: string }>
  resetPassword: (token: string, password: string) => Promise<{ role: string }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const session = await fetchSession()
    setUser(session)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchSession()
      .then((session) => {
        if (active) setUser(session)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string, portal?: string, mfaCode?: string) => {
    const next = await apiLogin({ email, password, portal, mfaCode })
    setUser(next)
    return next
  }, [])

  const register = useCallback(
    async (email: string, password: string, name: string, role: 'STUDENT' | 'ALUMNI', details?: Record<string, unknown>) => {
      const result = await apiRegister({ email, password, name, role, ...(details ?? {}) })
      setUser(result.user)
      return result
    },
    [],
  )

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const verifyEmail = useCallback(async (token: string) => {
    await apiVerifyEmail(token)
    await refresh()
  }, [refresh])

  const resendVerification = useCallback(async () => apiResendVerification(), [])
  const forgotPassword = useCallback(async (email: string) => apiForgotPassword(email), [])
  const resetPassword = useCallback(async (token: string, password: string) => {
    const result = await apiResetPassword(token, password)
    return result
  }, [])
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await apiChangePassword(currentPassword, newPassword)
    await refresh()
  }, [refresh])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh, verifyEmail, resendVerification, forgotPassword, resetPassword, changePassword }),
    [user, loading, login, register, logout, refresh, verifyEmail, resendVerification, forgotPassword, resetPassword, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
