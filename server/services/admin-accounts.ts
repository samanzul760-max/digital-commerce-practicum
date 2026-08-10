import { createError } from 'h3'
import { UserRole } from '@prisma/client'
import { prisma } from '../db/client'
import { createTemporaryPassword, hashPassword, isValidIdentifier, normalizeIdentifier, type AuthUser } from '../utils/auth-store'

export interface StudentAccountInput {
  identifier?: string
  displayName?: string
  temporaryPassword?: string
}

function accountView(account: { id: string; identifier: string; displayName: string; enabled: boolean; createdAt: Date; updatedAt: Date }) {
  return { ...account, role: 'STUDENT' as const }
}

async function auditRoomId(actorId: string) {
  const enrollment = await prisma.classEnrollment.findFirst({
    where: { userId: actorId, active: true },
    select: { class: { select: { roomId: true } } },
    orderBy: { id: 'asc' },
  })
  if (!enrollment) {
    throw createError({ statusCode: 409, statusMessage: 'AUTH_CONTEXT_REQUIRED', data: { code: 'AUTH_CONTEXT_REQUIRED' } })
  }
  return enrollment.class.roomId
}

async function writeAudit(actor: AuthUser, roomId: string, entityId: string, eventType: string) {
  await prisma.auditEvent.create({
    data: {
      trainingRoomId: roomId,
      actorId: actor.id,
      actorRole: actor.role,
      entityType: 'USER_ACCOUNT',
      entityId,
      eventType,
    },
  })
}

export async function listStudentAccounts() {
  const accounts = await prisma.user.findMany({
    where: { role: UserRole.STUDENT },
    select: { id: true, identifier: true, displayName: true, enabled: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return accounts.map(accountView)
}

export async function createStudentAccount(actor: AuthUser, input: StudentAccountInput) {
  const identifier = normalizeIdentifier(input.identifier ?? '')
  const displayName = (input.displayName ?? '').trim()
  const temporaryPassword = input.temporaryPassword?.trim() || createTemporaryPassword()
  if (!isValidIdentifier(identifier) || !displayName || displayName.length > 40 || temporaryPassword.length < 8) {
    throw createError({ statusCode: 422, statusMessage: 'ACCOUNT_INVALID', data: { code: 'ACCOUNT_INVALID' } })
  }
  const roomId = await auditRoomId(actor.id)
  try {
    const account = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { identifier, displayName, role: UserRole.STUDENT, ...hashPassword(temporaryPassword), roleGrants: { create: { role: UserRole.STUDENT } } },
        select: { id: true, identifier: true, displayName: true, enabled: true, createdAt: true, updatedAt: true },
      })
      await tx.auditEvent.create({
        data: { trainingRoomId: roomId, actorId: actor.id, actorRole: actor.role, entityType: 'USER_ACCOUNT', entityId: created.id, eventType: 'STUDENT_ACCOUNT_CREATED' },
      })
      return created
    })
    return { account: accountView(account), temporaryPassword }
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'ACCOUNT_IDENTIFIER_EXISTS', data: { code: 'ACCOUNT_IDENTIFIER_EXISTS' } })
    }
    throw error
  }
}

async function studentAccount(id: string) {
  const account = await prisma.user.findFirst({
    where: { id, role: UserRole.STUDENT },
    select: { id: true, identifier: true, displayName: true, enabled: true, createdAt: true, updatedAt: true },
  })
  if (!account) throw createError({ statusCode: 404, statusMessage: 'STUDENT_ACCOUNT_NOT_FOUND', data: { code: 'STUDENT_ACCOUNT_NOT_FOUND' } })
  return account
}

export async function setStudentAccountStatus(actor: AuthUser, id: string, enabled: boolean) {
  await studentAccount(id)
  const roomId = await auditRoomId(actor.id)
  const account = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id }, data: { enabled }, select: { id: true, identifier: true, displayName: true, enabled: true, createdAt: true, updatedAt: true } })
    await tx.auditEvent.create({ data: { trainingRoomId: roomId, actorId: actor.id, actorRole: actor.role, entityType: 'USER_ACCOUNT', entityId: id, eventType: enabled ? 'STUDENT_ACCOUNT_ENABLED' : 'STUDENT_ACCOUNT_DISABLED' } })
    return updated
  })
  return accountView(account)
}

export async function resetStudentAccountPassword(actor: AuthUser, id: string) {
  await studentAccount(id)
  const roomId = await auditRoomId(actor.id)
  const temporaryPassword = createTemporaryPassword()
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: hashPassword(temporaryPassword) })
    await tx.authSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })
    await tx.auditEvent.create({ data: { trainingRoomId: roomId, actorId: actor.id, actorRole: actor.role, entityType: 'USER_ACCOUNT', entityId: id, eventType: 'STUDENT_ACCOUNT_PASSWORD_RESET' } })
  })
  return { temporaryPassword }
}
