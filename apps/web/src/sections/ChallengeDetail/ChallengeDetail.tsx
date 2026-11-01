import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'

type Criterion = { id: string; label: string; maxPoints: number }

type ChallengeDetailData = {
  id: string
  slug: string
  title: string
  problemStatement: string
  category: string
  deliverables: string
  durationDays: number
  deadline: string
  isPaid: boolean
  author: { name: string; company: string }
  skills: string[]
  participants: number
  submissions: number
  evaluationCriteria: Criterion[]
}

export function ChallengeDetail() {
  const slug = window.location.pathname.split('/').pop() || 'customer-complaint-analyzer'
  const [challenge, setChallenge] = useState<ChallengeDetailData | null>(null)
  const [tab, setTab] = useState<'overview' | 'participation' | 'evaluation'>('overview')

  useEffect(() => {
    const demo: ChallengeDetailData = {
      id: '1',
      slug: slug || 'customer-complaint-analyzer',
      title: 'Customer Complaint Analyzer',
      problemStatement: 'Our company receives hundreds of customer complaints weekly. We need a prototype that groups complaints by topic and shows common issues.',
      category: 'Technical',
      deliverables: 'Working prototype, source code, demo, short explanation',
      durationDays: 14,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      isPaid: false,
      author: { name: 'Meera Nair', company: 'TechCorp' },
      skills: ['Python', 'Data Analysis', 'Web Development'],
      participants: 24,
      submissions: 3,
      evaluationCriteria: [
        { id: '1', label: 'Problem-solving quality', maxPoints: 40 },
        { id: '2', label: 'Functionality', maxPoints: 30 },
        { id: '3', label: 'Creativity', maxPoints: 20 },
        { id: '4', label: 'Documentation and presentation', maxPoints: 10 },
      ],
    }
    setChallenge(demo)
  }, [slug])

  if (!challenge) {
    return (
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xl text-mist">Challenge not found</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-semibold text-cream">{challenge.title}</h1>
            <p className="text-[11px] uppercase tracking-[0.1em] text-brand-500 mb-3">{challenge.category} Challenge</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => (window.location.href = '/')} className="text-mist hover:text-brand-400">
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm text-mist">Back home</span>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {(['overview', 'participation', 'evaluation'] as const).map((t) => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''} px-4 py-2 text-sm font-semibold transition-colors`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="mt-8 space-y-6">
            <p className="text-mist">{challenge.problemStatement}</p>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm uppercase tracking-[0.1em] text-brand-500 mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {challenge.skills.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium bg-brand-500/15 text-brand-300">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm uppercase tracking-[0.1em] text-brand-500 mb-3">Expected Deliverables</h3>
                <ul className="space-y-2 text-mist">
                  {challenge.deliverables.split(',').map((d, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="flex-shrink-0 text-brand-400 h-4 w-4" />
                      <span className="flex-1">{d.trim()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {challenge.isPaid && (
              <div className="pt-4 border-t border-border-bg">
                <p className="text-[10px] uppercase tracking-[0.1em] text-brand-500 mb-2">Paid task</p>
                <p className="text-mist">Reward terms will be discussed upon selection.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'participation' && (
          <div className="mt-8">
            <div className="card elevated-card border border-[rgba(242,149,89,0.15)] rounded-2xl p-6 mb-6">
              <h3 className="text-sm uppercase tracking-[0.1em] text-brand-500 mb-3">Challenge Participation</h3>
              <p className="text-mist mb-4">{challenge.participants} students have already joined this challenge.</p>
              <button className="btn-primary w-full py-2.5 text-[11px] uppercase tracking-[0.1em]">Join Challenge</button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm uppercase tracking-[0.1em] text-brand-500 mb-2">Important Dates</h4>
                <dl className="flex flex-col space-y-2">
                  <dt className="text-[10px] uppercase tracking-[0.08em] text-brand-500">Application Deadline</dt>
                  <dd className="text-sm text-mist">{new Date(challenge.deadline).toLocaleDateString()}</dd>
                  <dt className="text-[10px] uppercase tracking-[0.08em] text-brand-500">Challenge Duration</dt>
                  <dd className="text-sm text-mist">{challenge.durationDays} days</dd>
                </dl>
              </div>
              <div>
                <h4 className="text-sm uppercase tracking-[0.1em] text-brand-500 mb-2">Submission Count</h4>
                <p className="text-mist">{challenge.submissions} submissions received so far.</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'evaluation' && (
          <div className="mt-8">
            <div className="card elevated-card border border-[rgba(242,149,89,0.15)] rounded-2xl p-6">
              <h3 className="text-sm uppercase tracking-[0.1em] text-brand-500 mb-4">Evaluation Rubric</h3>
              <p className="text-mist mb-4">Scores are evaluated against the following criteria. Total: 100 points.</p>
              <div className="space-y-3">
                {challenge.evaluationCriteria.map((criterion) => (
                  <div key={criterion.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-brand-500 mb-1">{criterion.label}</p>
                      <p className="text-sm text-mist">Max: {criterion.maxPoints}</p>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min={0}
                        max={criterion.maxPoints}
                        className="w-full border border-border-bg rounded-xl px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                        defaultValue={0}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border-bg">
                <p className="text-[10px] uppercase tracking-[0.1em] text-brand-500">Total Score</p>
                <p className="text-2xl font-display font-bold text-brand-400">0 / 100</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}