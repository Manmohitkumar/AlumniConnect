import { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle } from 'lucide-react'

type SubmissionRecord = {
  id: string
  challengeTitle: string
  title: string
  submittedAt: string
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REVISION_REQUESTED' | 'EVALUATED' | 'WITHDRAWN'
  score: number | null
  feedback: string | null
}

export function SubmissionHistory() {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([])
  const [filter, setFilter] = useState<'all' | 'submitted' | 'evaluated' | 'withdrawn'>('all')

  useEffect(() => {
    const demo: SubmissionRecord[] = [
      { id: '1', challengeTitle: 'Customer Complaint Analyzer', title: 'Prototype with complaint categorization', submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), status: 'EVALUATED', score: 92, feedback: 'Excellent problem-solving quality.' },
      { id: '2', challengeTitle: 'Smart Attendance System', title: 'Attendance tracker with React and Firebase', submittedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), status: 'UNDER_REVIEW', score: null, feedback: null },
      { id: '3', challengeTitle: 'Landing Page Prototype', title: 'Responsive landing page with modern UI', submittedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), status: 'EVALUATED', score: 76, feedback: 'Creative design.' },
    ]
    setSubmissions(demo)
  }, [])

  const filtered = filter === 'all' ? submissions : submissions.filter((s) => s.status.toLowerCase() === filter)

  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-cream">Submission History</h1>
          <div className="flex gap-2 mb-4 mt-4">
            {(['all', 'submitted', 'evaluated', 'withdrawn'] as const).map((f) => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''} px-4 py-2 text-sm`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {submissions.length === 0 && (
          <div className="empty-state text-center py-12">
            <Clock className="h-12 w-12 mx-auto mb-4 text-mist opacity-50" />
            <h3 className="text-lg font-display font-medium text-cream mb-2">No submissions found</h3>
            <p className="text-mist">Apply to challenges and submit projects to see your history here.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((sub) => {
            const statusIcon = sub.status === 'EVALUATED'
              ? <CheckCircle className="mr-2 h-4 w-4 text-mint-400" />
              : sub.status === 'REVISION_REQUESTED'
              ? <XCircle className="mr-2 h-4 w-4 text-brand-400" />
              : sub.status === 'WITHDRAWN'
              ? <XCircle className="mr-2 h-4 w-4 text-mist" />
              : null

            return (
              <article key={sub.id} className="group card elevated-card border border-[rgba(242,149,89,0.15)] rounded-2xl p-4 hover:shadow-card transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-display font-semibold text-cream group-hover:text-brand-400 transition-colors">
                      {sub.challengeTitle}
                    </h3>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-mist mb-1">{sub.title}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.08em]">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border-bg">
                  <div className="flex gap-2">
                    {statusIcon}
                    <span className="text-[10px] text-mist">{sub.status}</span>
                  </div>
                  {sub.score !== null && (
                    <div className="mt-2">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-brand-500">Score</p>
                      <p className="text-xl font-display font-bold text-brand-400">{sub.score}/100</p>
                    </div>
                  )}
                  {sub.feedback && (
                    <p className="mt-2 text-[10px] text-mist line-clamp-2">{sub.feedback.substring(0, 100)}...</p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}