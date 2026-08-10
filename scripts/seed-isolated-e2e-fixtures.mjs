import { randomBytes, scryptSync } from 'node:crypto'
import { PrismaClient, ResourceSource, UserRole } from '@prisma/client'
import { fileURLToPath } from 'node:url'

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1'])

export function normalizeE2eRunId(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new Error('PRACTICUM_E2E_RUN_ID must contain letters, numbers, and single hyphens only.')
  }
  return normalized
}

export function assertFixtureEnvironment({ runId = process.env.PRACTICUM_E2E_RUN_ID, databaseUrl = process.env.DATABASE_URL } = {}) {
  if (!runId) throw new Error('PRACTICUM_E2E_RUN_ID is required before seeding isolated E2E fixtures.')
  if (!databaseUrl) throw new Error('DATABASE_URL is required before seeding isolated E2E fixtures.')

  const normalizedRunId = normalizeE2eRunId(runId)
  const url = new URL(databaseUrl)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('Isolated E2E fixture DATABASE_URL must use PostgreSQL.')
  }
  if (!loopbackHosts.has(url.hostname)) {
    throw new Error('Isolated E2E fixture DATABASE_URL must use a loopback host.')
  }

  const databaseName = url.pathname.replace(/^\/+/, '')
  const expectedDatabaseName = `practicum_e2e_${normalizedRunId.replaceAll('-', '_')}`
  if (databaseName !== expectedDatabaseName) {
    throw new Error(`Isolated E2E fixture database name must equal ${expectedDatabaseName}.`)
  }
  return { runId: normalizedRunId, databaseName }
}

export function createFixtureContract() {
  return {
    organization: { id: 'org-demo' },
    rooms: [{ id: 'room-001' }, { id: 'room-002' }],
    members: [
      { roomId: 'room-001', displayName: 'E2E Owner', role: 'OWNER' },
      { roomId: 'room-001', displayName: 'E2E Student', role: 'STUDENT' },
      { roomId: 'room-002', displayName: 'E2E Owner', role: 'OWNER' },
    ],
    class: { id: 'class-e2e-001', teacherId: 'user-owner-001' },
    template: { id: 'template-e2e-001', key: 'commerce-cases', enabled: true },
    competition: { id: 'competition-e2e-001', status: 'PUBLISHED' },
  }
}

