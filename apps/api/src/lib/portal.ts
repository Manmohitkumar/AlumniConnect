/**
 * One authentication service, five role experiences.
 *
 * A "portal" is only a presentation/deployment boundary. It never owns
 * credentials or data: every portal talks to this API, and the portal name is
 * used solely to reject a sign-in that belongs to a different role.
 */
export const PORTALS = {
  student: ['STUDENT'],
  alumni: ['ALUMNI'],
  university: ['UNIVERSITY'],
  admin: ['ADMIN'],
  company: ['COMPANY'],
} as const

export type PortalKey = keyof typeof PORTALS

export const PORTAL_KEYS = Object.keys(PORTALS) as [PortalKey, ...PortalKey[]]

export function isPortal(value: unknown): value is PortalKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PORTALS, value)
}

/** Roles the given portal is allowed to sign in. */
export function portalRoles(portal: PortalKey): readonly string[] {
  return PORTALS[portal]
}

/** Where each role belongs after sign-in. Shared with the web client. */
export const ROLE_HOME: Record<string, string> = {
  STUDENT: '/student/dashboard',
  ALUMNI: '/alumni/dashboard',
  UNIVERSITY: '/university/dashboard',
  ADMIN: '/admin/dashboard',
  COMPANY: '/company/dashboard',
}

/** Roles that may only be created by an administrator, never by self-service. */
export const PROVISIONED_ROLES = ['UNIVERSITY', 'COMPANY', 'ADMIN'] as const
