import { useState, useEffect } from 'react'
import { Search, Book } from 'lucide-react'

type Resource = {
  id: string
  title: string
  category: string
  description: string
  author: string
  downloads: number
  estimatedTime: string
}

export function KnowledgeVault() {
  const [resources, setResources] = useState<Resource[]>([])
  const [filter, setFilter] = useState<'all' | 'tutorials' | 'guides' | 'articles' | 'career'>('all')
  const [search, setSearch] = useState('')

  // Demo data
  useEffect(() => {
    const demoResources: Resource[] = [
      {
        id: '1',
        title: 'React Best Practices Guide',
        category: 'Tutorials',
        description: 'A comprehensive guide to writing maintainable React code.',
        author: 'Meera Nair',
        downloads: 124,
        estimatedTime: '30 min',
      },
      {
        id: '2',
        title: 'Data Structures & Algorithms',
        category: 'Guides',
        description: 'Master the fundamentals of DSA with practical examples.',
        author: 'John Smith',
        downloads: 89,
        estimatedTime: '45 min',
      },
      {
        id: '3',
        title: 'Career Planning for Students',
        category: 'Career',
        description: 'Step-by-step roadmap from student to professional.',
        author: 'Sarah Johnson',
        downloads: 231,
        estimatedTime: '20 min',
      },
      {
        id: '4',
        title: 'Technical Interview Preparation',
        category: 'Articles',
        description: 'Common interview questions and how to answer them.',
        author: 'Robert Chen',
        downloads: 156,
        estimatedTime: '25 min',
      },
      {
        id: '5',
        title: 'Portfolio Building Tips',
        category: 'Tutorials',
        description: 'Create a stunning portfolio that gets noticed.',
        author: 'Emily Davis',
        downloads: 187,
        estimatedTime: '35 min',
      },
      {
        id: '6',
        title: 'Alumni Networking Guide',
        category: 'Articles',
        description: 'How to effectively network with alumni on the platform.',
        author: 'Meera Nair',
        downloads: 95,
        estimatedTime: '15 min',
      },
    ]

    setResources(demoResources)
  }, [])

  const filteredResources = resources.filter(r => {
    if (filter !== 'all' && r.category !== filter) return false
    return r.title.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase())
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
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-cream">Knowledge Vault</h1>
          <p className="text-mist">Resources from alumni and industry experts</p>
        </header>

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
              <input
                type="text"
                placeholder="Search resources..."
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
              <option value="all">All Resources</option>
              <option value="tutorials">Tutorials</option>
              <option value="guides">Guides</option>
              <option value="articles">Articles</option>
              <option value="career">Career Resources</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredResources.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Book className="h-12 w-12 mx-auto mb-4 text-mist opacity-50" />
              <h3 className="text-lg font-display font-medium text-cream mb-2">No resources match your filters</h3>
              <p className="text-mist">Try adjusting your search or filters.</p>
            </div>
          )}

          {filteredResources.map((resource) => (
            <article
              key={resource.id}
              className="reveal border rounded-xl p-4 hover:shadow-card transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                  <Book className="h-5 w-5 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-display font-medium text-cream group-hover:text-brand-400 transition-colors">
                    {resource.title}
                  </h3>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-mist mb-1">
                    {resource.category}
                  </p>
                  <p className="text-mist line-clamp-2">
                    {resource.description.substring(0, 80)}...
                  </p>
                </div>
                <div className="w-16">
                  <div className="flex gap-2">
                    <span className="text-[9px] bg-brand-500/10 text-brand-300 rounded px-1 py-0.5">
                      {resource.downloads} downloads
                    </span>
                    <span className="text-[9px] text-mist">{resource.estimatedTime}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}