import { useEffect, useState } from 'react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { Logo } from './Logo'
import { navLinks } from '../data/content'
import { LocaleSelect, useI18n } from '../lib/i18n'

export function Nav() {
  const { t, locale, setLocale } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('#top')
  const isHome = (window.location.pathname.replace(/\/+$/, '') || '/') === '/'

  const linkHref = (href: string) => (isHome ? href : `/${href}`)

  useEffect(() => {
    if (!isHome || !window.location.hash) return
    const id = window.location.hash.slice(1)
    let attempts = 0
    let timer = 0
    const tryScroll = () => {
      const target = document.getElementById(id)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      attempts += 1
      if (attempts < 60) timer = window.setTimeout(tryScroll, 60)
    }
    timer = window.setTimeout(tryScroll, 0)
    return () => window.clearTimeout(timer)
  }, [isHome])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const ids = navLinks.map((link) => link.href.slice(1))
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element))

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(`#${visible.target.id}`)
      },
      { rootMargin: '-40% 0px -52% 0px', threshold: [0, 0.15, 0.5] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="shell pt-3 sm:pt-4">
        <div
          className={`relative flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 transition-all duration-300 sm:px-4 ${
            scrolled || open
              ? 'border-[rgba(242,149,89,0.15)] bg-ink-950/85 shadow-[0_20px_60px_-30px_rgba(0,0,0,1)] backdrop-blur-xl'
              : 'border-transparent bg-transparent'
          }`}
        >
          <a href="#top" className="rounded-lg" aria-label="AlumniConnect home">
            <Logo />
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-0.5 xl:flex">
            {navLinks.map((link) => {
              const isActive = isHome && active === link.href
              return (
                <a
                  key={link.href}
                  href={linkHref(link.href)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative rounded-xl px-3 py-2 text-[13.5px] font-medium transition ${
                    isActive
                      ? 'bg-white/[0.06] text-cream'
                      : 'text-mist hover:bg-white/[0.04] hover:text-cream'
                  }`}
                >
                  {t(link.label)}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-[1px] h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent" />
                  )}
                </a>
              )
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <LocaleSelect
              value={locale}
              onChange={(code) => setLocale(code, { persist: false })}
              className="rounded-xl border border-border-bg bg-ink-800/60 px-2 py-1.5 text-[12px] text-cream outline-none focus:ring-2 focus:ring-brand-400/30"
            />
            <a href="/login" className="btn-secondary !px-4 !py-2 !text-[13px] !rounded-xl">
              {t('Login')}
            </a>
            <a href="/register" className="btn-primary !px-4 !py-2 !text-[13px] !rounded-xl">
              {t('Get Started')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="btn-secondary !h-10 !w-10 !rounded-xl !p-0 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={t(open ? 'Close menu' : 'Open menu')}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <div
            id="mobile-nav"
            className={`absolute inset-x-0 top-full mt-2 overflow-hidden rounded-2xl border border-[rgba(242,149,89,0.15)] bg-ink-900/95 shadow-card backdrop-blur-xl transition-all duration-300 lg:hidden ${
              open ? 'max-h-[32rem] opacity-100' : 'pointer-events-none max-h-0 opacity-0'
            }`}
          >
            <nav aria-label="Mobile" className="flex flex-col p-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={linkHref(link.href)}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-white/[0.05] hover:text-cream ${
                    isHome && active === link.href ? 'text-cream' : 'text-mist'
                  }`}
                >
                  {t(link.label)}
                </a>
              ))}
            </nav>
            <div className="grid grid-cols-2 gap-2 border-t border-[rgba(242,149,89,0.12)] p-3">
              <LocaleSelect
                value={locale}
                onChange={(code) => setLocale(code, { persist: false })}
                className="col-span-2 rounded-xl border border-border-bg bg-ink-800/60 px-3 py-2.5 text-[13px] text-cream outline-none focus:ring-2 focus:ring-brand-400/30"
              />
              <a href="/login" className="btn-secondary !py-2.5 !text-[13px]" onClick={() => setOpen(false)}>
                {t('Login')}
              </a>
              <a href="/register" className="btn-primary !py-2.5 !text-[13px]" onClick={() => setOpen(false)}>
                {t('Get Started')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
