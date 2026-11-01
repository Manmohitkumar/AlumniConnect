import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Compass,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Award,
  Menu,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  LifeBuoy,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { LocaleSelect, useI18n } from '../../lib/i18n'
import { apiGet, apiPost, type NotificationRecord, type Role } from '../../lib/apiClient'
import { relativeTime } from '../../lib/format'
import { Badge, Btn, cn } from './ui'

export type NavItem = { id: string; label: string; icon: ReactNode }

const roleHome: Record<Role, string> = {
  STUDENT: '/student',
  ALUMNI: '/alumni',
  UNIVERSITY: '/university',
  COMPANY: '/company',
  ADMIN: '/admin',
}

export const navByRole: Record<Exclude<Role, 'COMPANY'>, NavItem[]> = {
  STUDENT: [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'ai', label: 'AI assistant', icon: <Bot className="h-4 w-4" /> },
    { id: 'mentor-ai', label: 'Alumni AI', icon: <Bot className="h-4 w-4" /> },
    { id: 'challenges', label: 'Challenges', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'submissions', label: 'Submissions', icon: <ClipboardCheck className="h-4 w-4" /> },
    { id: 'mentorship', label: 'Mentorship', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'portfolio', label: 'Portfolio', icon: <UserRound className="h-4 w-4" /> },
    { id: 'certificates', label: 'Certificates', icon: <Award className="h-4 w-4" /> },
    { id: 'events', label: 'Events', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'opportunities', label: 'Opportunities', icon: <Briefcase className="h-4 w-4" /> },
    { id: 'resources', label: 'Knowledge Vault', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'support', label: 'Support', icon: <LifeBuoy className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'profile', label: 'My profile', icon: <UserRound className="h-4 w-4" /> },
  ],
  ALUMNI: [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'ai', label: 'AI assistant', icon: <Bot className="h-4 w-4" /> },
    { id: 'ai-rep', label: 'AI representative', icon: <Bot className="h-4 w-4" /> },
    { id: 'challenges', label: 'My challenges', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'submissions', label: 'Submissions', icon: <ClipboardCheck className="h-4 w-4" /> },
    { id: 'mentorship', label: 'Mentorship', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'resources', label: 'Knowledge Vault', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'events', label: 'Events', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'certificates', label: 'Certificates', icon: <Award className="h-4 w-4" /> },
    { id: 'discovery', label: 'Student talent', icon: <Users className="h-4 w-4" /> },
    { id: 'support', label: 'Support', icon: <LifeBuoy className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'profile', label: 'My profile', icon: <UserRound className="h-4 w-4" /> },
  ],
  UNIVERSITY: [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  ],
  ADMIN: [
    { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
    { id: 'universities', label: 'Universities', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'ai', label: 'AI ops', icon: <Bot className="h-4 w-4" /> },
    { id: 'reliability', label: 'Reliability', icon: <Activity className="h-4 w-4" /> },
    { id: 'governance', label: 'Governance', icon: <Scale className="h-4 w-4" /> },
    { id: 'adoption', label: 'Adoption', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'provision', label: 'Provision', icon: <Plus className="h-4 w-4" /> },
    { id: 'content', label: 'Content', icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'events', label: 'Events', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'audit', label: 'Audit log', icon: <ClipboardCheck className="h-4 w-4" /> },
    { id: 'announce', label: 'Announcements', icon: <Bell className="h-4 w-4" /> },
    { id: 'support', label: 'Support', icon: <LifeBuoy className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'profile', label: 'My profile', icon: <UserRound className="h-4 w-4" /> },
  ],
}

