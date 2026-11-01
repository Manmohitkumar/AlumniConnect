import { UserRound } from 'lucide-react'
import type { Me } from '../../lib/apiClient'
import { Btn } from './ui'

function missingFor(me: Me): string[] {
  const missing: string[] = []
  if (!me.emailVerified) missing.push('verify your email')
  if (!me.headline) missing.push('a headline')
  if (!me.bio) missing.push('a short bio')
  if (me.role === 'STUDENT') {
    if (!me.studentProfile?.department) missing.push('your department')
    if (!me.studentProfile?.skills) missing.push('your skills')
    if (!me.studentProfile?.careerInterests) missing.push('career interests')
  } else if (me.role === 'ALUMNI') {
    if (!me.alumniProfile?.expertise) missing.push('your expertise')
    if (!me.alumniProfile?.company) missing.push('your company')
    if (!me.alumniProfile?.industry) missing.push('your industry')
  }
  return missing
}

export function CompletenessPrompt({ me, onNavigate }: { me: Me; onNavigate: (tab: string) => void }) {
  const missing = missingFor(me)
  if (missing.length === 0) return null
  const extra = missing.length - 3
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-400/25 bg-brand-500/[0.07] px-4 py-3">
      <div className="flex items-start gap-2.5">
        <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
        <div>
          <p className="text-[12.5px] font-semibold text-cream">Complete your profile</p>
          <p className="text-[11.5px] text-mist">
            Add {missing.slice(0, 3).join(' · ')}
            {extra > 0 ? ` and ${extra} more` : ''} — it improves recommendations
            {me.role === 'STUDENT' ? ' and mentor replies.' : ' and student requests.'}
          </p>
        </div>
      </div>
      <Btn size="sm" variant="secondary" onClick={() => onNavigate('profile')}>
        Complete profile
      </Btn>
    </div>
  )
}
