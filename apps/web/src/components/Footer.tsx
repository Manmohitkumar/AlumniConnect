import { ArrowUpRight, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react'
import { Logo } from './Logo'
import { footerColumns, socials } from '../data/content'

const socialIcons = [Linkedin, Instagram, Facebook, Twitter]

export function Footer() {
  return (
    <footer id="contact" className="relative overflow-hidden border-t border-[rgba(242,149,89,0.12)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[46rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[110px]"
      />

      <div className="shell relative py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-[13.5px] leading-relaxed text-mist">
              Bringing alumni, students, universities and companies together through real-world
              collaboration and meaningful opportunities.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {socials.map((social, index) => {
                const Icon = socialIcons[index]
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-[rgba(242,149,89,0.15)] bg-white/[0.03] text-mist transition hover:border-[rgba(242,149,89,0.65)] hover:text-cream"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-cream">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="inline-block py-1 text-[13px] text-mist transition hover:text-cream">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-[rgba(242,149,89,0.15)] bg-white/[0.025] p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-[13px] font-medium text-cream">Have a problem worth solving?</p>
            <p className="mt-0.5 text-[12px] text-ash">
              Partner as an alumnus, a university or a company — or bring a challenge to the platform.
            </p>
          </div>
          <a href="#cta" className="btn-secondary mt-3 !px-4 !py-2 !text-[12.5px] sm:mt-0">
            Start a conversation
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-[rgba(242,149,89,0.1)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-ash">© 2026 AlumniConnect. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ash">
            <a href="/privacy" className="inline-block py-1 transition hover:text-cream">
              Privacy
            </a>
            <a href="/terms" className="inline-block py-1 transition hover:text-cream">
              Terms
            </a>
            <span className="hidden h-3 w-px bg-white/10 sm:block" />
            <span>Prototype build · UI foundation</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
