import { Boxes, ArrowRight } from 'lucide-react'

export function MetaverseHub() {
  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <span className="text-[11px] uppercase tracking-[0.1em] text-brand-500 mb-1">3D Metaverse</span>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-cream">Alumni Hub</h1>
          <p className="text-mist mt-2">Step into the existing 3D virtual campus — preserved and integrated.</p>
        </div>

        <div className="card elevated-card border border-[rgba(242,149,89,0.15)] rounded-2xl p-8 text-center">
          <Boxes className="h-12 w-12 mx-auto mb-4 text-brand-400" />
          <h2 className="text-2xl font-display font-semibold text-cream mb-3">Enter the 3D Hub</h2>
          <p className="text-mist mb-6 max-w-xl mx-auto">
            The Metaverse Hub runs as a standalone Three.js application with real 3D movement, camera controls, room environments, and avatar selection. Multiplayer, voice chat, and Ready Player Me rendering into the 3D scene are not yet live — see docs/METAVERSE-AUDIT.md.
          </p>
          <a
            href="/metaverse/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-[11px] uppercase tracking-[0.1em]"
          >
            Open Metaverse <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  )
}