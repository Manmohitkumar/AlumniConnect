# AlumniConnect — Landing Page Motion System

## Reference-video status (read this first)

A reference clip was supplied: `WhatsApp Video 2026-10-31 at 11.58.19.mp4`
(1600×1200, 60 fps, 28.77 s, no audio).

It was analysed **numerically only** — frame statistics, scene/colour/motion
profiles extracted with FFmpeg. The person who built this motion layer cannot
view images in this session, so **no claim is made that the layout, composition
or choreography of the reference was visually matched**. What the video
*does* tell us with evidence is its overall tone and motion energy, and the
implementation was tuned against those measurements.

If you can describe specific moments (e.g. "at 0:09 the hero cards fan out"),
those can be reproduced precisely.

### Measured profile of the reference

The clip is a **light-framed presentation**: every frame has a bright border
(~110 luma) on all four sides with a dark site inside it. Whole-frame averages
are therefore misleading. Measured on the **interior region only** (5% side
margins, 7% top/bottom):

| Metric | Reference interior | This page (hero) |
|---|---|---|
| Average colour | `#17172a` | `#181530` |
| Average luma (0–255) | 24.3 | 23.8 |
| Mid-tone pixels (> 90) | 4.8 % | 2.5 % |
| Near-white pixels (> 140) | 0.6 % | 0.6 % |
| Hue / saturation | ~252°, 24 % | ~250°, 30 % |
| Motion energy (mean frame delta, 4 fps) | 6.99 | — |
| Motion peaks | 0.75 s, 9.0 s, 10.75 s, 21.75 s, 26.75 s | — |

Conclusion drawn from the data: the reference is a **neutral blue-violet dark
theme** (not the magenta-leaning `#1e0c25` this page started at), with
**continuous motion** and a large transition roughly every 5–10 s. The recorded
brightness was a framing artefact, so no brightening of the palette was needed —
only neutralising the ambient wash and adding a soft focal glow behind the hero.

### What changed because of this

1. Body ambient gradients reduced magenta bias and gained a neutral indigo layer
   (`rgba(126,130,190,…)`) — hue moved from ~285° to ~250°.
2. Hero gained a wide, soft focal aurora behind the headline, lifting the
   darkest band of the viewport (luma 15.7 → 20.9) without touching palette
   tokens.
3. No palette token, card colour or text colour was altered.

## Motion tokens

Defined in `apps/web/src/animations/config.ts`.

| Token | Value |
|---|---|
| Ease out / soft / in-out | `power3.out`, `power2.out`, `power2.inOut` |
| Durations (micro → draw) | 0.45 s, 0.6 s, 0.8 s, 1.1 s, 1.6 s |
| Stagger (tight / base / loose) | 0.06 s, 0.1 s, 0.14 s |
| Motion media query | `(prefers-reduced-motion: no-preference)` |

## Animation specification

| Element | Initial state | Final state | Trigger | Duration / easing | Owner |
|---|---|---|---|---|---|
| Hero badge | 14 px down, hidden | in place, visible | page load | 0.45 s `power3.out` | GSAP timeline |
| Hero headline lines (×3) | 38 px down, hidden | in place | page load, 0.1 s stagger | 0.8 s `power3.out` | GSAP timeline |
| Hero paragraph | 18 px down, hidden | in place | after headline (−0.5 s offset) | 0.6 s | GSAP timeline |
| Hero CTAs | 12 px down, hidden | in place, 0.06 s stagger | after paragraph | 0.6 s | GSAP timeline |
| Hero trust points | 8 px down, hidden | in place, 0.06 s stagger | after CTAs | 0.45 s | GSAP timeline |
| Hero dashboard | 46 px down, 0.97 scale, hidden | in place, full scale | hero entrance | 1.1 s `power2.out` | GSAP timeline |
| Hero orb A / orb B | static | parallax 20 % / −14 % on scroll | scroll scrub 0.6–0.8 | `none` | GSAP ScrollTrigger |
| Dashboard metrics | 0 | final value | in view (35 % threshold) | 1.3 s cubic ease-out | `Counter` rAF |
| About orbit lines | dash offset 260, faded | drawn, 0.6 opacity | in view at 82 % | 1.6 s `power2.inOut`, 0.1 s stagger | GSAP |
| About orbit rings | hidden | visible | in view at 82 % | 1.1 s, 0.12 s stagger | GSAP |
| Workflow connector | `scaleX/Y: 0` | `1` from top-left | in view at 70 % | 1.6 s `power2.inOut` | GSAP |
| Collaboration chain line | `scaleX: 0` | `1` from left | in view at 68 % | 1.6 s | GSAP |
| Certificate | 48 px down, 3° rotation, hidden | in place | in view at 86 % | 1.1 s `power2.out` | GSAP |
| All other sections | hidden | visible | IntersectionObserver | 0.7 s CSS | `Reveal` |

Only one library owns each element: GSAP handles the scenes above, CSS handles
ambient loops (orb pulse, dash flow, ring spin) and generic `Reveal` fades.
Nothing is animated twice.

## Architecture

```
apps/web/src/
├── animations/
│   ├── config.ts          # tokens + media queries
│   └── useMotionScene.ts  # scoped GSAP context, reduced-motion guard, cleanup
├── components/
│   └── Counter.tsx        # in-view count-up, SSR-safe, reduced-motion aware
```

`useMotionScene` wraps every scene in `gsap.matchMedia()` and `gsap.context()`
and reverts both on unmount, so React StrictMode's double effect and HMR cannot
leave duplicate ScrollTriggers or listeners behind.

## Reduced motion

When `prefers-reduced-motion: reduce` is active:

- `useMotionScene` never registers a scene, so elements keep their natural
  final state — nothing is left hidden.
- `Counter` renders the final value immediately.
- CSS animations are already disabled in `index.css` via the reduced-motion
  media query.

Verified: hero elements `opacity: 1 / visibility: visible`, counters show
`24 / 156 / 42 / 18`, certificate `transform: none`.

## Performance

- GSAP + ScrollTrigger only; no Framer Motion, no Lenis, no Three.js added.
- All scroll triggers use `once: true` except the two hero parallax scrubs.
- Animations only touch `transform` and `opacity`.
- Bundle cost: production JS 391 KB (123 KB gzip) including GSAP.
- No layout shift is introduced: initial states are applied in
  `useLayoutEffect` before paint.

## Verification (run 2026-10-31)

| Check | Result |
|---|---|
| `npm run typecheck` (web + api) | pass |
| `vite build` | pass, 1617 modules |
| Console errors | 0 |
| Page errors | 0 |
| Hidden reveals in view after full scroll | 0 of 70 |
| Horizontal overflow @ 1440 / 1280 / 1024 / 768 / 390 / 360 | none |
| Animation end states (certificate, orbit, connector, chain) | all settled at final values |
