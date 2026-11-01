import { useEffect, useRef, useState } from 'react'

type CounterProps = {
  value: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}

/**
 * Counts up once when scrolled into view. Reduced-motion users and assistive
 * technology always get the final value immediately.
 */
export function Counter({ value, suffix = '', prefix = '', duration = 1300, className = '' }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver === 'undefined') {
      setDisplay(value)
      return
    }

    let frame = 0
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || started.current) return
        started.current = true
        const start = performance.now()

        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setDisplay(Math.round(value * eased))
          if (progress < 1) frame = requestAnimationFrame(tick)
        }

        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.35 },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value, duration])

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">
        {prefix}
        {display}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {value}
        {suffix}
      </span>
    </span>
  )
}
