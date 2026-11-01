import { lazy } from 'react'
import { Footer } from './components/Footer'
import { Logo } from './components/Logo'
import { Nav } from './components/Nav'
import { GuestOnly, ProtectedRoute } from './components/RouteGuard'
import { About } from './sections/About'
import { ChallengeShowcase } from './sections/ChallengeShowcase'
import { Collaboration } from './sections/Collaboration'
import { Events } from './sections/Events'
import { Features } from './sections/Features'
import { FinalCTA } from './sections/FinalCTA'
import { Hero } from './sections/Hero'
import { HowItWorks } from './sections/HowItWorks'
import { Mentorship } from './sections/Mentorship'
import { Metaverse } from './sections/Metaverse'
import { PortfolioSection } from './sections/PortfolioSection'
import { Problem } from './sections/Problem'
import { Recognition } from './sections/Recognition'
import { TrustStrip } from './sections/TrustStrip'
import { University } from './sections/University'

// Portal and dashboard code is only needed after navigation, so every route
// below is loaded on demand instead of inflating the landing-page bundle.
const PortalLogin = lazy(() => import('./pages/PortalLogin').then((module) => ({ default: module.PortalLogin })))
const RegisterPage = lazy(() => import('./pages/Register').then((module) => ({ default: module.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword').then((module) => ({ default: module.ResetPasswordPage })))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmail').then((module) => ({ default: module.VerifyEmailPage })))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard').then((module) => ({ default: module.StudentDashboard })))
const AlumniDashboard = lazy(() => import('./pages/AlumniDashboard').then((module) => ({ default: module.AlumniDashboard })))
const UniversityDashboard = lazy(() => import('./pages/UniversityDashboard').then((module) => ({ default: module.UniversityDashboard })))
const UniversityAdminDashboard = lazy(() =>
  import('./pages/UniversityAdminDashboard').then((module) => ({ default: module.UniversityAdminDashboard })),
)
const ChallengeDetailPage = lazy(() =>
  import('./pages/ChallengeDetailPage').then((module) => ({ default: module.ChallengeDetailPage })),
)
const VerifyPage = lazy(() =>
  import('./components/app/PortfolioCertificates').then((module) => ({ default: module.VerifyPage })),
)
const PublicPortfolioPage = lazy(() =>
  import('./components/app/PortfolioCertificates').then((module) => ({ default: module.PublicPortfolioPage })),
)

type Placeholder = {
  title: string
  phase: string
  summary: string
  points: string[]
}

function resolvePlaceholder(path: string): Placeholder | null {
  if (path === '/login') {
    return {
      title: 'Sign in to AlumniConnect',
      phase: 'Phase 5 · Authentication',
      summary:
        'One secure account for alumni, students, companies and university administrators. Role decides what you can see and do.',
      points: [
        'Email and password with secure hashing',
        'Role-based permissions on every route',
        'Session handling with refresh and revocation',
      ],
    }
  }

  if (path === '/register') {
    return {
      title: 'Create your account',
      phase: 'Phase 5 · Authentication',
      summary:
        'Registration opens with the authenticated build. Choose your role, verify your email, and complete the profile that fits it.',
      points: [
        'Student, alumnus, company or administrator',
        'Email verification and admin approval where required',
        'Profile setup flows into the shared data model',
      ],
    }
  }

  if (path === '/verify') {
    return {
      title: 'Certificate verification',
      phase: 'Phase 10 · Certificates & QR',
      summary:
        'Scan a certificate QR code to confirm the record, its issuer and its integrity hash — and to see exactly what it does not certify.',
      points: [
        'Lookup by certificate ID or verification code',
        'SHA-256 integrity check against the stored record',
        'Clear statement that this is alumni appreciation, not a university credential',
      ],
    }
  }

  if (path === '/hub') {
    return {
      title: 'Virtual campus',
      phase: 'Phase 14 · Metaverse Hub',
      summary:
        'The 3D lobby opens here, inside the same application. Rooms link back to the standard pages and the same API data.',
      points: [
        'Central lobby with five room entrances',
        'Challenge Arena and Innovation Lab first',
        'Graceful 2D fallback on low-power devices',
      ],
    }
  }

  if (path.startsWith('/p/')) {
    return {
      title: 'Student portfolio',
      phase: 'Phase 11 · Portfolio',
      summary:
        'A shareable portfolio page showing only what the student has chosen to publish, with consent-controlled recruiter access.',
      points: [
        'Completed challenges and project links',
        'Alumni feedback and appreciation records',
        'Visibility controls owned by the student',
      ],
    }
  }

  if (path === '/privacy' || path === '/terms') {
    return {
      title: path === '/privacy' ? 'Privacy policy' : 'Terms of service',
      phase: 'Phase 15 · Governance',
      summary:
        'Legal pages are written and reviewed before launch. Until then, no personal data is transmitted or stored by this preview.',
      points: [
        'Data minimisation and retention rules',
        'Student consent and revocation rights',
        'File handling and audit obligations',
      ],
    }
  }

  return null
}

function PlaceholderPage({ placeholder }: { placeholder: Placeholder }) {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 grid-lines" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-brand-500/[0.14] blur-[120px]"
      />

      <div className="shell relative max-w-2xl py-20">
        <a href="/" className="inline-flex rounded-lg" aria-label="Back to AlumniConnect home">
          <Logo />
        </a>

        <span className="eyebrow mt-10 inline-flex">{placeholder.phase}</span>
        <h1 className="mt-5 text-[2rem] font-semibold leading-tight sm:text-[2.6rem]">{placeholder.title}</h1>
        <p className="mt-4 text-[13.5px] leading-relaxed text-mist sm:text-[14.5px]">{placeholder.summary}</p>

        <ul className="mt-6 space-y-2.5">
          {placeholder.points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-[12.5px] text-mist">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-mint-400" />
              {point}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="/" className="btn-primary">
            Back to the landing page
          </a>
          <a href="/#features" className="btn-secondary">
            Explore features
          </a>
        </div>

        <p className="mt-10 text-[11px] leading-relaxed text-ash">
          This route is reserved and wired into the shared router. The module behind it is scheduled for{' '}
          {placeholder.phase.split('·')[0].trim()} of the build plan.
        </p>
      </div>
    </main>
  )
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  // The existing 3D Metaverse Hub is served as a static app from /metaverse/.
  if (path === '/metaverse') {
    window.location.replace('/metaverse/index.html')
    return null
  }

  // Phase 2 pages
  if (path === '/login') {
    const portal = new URLSearchParams(window.location.search).get('portal') ?? undefined
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <Nav />
        <GuestOnly>
          <PortalLogin portal={portal} />
        </GuestOnly>
      </div>
    )
  }
  if (path === '/student/login') {
    return <div className="relative min-h-screen overflow-x-hidden"><Nav /><GuestOnly><PortalLogin portal="student" /></GuestOnly></div>
  }
  if (path === '/alumni/login') {
    return <div className="relative min-h-screen overflow-x-hidden"><Nav /><GuestOnly><PortalLogin portal="alumni" /></GuestOnly></div>
  }
  if (path === '/university/login') {
    return <div className="relative min-h-screen overflow-x-hidden"><Nav /><GuestOnly><PortalLogin portal="university" /></GuestOnly></div>
  }
  if (path === '/admin/login') {
    return <div className="relative min-h-screen overflow-x-hidden"><Nav /><GuestOnly><PortalLogin portal="admin" /></GuestOnly></div>
  }
  if (path === '/forgot-password') {
    return <div className="relative min-h-screen overflow-x-hidden"><Nav /><ForgotPasswordPage /></div>
  }
  if (path === '/reset-password') {
    return <div className="relative min-h-screen overflow-x-hidden"><Nav /><ResetPasswordPage /></div>
  }
  if (path === '/verify-email') {
    return <div className="relative min-h-screen overflow-x-hidden"><Nav /><VerifyEmailPage /></div>
  }
  if (path === '/register') {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <Nav />
        <GuestOnly>
          <RegisterPage />
        </GuestOnly>
      </div>
    )
  }
  if (path === '/student/dashboard') {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <ProtectedRoute roles={['STUDENT']}>
          <StudentDashboard />
        </ProtectedRoute>
      </div>
    )
  }
  if (path === '/alumni/dashboard') {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <ProtectedRoute roles={['ALUMNI']}>
          <AlumniDashboard />
        </ProtectedRoute>
      </div>
    )
  }
  if (path === '/university/dashboard') {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <ProtectedRoute roles={['UNIVERSITY']}>
          <UniversityDashboard />
        </ProtectedRoute>
      </div>
    )
  }
  if (path === '/admin/dashboard') {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <ProtectedRoute roles={['ADMIN']}>
          <UniversityAdminDashboard />
        </ProtectedRoute>
      </div>
    )
  }
  if (path === '/logout') {
    void (async () => {
      const { logout } = await import('./lib/auth')
      await logout()
      window.location.replace('/login')
    })()
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <Nav />
        <p className="shell py-32 text-center text-[12px] uppercase tracking-[0.1em] text-mist">Signing out…</p>
      </div>
    )
  }

  if (path === '/verify') {
    const code = new URLSearchParams(window.location.search).get('code') ?? ''
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <Nav />
        <VerifyPage initialCode={code} />
        <Footer />
      </div>
    )
  }

  if (path.startsWith('/portfolio/')) {
    const userId = path.slice('/portfolio/'.length)
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <Nav />
        <PublicPortfolioPage userId={userId} />
        <Footer />
      </div>
    )
  }

  if (path.startsWith('/challenges/')) {
    const slug = path.slice('/challenges/'.length)
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <Nav />
        <ChallengeDetailPage slug={slug} />
        <Footer />
      </div>
    )
  }

  const placeholder = resolvePlaceholder(path)

  if (placeholder) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <Nav />
        <PlaceholderPage placeholder={placeholder} />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <About />
        <Problem />
        <Features />
        <HowItWorks />
        <Collaboration />
        <ChallengeShowcase />
        <Recognition />
        <PortfolioSection />
        <Mentorship />
        <Metaverse />
        <University />
        <Events />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
