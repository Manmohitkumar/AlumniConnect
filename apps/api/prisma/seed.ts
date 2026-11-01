import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const prisma = new PrismaClient()

/**
 * Demonstration dataset for local development.
 * - Only accounts on the @example.edu demo domain are reset; accounts created by
 *   real users of this checkout are never deleted.
 * - Every row here is sample content and is labelled as such in the UI.
 */

const DEMO_PASSWORD = 'DemoPass123!'
const DEMO_DOMAIN = '@example.edu'

type SyntheticAlumni = {
  alumni_id: string
  full_name: string
  gender: string
  degree: string
  branch: string
  graduation_year: number
  current_role: string
  employer_type: string
  city: string
  years_experience: number
  headline: string
  skills: string
  mentorship_topics: string
  communication_style: string
  career_advice: string
  about: string
  contact_email: string
  linkedin_url: string
  sample_student_question: string
  sample_alumni_reply: string
}

const seedDataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data')
const syntheticAlumni = JSON.parse(
  fs.readFileSync(path.join(seedDataDir, 'synthetic_alumni_120.json'), 'utf8'),
) as SyntheticAlumni[]

const toCommaList = (value: string, limit = 8) =>
  value
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit)
    .join(', ')

const SAMPLE_FIRST_NAMES = [
  'Aditi', 'Rohan', 'Sneha', 'Vikram', 'Pooja', 'Karan', 'Neha', 'Siddharth', 'Tanya', 'Manav',
  'Isha', 'Aditya', 'Ritika', 'Nikhil', 'Shreya', 'Rahul', 'Divya', 'Harsh', 'Ananya', 'Yash',
  'Megha', 'Saurabh', 'Kavya', 'Amit', 'Nidhi', 'Vivek', 'Prerna', 'Abhishek', 'Simran', 'Gaurav',
]
const SAMPLE_LAST_NAMES = ['Agarwal', 'Bansal', 'Chopra', 'Dutta', 'Gill', 'Iyer', 'Jain', 'Kapoor', 'Lal', 'Mishra']

// Deterministic sample students derived from the alumni dataset (same branches,
// skills and cities). Names are synthetic; no real student is represented.
const syntheticStudents = Array.from({ length: 60 }, (_, index) => {
  const sponsor = syntheticAlumni[index % syntheticAlumni.length]
  const first = SAMPLE_FIRST_NAMES[index % SAMPLE_FIRST_NAMES.length]
  const last = SAMPLE_LAST_NAMES[Math.floor(index / SAMPLE_FIRST_NAMES.length) % SAMPLE_LAST_NAMES.length]
  const currentYear = (index % 4) + 1
  return {
    email: `sample.student${String(index + 1).padStart(3, '0')}@example.com`,
    name: `${first} ${last}`,
    department: sponsor.branch,
    course: sponsor.degree,
    currentYear,
    semester: currentYear * 2,
    graduationYear: 2026 + (index % 4),
    skills: toCommaList(sponsor.skills, 3),
    interests: toCommaList(sponsor.mentorship_topics, 2),
    city: sponsor.city,
    registrationNumber: `SAMPLE-${sponsor.graduation_year + 1}-${String(index + 1).padStart(3, '0')}`,
  }
})

const studentSeeds = [
  { email: 'student1@example.edu', name: 'Aarav Mehta', department: 'Computer Science', course: 'B.Tech CSE', year: 2026, skills: 'Python, React, Data Analysis', interests: 'Data engineering, product analytics' },
  { email: 'student2@example.edu', name: 'Riya Shah', department: 'Information Technology', course: 'B.Tech IT', year: 2025, skills: 'JavaScript, UI/UX, Figma', interests: 'Frontend engineering, design systems' },
  { email: 'student3@example.edu', name: 'Kabir Patel', department: 'Computer Science', course: 'B.Tech CSE', year: 2027, skills: 'Java, Spring, SQL', interests: 'Backend systems, fintech' },
  { email: 'student4@example.edu', name: 'Ananya Rao', department: 'Electronics', course: 'B.Tech ECE', year: 2026, skills: 'Python, Embedded C, IoT', interests: 'Hardware, edge AI' },
  { email: 'student5@example.edu', name: 'Dev Malhotra', department: 'Management', course: 'BBA', year: 2026, skills: 'Market research, Excel, Presentation', interests: 'Product management, consulting' },
  { email: 'student6@example.edu', name: 'Ishita Bose', department: 'Design', course: 'B.Des', year: 2025, skills: 'Figma, Prototyping, User research', interests: 'Product design, accessibility' },
]

