import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const fixtureModule = await import('../../scripts/seed-isolated-e2e-fixtures.mjs').catch(() => null)

test('isolated E2E fixture guard rejects missing, remote, and mismatched database targets', () => {
  assert.ok(fixtureModule, 'the isolated E2E fixture seed script must exist')

  assert.throws(
    () => fixtureModule.assertFixtureEnvironment({ databaseUrl: 'postgresql://user:password@127.0.0.1:5432/practicum_e2e_contract_run' }),
    /PRACTICUM_E2E_RUN_ID/,
  )
  assert.throws(
    () => fixtureModule.assertFixtureEnvironment({ runId: 'contract-run', databaseUrl: 'postgresql://user:password@db.example.test:5432/practicum_e2e_contract_run' }),
    /loopback host/,
  )
  assert.throws(
    () => fixtureModule.assertFixtureEnvironment({ runId: 'contract-run', databaseUrl: 'postgresql://user:password@127.0.0.1:5432/practicum_e2e_other_run' }),
    /must equal practicum_e2e_contract_run/,
  )
  assert.deepEqual(
    fixtureModule.assertFixtureEnvironment({ runId: 'Contract-Run', databaseUrl: 'postgresql://user:password@localhost:5432/practicum_e2e_contract_run' }),
    { databaseName: 'practicum_e2e_contract_run', runId: 'contract-run' },
  )
})

test('isolated E2E fixture contract is deterministic and covers every role surface', () => {
  assert.ok(fixtureModule, 'the isolated E2E fixture seed script must exist')

  assert.deepEqual(fixtureModule.createFixtureContract(), {
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
  })
})

test('global setup verifies a read-only fixture query and does not use member initialization', async () => {
  const source = await readFile(new URL('../e2e/global-setup.ts', import.meta.url), 'utf8')

  assert.match(source, /\/api\/practicum\/classes\?roomId=room-001&organizationId=org-demo/)
  assert.match(source, /fixtureResponse\.ok\(\)/)
  assert.doesNotMatch(source, /\/api\/practicum\/members/)
  assert.doesNotMatch(source, /@prisma\/client|PrismaClient|docker/i)
})
