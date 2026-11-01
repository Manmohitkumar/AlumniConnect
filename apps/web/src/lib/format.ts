let activeLocale: string | undefined

/** Set by the i18n provider so every date/number follows the chosen language. */
export function setFormatLocale(locale: string) {
  activeLocale = locale
}

export function formatDate(value: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(activeLocale, { day: 'numeric', month: 'short', year: 'numeric', ...options })
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(activeLocale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function relativeTime(value: string | Date | null | undefined) {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const formatter = new Intl.RelativeTimeFormat(activeLocale, { numeric: 'auto' })
  const minutes = Math.round(diff / 60000)
  if (Math.abs(minutes) < 1) return formatter.format(0, 'second')
  if (Math.abs(minutes) < 60) return formatter.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return formatter.format(-hours, 'hour')
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return formatter.format(-days, 'day')
  return formatDate(date)
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}