const alumniSeeds = [
  {
    email: 'meera.nair@example.edu',
    name: 'Meera Nair',
    graduationYear: 2016,
    company: 'Northwind Labs',
    designation: 'Senior Product Engineer',
    industry: 'Product & Data',
    expertise: 'Product discovery, analytics, technical reviews',
    topics: 'Product thinking, analytics, interview preparation',
    location: 'Bengaluru, IN',
    timezone: 'Asia/Kolkata',
    yearsExperience: 9,
  },
  {
    email: 'arjun.desai@example.edu',
    name: 'Arjun Desai',
    graduationYear: 2013,
    company: 'Meridian Pay',
    designation: 'Engineering Manager',
    industry: 'Fintech',
    expertise: 'Payments infrastructure, backend systems, team leadership',
    topics: 'Backend architecture, system design, first job prep',
    location: 'Pune, IN',
    timezone: 'Asia/Kolkata',
    yearsExperience: 12,
  },
  {
    email: 'priya.krishnan@example.edu',
    name: 'Priya Krishnan',
    graduationYear: 2018,
    company: 'Lumen Studio',
    designation: 'Design Lead',
    industry: 'Design',
    expertise: 'Design systems, accessibility, portfolio reviews',
    topics: 'Portfolio review, design critiques, career switching',
    location: 'Remote',
    timezone: 'Asia/Kolkata',
    yearsExperience: 7,
  },
]

const companySeeds = [
  { email: 'talent@northwind.example.edu', name: 'Northwind Labs Talent', company: 'Northwind Labs', industry: 'Product & Data' },
  { email: 'people@lumenstudio.example.edu', name: 'Lumen Studio People', company: 'Lumen Studio', industry: 'Design' },
]

const challengeSeeds = [
  {
    slug: 'customer-complaint-analyzer',
    title: 'Customer Complaint Analyzer',
    summary: 'Analyse a support inbox, classify complaints and surface the issues that drive the most churn risk.',
    category: 'Data',
    objectives: 'Cluster complaints, identify recurring drivers, and present a one-page summary with recommended actions.',
    deliverables: 'Working prototype, source code, demo',
    requirements: 'Python or JavaScript, basic NLP or keyword rules, readable documentation.',
    durationDays: 14,
    isPaid: true,
    skills: ['Python', 'Data Analysis', 'Web'],
    authorEmail: 'meera.nair@example.edu',
    status: 'OPEN',
  },
  {
    slug: 'smart-attendance-management',
    title: 'Smart Attendance Management System',
    summary: 'Design a reliable attendance workflow for a multi-department campus with reporting for faculty.',
    category: 'Web app',
    objectives: 'Replace manual registers with an auditable digital flow and give faculty usable reports.',
    deliverables: 'Functional prototype and project documentation',
    requirements: 'Web stack of your choice, role-based access, exportable reports.',
    durationDays: 21,
    isPaid: false,
    skills: ['JavaScript', 'React', 'Database'],
    authorEmail: 'arjun.desai@example.edu',
    status: 'OPEN',
  },
  {
    slug: 'startup-landing-page-prototype',
    title: 'Startup Landing Page Prototype',
    summary: 'Turn a founder brief into a responsive, accessible landing page with a clear conversion path.',
    category: 'Design',
    objectives: 'Produce a responsive landing page and explain the design decisions behind it.',
    deliverables: 'Responsive landing page and source files',
    requirements: 'Figma or hand-coded HTML/CSS, keyboard accessible, mobile first.',
    durationDays: 9,
    isPaid: false,
    skills: ['HTML', 'CSS', 'UI/UX'],
    authorEmail: 'priya.krishnan@example.edu',
    status: 'OPEN',
  },
  {
    slug: 'campus-navigation-voice-guide',
    title: 'Campus Navigation Voice Guide',
    summary: 'Prototype an accessible voice-first guide that helps new students find departments and services.',
    category: 'Accessibility',
    objectives: 'Map ten key campus locations and guide a user by voice with graceful error handling.',
    deliverables: 'Prototype, accessibility notes, short demo video',
    requirements: 'Any web stack, screen-reader-friendly output, consent-safe sample data.',
    durationDays: 18,
    isPaid: false,
    skills: ['Accessibility', 'JavaScript', 'UX Research'],
    authorEmail: 'priya.krishnan@example.edu',
    status: 'OPEN',
  },
  {
    slug: 'expense-splitting-api',
    title: 'Expense Splitting API',
    summary: 'Build and document an API that splits shared expenses fairly and settles balances.',
    category: 'Backend',
    objectives: 'Ship a tested API with clear error responses and a short usage guide.',
    deliverables: 'API, tests, documentation',
    requirements: 'REST, input validation, unit tests for edge cases.',
    durationDays: 12,
    isPaid: false,
    skills: ['Node.js', 'Testing', 'REST'],
    authorEmail: 'arjun.desai@example.edu',
    status: 'CLOSED',
  },
]

