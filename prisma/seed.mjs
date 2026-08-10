import { randomBytes, scryptSync } from 'node:crypto'
import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

function requiredPassword(name) {
  const value = process.env[name]
  if (!value || value.length < 8) throw new Error(`${name} must be set to an uncommitted password of at least 8 characters.`)
  return value
}

function passwordFields(password) {
  const passwordSalt = randomBytes(16).toString('hex')
  return { passwordSalt, passwordHash: scryptSync(password, passwordSalt, 32).toString('hex') }
}

async function upsertUser({ identifier, displayName, role, password }) {
  const fields = passwordFields(password)
  const user = await prisma.user.upsert({
    where: { identifier },
    update: { displayName, role, enabled: true, ...fields },
    create: { identifier, displayName, role, ...fields, roleGrants: { create: { role } } },
  })
  await prisma.userRoleGrant.upsert({ where: { userId_role: { userId: user.id, role } }, update: {}, create: { userId: user.id, role } })
  return user
}

async function main() {
  const admin = await upsertUser({
    identifier: 'admin', displayName: '平台管理员', role: UserRole.ADMIN, password: requiredPassword('SEED_ADMIN_PASSWORD'),
  })
  const student = await upsertUser({
    identifier: 'student1', displayName: '学生 1', role: UserRole.STUDENT, password: requiredPassword('SEED_STUDENT1_PASSWORD'),
  })

  const organization = await prisma.organization.upsert({
    where: { id: 'learnec-org' }, update: { name: 'LearnEC 教学组织' }, create: { id: 'learnec-org', name: 'LearnEC 教学组织' },
  })
  const room = await prisma.trainingRoom.upsert({
    where: { id: 'learnec-room' }, update: { organizationId: organization.id, name: 'LearnEC 默认实训室' },
    create: { id: 'learnec-room', organizationId: organization.id, name: 'LearnEC 默认实训室' },
  })
  const cohort = await prisma.cohort.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'LearnEC 默认届别' } },
    update: {}, create: { organizationId: organization.id, name: 'LearnEC 默认届别', startsAt: new Date('2026-01-01'), endsAt: new Date('2026-12-31') },
  })
  const classroom = await prisma.class.upsert({
    where: { cohortId_name: { cohortId: cohort.id, name: 'LearnEC 默认班级' } },
    update: { organizationId: organization.id, roomId: room.id },
    create: { organizationId: organization.id, roomId: room.id, cohortId: cohort.id, name: 'LearnEC 默认班级' },
  })
  await prisma.classEnrollment.upsert({
    where: { classId_userId: { classId: classroom.id, userId: admin.id } }, update: { role: 'TEACHER', active: true },
    create: { classId: classroom.id, userId: admin.id, role: 'TEACHER', active: true },
  })
  await prisma.classEnrollment.upsert({
    where: { classId_userId: { classId: classroom.id, userId: student.id } }, update: { role: 'STUDENT', active: true },
    create: { classId: classroom.id, userId: student.id, role: 'STUDENT', active: true },
  })
}

main().finally(async () => { await prisma.$disconnect() })
