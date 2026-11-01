import { useState, useEffect } from 'react'
import { Search, Calendar } from 'lucide-react'

type Challenge = {
  id: string
  title: string
  slug: string
  category: string
  skills: string[]
  deadline: string
  participants: number
  isPaid: boolean
  status: 'OPEN' | 'CLOSED'
  organizer: {
    name: string
    company: string
    avatar: string
  }
  description: string
}

export function ChallengeManagement() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [filter, setFilter] = useState<'all' | 'technical' | 'creative' | 'business'>('all')
  const [search, setSearch] = useState('')

  // Demo data
  useEffect(() => {
    const demoChallenges: Challenge[] = [
      {
        id: '1',
        title: 'Customer Complaint Analyzer',
        slug: 'customer-complaint-analyzer',
        category: 'Technical',
        skills: ['Python', 'Data Analysis', 'Web Development'],
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        participants: 24,
        isPaid: false,
        status: 'OPEN',
        organizer: { name: 'Meera Nair', company: 'TechCorp', avatar: '' },
        description: 'Analyze customer complaints and identify common issues',
      },
      {
        id: '2',
        title: 'Smart Attendance System',
        slug: 'smart-attendance-system',
        category: 'Technical',
        skills: ['React', 'Firebase', 'Mobile Development'],
        deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        participants: 18,
        isPaid: true,
        status: 'OPEN',
        organizer: { name: 'John Smith', company: 'InnovateX', avatar: '' },
        description: 'Build an automated attendance tracking system',
      },
      {
        id: '3',
        title: 'Landing Page Prototype',
        slug: 'landing-page-prototype',
        category: 'Creative',
        skills: ['Figma', 'React', 'CSS'],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        participants: 8,
        isPaid: false,
        status: 'OPEN',
        organizer: { name: 'Sarah Johnson', company: 'DesignCo', avatar: '' },
        description: 'Create a modern responsive landing page',
      },
      {
        id: '4',
        title: 'Data Dashboard Redesign',
        slug: 'data-dashboard-redesign',
        category: 'Business',
        skills: ['Tableau', 'SQL', 'Data Visualization'],
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        participants: 12,
        isPaid: true,
        status: 'CLOSED',
        organizer: { name: 'Robert Chen', company: 'DataCo', avatar: '' },
        description: 'Redesign the company analytics dashboard',
      },
    ]

    setChallenges(demoChallenges)
  }, [])

  const filtered = challenges.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || c.category.toLowerCase().includes(filter)
    return matchesSearch && matchesFilter
  })

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const handleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value as any)
  }

  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-display font-semibold text-cream mb-6">Challenge Management</h2>

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
              <input
                type="text"
                placeholder="Search challenges..."
                value={search}
                onChange={handleSearch}
                className="pl-30 pr-4 py-2.5 w-full rounded-xl border border-border-bg bg-ink-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              />
            </div>
            <select
              value={filter}
              onChange={handleFilter}
              className="bg-ink-800/50 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 appearance-none"
            >
              <option value="all">All Challenges</option>
              <option value="technical">Technical</option>
              <option value="creative">Creative</option>
              <option value="business">Business</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Search className="h-12 w-12 mx-auto mb-4 text-mist opacity-50" />
              <h3 className="text-lg font-display font-medium text-cream mb-2">No challenges match your filters</h3>
              <p className="text-mist">Try adjusting your search or filters.</p>
              <a href="#" className="mt-4 inline-block text-[11px] uppercase tracking-[0.1em] text-brand-400/70 hover:text-brand-400">
                View All Challenges
              </a>
            </div>
          )}

          {filtered.map((challenge) => (
            <article
              key={challenge.id}
              className="group card elevated-card border border-[rgba(242,149,89,0.15)] rounded-2xl overflow-hidden hover:shadow-card transition-shadow"
            >
              <div className="p-5">
                <span
                  className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] bg-brand-500/[10] border border-brand-500/20 rounded-full px-2.5 py-1.5 mb-3"
                >
                  {challenge.skills.map((skill, i) => (
                    <span key={i} className="text-[10px] font-medium">
                      {skill}
                    </span>
                  ))}
                </span>

                <h3 className="text-lg font-display font-semibold text-cream group-hover:text-brand-400 transition-colors">
                  <a
                    href={`/hub/${challenge.slug}`}
                    className="hover:underline"
                  >
                    {challenge.title}
                  </a>
                </h3>

                <p className="text-[11px] text-mist line-clamp-2 mb-3">
                  {challenge.description.substring(0, 80)}...
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border-bg">
                  <span className="text-[10px] text-mist">
                    <Calendar className="mr-1 h-4 w-4" /> {new Date(challenge.deadline).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] text-mist ml-2">
                    {challenge.participants} participants
                  </span>
                </div>

                {challenge.isPaid && (
                  <span className="mt-2 text-[10px] uppercase tracking-[0.05em] text-brand-500">
                    Paid task
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}