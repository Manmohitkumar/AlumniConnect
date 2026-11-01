/**
 * Motion tokens for the landing page.
 *
 * These timings are authored for this implementation. They were NOT measured
 * from a reference video — none was supplied with the brief — so treat them as
 * a deliberate motion system rather than a frame-accurate reproduction.
 */
export const motion = {
  ease: {
    out: 'power3.out',
    soft: 'power2.out',
    inOut: 'power2.inOut',
  },
  duration: {
    micro: 0.45,
    fast: 0.6,
    base: 0.8,
    slow: 1.1,
    draw: 1.6,
  },
  stagger: {
    tight: 0.06,
    base: 0.1,
    loose: 0.14,
  },
} as const

export const MOTION_MEDIA = '(prefers-reduced-motion: no-preference)'
export const REDUCED_MOTION_MEDIA = '(prefers-reduced-motion: reduce)'
