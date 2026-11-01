import { BadgeCheck, ShieldCheck } from 'lucide-react'
import { QrPattern } from './QrPattern'

type CertificateMockupProps = {
  compact?: boolean
  className?: string
}

export function CertificateMockup({ compact = false, className = '' }: CertificateMockupProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-[#FAF8FF] via-[#F3F0FF] to-[#E9E5FB] text-ink-950 shadow-panel ${className}`}
    >
      <div aria-hidden="true" className="absolute -right-16 -top-16 h-40 w-40 rounded-full border border-brand-500/20" />
      <div aria-hidden="true" className="absolute -right-10 -top-10 h-28 w-28 rounded-full border border-brand-500/15" />
      <div aria-hidden="true" className="absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-mint-400/10 blur-2xl" />

      <div className={`relative ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="grid h-4 w-4 place-items-center rounded bg-gradient-to-br from-brand-500 to-mint-400 text-[7px] font-bold text-ink-950">
                AC
              </span>
              <span className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-brand-300">
                AlumniConnect
              </span>
            </div>
            <p className="mt-2.5 text-[8.5px] font-semibold uppercase tracking-[0.2em] text-ash">
              Alumni Appreciation
            </p>
            <h3 className={`font-display font-semibold leading-tight ${compact ? 'text-base' : 'text-xl sm:text-2xl'}`}>
              Certificate of Appreciation
            </h3>
          </div>
          <div className="shrink-0 rounded-lg bg-ink-950 p-1.5 text-white shadow-lg">
            <QrPattern className={compact ? 'h-10 w-10' : 'h-14 w-14'} seed={11} />
          </div>
        </div>

        <div className={compact ? 'mt-3' : 'mt-4'}>
          <p className="text-[8.5px] uppercase tracking-[0.16em] text-ash">Presented to</p>
          <p className={`font-display font-semibold ${compact ? 'text-[15px]' : 'text-lg'}`}>Student Name</p>
          <p className="mt-0.5 text-[9.5px] text-ash">Computer Science · Class of 2026</p>
        </div>

        <div className={compact ? 'mt-2.5' : 'mt-3.5'}>
          <p className="text-[8.5px] uppercase tracking-[0.16em] text-ash">For outstanding work on</p>
          <p className={`font-medium ${compact ? 'text-[11.5px]' : 'text-[13px]'}`}>Sample Challenge Title</p>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1">
          {['Problem solving', 'Prototyping', 'Data analysis'].map((skill) => (
            <span
              key={skill}
              className="rounded-md border border-brand-500/20 bg-brand-500/[0.07] px-1.5 py-0.5 text-[8px] font-medium text-brand-300"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3 border-t border-ink-900/10 pt-2.5">
          <div>
            <p className="text-[7.5px] uppercase tracking-[0.14em] text-ash">Issued by</p>
            <p className="text-[9.5px] font-semibold">Alumnus Name</p>
            <p className="text-[8px] text-ash">Alumnus · Industry mentor</p>
          </div>
          <div className="text-right">
            <p className="text-[7.5px] uppercase tracking-[0.14em] text-ash">Date</p>
            <p className="text-[9px] font-medium">— — 2026</p>
          </div>
          <div className="text-right">
            <p className="text-[7.5px] uppercase tracking-[0.14em] text-ash">Certificate ID</p>
            <p className="font-mono text-[8.5px] font-semibold">AC-2026-0000</p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-mint-500/25 bg-mint-400/[0.12] px-2 py-1.5">
          <span className="inline-flex items-center gap-1 text-[8px] font-semibold text-emerald-700">
            <BadgeCheck className="h-3 w-3" /> QR verified
          </span>
          <span className="inline-flex items-center gap-1 text-[8px] text-ash">
            <ShieldCheck className="h-2.5 w-2.5" /> SHA-256 sealed
          </span>
        </div>

        {!compact && (
          <p className="mt-2 text-[7.5px] leading-snug text-ash">
            Alumni appreciation record — not an official university credential. Sample preview with placeholder
            data.
          </p>
        )}
      </div>
    </div>
  )
}
