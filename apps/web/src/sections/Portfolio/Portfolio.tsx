import { useState } from 'react'

type Project = {
  id: string
  title: string
  description: string
  githubUrl: string
  demoUrl: string
  technologies: string[]
  completedAt: string
  challenge: string | null
}

type Certificate = {
  id: string
  title: string
  challenge: string
  issuedAt: string
  certificateId: string
}

export function PortfolioPage() {
  const [tab, setTab] = useState<'projects' | 'certificates' | 'challenges'>('projects')

  const projects: Project[] = [
    {
      id: '1',
      title: 'Customer Complaint Analyzer',
      description: 'Prototype with complaint categorization using Python and React',
      githubUrl: 'https://github.com/user/complaint-analyzer',
      demoUrl: 'https://demo.complaint-analyzer.com',
      technologies: ['Python', 'React', 'Data Analysis'],
      completedAt: new Date().toISOString(),
      challenge: 'Customer Complaint Analyzer',
    },
    {
      id: '2',
      title: 'Smart Attendance System',
      description: 'Attendance tracker with React and Firebase',
      githubUrl: 'https://github.com/user/smart-attendance',
      demoUrl: 'https://demo.attendance-system.com',
      technologies: ['React', 'Firebase'],
      completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      challenge: 'Smart Attendance System',
    },
    {
      id: '3',
      title: 'Landing Page Prototype',
      description: 'Responsive landing page with modern UI',
      githubUrl: 'https://github.com/user/landing-page',
      demoUrl: 'https://demo.landing-page.com',
      technologies: ['Figma', 'React', 'CSS'],
      completedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      challenge: 'Landing Page Prototype',
    },
  ]

  const certificates: Certificate[] = [
    {
      id: '1',
      title: 'Customer Complaint Analyzer - Winner',
      challenge: 'Customer Complaint Analyzer',
      issuedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      certificateId: 'CCA-2024-001',
    },
    {
      id: '2',
      title: 'Landing Page Prototype - Excellence',
      challenge: 'Landing Page Prototype',
      issuedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      certificateId: 'LPP-2024-015',
    },
  ]

  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-cream">
            My Portfolio
          </h1>
          <p className="text-mist mt-2">Demonstrate your skills and accomplishments</p>
        </header>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            className={`tab-btn ${tab === 'projects' ? 'active' : ''} px-4 py-2 text-sm font-semibold transition-colors`}
            onClick={() => setTab('projects')}
          >
            Projects
            <span className="ml-2 text-[10px] bg-brand-500/20 text-brand-300 rounded-full">{projects.length}</span>
          </button>
          <button
            className={`tab-btn ${tab === 'certificates' ? 'active' : ''} px-4 py-2 text-sm font-semibold transition-colors}`}
            onClick={() => setTab('certificates')}
          >
            Certificates
            <span className="ml-2 text-[10px] bg-brand-500/20 text-brand-300 rounded-filter">{certificates.length}</span>
          </button>
          <button
            className={`tab-btn ${tab === 'challenges' ? 'active' : ''} px-4 py-2 text-sm font-semibold transition-colors}`}
            onClick={() => setTab('challenges')}
          >
            Challenge History
            <span className="ml-2 text-[10px] bg-brand-500/20 text-brand-300 rounded-filter">{projects.length}</span>
          </button>
        </div>

        {tab === 'projects' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <article
                key={project.id}
                className="reveal card elevated-card border border-[rgba(242,149,89,0.15)] rounded-2xl p-4 hover:shadow-card transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-display font-semibold text-cream group-hover:text-brand-400 transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-mist mb-1">
                      {project.challenge || 'Independent project'}
                    </p>
                    <p className="text-mist line-clamp-2">
                      {project.description.substring(0, 100)}...
                    </p>
                  </div>
                  <div className="w-16">
                    <div className="flex gap-2">
                      {project.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-medium bg-brand-500/15 text-brand-300 rounded px-2 py-0.5"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border-bg">
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-brand-400 hover:underline"
                  >
                    GitHub
                  </a>
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-brand-400 hover:underline ml-3"
                  >
                    Demo
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

        {tab === 'certificates' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {certificates.map((cert) => (
              <article
                key={cert.id}
                className="reveal card elevated-card border border-[rgba(242,149,89,0.15)] rounded-2xl p-4 hover:shadow-card transition-shadow"
              >
                <div className="text-center">
                  <span className="text-2xl font-display font-bold text-brand-400">{cert.certificateId}</span>
                  <h3 className="mt-3 text-lg font-display font-semibold text-cream">{cert.title}</h3>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-mist">{cert.challenge}</p>
                  <p className="mt-1 text-[10px] text-mist">{new Date(cert.issuedAt).toLocaleDateString()}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        {tab === 'challenges' && (
          <div className="py-8">
            <h3 className="text-sm uppercase tracking-[0.1em] text-brand-500 mb-3">Challenge Participation History</h3>
            <p className="text-mist mb-4">Projects completed through AlumniConnect challenges</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...new Set(projects.map(p => p.challenge))].map((challenge) => (
                <article
                  key={challenge}
                  className="reveal border rounded-xl p-3 hover:shadow-card transition-shadow"
                >
                  <p className="text-[10px] uppercase tracking-[0.08em] text-brand-500">{challenge}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}