export function useTab<T extends string>(defaultTab: T, allowed: readonly T[]) {
  const read = useCallback((): T => {
    const params = new URLSearchParams(window.location.search)
    const value = params.get('tab') as T | null
    return value && allowed.includes(value) ? value : defaultTab
  }, [defaultTab, allowed])

  const [tab, setTabState] = useState<T>(read)

  useEffect(() => {
    const onPop = () => setTabState(read())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [read])

  const setTab = useCallback(
    (next: T) => {
      setTabState(next)
      const url = new URL(window.location.href)
      url.searchParams.set('tab', next)
      window.history.pushState({}, '', url)
    },
    [],
  )

  return [tab, setTab] as const
}

export function AppShell({
  title,
  subtitle,
  nav,
  active,
  onNavigate,
  children,
}: {
  title: string
  subtitle: string
  nav: NavItem[]
  active: string
  onNavigate: (id: string) => void
  children: ReactNode
}) {
  const { user, logout } = useAuth()
  const { t, locale, setLocale } = useI18n()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [unread, setUnread] = useState(0)
  const [loadingBell, setLoadingBell] = useState(false)
  const lastTopId = useRef<string | null>(null)

  const loadNotifications = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoadingBell(true)
    try {
      const result = await apiGet<{ data: NotificationRecord[]; meta: { unread: number } }>('/notifications?pageSize=8')
      setNotifications(result.data)
      setUnread(result.meta.unread)
      const topId = result.data[0]?.id ?? null
      if (lastTopId.current && topId && topId !== lastTopId.current) {
        // A new cross-portal event arrived: let mounted views silently refetch.
        window.dispatchEvent(new CustomEvent('app:refresh'))
      }
      lastTopId.current = topId
    } catch {
      // The bell is non-critical; failures stay silent behind the empty state.
    } finally {
      if (showSpinner) setLoadingBell(false)
    }
  }, [])

  useEffect(() => {
    void loadNotifications(true)
    const timer = window.setInterval(() => void loadNotifications(), 15_000)
    const refresh = () => {
      if (document.visibilityState === 'visible') void loadNotifications()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [loadNotifications])

  const activeItem = useMemo(() => nav.find((item) => item.id === active), [nav, active])

  if (!user) return null

  const openNotification = async (notification: NotificationRecord) => {
    if (!notification.readAt) {
      await apiPost(`/notifications/${notification.id}/read`).catch(() => null)
      setNotifications((items) => items.map((item) => (item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)))
      setUnread((count) => Math.max(count - 1, 0))
    }
    if (notification.link) {
      window.location.assign(notification.link)
    }
  }

  const markAllRead = async () => {
    await apiPost('/notifications/read-all').catch(() => null)
    setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })))
    setUnread(0)
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-1">
      <div className="mb-4 px-3">
        <a href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-azure-500 text-[12px] font-bold text-ink-950">AC</span>
          <span className="font-display text-sm font-semibold text-cream">AlumniConnect</span>
        </a>
      </div>
      {nav.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            onNavigate(item.id)
            setMobileOpen(false)
          }}
          aria-current={active === item.id ? 'page' : undefined}
          className={cn(
            'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-[12.5px] font-medium transition-colors',
            active === item.id ? 'bg-brand-500/15 text-brand-200' : 'text-mist hover:bg-white/5 hover:text-cream',
          )}
        >
          {item.icon}
          {t(item.label)}
        </button>
      ))}
      <div className="mt-auto space-y-2 border-t border-white/10 pt-3">
        <a href="/metaverse/index.html" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] text-mist hover:bg-white/5 hover:text-cream">
          <Compass className="h-4 w-4" /> {t('Metaverse campus')}
        </a>
        <div className="flex items-center justify-between gap-2 px-3 py-1">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-cream">{user.name}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-ash">{user.role}</p>
          </div>
          <button
            onClick={() => void logout().then(() => window.location.assign('/login'))}
            className="rounded-lg p-2 text-mist hover:bg-white/10 hover:text-cream"
            aria-label={t('Sign out')}
            title={t('Sign out')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-ink-950 text-cream">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 grid-lines opacity-40" />
      <div className="relative mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-e border-white/10 bg-ink-900/70 p-3 backdrop-blur lg:block">
          {sidebar}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/85 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-mist hover:bg-white/10 lg:hidden" aria-label={t('Open navigation')}>
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.1em] text-ash">
                  <span>{title}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-mist">{t(activeItem?.label ?? active)}</span>
                </div>
                <p className="truncate text-[12px] text-mist">{subtitle}</p>
              </div>

              <LocaleSelect
                value={locale}
                onChange={setLocale}
                className="hidden rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-mist outline-none hover:text-cream sm:block"
              />

              <div className="relative">
                <button
                  onClick={() => {
                    setBellOpen((open) => !open)
                    if (!bellOpen) void loadNotifications(true)
                  }}
                  className="relative rounded-xl border border-white/10 bg-white/5 p-2 text-mist hover:text-cream"
                  aria-label={`${t('Notifications')}${unread ? `, ${unread} ${t('unread')}` : ''}`}
                  aria-expanded={bellOpen}
                >
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-ink-950">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="absolute end-0 top-full z-40 mt-2 w-[22rem] max-w-[85vw] rounded-2xl border border-white/12 bg-ink-800 p-3 shadow-panel">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-mist">{t('Notifications')}</p>
                      {unread > 0 && (
                        <button onClick={() => void markAllRead()} className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">
                          {t('Mark all read')}
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 space-y-1 overflow-y-auto">
                      {loadingBell && <p className="p-3 text-[12px] text-mist">{t('Loading…')}</p>}
                      {!loadingBell && notifications.length === 0 && <p className="p-3 text-[12px] text-mist">{t('No notifications yet.')}</p>}
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => void openNotification(notification)}
                          className={cn(
                            'block w-full rounded-xl px-3 py-2 text-start transition-colors hover:bg-white/5',
                            !notification.readAt && 'bg-brand-500/5',
                          )}
                        >
                          <p dir="auto" className="text-[12px] font-semibold text-cream">{notification.title}</p>
                          <p dir="auto" className="mt-0.5 line-clamp-2 text-[11px] text-mist">{notification.body}</p>
                          <p className="mt-1 text-[10px] text-ash">{relativeTime(notification.createdAt)}</p>
                        </button>
                      ))}
                    </div>
                    <a href={`${roleHome[user.role]}/dashboard?tab=notifications`} className="mt-2 block rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:bg-white/5">
                      {t('Open notification history')}
                    </a>
                  </div>
                )}
              </div>

              <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 sm:flex">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full border border-white/10 object-cover" />
                ) : (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500/20 text-[10px] font-bold text-brand-200">
                    {user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                  </span>
                )}
                <div className="leading-tight">
                  <p className="max-w-32 truncate text-[11.5px] font-semibold text-cream">{user.name}</p>
                  <p className="text-[9.5px] uppercase tracking-[0.08em] text-ash">{user.role}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/80" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="relative h-full w-64 border-e border-white/10 bg-ink-900 p-3">
            <button onClick={() => setMobileOpen(false)} className="absolute end-3 top-3 rounded-lg p-1 text-mist" aria-label={t('Close navigation')}>
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  )
}

export function RoleBanner({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2 text-[11.5px] text-mist">{children}</div>
}

export function DemoTag() {
  return <Badge tone="warning">Demo dataset</Badge>
}

export function VerifiedBadge() {
  return <Badge tone="mint">Verified record</Badge>
}

export { Btn }
