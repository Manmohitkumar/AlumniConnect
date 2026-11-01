import { useLayoutEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MOTION_MEDIA } from './config'

gsap.registerPlugin(ScrollTrigger)

/**
 * Runs a GSAP scene inside a component-scoped context, only when the user has
 * not asked for reduced motion. Everything is reverted on unmount, so HMR and
 * StrictMode's double-effect cannot leave duplicate ScrollTriggers behind.
 */
export function useMotionScene(
  scope: RefObject<HTMLElement>,
  scene: () => void,
  deps: unknown[] = [],
) {
  useLayoutEffect(() => {
    const element = scope.current
    if (!element) return

    const media = gsap.matchMedia()
    media.add(MOTION_MEDIA, () => {
      const context = gsap.context(scene, element)
      return () => context.revert()
    })

    return () => media.revert()
    // Scene closures are intentionally recreated only when deps change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export { gsap, ScrollTrigger }