const knowledgeSeeds = [
  {
    title: 'How to prepare for a product engineering interview',
    summary: 'A practical preparation plan covering fundamentals, system design and portfolio storytelling.',
    category: 'Career guidance',
    type: 'ARTICLE',
    tags: 'interview, product, system design',
    authorEmail: 'meera.nair@example.edu',
    body: 'Start with the problems you have already solved. Rehearse the decisions behind them, not just the outcome. Then practise a small number of system design prompts end to end, and finish with two portfolio stories that explain trade-offs clearly.\n\nThis guide is sample content written for the demo dataset.',
  },
  {
    title: 'Design portfolio review checklist',
    summary: 'Twelve checks to run before sharing a design portfolio with a recruiter or mentor.',
    category: 'Career guidance',
    type: 'GUIDE',
    tags: 'design, portfolio, feedback',
    authorEmail: 'priya.krishnan@example.edu',
    body: 'Lead with the problem. Show the constraint you were designing against. Include one thing you would change. Keep the case study skimmable and make sure the outcome is not overstated.\n\nThis guide is sample content written for the demo dataset.',
  },
  {
    title: 'Reading a payments system without panicking',
    summary: 'An introduction to ledgers, idempotency and reconciliation for students entering fintech.',
    category: 'Industry insights',
    type: 'ARTICLE',
    tags: 'fintech, backend, payments',
    authorEmail: 'arjun.desai@example.edu',
    body: 'A payment is not a row update. It is a state machine with external dependencies. Learn idempotency keys, double-entry ledgers and reconciliation reports before you optimise anything.\n\nThis article is sample content written for the demo dataset.',
  },
]

function daysFromNow(days: number, hour = 10) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date
}

