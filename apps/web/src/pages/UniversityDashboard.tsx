import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiGet, apiPost, apiPatch } from '../lib/apiClient'
import { NotificationBell } from '../components/app/NotificationBell'
import { NotificationHistory } from '../components/app/Community'
import { SupportPanel } from '../components/app/Support'
import { UniversityInsightsPanel } from '../components/app/AiOps'

type StudentRow = {
  id: string
  registrationNumber: string | null
  department: string | null
  course: string | null
  currentYear: number | null
  verificationStatus: string
  user: { id: string; name: string; email: string; emailVerified: boolean; status: string }
}

type AlumniRow = {
  id: string
  registrationNumber: string | null
  graduationYear: number | null
  company: string | null
  designation: string | null
  industry: string | null
  verificationStatus: string
  user: { id: string; name: string; email: string; emailVerified: boolean; status: string }
}

type EventRow = { id: string; title: string; category: string; mode: string; startsAt: string; capacity: number | null; registrationCount: number; status: string }

const UNIVERSITY_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'students', label: 'Students' },
  { key: 'alumni', label: 'Alumni' },
  { key: 'events', label: 'Events' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'insights', label: 'AI insights' },
  { key: 'support', label: 'Support' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'profile', label: 'Profile' },
] as const

type UniversityTab = (typeof UNIVERSITY_TABS)[number]['key']

