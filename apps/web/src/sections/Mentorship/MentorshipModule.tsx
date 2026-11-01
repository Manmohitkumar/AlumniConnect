import { useState, useEffect } from 'react'

type Mentor = {
  id: string
  name: string
  role: string
  organization: string
  industry: string
  expertise: string[]
  availability: 'available' | 'limited' | 'busy'
  avatar: string
}

type MentorshipRequest = {
  id: string
  studentName: string
  mentorId: string
  message: string
  status: 'pending' | 'accepted' | 'rejected' | 'active'
  createdAt: string
}

export function MentorshipModule() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [requests, setRequests] = useState<MentorshipRequest[]>([])
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [form, setForm] = useState({
    mentorId: '',
    message: '',
  })

  // Demo data
  useEffect(() => {
    const demoMentors: Mentor[] = [
      {
        id: '1',
        name: 'Meera Nair',
        role: 'Senior Software Engineer',
        organization: 'TechCorp',
        industry: 'Technology',
        expertise: ['Python', 'React', 'System Design', 'Career Guidance'],
        availability: 'available',
        avatar: '',
      },
      {
        id: '2',
        name: 'John Smith',
        role: 'Product Manager',
        organization: 'InnovateX',
        industry: 'Technology',
        expertise: ['Product Strategy', 'Agile', 'Leadership', 'Growth'],
        availability: 'limited',
        avatar: '',
      },
      {
        id: '3',
        name: 'Sarah Johnson',
        role: 'Creative Director',
        organization: 'DesignCo',
        industry: 'Design',
        expertise: ['Figma', 'UI/UX', 'Branding', 'Creative Strategy'],
        availability: 'available',
        avatar: '',
      },
      {
        id: '4',
        name: 'Robert Chen',
        role: 'Data Scientist',
        organization: 'DataCo',
        industry: 'Data',
        expertise: ['Machine Learning', 'Python', 'Data Visualization', 'Analytics'],
        availability: 'busy',
        avatar: '',
      },
    ]

    const demoRequests: MentorshipRequest[] = [
      {
        id: '1',
        studentName: 'Alex Johnson',
        mentorId: '1',
        message: 'I would love to learn about system design and career guidance in tech.',
        status: 'active',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        studentName: 'Sarah Chen',
        mentorId: '2',
        message: 'Looking for guidance on product strategy and leadership skills.',
        status: 'pending',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]

    setMentors(demoMentors)
    setRequests(demoRequests)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-cream">Mentorship</h1>
          <p className="text-mist">Connect with experienced alumni mentors</p>
        </header>

        {/* Mentor Discovery */}
        <div className="mb-8">
          <h2 className="text-xl font-display font-medium text-cream mb-4">Find a Mentor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {mentors.map((mentor) => (
              <article
                key={mentor.id}
                className="reveal border rounded-xl p-4 hover:shadow-card transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded bg-ink-800/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-[14px] font-display font-bold">
                      {mentor.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-display font-semibold text-cream group-hover:text-brand-400 transition-colors">
                      {mentor.name}
                    </h3>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-mist mb-1">
                      {mentor.role} at {mentor.organization}
                    </p>
                    <p className="text-[10px] text-mist">
                      {mentor.expertise.slice(0, 3).join(', ')}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-[8px] font-medium ${mentor.availability === 'available' ? 'bg-brand-500/10 text-brand-300' : mentor.availability === 'limited' ? 'bg-brand-400/20 text-brand-300' : 'bg-mist text-mist'}`}
                  >
                    {mentor.availability}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {/* Request Mentor */}
          <button
            className="w-full py-2.5 text-[11px] uppercase tracking-[0.1em] text-brand-400/70 hover:text-brand-400 transition-colors mt-4"
            onClick={() => setShowRequestModal(true)}
          >
            Request Mentorship
          </button>
        </div>

        {/* My Requests */}
        <div>
          <h2 className="text-xl font-display font-medium text-cream mb-4">My Mentorship Requests</h2>
          <div className="space-y-3">
            {requests.map((request) => {

              const statusLabel: Record<string, string> = {
                pending: 'Pending',
                accepted: 'Accepted',
                rejected: 'Rejected',
                active: 'Active',
              }

              return (
                <article
                  key={request.id}
                  className="reveal border rounded-xl p-3 hover:shadow-card transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className="text-[9px] uppercase tracking-[0.05em] {statusColors[request.status]}">
                        {statusLabel[request.status]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-display font-semibold text-cream group-hover:text-brand-400 transition-colors">
                        {request.studentName}
                      </h3>
                      <p className="text-[10px] text-mist mb-1">
                        Mentee of {request.mentorId}
                      </p>
                      <p className="text-[9px] text-mist">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </article>
              )}
            )}
          </div>
        </div>

        {/* Request Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-ink-800/80 rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-display font-bold text-cream mb-4">Request Mentorship</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const newRequest: MentorshipRequest = {
                    id: String(Date.now()),
                    studentName: 'Current User',
                    mentorId: form.mentorId,
                    message: form.message,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                  }
                  setRequests(prev => [...prev, newRequest])
                  setShowRequestModal(false)
                  setForm({ mentorId: '', message: '' })
                  alert('Mentorship request submitted!')
                }}
                className="space-y-4"
              >
                <select
                  name="mentorId"
                  value={form.mentorId}
                  onChange={(e) => setForm({ ...form, mentorId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                >
                  <option value="">Select a mentor</option>
                  {mentors.map((mentor) => (
                    <option key={mentor.id} value={mentor.id}>
                      {mentor.name} - {mentor.role} at {mentor.organization}
                    </option>
                  ))}
                </select>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.1em] text-mist mb-2">
                    Message to mentor
                  </label>
                  <textarea
                    name="message"
                    rows={3}
                    value={form.message}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-border-bg bg-ink-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 resize-y placeholder-text-[12px] placeholder-text-mist"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 text-[12px] uppercase tracking-[0.1em] transition-colors"
                >
                  Send Request
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}