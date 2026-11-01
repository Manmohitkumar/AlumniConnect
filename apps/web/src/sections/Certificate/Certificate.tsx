import { useState } from 'react'
import { Download, ShieldCheck } from 'lucide-react'

type Certificate = {
  id: string
  studentName: string
  challengeTitle: string
  issuingAlumni: string
  issueDate: string
  certificateId: string
  verificationCode: string
}

export function CertificatePage({ certificate }: {
  certificate: Certificate
}) {
  const [showDownload, setShowDownload] = useState(false)

  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-ink-800/80 rounded-2xl p-8 border border-border-bg backdrop-blur-sm mb-8">
          <div className="text-center mb-6">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-brand-500/10 flex items-center justify-center mb-4">
              <ShieldCheck className="h-12 w-12 text-brand-400" />
            </div>
            <h2 className="text-3xl font-display font-bold text-brand-400">Certificate Generated</h2>
            <p className="text-mist">Your appreciation certificate is ready.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-[0.1em] text-brand-500 mb-3">Certificate Details</h3>
              <p className="text-mist"><strong>Student:</strong> {certificate.studentName}</p>
              <p className="text-mist"><strong>Challenge:</strong> {certificate.challengeTitle}</p>
              <p className="text-mist"><strong>Issued by:</strong> {certificate.issuingAlumni}</p>
              <p className="text-mist"><strong>Date:</strong> {new Date(certificate.issueDate).toLocaleDateString()}</p>
              <p className="text-mist"><strong>Certificate ID:</strong> {certificate.certificateId}</p>
              <p className="text-mist"><strong>Verification Code:</strong> {certificate.verificationCode}</p>
            </div>

            <div>
              <h3 className="text-sm uppercase tracking-[0.1em] text-brand-500 mb-3">Actions</h3>
              <button
                onClick={() => setShowDownload(true)}
                className="w-full py-2.5 text-[11px] uppercase tracking-[0.1em] text-brand-400/70 hover:text-brand-400 transition-colors"
              >
                Download Certificate
              </button>
              <button
                className="w-full py-2.5 text-[11px] uppercase tracking-[0.1em] text-brand-400/70 hover:text-brand-400 transition-colors mt-3"
              >
                Share Certificate
              </button>
            </div>
          </div>
        </div>

        {showDownload && (
          <div className="mt-8">
            <div className="bg-ink-800/50 rounded-2xl p-6 text-center mb-6">
              <Download className="h-8 w-8 mx-auto mb-3 text-brand-400" />
              <p className="text-mist">Downloading your certificate...</p>
            </div>
            <p className="text-[11px] text-mist">Your certificate will be downloaded as a PDF file.</p>
            <button className="mt-4 btn-primary px-6 py-2.5 text-[11px] uppercase tracking-[0.1em]">Open File</button>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-sm uppercase tracking-[0.1em] text-brand-500 mb-3">Verification Page</h3>
          <p className="text-mist">
            Share this verification link with others:
            <code className="bg-ink-800/50 rounded px-3 py-2 text-sm display-block overflow-x-auto">
              /verify-certificate?id={certificate.id}
            </code>
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.08em] text-mist">This platform certificate is appreciation recognition and is not an official academic credential.</p>
        </div>
      </div>
    </section>
  )
}