async function seedFixtures(prisma) {
  const fixture = createFixtureContract()
  const organization = await prisma.organization.upsert({
    where: { id: fixture.organization.id },
    update: { name: 'E2E Demo Organization' },
    create: { id: fixture.organization.id, name: 'E2E Demo Organization' },
  })

  for (const room of fixture.rooms) {
    await prisma.trainingRoom.upsert({
      where: { id: room.id },
      update: { organizationId: organization.id, name: `E2E ${room.id}` },
      create: { id: room.id, organizationId: organization.id, name: `E2E ${room.id}` },
    })
  }

  const cohort = await prisma.cohort.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'E2E Cohort' } },
    update: { startsAt: new Date('2026-01-01T00:00:00.000Z'), endsAt: new Date('2026-12-31T23:59:59.000Z') },
    create: {
      id: 'cohort-e2e-001',
      organizationId: organization.id,
      name: 'E2E Cohort',
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
    },
  })

  const classroom = await prisma.class.upsert({
    where: { cohortId_name: { cohortId: cohort.id, name: 'E2E Teacher Class' } },
    update: { organizationId: organization.id, roomId: 'room-001' },
    create: {
      id: fixture.class.id,
      organizationId: organization.id,
      roomId: 'room-001',
      cohortId: cohort.id,
      name: 'E2E Teacher Class',
    },
  })
  const foreignRoom = await prisma.trainingRoom.upsert({
    where: { id: 'room-e2e-foreign' },
    update: { organizationId: organization.id, name: 'E2E 未授权实训室' },
    create: { id: 'room-e2e-foreign', organizationId: organization.id, name: 'E2E 未授权实训室' },
  })
  await prisma.class.upsert({
    where: { id: 'class-e2e-foreign' },
    update: { organizationId: organization.id, roomId: foreignRoom.id, cohortId: cohort.id, name: 'E2E 未授权班级' },
    create: { id: 'class-e2e-foreign', organizationId: organization.id, roomId: foreignRoom.id, cohortId: cohort.id, name: 'E2E 未授权班级' },
  })

  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  const studentPassword = process.env.SEED_STUDENT1_PASSWORD
  if (!adminPassword || !studentPassword) throw new Error('Isolated E2E auth fixture passwords are required.')
  const passwordFields = (password) => {
    const passwordSalt = randomBytes(16).toString('hex')
    return { passwordSalt, passwordHash: scryptSync(password, passwordSalt, 32).toString('hex') }
  }
  const admin = await prisma.user.upsert({
    where: { identifier: 'admin' },
    update: { id: 'user-owner-001', displayName: 'E2E Admin', role: UserRole.ADMIN, enabled: true, ...passwordFields(adminPassword) },
    create: { id: 'user-owner-001', identifier: 'admin', displayName: 'E2E Admin', role: UserRole.ADMIN, ...passwordFields(adminPassword) },
  })
  const student = await prisma.user.upsert({
    where: { identifier: 'student1' },
    update: { id: 'user-student-001', displayName: 'E2E Student', role: UserRole.STUDENT, enabled: true, ...passwordFields(studentPassword) },
    create: { id: 'user-student-001', identifier: 'student1', displayName: 'E2E Student', role: UserRole.STUDENT, ...passwordFields(studentPassword) },
  })
  await prisma.userRoleGrant.upsert({ where: { userId_role: { userId: admin.id, role: UserRole.ADMIN } }, update: {}, create: { userId: admin.id, role: UserRole.ADMIN } })
  await prisma.userRoleGrant.upsert({ where: { userId_role: { userId: student.id, role: UserRole.STUDENT } }, update: {}, create: { userId: student.id, role: UserRole.STUDENT } })

  await prisma.classEnrollment.upsert({
    where: { classId_userId: { classId: classroom.id, userId: fixture.class.teacherId } },
    update: { role: 'TEACHER', active: true },
    create: { classId: classroom.id, userId: fixture.class.teacherId, role: 'TEACHER', active: true },
  })
  await prisma.classEnrollment.upsert({
    where: { classId_userId: { classId: classroom.id, userId: student.id } },
    update: { role: 'STUDENT', active: true },
    create: { classId: classroom.id, userId: student.id, role: 'STUDENT', active: true },
  })

  const resources = [
    { id: 'resource-e2e-software', source: ResourceSource.SOFTWARE_CENTER, title: 'E2E 网店开通', summary: '软件中心测试资源', capabilityTags: ['开店'], configuration: { sectionType: 'SANDBOX', sandboxType: 'STORE_BASICS', appKey: 'store-basics' } },
    { id: 'resource-e2e-camp', source: ResourceSource.SKILL_CAMP, title: 'E2E 店铺基础训练', summary: '技能训练营测试资源', capabilityTags: ['设置'], configuration: { sectionType: 'SANDBOX', sandboxType: 'STORE_BASICS', appKey: 'store-basics' } },
    { id: 'resource-e2e-enterprise', source: ResourceSource.ENTERPRISE_TASK_LIBRARY, title: 'E2E 企业经营任务', summary: '企业任务库测试资源', capabilityTags: ['分析'], configuration: { sectionType: 'SANDBOX', sandboxType: 'BUSINESS_ANALYTICS', appKey: 'business-analytics' } },
  ]
  for (const resource of resources) {
    await prisma.resourceCatalogItem.upsert({ where: { id: resource.id }, update: resource, create: resource })
  }

  await prisma.workOrderTemplate.upsert({
    where: { id: 'template-e2e-work-order' },
    update: { organizationId: organization.id, title: 'E2E 预置工单', description: '隔离测试模板', createdById: admin.id },
    create: {
      id: 'template-e2e-work-order', organizationId: organization.id, title: 'E2E 预置工单', description: '隔离测试模板', createdById: admin.id,
      sectionsSnapshot: [{ clientKey: 'work-order', type: 'WORK_ORDER', title: 'E2E 预置工单', description: '隔离测试区块', sort: 0, required: true, weightPercent: 0 }],
    },
  })

  for (const member of fixture.members) {
    await prisma.roomMember.upsert({
      where: { roomId_displayName: { roomId: member.roomId, displayName: member.displayName } },
      update: { role: member.role, isDemo: true },
      create: { roomId: member.roomId, displayName: member.displayName, role: member.role, isDemo: true },
    })
  }

  await prisma.practicumTemplate.upsert({
    where: { trainingRoomId_templateKey: { trainingRoomId: 'room-001', templateKey: fixture.template.key } },
    update: {
      name: 'E2E Commerce Cases Template',
      enabled: fixture.template.enabled,
      configuration: { source: 'isolated-e2e-fixture' },
    },
    create: {
      id: fixture.template.id,
      trainingRoomId: 'room-001',
      templateKey: fixture.template.key,
      name: 'E2E Commerce Cases Template',
      enabled: fixture.template.enabled,
      configuration: { source: 'isolated-e2e-fixture' },
    },
  })

  await prisma.competition.upsert({
    where: { id: fixture.competition.id },
    update: {
      trainingRoomId: 'room-001',
      createdById: 'user-owner-001',
      name: 'E2E Published Competition',
      description: 'Deterministic isolated E2E competition.',
      status: fixture.competition.status,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    create: {
      id: fixture.competition.id,
      trainingRoomId: 'room-001',
      createdById: 'user-owner-001',
      name: 'E2E Published Competition',
      description: 'Deterministic isolated E2E competition.',
      status: fixture.competition.status,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  })
}

async function main() {
  assertFixtureEnvironment()
  const prisma = new PrismaClient()
  try {
    await seedFixtures(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => {
    console.error(`[isolated-e2e-fixtures] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
