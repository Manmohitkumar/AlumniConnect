# Database Schema

## Core models

- `User`: identity, role, status, emailVerified, mustChangePassword, tokenVersion.
- `StudentProfile`, `AlumniProfile`: academic/professional details, university link, verification status.
- `University`, `UniversityProfile`: institution and representative permissions.
- `AuthToken`: hashed single-use verification/reset tokens.

## Domain models

- Challenge, ChallengeParticipant, ChallengeSkill, Submission, Evaluation
- MentorshipRequest, MentorshipSession
- Certificate
- Notification
- Event, EventRegistration
- KnowledgeResource, Bookmark
- Opportunity, Application
- PortfolioProject
- RoomVisit, AuditLog

## Indexes

- User(role,status)
- StudentProfile(universityId,verificationStatus)
- AlumniProfile(universityId,verificationStatus), (industry,mentorshipOpen)
- Event(startsAt,status), (universityId)
- Notification(userId,readAt,createdAt)

## Provider

- SQLite for development; schema uses `String` for roles/statuses for Postgres compatibility.
