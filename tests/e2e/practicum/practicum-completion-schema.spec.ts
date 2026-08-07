import { expect, test } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const projectRoot = join(__dirname, '..', '..', '..')
const schemaPath = join(projectRoot, 'prisma', 'schema.prisma')
const migrationsPath = join(projectRoot, 'prisma', 'migrations')

const schema = readFileSync(schemaPath, 'utf8')
const completionMigration = readdirSync(migrationsPath)
  .find((entry) => entry.endsWith('_add_practicum_completion_entities'))

function model(name: string) {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`, 'm'))
  expect(match, `${name} must be declared in prisma/schema.prisma`).toBeTruthy()
  return match![1]
}

test.describe('practicum completion schema contract', () => {
  test('[BDD-COMPLETION-SCHEMA-001] every completion entity has room or class scope', () => {
    expect(model('TrainingRoomSetting')).toContain('trainingRoomId String')
    expect(model('JoinApplication')).toContain('trainingRoomId String')
    expect(model('MemberInvite')).toContain('trainingRoomId String')
    expect(model('AuditEvent')).toContain('trainingRoomId String')
    expect(model('PracticumTemplate')).toContain('trainingRoomId String')
    expect(model('Competition')).toContain('trainingRoomId String')
    expect(model('ClassAnnouncement')).toContain('classId String')
    expect(model('TeachingSession')).toContain('classId String')
  })

  test('[BDD-COMPLETION-SCHEMA-002] related records declare scoped foreign keys', () => {
    expect(model('TrainingRoomSetting')).toContain('trainingRoom TrainingRoom @relation(fields: [trainingRoomId], references: [id], onDelete: Cascade)')
    expect(model('ClassAnnouncement')).toContain('class Class @relation(fields: [classId], references: [id], onDelete: Cascade)')
    expect(model('TeachingSession')).toContain('class Class @relation(fields: [classId], references: [id], onDelete: Cascade)')
    expect(model('ActivityExecution')).toContain('teachingSession TeachingSession @relation(fields: [teachingSessionId], references: [id], onDelete: Cascade)')
    expect(model('ActivityExecution')).toContain('member RoomMember @relation(fields: [memberId], references: [id], onDelete: Cascade)')
    expect(model('CompetitionEntry')).toContain('competition Competition @relation(fields: [competitionId], references: [id], onDelete: Cascade)')
    expect(model('CompetitionEntry')).toContain('member RoomMember @relation(fields: [memberId], references: [id], onDelete: Cascade)')
  })

  test('[BDD-COMPLETION-SCHEMA-003] idempotency and duplicate facts have durable unique constraints', () => {
    expect(model('ClassAnnouncement')).toContain('idempotencyKey String')
    expect(model('ClassAnnouncement')).toContain('@@unique([classId, authorId, idempotencyKey])')
    expect(model('TeachingSession')).toContain('@@unique([classId, idempotencyKey])')
    expect(model('JoinApplication')).toContain('@@unique([trainingRoomId, applicantId, idempotencyKey])')
    expect(model('MemberInvite')).toContain('@@unique([trainingRoomId, invitedById, idempotencyKey])')
    expect(model('MemberInvite')).toContain('inviteCode String @unique')
    expect(model('ActivityExecution')).toContain('@@unique([teachingSessionId, memberId, activityId])')
    expect(model('CompetitionEntry')).toContain('@@unique([competitionId, memberId])')
  })

  test('[BDD-COMPLETION-SCHEMA-005] the completion migration is additive SQL only', () => {
    expect(completionMigration).toBeTruthy()
    const sql = readFileSync(join(migrationsPath, completionMigration!, 'migration.sql'), 'utf8')
    const statements = sql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean)

    expect(statements.some((statement) => /\b(DROP|DELETE|TRUNCATE|RENAME|UPDATE|INSERT)\b/i.test(statement))).toBeFalsy()
    expect(statements.every((statement) => /^(CREATE TABLE|CREATE (UNIQUE )?INDEX|ALTER TABLE .* ADD CONSTRAINT)/is.test(statement))).toBeTruthy()
  })
})
