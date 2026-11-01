import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiGet, apiPost, type NotificationRecord } from '../../lib/apiClient'
import { relativeTime } from '../../lib/format'
import { useI18n } from '../../lib/i18n'
import { cn } from './ui'

const roleHome: Record<string, string> = {
  STUDENT: '/student',
  ALUMNI: '/alumni',
  UNIVERSITY: '/university',
  COMPANY: '/company',
  ADMIN: '/admin',
}

/** Notification bell for portals that do not use AppShell (e.g. university). */
export function NotificationBell() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<NotificationRecord[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const lastTopId = useRef<string | null>(null)

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const result = await apiGet<{ data: NotificationRecord[]; meta: { unread: number } }>('/notifications?pageSize=8')
      setRows(result.data)
      setUnread(result.meta.unread)
      const topId = result.data[0]?.id ?? null
      if (lastTopId.current && topId && topId !== lastTopId.current) {
        window.dispatchEvent(new CustomEvent('app:refresh'))
      }
      lastTopId.current = topId
    } catch {
      // Non-critical: keep the previous list on transient failures.
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
    const timer = window.setInterval(() => void load(), 15_000)
    const refresh = () => {
      if (document.visibilityState === 'visible') void load()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [load])

  if (!user) return null

  const openNotification = async (notification: NotificationRecord) => {
    if (!notification.readAt) {
      await apiPost(`/notifications/${notification.id}/read`).catch(() => null)
      setRows((items) => items.map((item) => (item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)))
      setUnread((count) => Math.max(count - 1, 0))
    }
    if (notification.link) window.location.assign(notification.link)
  }

  const markAllRead = async () => {
    await apiPost('/notifications/read-all').catch(() => null)
    setRows((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })))
    setUnread(0)
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((value) => !value)
          if (!open) void load(true)
        }}
        className="relative rounded-xl border border-[rgba(184,176,141,0.18)] bg-white/5 p-2 text-mist hover:text-cream"
        aria-label={`${t('Notifications')}${unread ? `, ${unread} ${t('unread')}` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-ink-950">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-40 mt-2 w-[22rem] max-w-[85vw] rounded-2xl border border-[rgba(184,176,141,0.18)] bg-ink-800 p-3 shadow-panel">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-mist">{t('Notifications')}</p>
            {unread > 0 && (
              <button onClick={() => void markAllRead()} className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:underline">
                {t('Mark all read')}
              </button>
            )}
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {loading && <p className="p-3 text-[12px] text-mist">{t('Loading…')}</p>}
            {!loading && rows.length === 0 && <p className="p-3 text-[12px] text-mist">{t('No notifications yet.')}</p>}
            {rows.map((notification) => (
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
          <a
            href={`${roleHome[user.role] ?? '/student'}/dashboard?tab=notifications`}
            className="mt-2 block rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-300 hover:bg-white/5"
          >
            {t('Open notification history')}
          </a>
        </div>
      )}
    </div>
  )
}