export function UniversityDashboard() {
  const { user, logout } = useAuth()
  const requestedTab = new URLSearchParams(window.location.search).get('tab')
  const [tab, setTab] = useState<UniversityTab>(
    UNIVERSITY_TABS.some((item) => item.key === requestedTab) ? (requestedTab as UniversityTab) : 'overview',
  )
  const selectTab = (next: UniversityTab) => {
    setTab(next)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', next)
    window.history.replaceState({}, '', url)
  }
  const [overview, setOverview] = useState<any>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [alumni, setAlumni] = useState<AlumniRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [studentQuery, setStudentQuery] = useState('')
  const [studentStatus, setStudentStatus] = useState('')
  const [alumniQuery, setAlumniQuery] = useState('')
  const [alumniStatus, setAlumniStatus] = useState('')

  const [eventForm, setEventForm] = useState({ title: '', description: '', category: 'Webinar', mode: 'CAMPUS', location: '', startsAt: '', capacity: '' })
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '', audience: 'ALL' })
  const [message, setMessage] = useState<string | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const hasLoaded = useRef(false)

  const loadOverview = async () => {
    const res = await apiGet<{ data: any }>('/university/overview')
    setOverview(res.data)
  }
  const loadStudents = async () => {
    const params = new URLSearchParams()
    if (studentQuery) params.set('q', studentQuery)
    if (studentStatus) params.set('status', studentStatus)
    const res = await apiGet<{ data: StudentRow[] }>(`/university/students?${params.toString()}`)
    setStudents(res.data)
  }
  const loadAlumni = async () => {
    const params = new URLSearchParams()
    if (alumniQuery) params.set('q', alumniQuery)
    if (alumniStatus) params.set('status', alumniStatus)
    const res = await apiGet<{ data: AlumniRow[] }>(`/university/alumni?${params.toString()}`)
    setAlumni(res.data)
  }
  const loadEvents = async () => {
    const res = await apiGet<{ data: EventRow[] }>('/university/events')
    setEvents(res.data)
  }
  const loadProfile = async () => {
    const res = await apiGet<{ data: any }>('/university/profile')
    setProfile(res.data)
  }

  useEffect(() => {
    let active = true
    if (!hasLoaded.current) setLoading(true)
    Promise.all([loadOverview(), loadStudents(), loadAlumni(), loadEvents(), loadProfile()])
      .then(() => {
        if (active) {
          hasLoaded.current = true
          setError(null)
        }
      })
      .catch((err) => {
        if (active && !hasLoaded.current) setError(err instanceof Error ? err.message : 'Failed to load portal')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion])

  // Incoming verification requests and other cross-portal events refresh the
  // console without forcing the representative to reload the page.
  useEffect(() => {
    let last = 0
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - last < 3000) return
      last = now
      setRefreshVersion((value) => value + 1)
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('app:refresh', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('app:refresh', refresh)
    }
  }, [])

  const verifyStudent = async (profileId: string, status: 'VERIFIED' | 'REJECTED') => {
    await apiPatch(`/university/students/${profileId}/verification`, { status })
    await loadStudents()
    await loadOverview()
    setMessage(`Student ${status.toLowerCase()}.`)
  }
  const verifyAlumni = async (profileId: string, status: 'VERIFIED' | 'REJECTED') => {
    await apiPatch(`/university/alumni/${profileId}/verification`, { status })
    await loadAlumni()
    await loadOverview()
    setMessage(`Alumni ${status.toLowerCase()}.`)
  }

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    try {
      await apiPost('/university/events', {
        title: eventForm.title,
        description: eventForm.description,
        category: eventForm.category,
        mode: eventForm.mode,
        location: eventForm.location || null,
        startsAt: new Date(eventForm.startsAt).toISOString(),
        capacity: eventForm.capacity ? Number(eventForm.capacity) : null,
      })
      setEventForm({ title: '', description: '', category: 'Webinar', mode: 'CAMPUS', location: '', startsAt: '', capacity: '' })
      await loadEvents()
      setMessage('Event created and members notified.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Event creation failed')
    }
  }

  const sendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    try {
      const res = await apiPost<{ data: { recipients: number } }>('/university/announcements', announcementForm)
      setAnnouncementForm({ title: '', body: '', audience: 'ALL' })
      setMessage(`Announcement sent to ${res.data.recipients} members.`)
      await loadOverview()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Announcement failed')
    }
  }

  if (loading) return <div className="shell py-20 text-center text-mist">Loading university portal...</div>

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="shell py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500 font-display text-sm font-bold text-ink-950">UN</span>
            <div>
              <span className="inline-flex items-center rounded-full bg-azure-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-950">Institution console</span>
              <h1 className="mt-1 text-2xl font-display font-semibold text-cream">University portal</h1>
              <p className="text-[12px] text-mist">{overview?.university?.name ?? 'Institution'} {user ? `- signed in as ${user.name}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => void logout().then(() => (window.location.href = '/login'))} className="btn-secondary">Sign out</button>
          </div>
        </div>

        {error && <p className="mb-4 text-[11px] uppercase tracking-[0.1em] text-brand-400">{error}</p>}
        {message && <p className="mb-4 text-[11px] text-mint-400">{message}</p>}

        <div className="flex flex-wrap gap-2 mb-6">
          {UNIVERSITY_TABS.map((item) => (
            <button key={item.key} onClick={() => selectTab(item.key)} className={`px-4 py-2 rounded-xl text-[11px] uppercase tracking-[0.08em] border ${tab === item.key ? 'border-brand-500 bg-brand-500 text-ink-950' : 'border-[rgba(184,176,141,0.18)] text-mist'}`}>
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Students', overview.counts.students],
              ['Alumni', overview.counts.alumni],
              ['Pending students', overview.counts.pendingStudents],
              ['Pending alumni', overview.counts.pendingAlumni],
              ['Events', overview.counts.events],
              ['Announcements', overview.counts.announcements],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.08em] text-mist">{label}</p>
                <p className="text-2xl font-display font-semibold text-cream mt-1">{value}</p>
              </div>
            ))}
            <div className="col-span-full rounded-2xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 p-4">
              <p className="text-[10px] uppercase tracking-[0.08em] text-mist mb-2">Permissions</p>
              <p className="text-[12px] text-cream">{(overview.permissions ?? []).join(', ') || 'none'}</p>
            </div>
          </div>
        )}

        {tab === 'students' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="Search name, email, registration, department" aria-label="Search students" className="flex-1 px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm" />
              <select aria-label="Filter students by status" value={studentStatus} onChange={(e) => setStudentStatus(e.target.value)} className="px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm">
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
                <option value="UNVERIFIED">Unverified</option>
              </select>
              <button onClick={() => void loadStudents()} className="btn-primary">Search</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead><tr className="text-left text-mist"><th className="py-2">Name</th><th>Registration</th><th>Department</th><th>Email verified</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {students.map((row) => (
                    <tr key={row.id} className="border-t border-[rgba(184,176,141,0.18)]">
                      <td className="py-2">{row.user.name}<div className="text-[10px] text-mist">{row.user.email}</div></td>
                      <td>{row.registrationNumber ?? '-'}</td>
                      <td>{row.department ?? '-'}</td>
                      <td>{row.user.emailVerified ? 'Yes' : 'No'}</td>
                      <td>{row.verificationStatus}</td>
                      <td className="space-x-2">
                        <button onClick={() => void verifyStudent(row.id, 'VERIFIED')} className="text-mint-400 hover:underline">Verify</button>
                        <button onClick={() => void verifyStudent(row.id, 'REJECTED')} className="text-brand-400 hover:underline">Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'alumni' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input value={alumniQuery} onChange={(e) => setAlumniQuery(e.target.value)} placeholder="Search name, email, registration, company" aria-label="Search alumni" className="flex-1 px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm" />
              <select aria-label="Filter alumni by status" value={alumniStatus} onChange={(e) => setAlumniStatus(e.target.value)} className="px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm">
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
                <option value="UNVERIFIED">Unverified</option>
              </select>
              <button onClick={() => void loadAlumni()} className="btn-primary">Search</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead><tr className="text-left text-mist"><th className="py-2">Name</th><th>Registration</th><th>Company</th><th>Email verified</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {alumni.map((row) => (
                    <tr key={row.id} className="border-t border-[rgba(184,176,141,0.18)]">
                      <td className="py-2">{row.user.name}<div className="text-[10px] text-mist">{row.user.email}</div></td>
                      <td>{row.registrationNumber ?? '-'}</td>
                      <td>{row.company ?? '-'}</td>
                      <td>{row.user.emailVerified ? 'Yes' : 'No'}</td>
                      <td>{row.verificationStatus}</td>
                      <td className="space-x-2">
                        <button onClick={() => void verifyAlumni(row.id, 'VERIFIED')} className="text-mint-400 hover:underline">Verify</button>
                        <button onClick={() => void verifyAlumni(row.id, 'REJECTED')} className="text-brand-400 hover:underline">Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-6">
            <form onSubmit={createEvent} className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-2xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 p-4">
              <input required placeholder="Title" aria-label="Event title" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className="px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm" />
              <input required placeholder="Category" aria-label="Event category" value={eventForm.category} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })} className="px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm" />
              <input required type="datetime-local" aria-label="Event start time" value={eventForm.startsAt} onChange={(e) => setEventForm({ ...eventForm, startsAt: e.target.value })} className="px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm" />
              <select aria-label="Event mode" value={eventForm.mode} onChange={(e) => setEventForm({ ...eventForm, mode: e.target.value })} className="px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm">
                <option value="CAMPUS">Campus</option>
                <option value="ONLINE">Online</option>
                <option value="METAVERSE">Metaverse</option>
              </select>
              <input placeholder="Location" aria-label="Event location" value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} className="px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm" />
              <input placeholder="Capacity" aria-label="Event capacity" type="number" value={eventForm.capacity} onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })} className="px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm" />
              <textarea required placeholder="Description" aria-label="Event description" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className="md:col-span-2 px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm" rows={3} />
              <button type="submit" className="md:col-span-2 btn-primary">Create event</button>
            </form>
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id} className="rounded-2xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 p-4">
                  <p className="font-semibold text-cream">{event.title}</p>
                  <p className="text-[11px] text-mist">{event.category} · {event.mode} · {new Date(event.startsAt).toLocaleString()} · {event.registrationCount} registered</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'announcements' && (
          <form onSubmit={sendAnnouncement} className="space-y-3 rounded-2xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 p-4">
            <input required placeholder="Title" aria-label="Announcement title" value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm" />
            <select aria-label="Announcement audience" value={announcementForm.audience} onChange={(e) => setAnnouncementForm({ ...announcementForm, audience: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm">
              <option value="ALL">All members</option>
              <option value="STUDENTS">Students only</option>
              <option value="ALUMNI">Alumni only</option>
            </select>
            <textarea required placeholder="Message" aria-label="Announcement message" value={announcementForm.body} onChange={(e) => setAnnouncementForm({ ...announcementForm, body: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm" rows={4} />
            <button type="submit" className="btn-primary">Send announcement</button>
          </form>
        )}

        {tab === 'insights' && <UniversityInsightsPanel />}
        {tab === 'support' && (
          <SupportPanel />
        )}
        {tab === 'notifications' && <NotificationHistory />}
        {tab === 'profile' && profile && (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const form = e.currentTarget as HTMLFormElement
              const data = new FormData(form)
              await apiPatch('/university/profile', {
                name: data.get('name'),
                designation: data.get('designation'),
                department: data.get('department'),
              })
              await loadProfile()
              setMessage('Profile updated.')
            }}
            className="space-y-3 rounded-2xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 p-4 max-w-lg"
          >
            <input name="name" defaultValue={profile.user?.name ?? ''} placeholder="Name" aria-label="Full name" className="w-full px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm" />
            <input name="designation" defaultValue={profile.designation ?? ''} placeholder="Designation" aria-label="Designation" className="w-full px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm" />
            <input name="department" defaultValue={profile.department ?? ''} placeholder="Department" aria-label="Department" className="w-full px-4 py-2.5 rounded-xl border border-[rgba(184,176,141,0.18)] bg-ink-800/60 text-sm" />
            <button type="submit" className="btn-primary">Save profile</button>
          </form>
        )}
      </div>
    </div>
  )
}
