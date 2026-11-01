import { useState } from 'react'
import { Check } from 'lucide-react'

type EvaluationForm = {
  criteria: Record<string, number>
  overallScore: number
  feedback: string
}

export function EvaluationPage({ submissionId }: { submissionId: string }) {
  const [form, setForm] = useState<EvaluationForm>({ criteria: {}, overallScore: 0, feedback: '' })
  const [showThankYou, setShowThankYou] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCriterionChange = (criterionId: string, value: number) => {
    setForm((prev) => ({ ...prev, criteria: { ...prev.criteria, [criterionId]: value } }))
  }

  const handleSubmit = () => {
    if (form.overallScore > 100) { alert('Overall score cannot exceed 100'); return }
    if (!form.feedback.trim()) { alert('Feedback is required'); return }
    setShowThankYou(true)
    setTimeout(() => setShowThankYou(false), 2000)
  }

  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl font-display font-semibold text-cream mb-4">Evaluate Submission</h2>
          <p className="text-mist">Submission ID: {submissionId}</p>
        </div>

        {showThankYou && (
          <div className="bg-brand-500/20 rounded-2xl p-6 text-center mb-8">
            <Check className="h-12 w-12 mx-auto mb-4 text-brand-400" />
            <h3 className="text-2xl font-display font-bold text-brand-400">Evaluation Submitted</h3>
            <p className="text-mist">Your evaluation has been recorded.</p>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="space-y-6">
          <div>
            <h3 className="text-sm uppercase tracking-[0.1em] text-brand-500 mb-3">Evaluation Criteria</h3>
            <div className="space-y-3">
              {['Problem-solving quality', 'Functionality', 'Creativity', 'Documentation and presentation'].map((label, i) => (
                <div key={i} className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-brand-500 mb-1">{label}</p>
                    <p className="text-sm text-mist">Max: {25}</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      min={0}
                      max={25}
                      value={form.criteria[String(i)] || 0}
                      onChange={(e) => handleCriterionChange(String(i), parseInt(e.target.value) || 0)}
                      className="w-24 border border-border-bg rounded-xl px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.1em] text-mist mb-2">Overall Score</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.overallScore}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.1em] text-mist mb-2">Alumni Feedback</label>
            <textarea
              rows={4}
              value={form.feedback}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={form.overallScore === 0 || !form.feedback.trim()}
            className="w-full py-3 text-[12px] uppercase tracking-[0.1em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-brand-500 text-ink-900 rounded-xl font-semibold hover:bg-brand-400"
          >
            Submit Evaluation
          </button>
        </form>
      </div>
    </section>
  )
}