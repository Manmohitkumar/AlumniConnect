import { ArrowUpRight, Download, TrendingUp } from 'lucide-react'
import { departmentData, engagementSeries, universityMetrics } from '../data/content'

function LineChart() {
  const width = 300
  const height = 100
  const max = Math.max(...engagementSeries)
  const step = width / (engagementSeries.length - 1)
  const points = engagementSeries.map((value, index) => {
    const x = index * step
    const y = height - (value / max) * (height - 14) - 6
    return { x, y }
  })
  const line = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
  const last = points[points.length - 1]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="admin-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F29559" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#F29559" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="admin-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#B8B08D" />
          <stop offset="100%" stopColor="#F2D492" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line key={ratio} x1="0" y1={height * ratio} x2={width} y2={height * ratio} stroke="rgba(242,149,89,0.1)" strokeWidth="1" />
      ))}
      <polygon points={`0,${height} ${line} ${width},${height}`} fill="url(#admin-area)" />
      <polyline points={line} fill="none" stroke="url(#admin-line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="3" fill="#F2D492" />
      <circle cx={last.x} cy={last.y} r="6" fill="#F2D492" opacity="0.2" />
    </svg>
  )
}

export function AdminMockup() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_20%_10%,rgba(184,176,141,0.18),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(242,149,89,0.2),transparent_55%)] blur-xl"
      />

      <div className="gradient-border rounded-3xl bg-ink-900/85 p-2 shadow-panel backdrop-blur">
        <div className="rounded-[18px] bg-ink-850 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12.5px] font-semibold text-cream">University engagement</p>
              <p className="text-[9px] text-ash">Academic year overview</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="demo-note !text-[7.5px]">Demo data</span>
              <span className="grid h-6 w-6 place-items-center rounded-md border border-white/10 text-mist">
                <Download className="h-3 w-3" />
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {universityMetrics.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5">
                <p className="truncate text-[8px] uppercase tracking-[0.1em] text-ash">{metric.label}</p>
                <p className="mt-1 font-display text-base font-semibold leading-none text-cream">{metric.value}</p>
                <p className="mt-1 text-[7.5px] text-mint-400">{metric.trend}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-cream">Engagement trend</p>
                <span className="inline-flex items-center gap-1 text-[8px] text-mint-400">
                  <TrendingUp className="h-2.5 w-2.5" /> +18%
                </span>
              </div>
              <LineChart />
              <div className="mt-1 flex justify-between text-[7px] text-ash">
                <span>Term 1</span>
                <span>Term 2</span>
                <span>Term 3</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-semibold text-cream">Participation by department</p>
              <div className="mt-2 space-y-1.5">
                {departmentData.map((department) => (
                  <div key={department.label}>
                    <div className="flex items-center justify-between text-[7.5px]">
                      <span className="truncate text-mist">{department.label}</span>
                      <span className="text-ash">{department.value}%</span>
                    </div>
                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-mint-400"
                        style={{ width: `${department.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
            <span className="text-[8px] text-ash">Alumni profile updates · 34 this month</span>
            <span className="inline-flex items-center gap-1 text-[8px] font-medium text-brand-300">
              Export report <ArrowUpRight className="h-2.5 w-2.5" />
            </span>
          </div>

          <p className="mt-2 text-[7.5px] leading-snug text-ash">
            Demonstration data. Engagement reports support institutional documentation and do not guarantee
            accreditation scores or rankings.
          </p>
        </div>
      </div>
    </div>
  )
}
