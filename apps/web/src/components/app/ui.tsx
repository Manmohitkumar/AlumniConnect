import { useEffect, useRef, type ReactNode } from 'react'
import { AlertCircle, X } from 'lucide-react'

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-white/10 bg-ink-800/70 p-5 shadow-card backdrop-blur-sm', className)}>
      {children}
    </div>
  )
}

export function SectionHeading({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-cream">{title}</h2>
        {hint && <p className="mt-1 text-[12.5px] leading-relaxed text-mist">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

const badgeTones = {
  brand: 'border-brand-500/30 bg-brand-500/10 text-brand-300',
  mint: 'border-mint-500/30 bg-mint-500/10 text-mint-300',
  azure: 'border-azure-500/30 bg-azure-500/10 text-azure-300',
  neutral: 'border-white/15 bg-ink-950/50 text-mist',
  danger: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
}

export type BadgeTone = keyof typeof badgeTones

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]', badgeTones[tone])}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const value = status.toUpperCase()
  const tone: BadgeTone =
    value === 'OPEN' || value === 'ACCEPTED' || value === 'COMPLETED' || value === 'EVALUATED' || value === 'PUBLISHED' || value === 'ACTIVE'
      ? 'mint'
      : value === 'PENDING' || value === 'SUBMITTED' || value === 'SCHEDULED' || value === 'UNDER_REVIEW'
        ? 'warning'
        : value === 'DECLINED' || value === 'CANCELLED' || value === 'SUSPENDED' || value === 'REVOKED' || value === 'WITHDRAWN'
          ? 'danger'
          : 'neutral'
  return <Badge tone={tone}>{value.replace(/_/g, ' ')}</Badge>
}

const buttonVariants = {
  primary: 'bg-brand-500 text-ink-950 hover:bg-brand-600 disabled:bg-brand-500/50',
  secondary: 'border border-white/15 bg-white/5 text-cream hover:bg-white/10',
  ghost: 'text-mist hover:bg-white/5 hover:text-cream',
  danger: 'border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
  mint: 'bg-mint-500 text-ink-950 hover:bg-mint-400 disabled:bg-mint-500/50',
}

export function Btn({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants
  size?: 'sm' | 'md'
}) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'px-3 py-1.5 text-[11px] uppercase tracking-[0.08em]' : 'px-4 py-2.5 text-[12px] uppercase tracking-[0.08em]',
        buttonVariants[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ id: T; label: string; count?: number }>
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div role="tablist" className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-white/10 bg-ink-900/60 p-1">
      {items.map((item) => (
        <button
          key={item.id}
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            'rounded-xl px-3.5 py-2 text-[11.5px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400',
            value === item.id ? 'bg-brand-500/15 text-brand-200' : 'text-mist hover:bg-white/5 hover:text-cream',
          )}
        >
          {item.label}
          {typeof item.count === 'number' && (
            <span className="ml-2 rounded-full bg-white/10 px-1.5 text-[10px] text-mist">{item.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
}: {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
  tone?: 'brand' | 'mint' | 'azure'
}) {
  const tones = {
    brand: 'text-brand-300 bg-brand-500/10',
    mint: 'text-mint-300 bg-mint-500/10',
    azure: 'text-azure-300 bg-azure-500/10',
  }
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ash">{label}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-cream">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-mist">{hint}</p>}
        </div>
        {icon && <div className={cn('rounded-xl p-2', tones[tone])}>{icon}</div>}
      </div>
    </Card>
  )
}

export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: string
  hint?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-ink-900/40 px-6 py-12 text-center">
      {icon && <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-brand-300">{icon}</div>}
      <p className="font-display text-sm font-semibold text-cream">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-mist">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function Loading({ rows = 3, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div aria-live="polite" aria-busy="true" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
      ))}
    </div>
  )
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
      <p className="flex items-center gap-2 text-[12.5px] text-rose-200">
        <AlertCircle className="h-4 w-4 shrink-0" /> {message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-200 underline">
          Retry
        </button>
      )}
    </div>
  )
}

export function SuccessNote({ message }: { message: string }) {
  return (
    <div role="status" className="rounded-xl border border-mint-500/30 bg-mint-500/10 px-4 py-3 text-[12.5px] text-mint-200">
      {message}
    </div>
  )
}

export const fieldClass =
  'w-full rounded-xl border border-white/12 bg-ink-900/60 px-3.5 py-2.5 text-[13px] text-cream placeholder:text-ash focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/20'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.09em] text-mist">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ash">{hint}</span>}
    </label>
  )
}

export function DemoBadge({ children = 'Sample data' }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200">
      {children}
    </span>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/12 bg-ink-800 p-6 shadow-panel focus:outline-none"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold text-cream">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1 text-mist hover:bg-white/10 hover:text-cream">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function Progress({ value, max = 100 }: { value: number; max?: number }) {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100)
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-azure-500" style={{ width: `${percent}%` }} />
    </div>
  )
}
