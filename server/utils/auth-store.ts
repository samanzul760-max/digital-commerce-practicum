import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import type { PracticumRole } from '../../domain/practicum/types'

export interface AuthUser {
  id: string
  identifier: string
  displayName: string
  role: PracticumRole
  roomIds: string[]
}

interface StoredUser extends AuthUser {
  passwordSalt: string
  passwordHash: string
}

interface StoredSession {
  userId: string
  expiresAt: number
}

export interface BootstrapOwnerInput {
  identifier?: string
  displayName?: string
  password?: string
}

const dataRoot = process.env.PRACTICUM_DATA_DIR || join(process.cwd(), '.data')
const usersPath = join(dataRoot, 'auth-users.json')
const sessionsPath = join(dataRoot, 'auth-sessions.json')
const sessionTtlMs = 8 * 60 * 60 * 1000
const identifierPattern = /^[a-zA-Z0-9_-]{3,64}$/

const seedUsers: StoredUser[] = [
  {
    id: 'user-owner-001',
    identifier: 'owner@example.test',
    displayName: '实训室管理员',
    role: 'OWNER',
    roomIds: ['room-001'],
    passwordSalt: '43a89244653ebbdf3789eaf29bf58cdc',
    passwordHash: 'f399d8cf9ab72864f3667805c2a28ab84069de9bfac54d9becc5b1071be2ac47',
  },
  {
    id: 'user-student-001',
    identifier: 'student@example.test',
    displayName: '实训学生',
    role: 'STUDENT',
    roomIds: ['room-001'],
    passwordSalt: '24dacf697812c9bddec1fb3624390f07',
    passwordHash: 'a7b4adca45fb69fa09ea05850a6f5afc79b9156bf219c2364b3553c24274b32a',
  },
]

function readCustomUsers(): StoredUser[] {
  try {
    const value = JSON.parse(readFileSync(usersPath, 'utf8'))
    return Array.isArray(value) ? value as StoredUser[] : []
  } catch {
    return []
  }
}

function writeCustomUsers(users: StoredUser[]) {
  mkdirSync(dirname(usersPath), { recursive: true })
  writeFileSync(usersPath, JSON.stringify(users), 'utf8')
}

function allUsers() {
  return [...seedUsers, ...readCustomUsers()]
}

function readSessions(): Record<string, StoredSession> {
  try {
    return JSON.parse(readFileSync(sessionsPath, 'utf8')) as Record<string, StoredSession>
  } catch {
    return {}
  }
}

function writeSessions(sessions: Record<string, StoredSession>) {
  mkdirSync(dirname(sessionsPath), { recursive: true })
  writeFileSync(sessionsPath, JSON.stringify(sessions), 'utf8')
}

function publicUser(user: StoredUser): AuthUser {
  const { passwordHash: _hash, passwordSalt: _salt, ...safeUser } = user
  return safeUser
}

function findUser(identifier: string) {
  const normalized = identifier.trim().toLowerCase()
  return allUsers().find(user => user.identifier.toLowerCase() === normalized)
}

export function isBootstrapAvailable() {
  return !readCustomUsers().some(user => user.role === 'OWNER')
}

export function bootstrapOwner(input: BootstrapOwnerInput) {
  if (!isBootstrapAvailable()) return { kind: 'ALREADY_COMPLETED' as const }
  const identifier = input.identifier?.trim() ?? ''
  const displayName = input.displayName?.trim() ?? ''
  const password = input.password ?? ''
  if (!identifierPattern.test(identifier) || !displayName || displayName.length > 40 || password.length < 3 || findUser(identifier)) {
    return { kind: 'INVALID' as const }
  }
  const passwordSalt = randomBytes(16).toString('hex')
  const user: StoredUser = {
    id: `user-${randomUUID()}`,
    identifier,
    displayName,
    role: 'OWNER',
    roomIds: ['room-001'],
    passwordSalt,
    passwordHash: scryptSync(password, passwordSalt, 32).toString('hex'),
  }
  writeCustomUsers([...readCustomUsers(), user])
  return { kind: 'OK' as const, user: publicUser(user) }
}

export function verifyCredentials(identifier: string, password: string): AuthUser | null {
  const user = findUser(identifier)
  if (!user || !password) return null
  const actual = scryptSync(password, user.passwordSalt, 32)
  const expected = Buffer.from(user.passwordHash, 'hex')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  return publicUser(user)
}

export function createSession(user: AuthUser): { token: string; expiresAt: number } {
  const token = randomBytes(32).toString('hex')
  const expiresAt = Date.now() + sessionTtlMs
  const sessions = readSessions()
  sessions[token] = { userId: user.id, expiresAt }
  writeSessions(sessions)
  return { token, expiresAt }
}

export function getSessionUser(token: string | undefined): AuthUser | null {
  if (!token) return null
  const sessions = readSessions()
  const session = sessions[token]
  if (!session) return null
  if (session.expiresAt <= Date.now()) {
    delete sessions[token]
    writeSessions(sessions)
    return null
  }
  const user = allUsers().find(item => item.id === session.userId)
  return user ? publicUser(user) : null
}

export function revokeSession(token: string | undefined) {
  if (!token) return
  const sessions = readSessions()
  if (!sessions[token]) return
  delete sessions[token]
  writeSessions(sessions)
}

export const AUTH_COOKIE = 'practicum_session'
