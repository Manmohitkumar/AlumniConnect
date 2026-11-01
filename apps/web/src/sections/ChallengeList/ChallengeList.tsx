import { useState, useEffect } from 'react'
import { Search, Clock } from 'lucide-react'

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
}

export function ChallengeList({ challenges }: { challenges: Challenge[] }) {
  const [filter, setFilter] = useState<'all' | 'technical' | 'creative' | 'business' | 'data'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    // Remove any non-matching challenges when filter/search changes
    const handleWindowResize = () => {
      // Re-apply filters on resize if needed
    }
    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [filter, search])

  const filtered = challenges.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      filter === 'all' ||
      c.category.toLowerCase().includes(filter.toLowerCase())
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
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
              <option value="data">Data</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Search className="h-12 w-12 mx-auto mb-4 text-mist opacity-50" />
              <h3 className="text-lg font-display font-medium text-cream mb-2">No challenges match your filters</h3>
              <p className="text-mist">Try adjusting your search or filters.</p>
              <a href="#challenges" className="mt-4 inline-block text-[11px] uppercase tracking-[0.1em] text-brand-400/70 hover:text-brand-400">
                View Challenges
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
                  {challenge.title.substring(0, 80)}...
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border-bg">
                  <span className="text-[10px] text-mist">
                    <Clock className="mr-1 h-4 w-4" /> {new Date(challenge.deadline).toLocaleDateString()}
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

        {/* Load more button */}
        {challenges.length > filtered.length && (
          <div className="mt-8 text-center">
            <button
              className="btn-primary px-6 py-2.5 text-[11px] uppercase tracking-[0.1em]"
            >
              Load More Challenges
            </button>
          </div>
        )}
      </div>
    </section>
  )
}