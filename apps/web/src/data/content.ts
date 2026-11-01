import {
  Award,
  BarChart3,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Code2,
  Compass,
  Database,
  FolderKanban,
  GraduationCap,
  ListChecks,
  Megaphone,
  MessagesSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UploadCloud,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavLink = { label: string; href: string }

export const navLinks: NavLink[] = [
  { label: 'Home', href: '#top' },
  { label: 'About', href: '#about' },
  { label: 'How It Works', href: '#workflow' },
  { label: 'Features', href: '#features' },
  { label: 'Metaverse Hub', href: '#campus' },
  { label: 'Contact', href: '#contact' },
]

export const heroTrust = [
  'Real-world industry challenges',
  'Practical student collaboration',
  'Meaningful alumni connections',
]

/** Illustrative product metrics. Demo data, not platform statistics. */
export const demoMetrics = [
  { label: 'Active challenges', value: 24, delta: '+6 this week', tone: 'brand' as const },
  { label: 'Student submissions', value: 156, delta: '+18 this week', tone: 'azure' as const },
  { label: 'Completed projects', value: 42, delta: '+9 this month', tone: 'mint' as const },
  { label: 'Mentorship sessions', value: 18, delta: '+4 this week', tone: 'brand' as const },
]

export const demoChallenges = [
  {
    title: 'Customer Complaint Analyzer',
    skills: ['Python', 'Data Analysis', 'Web'],
    deliverables: 'Working prototype, source code, demo',
    days: 14,
    submissions: 18,
    category: 'Data',
    paid: true,
    tone: 'azure' as const,
  },
  {
    title: 'Smart Attendance Management System',
    skills: ['JavaScript', 'React', 'Database'],
    deliverables: 'Functional prototype, documentation',
    days: 21,
    submissions: 11,
    category: 'Web app',
    paid: false,
    tone: 'brand' as const,
  },
  {
    title: 'Startup Landing Page Prototype',
    skills: ['HTML', 'CSS', 'UI/UX'],
    deliverables: 'Responsive page, source files',
    days: 9,
    submissions: 26,
    category: 'Design',
    paid: false,
    tone: 'mint' as const,
  },
]

export type Problem = {
  title: string
  description: string
  solution: string
  icon: LucideIcon
}

export const problems: Problem[] = [
  {
    title: 'Fragmented alumni information',
    description: 'Alumni records sit in spreadsheets, departments and disconnected platforms.',
    solution: 'Centralized Alumni Data Hub',
    icon: Database,
  },
  {
    title: 'Limited practical experience',
    description: 'Students need real-world problems and meaningful industry feedback, not just coursework.',
    solution: 'Alumni Challenge Hub',
    icon: Target,
  },
  {
    title: 'Unstructured alumni collaboration',
    description: 'Alumni want a structured way to delegate tasks, review work and recognise contributions.',
    solution: 'Evaluation & Recognition System',
    icon: ClipboardCheck,
  },
  {
    title: 'Limited talent visibility',
    description: 'Companies need better ways to identify students through demonstrated project work.',
    solution: 'Portfolios & Company Discovery',
    icon: Compass,
  },
]

export type Feature = {
  name: string
  description: string
  bullets: string[]
  icon: LucideIcon
  span: string
  preview?: 'search' | 'challenge' | 'certificate' | 'analytics'
  accent: string
}

export const features: Feature[] = [
  {
    name: 'Centralized Alumni Data Hub',
    description:
      'Bring alumni information into one organized platform and make professional connections easier to discover.',
    bullets: ['Alumni profiles & graduation year', 'Company, designation & industry', 'Skills, expertise & mentorship interests', 'Search and filtering'],
    icon: Database,
    span: 'lg:col-span-7',
    preview: 'search',
    accent: 'from-brand-500/25 via-brand-500/5 to-transparent',
  },
  {
    name: 'Alumni Challenge Hub',
    description: 'Let alumni publish real-world problems and project challenges for students to solve.',
    bullets: ['Challenge creation & required skills', 'Deliverables and deadlines', 'Published evaluation criteria', 'Paid and unpaid task labels'],
    icon: Target,
    span: 'lg:col-span-5',
    preview: 'challenge',
    accent: 'from-azure-500/25 via-azure-500/5 to-transparent',
  },
  {
    name: 'Student Project Submissions',
    description: 'A structured space to participate and demonstrate ability through actual work.',
    bullets: ['Project file uploads', 'GitHub & prototype links', 'Demo videos', 'Submission tracking'],
    icon: UploadCloud,
    span: 'lg:col-span-4',
    accent: 'from-mint-400/20 via-mint-400/5 to-transparent',
  },
  {
    name: 'Alumni Evaluation & Recognition',
    description: 'Evaluate work, give constructive feedback and recognise outstanding contributions.',
    bullets: ['Rubric-based scoring', 'Challenge-specific ranking', 'Written feedback', 'Outstanding submission selection'],
    icon: ClipboardCheck,
    span: 'lg:col-span-4',
    accent: 'from-brand-400/20 via-brand-400/5 to-transparent',
  },
  {
    name: 'Digital Appreciation Certificates',
    description: 'Recognise achievements with unique IDs, recognized skills and QR verification.',
    bullets: ['Certificate previews', 'Issuer information', 'SHA-256 integrity hash', 'Public verification page'],
    icon: Award,
    span: 'lg:col-span-4',
    preview: 'certificate',
    accent: 'from-azure-400/20 via-azure-400/5 to-transparent',
  },
  {
    name: 'Student Skill Portfolio',
    description: 'Turn completed challenges, feedback and certificates into one shareable portfolio.',
    bullets: ['Completed projects', 'Demonstrated skills', 'Alumni recommendations', 'Portfolio visibility controls'],
    icon: FolderKanban,
    span: 'lg:col-span-5',
    accent: 'from-mint-300/20 via-mint-300/5 to-transparent',
  },
  {
    name: 'Mentorship & Knowledge Vault',
    description: 'Connect students with experienced alumni and approved professional knowledge.',
    bullets: ['Mentorship requests', 'Career talks & project reviews', 'Approved lectures and case studies', 'Industry insights'],
    icon: MessagesSquare,
    span: 'lg:col-span-4',
    accent: 'from-brand-300/20 via-brand-300/5 to-transparent',
  },
  {
    name: 'Task Delegation & Rewards',
    description: 'Delegate suitable real-world tasks with clearly defined deliverables and agreed terms.',
    bullets: ['Scope & deadlines', 'Paid or unpaid status', 'Acceptance criteria', 'Reward tracking'],
    icon: ListChecks,
    span: 'lg:col-span-3',
    accent: 'from-mint-400/15 via-mint-400/5 to-transparent',
  },
  {
    name: 'Company Talent Discovery',
    description: 'Discover students through completed projects and demonstrated skills — with permission.',
    bullets: ['Skill-based discovery', 'Recruiter dashboard', 'Internship invitations', 'Interview invitations'],
    icon: Building2,
    span: 'lg:col-span-7',
    accent: 'from-azure-500/20 via-azure-500/5 to-transparent',
  },
  {
    name: 'University Engagement Dashboard',
    description: 'Centralized insight into alumni participation and student collaboration.',
    bullets: ['Alumni records', 'Challenges & participation', 'Verified certificates', 'Engagement reports'],
    icon: BarChart3,
    span: 'lg:col-span-5',
    preview: 'analytics',
    accent: 'from-brand-500/20 via-brand-500/5 to-transparent',
  },
]

export type Step = {
  num: string
  title: string
  description: string
  icon: LucideIcon
}

export const steps: Step[] = [
  {
    num: '01',
    title: 'Alumni join',
    description: 'Create professional profiles and share experience, industry expertise and skills.',
    icon: UserPlus,
  },
  {
    num: '02',
    title: 'Post real-world challenges',
    description: 'Publish industry problems with requirements, deadlines and evaluation criteria.',
    icon: Megaphone,
  },
  {
    num: '03',
    title: 'Students participate & submit',
    description: 'Discover challenges, apply, build solutions and submit projects or prototypes.',
    icon: Code2,
  },
  {
    num: '04',
    title: 'Alumni evaluate & recognise',
    description: 'Review submissions, score against the rubric and recognise outstanding work.',
    icon: Star,
  },
  {
    num: '05',
    title: 'Build student portfolios',
    description: 'Projects, skills, feedback and certificates become one verified portfolio.',
    icon: FolderKanban,
  },
  {
    num: '06',
    title: 'Discover career opportunities',
    description: 'Companies explore student-approved portfolios and invite candidates for interviews.',
    icon: Briefcase,
  },
]

export type Room = {
  index: string
  name: string
  description: string
  connects: string
  icon: LucideIcon
  accent: string
  mvp?: boolean
}

export const rooms: Room[] = [
  {
    index: '01',
    name: 'Career Hall',
    description: 'Alumni profiles, professional expertise, industry booths and career information.',
    connects: 'Alumni Data Hub · Company Discovery',
    icon: GraduationCap,
    accent: 'text-brand-400',
  },
  {
    index: '02',
    name: 'Mentorship Room',
    description: 'Scheduled alumni talks, mentoring sessions and project reviews.',
    connects: 'Mentorship & Knowledge Vault',
    icon: CalendarClock,
    accent: 'text-brand-300',
  },
  {
    index: '03',
    name: 'Innovation Lab',
    description: 'Student projects and innovative solutions created through alumni challenges.',
    connects: 'Student Skill Portfolio',
    icon: Sparkles,
    accent: 'text-mint-400',
    mvp: true,
  },
  {
    index: '04',
    name: 'Alumni Challenge Arena',
    description: 'Real-world challenges, required skills, deadlines and participation opportunities.',
    connects: 'Challenge Hub · Submissions',
    icon: Target,
    accent: 'text-azure-400',
    mvp: true,
  },
  {
    index: '05',
    name: 'Wall of Recognition',
    description: 'Approved student projects, achievements and alumni appreciation records.',
    connects: 'Evaluation · Certificates',
    icon: Award,
    accent: 'text-mint-300',
  },
]

/** Illustrative engagement data for the university dashboard mockup. Demo data only. */
export const engagementSeries = [18, 26, 22, 38, 33, 47, 44, 58, 63, 57, 74, 84]

export const departmentData = [
  { label: 'Computer Science', value: 82 },
  { label: 'Electronics', value: 64 },
  { label: 'Mechanical', value: 48 },
  { label: 'Design', value: 39 },
  { label: 'Business', value: 27 },
]

export const universityMetrics = [
  { label: 'Alumni records', value: '1,284', trend: '+42 this term' },
  { label: 'Active alumni', value: '612', trend: '48% of records' },
  { label: 'Challenges posted', value: '96', trend: '+14 this term' },
  { label: 'Mentorship sessions', value: '208', trend: '+31 this term' },
]

export const events = [
  {
    category: 'Alumni Talk',
    title: 'Alumni Industry Talk',
    description: 'A practitioner-led session on how real product teams scope, review and ship work.',
    date: 'Date to be announced',
    mode: 'Online',
    accent: 'from-brand-500/25 to-transparent',
    icon: Megaphone,
  },
  {
    category: 'Showcase',
    title: 'Student Innovation Showcase',
    description: 'Students present solutions built for alumni challenges, with feedback from reviewers.',
    date: 'Date to be announced',
    mode: 'On campus',
    accent: 'from-mint-400/25 to-transparent',
    icon: Sparkles,
  },
  {
    category: 'Mentorship',
    title: 'Alumni Mentorship Roundtable',
    description: 'Small-group conversations on career direction, specialisation and portfolio feedback.',
    date: 'Date to be announced',
    mode: 'Hybrid',
    accent: 'from-azure-500/25 to-transparent',
    icon: Users,
  },
]

export const footerColumns = [
  {
    title: 'Platform',
    links: [
      { label: 'Home', href: '#top' },
      { label: 'About', href: '#about' },
      { label: 'Features', href: '#features' },
      { label: 'Challenge Hub', href: '#challenges' },
      { label: 'Metaverse Hub', href: '#campus' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Alumni Network', href: '#about' },
      { label: 'Mentorship', href: '#mentorship' },
      { label: 'Student Projects', href: '#portfolio' },
      { label: 'Events', href: '#events' },
      { label: 'Success Stories', href: '#recognition' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help Center', href: '#contact' },
      { label: 'FAQs', href: '#contact' },
      { label: 'Contact', href: '#contact' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
]

export const socials: Array<{ label: string; href: string }> = [
  { label: 'LinkedIn', href: '#contact' },
  { label: 'Instagram', href: '#contact' },
  { label: 'Facebook', href: '#contact' },
  { label: 'X', href: '#contact' },
]

export const recognitionPoints = [
  { label: 'Evaluation score', value: '92 / 100', icon: Star },
  { label: 'Alumni feedback', value: 'Detailed, written', icon: MessagesSquare },
  { label: 'Project achievement', value: 'Rank #1 in challenge', icon: TrendingUp },
  { label: 'Verified record', value: 'QR + hash', icon: ShieldCheck },
]

export { Search, BookOpen, Boxes }
