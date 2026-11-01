import { useId } from 'react'

type LogoProps = {
  className?: string
  markOnly?: boolean
}

export function Logo({ className = '', markOnly = false }: LogoProps) {
  const gradientId = useId()

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F29559" />
            <stop offset="55%" stopColor="#B8B08D" />
            <stop offset="100%" stopColor="#F2D492" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill={`url(#${gradientId})`} />
        <path d="M9 19.6 20 14l11 5.6-11 5.6z" fill="#fff" />
        <path
          d="M13.6 22.3v4.5c0 1.7 2.9 3.2 6.4 3.2s6.4-1.5 6.4-3.2v-4.5"
          stroke="#fff"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="31" cy="19.6" r="1.6" fill="#202C39" />
      </svg>
      {!markOnly && (
        <span className="font-display text-[17px] font-semibold tracking-tight text-cream">
          Alumni<span className="gradient-text">Connect</span>
        </span>
      )}
    </span>
  )
}
