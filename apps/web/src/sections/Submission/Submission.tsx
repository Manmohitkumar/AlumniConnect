import { useState } from 'react'
import { FileText, Check } from 'lucide-react'

type SubmissionFormValues = {
  title: string
  description: string
  repoUrl: string
  demoUrl: string
  files: File[]
  supportingDocs: File[]
}

export function ProjectSubmission({ onSubmit }: { onSubmit: (values: SubmissionFormValues) => void }) {
  const [form, setForm] = useState<SubmissionFormValues>({
    title: '', description: '', repoUrl: '', demoUrl: '', files: [], supportingDocs: [],
  })
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'files' | 'supporting') => {
    const files = Array.from(e.target.files || [])
    setForm((prev) => ({ ...prev, [type]: [...(prev as any)[type], ...files] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProgress(20)
    if (!form.title.trim()) { setError('Title is required'); setProgress(0); return }
    if (!form.description.trim()) { setError('Description is required'); setProgress(0); return }
    setProgress(50)
    setProgress(80)
    onSubmit({ ...form, files: [...form.files, ...form.supportingDocs] })
    setProgress(100)
    setTimeout(() => { setProgress(0); setError(null) }, 1500)
  }

  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-cream">Project Submission</h1>
          <p className="text-mist mt-2">Submit your solution to the challenge and demonstrate your skills.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <form onSubmit={handleSubmit} className="space-y-6 rounded-xl p-6 border border-border-bg bg-ink-800/50">
              <div>
                <label className="block text-sm uppercase tracking-[0.1em] text-mist mb-1">
                  Project Title <span className="text-[10px] text-brand-500">*</span>
                </label>
                <input type="text" name="title" value={form.title} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30" />
              </div>

              <div>
                <label className="block text-sm uppercase tracking-[0.1em] text-mist mb-1">
                  Description <span className="text-[10px] text-brand-500">*</span>
                </label>
                <textarea name="description" rows={4} value={form.description} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 resize-y" />
              </div>

              <div>
                <label className="block text-sm uppercase tracking-[0.1em] text-mist mb-1">GitHub Repository URL</label>
                <input type="text" name="repoUrl" value={form.repoUrl} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30" />
              </div>

              <div>
                <label className="block text-sm uppercase tracking-[0.1em] text-mist mb-1">Demo URL</label>
                <input type="text" name="demoUrl" value={form.demoUrl} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30" />
              </div>

              <div>
                <label className="block text-sm uppercase tracking-[0.1em] text-mist mb-1">
                  Project Files <span className="text-[10px] text-brand-500">*</span>
                </label>
                <div
                  className="border rounded-xl p-4 bg-ink-800/30 mb-3 cursor-pointer hover:border-brand-500/30 transition-colors"
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  <FileText className="h-4 w-4 text-mist mr-2 inline" />
                  <span>Click to upload or drag & drop files</span>
                  <p className="text-[10px] text-mist mt-1">Supported: PDF, ZIP, PNG, JPG, WEBP (max 5 files, 10MB each)</p>
                </div>
                <input type="file" id="file-upload-input" multiple className="hidden" onChange={(e) => handleFileChange(e, 'files')} />
              </div>

              <div>
                <label className="block text-sm uppercase tracking-[0.1em] text-mist mb-1">Supporting Documentation (optional)</label>
                <div
                  className="border rounded-xl p-3 bg-ink-800/30 mb-3 cursor-pointer hover:border-brand-500/30 transition-colors"
                  onClick={() => document.getElementById('supporting-upload-input')?.click()}
                >
                  <FileText className="h-4 w-4 text-mist mr-2 inline" />
                  <span>Upload proposals, reports, or presentations</span>
                  <p className="text-[10px] text-mist mt-1">Max 3 files, 5MB each</p>
                </div>
                <input type="file" multiple className="hidden" id="supporting-upload-input" onChange={(e) => handleFileChange(e, 'supporting')} />
              </div>

              {progress > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-mist mb-2">Uploading... {progress}%</div>
                  <div className="bg-ink-800/50 rounded-full h-2">
                    <div className="bg-brand-500 rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {error && <div className="mt-2 text-sm text-brand-400">{error}</div>}

              <button
                type="submit"
                disabled={progress > 0}
                className="btn-primary w-full py-3 text-[12px] uppercase tracking-[0.1em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {progress > 0 ? `Submitting (${progress}%)` : 'Submit Project'}
              </button>
            </form>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-[0.1em] text-brand-500 mb-3">Submission Guidelines</h3>
            <ul className="space-y-3 text-mist">
              <li className="flex items-start gap-2"><Check className="mr-2 h-4 w-4 text-brand-400 flex-shrink-0" /> All files must be under 10MB</li>
              <li className="flex items-start gap-2"><Check className="mr-2 h-4 w-4 text-brand-400 flex-shrink-0" /> Maximum 5 project files allowed</li>
              <li className="flex items-start gap-2"><Check className="mr-2 h-4 w-4 text-brand-400 flex-shrink-0" /> GitHub repositories must be public or have appropriate access</li>
              <li className="flex items-start gap-2"><Check className="mr-2 h-4 w-4 text-brand-400 flex-shrink-0" /> Demo URLs must be publicly accessible</li>
              <li className="flex items-start gap-2"><Check className="mr-2 h-4 w-4 text-brand-400 flex-shrink-0" /> Supporting docs should be PDFs or presentation files</li>
            </ul>

            <div className="mt-6 p-4 border rounded-xl border-border-bg bg-ink-800/50">
              <h4 className="text-[10px] uppercase tracking-[0.1em] text-brand-500 mb-2">File Types</h4>
              <p className="text-[10px] text-mist">Accepted: PDF, ZIP, PNG, JPG, WEBP, DOCS</p>
              <p className="text-[10px] text-mist">Rejected: Executables, scripts, SVG with handlers</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}