async function main() {
  const demoEmails = [
    ...studentSeeds.map((s) => s.email),
    ...alumniSeeds.map((a) => a.email),
    ...companySeeds.map((c) => c.email),
    ...syntheticAlumni.map((row) => row.contact_email),
    ...syntheticStudents.map((row) => row.email),
    'admin@example.edu',
    'registrar@demo.edu',
  ]

  // Remove only seeded demo rows, in dependency order. Real accounts survive.
  const demoUsers = await prisma.user.findMany({ where: { email: { in: demoEmails } }, select: { id: true } })
  const demoUserIds = demoUsers.map((u) => u.id)
  const demoChallenges = await prisma.challenge.findMany({
    where: { authorId: { in: demoUserIds } },
    select: { id: true },
  })
  const demoChallengeIds = demoChallenges.map((c) => c.id)

  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { actorId: { in: demoUserIds } } }),
    prisma.notification.deleteMany({ where: { userId: { in: demoUserIds } } }),
    prisma.bookmark.deleteMany({ where: { userId: { in: demoUserIds } } }),
    prisma.application.deleteMany({ where: { studentId: { in: demoUserIds } } }),
    prisma.opportunity.deleteMany({ where: { companyId: { in: demoUserIds } } }),
    prisma.portfolioProject.deleteMany({ where: { studentId: { in: demoUserIds } } }),
    prisma.eventRegistration.deleteMany({ where: { userId: { in: demoUserIds } } }),
    prisma.event.deleteMany({ where: { hostId: { in: demoUserIds } } }),
    prisma.bookmark.deleteMany({ where: { resource: { authorId: { in: demoUserIds } } } }),
    prisma.knowledgeResource.deleteMany({ where: { authorId: { in: demoUserIds } } }),
    prisma.evaluation.deleteMany({ where: { evaluatorId: { in: demoUserIds } } }),
    prisma.certificate.deleteMany({ where: { userId: { in: demoUserIds } } }),
    prisma.mentorshipSession.deleteMany({ where: { request: { mentorId: { in: demoUserIds } } } }),
    prisma.mentorshipRequest.deleteMany({ where: { OR: [{ studentId: { in: demoUserIds } }, { mentorId: { in: demoUserIds } }] } }),
    prisma.submission.deleteMany({ where: { challengeId: { in: demoChallengeIds } } }),
    prisma.challengeParticipant.deleteMany({ where: { challengeId: { in: demoChallengeIds } } }),
    prisma.challengeSkill.deleteMany({ where: { challengeId: { in: demoChallengeIds } } }),
    prisma.challenge.deleteMany({ where: { id: { in: demoChallengeIds } } }),
    prisma.studentProfile.deleteMany({ where: { userId: { in: demoUserIds } } }),
    prisma.alumniProfile.deleteMany({ where: { userId: { in: demoUserIds } } }),
    prisma.universityProfile.deleteMany({ where: { userId: { in: demoUserIds } } }),
    prisma.university.deleteMany({ where: { name: 'Demo University' } }),
    prisma.user.deleteMany({ where: { id: { in: demoUserIds } } }),
  ])

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  const university = await prisma.university.create({
    data: {
      name: 'Demo University',
      shortName: 'DU',
      domain: 'demo.edu',
      city: 'Demo City',
      verified: true,
    },
  })

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.edu',
      name: 'Demo University Admin',
      role: 'ADMIN',
      emailVerified: true,
      passwordHash,
      headline: 'Demo administrator account',
    },
  })

  const registrar = await prisma.user.create({
    data: {
      email: 'registrar@demo.edu',
      name: 'Demo University Registrar',
      role: 'UNIVERSITY',
      emailVerified: true,
      passwordHash,
      headline: 'Demo university representative (registrar)',
      universityProfile: {
        create: {
          universityId: university.id,
          designation: 'Registrar',
          department: 'Academic Affairs',
          permissions: JSON.stringify(['VERIFY_STUDENTS', 'VERIFY_ALUMNI', 'ANNOUNCE', 'EVENTS', 'ANALYTICS', 'PROFILE']),
        },
      },
    },
  })

  const alumni = new Map<string, string>()
  for (const [index, seed] of alumniSeeds.entries()) {
    const user = await prisma.user.create({
      data: {
        email: seed.email,
        name: seed.name,
        role: 'ALUMNI',
        emailVerified: true,
        passwordHash,
        headline: `${seed.designation} at ${seed.company}`,
        location: seed.location,
        alumniProfile: {
          create: {
            universityId: university.id,
            universityName: 'Demo University',
            registrationNumber: `AL-${seed.graduationYear}-${index + 1}`,
            graduationYear: seed.graduationYear,
            company: seed.company,
            designation: seed.designation,
            industry: seed.industry,
            expertise: seed.expertise,
            mentorshipTopics: seed.topics,
            location: seed.location,
            timezone: seed.timezone,
            yearsExperience: seed.yearsExperience,
            mentorshipOpen: true,
            availability: 'Weekday evenings, 30-minute slots',
            verificationStatus: 'VERIFIED',
            verifiedAt: new Date(),
          },
        },
      },
    })
    alumni.set(seed.email, user.id)
    if (index === 0) {
      await prisma.alumniAiSettings.create({
        data: { alumniId: user.id, enabled: true, permissionLevel: 2, useApprovedAnswers: true },
      })
      await prisma.alumniAiKnowledge.createMany({
        data: [
          {
            alumniId: user.id,
            type: 'PROFILE',
            title: 'Professional profile',
            content: `${seed.designation} at ${seed.company} in ${seed.industry}. ${seed.expertise}. ${seed.yearsExperience} years of experience.`,
            approved: true,
            approvedAt: new Date(),
          },
          {
            alumniId: user.id,
            type: 'EXPERIENCE',
            title: 'Approved mentorship topics',
            content: `I mentor on ${seed.topics}. I focus on practical preparation and reviewing work that students can show.`,
            approved: true,
            approvedAt: new Date(),
          },
        ],
      })
    }
  }

  const companies = new Map<string, string>()
  for (const seed of companySeeds) {
    const user = await prisma.user.create({
      data: {
        email: seed.email,
        name: seed.name,
        role: 'COMPANY',
        emailVerified: true,
        passwordHash,
        headline: seed.company,
      },
    })
    companies.set(seed.email, user.id)
  }

  // Synthetic alumni directory imported from prisma/data/synthetic_alumni_120.json.
  // These are sample records for local development, not real people.
  for (const [index, record] of syntheticAlumni.entries()) {
    const user = await prisma.user.create({
      data: {
        email: record.contact_email,
        name: record.full_name,
        role: 'ALUMNI',
        emailVerified: true,
        passwordHash,
        headline: record.headline,
        bio: record.about,
        location: record.city,
        alumniProfile: {
          create: {
            universityId: university.id,
            universityName: 'Demo University',
            registrationNumber: record.alumni_id,
            graduationYear: record.graduation_year,
            company: record.employer_type.charAt(0).toUpperCase() + record.employer_type.slice(1),
            designation: record.current_role,
            industry: record.branch,
            location: record.city,
            country: 'India',
            languages: 'English, Hindi',
            expertise: toCommaList(record.skills),
            mentorshipTopics: toCommaList(record.mentorship_topics),
            availability: `${record.communication_style} · sample availability`,
            timezone: 'Asia/Kolkata',
            yearsExperience: record.years_experience,
            mentorshipOpen: index % 3 !== 0,
            verificationStatus: index < 12 ? 'VERIFIED' : 'UNVERIFIED',
            verifiedAt: index < 12 ? new Date() : null,
          },
        },
      },
    })

    // The first twelve sample alumni enable the AI representative with approved
    // knowledge so the student experience can be demonstrated locally.
    if (index < 12) {
      await prisma.alumniAiSettings.create({
        data: {
          alumniId: user.id,
          enabled: true,
          permissionLevel: index % 2 === 0 ? 2 : 1,
          useApprovedAnswers: true,
        },
      })
      await prisma.alumniAiKnowledge.createMany({
        data: [
          {
            alumniId: user.id,
            type: 'PROFILE',
            title: 'Professional profile',
            content: `${record.current_role} (${record.branch}) with ${record.years_experience} years of experience. ${record.about}`,
            approved: true,
            approvedAt: new Date(),
          },
          {
            alumniId: user.id,
            type: 'EXPERIENCE',
            title: 'Approved career advice',
            content: record.career_advice,
            approved: true,
            approvedAt: new Date(),
          },
          {
            alumniId: user.id,
            type: 'APPROVED_ANSWER',
            title: `Answer: ${record.sample_student_question}`,
            content: record.sample_alumni_reply,
            approved: true,
            approvedAt: new Date(),
          },
        ],
      })
    }
  }

  // Sample students derived from the same dataset.
  for (const student of syntheticStudents) {
    await prisma.user.create({
      data: {
        email: student.email,
        name: student.name,
        role: 'STUDENT',
        emailVerified: true,
        passwordHash,
        headline: `${student.course}, ${student.department}`,
        location: student.city,
        studentProfile: {
          create: {
            universityId: university.id,
            universityName: 'Demo University',
            registrationNumber: student.registrationNumber,
            department: student.department,
            course: student.course,
            currentYear: student.currentYear,
            semester: student.semester,
            graduationYear: student.graduationYear,
            skills: student.skills,
            careerInterests: student.interests,
            country: 'India',
          },
        },
      },
    })
  }

  const students: Array<{ id: string; name: string; email: string }> = []
  for (const [index, seed] of studentSeeds.entries()) {
    const user = await prisma.user.create({
      data: {
        email: seed.email,
        name: seed.name,
        role: 'STUDENT',
        emailVerified: true,
        passwordHash,
        headline: `${seed.course}, ${seed.department}`,
        location: 'Demo University',
        studentProfile: {
          create: {
            universityId: university.id,
            universityName: 'Demo University',
            registrationNumber: `REG-${seed.year}-${index + 1}`,
            department: seed.department,
            course: seed.course,
            currentYear: Math.max(1, 2026 - seed.year + 4),
            graduationYear: seed.year,
            skills: seed.skills,
            careerInterests: seed.interests,
            portfolioVisible: index % 2 === 0,
            visibleToCompanies: index < 3,
            consentAt: new Date(),
            verificationStatus: index === 0 ? 'VERIFIED' : 'PENDING',
            verifiedAt: index === 0 ? new Date() : null,
            verifiedById: index === 0 ? registrar.id : null,
          },
        },
      },
    })
    students.push({ id: user.id, name: user.name, email: user.email })
  }

  const skills = new Map<string, string>()
  async function skillId(name: string) {
    const existing = skills.get(name)
    if (existing) return existing
    const row = await prisma.skill.upsert({ where: { name }, update: {}, create: { name } })
    skills.set(name, row.id)
    return row.id
  }

  const challenges: Array<{ id: string; slug: string; title: string; authorId: string }> = []
  for (const seed of challengeSeeds) {
    const authorId = alumni.get(seed.authorEmail)!
    const created = await prisma.challenge.create({
      data: {
        slug: seed.slug,
        title: seed.title,
        summary: seed.summary,
        category: seed.category,
        objectives: seed.objectives,
        deliverables: seed.deliverables,
        requirements: seed.requirements,
        durationDays: seed.durationDays,
        isPaid: seed.isPaid,
        status: seed.status,
        deadline: daysFromNow(seed.status === 'CLOSED' ? -5 : seed.durationDays),
        authorId,
        skills: {
          create: await Promise.all(
            seed.skills.map(async (name) => ({ skillId: await skillId(name) })),
          ),
        },
      },
    })
    challenges.push({ id: created.id, slug: created.slug, title: created.title, authorId })
  }

  // Participation and one submission per student per challenge.
  let seedCounter = 0
  for (const challenge of challenges) {
    for (const [index, student] of students.entries()) {
      if ((index + seedCounter) % 2 === 1) continue
      await prisma.challengeParticipant.create({ data: { challengeId: challenge.id, userId: student.id } })

      const shouldSubmit = (index + seedCounter) % 3 !== 0
      if (!shouldSubmit) continue

      const evaluated = (index + seedCounter) % 4 === 0
      const score = evaluated ? 72 + ((index * 5 + seedCounter * 3) % 26) : null
      await prisma.submission.create({
        data: {
          challengeId: challenge.id,
          studentId: student.id,
          title: `${challenge.title} — ${student.name}`,
          summary: 'Sample submission created for the demo dataset.',
          repoUrl: `https://example.com/demo/${challenge.slug}/${index + 1}`,
          status: evaluated ? 'EVALUATED' : 'SUBMITTED',
          score,
          feedback: evaluated ? 'Sample evaluation feedback for demonstration purposes.' : null,
          evaluatedById: evaluated ? challenge.authorId : null,
          evaluatedAt: evaluated ? new Date() : null,
          evaluations: evaluated
            ? {
                create: {
                  evaluatorId: challenge.authorId,
                  score: score!,
                  feedback: 'Sample evaluation feedback for demonstration purposes.',
                  criteria: JSON.stringify({ problemUnderstanding: 8, craft: 7, communication: 8 }),
                },
              }
            : undefined,
        },
      })
    }
    seedCounter += 1
  }

  // Mentorship lifecycle across pending, accepted and completed states.
  const meera = alumni.get('meera.nair@example.edu')!
  const arjun = alumni.get('arjun.desai@example.edu')!
  const priya = alumni.get('priya.krishnan@example.edu')!

  await prisma.mentorshipRequest.create({
    data: {
      studentId: students[0].id,
      mentorId: meera,
      topic: 'Breaking into product analytics',
      message: 'I am building a complaint-analysis project and would like guidance on scoping it for a product audience.',
      status: 'PENDING',
    },
  })

  const acceptedRequest = await prisma.mentorshipRequest.create({
    data: {
      studentId: students[1].id,
      mentorId: priya,
      topic: 'Portfolio review before internship applications',
      message: 'Could we review three case studies and tighten the storytelling?',
      status: 'ACCEPTED',
      respondedAt: daysFromNow(-2),
    },
  })
  await prisma.mentorshipSession.create({
    data: {
      requestId: acceptedRequest.id,
      scheduledAt: daysFromNow(3, 18),
      durationMins: 30,
      status: 'SCHEDULED',
      roomKey: 'mentor-room',
      notes: 'Bring two case studies and one question about accessibility.',
    },
  })

  const completedRequest = await prisma.mentorshipRequest.create({
    data: {
      studentId: students[2].id,
      mentorId: arjun,
      topic: 'System design foundations',
      message: 'I want a study plan for backend interviews.',
      status: 'COMPLETED',
      respondedAt: daysFromNow(-20),
    },
  })
  await prisma.mentorshipSession.create({
    data: {
      requestId: completedRequest.id,
      scheduledAt: daysFromNow(-14, 19),
      durationMins: 30,
      status: 'COMPLETED',
      roomKey: 'mentor-room',
      notes: 'Covered idempotency and database indexes.',
      rating: 5,
      feedback: 'Clear, practical plan. Sample feedback for the demo dataset.',
    },
  })

  // Certificates only exist where a submission was actually evaluated.
  const evaluatedSubmissions = await prisma.submission.findMany({
    where: { status: 'EVALUATED' },
    include: { challenge: true },
    take: 6,
  })
  let certificateIndex = 0
  for (const submission of evaluatedSubmissions) {
    certificateIndex += 1
    await prisma.certificate.create({
      data: {
        code: `DEMO-${String(certificateIndex).padStart(4, '0')}`,
        userId: submission.studentId,
        challengeId: submission.challengeId,
        issuedById: submission.challenge.authorId,
        title: `${submission.challenge.title} — participation`,
        kind: certificateIndex === 1 ? 'CHALLENGE_WINNER' : 'CHALLENGE_COMPLETION',
      },
    })
  }

  const events = await Promise.all([
    prisma.event.create({
      data: {
        title: 'Careers in product analytics',
        description: 'A demo webinar on the day-to-day work of a product analyst. Sample event for the local dataset.',
        category: 'Webinar',
        mode: 'ONLINE',
        location: 'Online',
        startsAt: daysFromNow(5, 18),
        endsAt: daysFromNow(5, 19),
        capacity: 100,
        hostId: meera,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Metaverse mentorship open house',
        description: 'Meet mentors in the virtual mentorship room. Sample event for the local dataset.',
        category: 'Mentorship',
        mode: 'METAVERSE',
        location: 'Mentorship Room',
        metaverseRoom: 'mentor-room',
        startsAt: daysFromNow(8, 17),
        endsAt: daysFromNow(8, 18),
        capacity: 30,
        hostId: priya,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Campus alumni meetup',
        description: 'An informal campus meetup for current students and alumni. Sample event for the local dataset.',
        category: 'Meetup',
        mode: 'CAMPUS',
        location: 'Demo University — Innovation Block',
        startsAt: daysFromNow(14, 11),
        endsAt: daysFromNow(14, 14),
        capacity: 120,
        hostId: admin.id,
        universityId: university.id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Backend interview workshop',
        description: 'A practical workshop on backend interview patterns. Sample event for the local dataset.',
        category: 'Workshop',
        mode: 'ONLINE',
        location: 'Online',
        startsAt: daysFromNow(3, 19),
        endsAt: daysFromNow(3, 20),
        capacity: 60,
        hostId: arjun,
      },
    }),
  ])

  await prisma.eventRegistration.createMany({
    data: [
      { eventId: events[0].id, userId: students[0].id },
      { eventId: events[0].id, userId: students[3].id },
      { eventId: events[1].id, userId: students[1].id },
      { eventId: events[1].id, userId: students[5].id },
      { eventId: events[2].id, userId: students[2].id },
      { eventId: events[2].id, userId: students[4].id },
    ],
  })

  for (const seed of knowledgeSeeds) {
    await prisma.knowledgeResource.create({
      data: {
        title: seed.title,
        summary: seed.summary,
        body: seed.body,
        category: seed.category,
        tags: seed.tags,
        type: seed.type,
        authorId: alumni.get(seed.authorEmail)!,
        views: 12 + Math.floor(Math.random() * 40),
      },
    })
  }

  await prisma.opportunity.createMany({
    data: [
      {
        companyId: companies.get('talent@northwind.example.edu')!,
        title: 'Product analytics intern',
        description: 'Work with the product team on instrumentation and reporting. Sample opportunity for the demo dataset.',
        type: 'INTERNSHIP',
        location: 'Bengaluru',
        remote: true,
        skills: 'SQL, Python, Data Analysis',
        deadline: daysFromNow(20),
      },
      {
        companyId: companies.get('people@lumenstudio.example.edu')!,
        title: 'Design systems apprentice',
        description: 'Support the design systems team on component documentation. Sample opportunity for the demo dataset.',
        type: 'INTERNSHIP',
        location: 'Remote',
        remote: true,
        skills: 'Figma, Documentation, Accessibility',
        deadline: daysFromNow(30),
      },
      {
        companyId: companies.get('talent@northwind.example.edu')!,
        title: 'Junior backend engineer',
        description: 'Join the platform team building reliable APIs. Sample opportunity for the demo dataset.',
        type: 'JOB',
        location: 'Pune',
        remote: false,
        skills: 'Node.js, SQL, Testing',
        deadline: daysFromNow(45),
      },
    ],
  })

  for (const [index, student] of students.entries()) {
    await prisma.portfolioProject.createMany({
      data: [
        {
          studentId: student.id,
          title: `${student.name.split(' ')[0]}'s capstone project`,
          summary: 'Sample portfolio project created for the demo dataset.',
          skills: studentSeeds[index].skills,
          url: 'https://example.com/demo/portfolio',
          visibility: index % 2 === 0 ? 'PUBLIC' : 'PLATFORM',
        },
        {
          studentId: student.id,
          title: 'Hackathon prototype',
          summary: 'A 36-hour prototype built with a three-person team. Sample portfolio project.',
          skills: 'Teamwork, Prototyping',
          visibility: 'PRIVATE',
        },
      ],
    })
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: students[0].id,
        type: 'MENTORSHIP_REQUEST',
        title: 'Mentorship request pending',
        body: 'Your request to Meera Nair is waiting for a response.',
        link: '/student/dashboard?tab=mentorship',
      },
      {
        userId: students[1].id,
        type: 'SESSION_SCHEDULED',
        title: 'Session scheduled with Priya Krishnan',
        body: 'Your portfolio review is scheduled. Check the mentorship tab for details.',
        link: '/student/dashboard?tab=mentorship',
      },
      {
        userId: meera,
        type: 'MENTORSHIP_REQUEST',
        title: 'New mentorship request',
        body: `${students[0].name} asked for guidance on product analytics.`,
        link: '/alumni/dashboard?tab=mentorship',
      },
    ],
  })

  const counts = {
    users: await prisma.user.count(),
    universities: await prisma.university.count(),
    challenges: await prisma.challenge.count(),
    submissions: await prisma.submission.count(),
    mentorshipRequests: await prisma.mentorshipRequest.count(),
    certificates: await prisma.certificate.count(),
    events: await prisma.event.count(),
    resources: await prisma.knowledgeResource.count(),
    opportunities: await prisma.opportunity.count(),
  }
  console.log('Seed complete:', counts)
  console.log(`Synthetic dataset: ${syntheticAlumni.length} alumni + ${syntheticStudents.length} students (password ${DEMO_PASSWORD})`)
  console.log(`Demo accounts use the password: ${DEMO_PASSWORD} (${DEMO_DOMAIN})`)
  console.log('University rep demo account: registrar@demo.edu / ' + DEMO_PASSWORD)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
