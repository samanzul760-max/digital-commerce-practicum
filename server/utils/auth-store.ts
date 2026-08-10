import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { UserRole, type User } from '@prisma/client'
import type { PracticumRole } from '../../domain/practicum/types'
import { prisma } from '../db/client'

export const AUTH_COOKIE = 'practicum_session'
export const CSRF_COOKIE = 'practicum_csrf'

const sessionTtlMs = 8 * 60 * 60 * 1000
const identifierPattern = /^[a-zA-Z0-9_-]{3,64}$/

export interface AuthUser {
  id: string
  identifier: string
  displayName: string
  role: PracticumRole
  authorizedRoles: PracticumRole[]
  roomIds: string[]
}

export interface SessionContext {
  id: string
  user: AuthUser
  csrfTokenHash: string
  organizationId?: string
  roomId?: string
}

export interface BootstrapOwnerInput {
  identifier?: string
  displayName?: string
  password?: string
}

function hashSecret(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function toLegacyCompatibleRole(role: UserRole): PracticumRole {
  return role === UserRole.ADMIN ? 'ADMIN' : 'STUDENT'
}

async function roomIdsForUser(userId: string) {
  const enrollments = await prisma.classEnrollment.findMany({
    where: { userId, active: true },
    select: { class: { select: { roomId: true } } },
  })
  return [...new Set(enrollments.map(item => item.class.roomId))]
}

async function publicUser(user: User, activeRole?: UserRole): Promise<AuthUser> {
  const grants = await prisma.userRoleGrant.findMany({ where: { userId: user.id }, select: { role: true } })
  const roles = [...new Set([...grants.map(grant => toLegacyCompatibleRole(grant.role)), toLegacyCompatibleRole(user.role)])]
  const selectedRole = activeRole && roles.includes(toLegacyCompatibleRole(activeRole)) ? activeRole : user.role
  return {
    id: user.id,
    identifier: user.identifier,
    displayName: user.displayName,
    role: toLegacyCompatibleRole(selectedRole),
    authorizedRoles: roles,
    roomIds: await roomIdsForUser(user.id),
  }
}

function validPassword(password: string, user: User) {
  const actual = scryptSync(password, user.passwordSalt, 32)
  const expected = Buffer.from(user.passwordHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function hashPassword(password: string) {
  const passwordSalt = randomBytes(16).toString('hex')
  return { passwordSalt, passwordHash: scryptSync(password, passwordSalt, 32).toString('hex') }
}

export function isValidIdentifier(identifier: string) {
  return identifierPattern.test(identifier)
}

export function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase()
}

export function createTemporaryPassword() {
  return randomBytes(12).toString('base64url')
}

export async function verifyCredentials(identifier: string, password: string): Promise<AuthUser | null> {
  const normalized = normalizeIdentifier(identifier)
  const user = await prisma.user.findUnique({ where: { identifier: normalized } })
  if (!user || !user.enabled || !password || !validPassword(password, user)) return null
  return await publicUser(user)
}

export async function createSession(user: AuthUser) {
  const token = randomBytes(32).toString('base64url')
  const csrfToken = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + sessionTtlMs)
  await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashSecret(token),
      csrfTokenHash: hashSecret(csrfToken),
      activeRole: user.role === 'ADMIN' ? UserRole.ADMIN : UserRole.STUDENT,
      expiresAt,
    },
  })
  return { token, csrfToken, expiresAt }
}

export async function getSessionContext(token: string | undefined): Promise<SessionContext | null> {
  if (!token) return null
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSecret(token) },
    include: { user: true },
  })
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.enabled) {
    if (session && !session.revokedAt) await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } })
    return null
  }
  return {
    id: session.id,
    user: await publicUser(session.user, session.activeRole),
    csrfTokenHash: session.csrfTokenHash,
    organizationId: session.organizationId ?? undefined,
    roomId: session.roomId ?? undefined,
  }
}

export async function getSessionUser(token: string | undefined) {
  return (await getSessionContext(token))?.user ?? null
}

export async function setSessionActiveRole(token: string | undefined, role: UserRole) {
  const context = await getSessionContext(token)
  if (!context) return 'SESSION_NOT_FOUND' as const
  if (!context.user.authorizedRoles.includes(toLegacyCompatibleRole(role))) return 'ROLE_NOT_AUTHORIZED' as const
  await prisma.authSession.update({ where: { id: context.id }, data: { activeRole: role } })
  return 'OK' as const
}

export async function setSessionContext(token: string | undefined, context: { organizationId: string; roomId: string }) {
  const session = await getSessionContext(token)
  if (!session || !session.user.roomIds.includes(context.roomId)) return false
  await prisma.authSession.update({ where: { id: session.id }, data: context })
  return true
}

export async function revokeSession(token: string | undefined) {
  if (!token) return
  await prisma.authSession.updateMany({
    where: { tokenHash: hashSecret(token), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export function csrfTokenMatches(token: string, expectedHash: string) {
  const actual = Buffer.from(hashSecret(token), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function updateUserDisplayName(userId: string, displayName: string) {
  const normalized = displayName.trim()
  if (!normalized || normalized.length > 40) return { kind: 'INVALID' as const }
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { kind: 'NOT_FOUND' as const }
  const updated = await prisma.user.update({ where: { id: userId }, data: { displayName: normalized } })
  return { kind: 'OK' as const, user: await publicUser(updated) }
}

// The old bootstrap flow conflicts with mandatory seeded credentials.
export function isBootstrapAvailable() { return false }
export function bootstrapOwner(_input: BootstrapOwnerInput) { return { kind: 'ALREADY_COMPLETED' as const } }

// Legacy APIs are no longer application entry points. They deliberately do not
// fall back to a file store while `/practicum/**` is redirected during migration.
export function findPublicUserById(_userId: string): AuthUser | null { return null }
export async function listStudentRoster(roomId: string) {
  const enrollments = await prisma.classEnrollment.findMany({
    where: { class: { roomId }, active: true, role: 'STUDENT' },
    select: { userId: true },
  })
  const users = await prisma.user.findMany({
    where: { id: { in: enrollments.map(item => item.userId) }, role: UserRole.STUDENT, enabled: true },
    select: { id: true, displayName: true },
  })
  return users.map(user => ({ id: user.id, displayLabel: user.displayName.slice(0, 1) }))
}
