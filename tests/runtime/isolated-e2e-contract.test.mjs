import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { assertIsolatedDatabaseUrl, createIsolatedE2eRun } from '../../scripts/e2e-isolation.mjs'

test('isolated E2E runs keep data and auth state in a unique artifact directory', () => {
  const run = createIsolatedE2eRun({ runId: 'contract-run', projectRoot: 'C:/project' })

  assert.match(run.dataDir, /\.artifacts[\\/]practicum-e2e[\\/]contract-run[\\/]data$/)
  assert.match(run.authStatePath, /\.artifacts[\\/]practicum-e2e[\\/]contract-run[\\/]auth-state\.json$/)
  assert.equal(run.databaseName, 'practicum_e2e_contract_run')
  assert.equal(run.postgresContainerName, 'digital-commerce-practicum-e2e-contract-run')
  assert.equal(run.postgresContainerLabel, 'digital-commerce-practicum.e2e-run=contract-run')
  assert.match(run.databaseEvidencePath, /\.artifacts[\\/]practicum-e2e[\\/]contract-run[\\/]database-evidence\.json$/)
  assert.match(run.databaseDumpPath, /\.artifacts[\\/]practicum-e2e[\\/]contract-run[\\/]database-dump\.sql$/)
  assert.match(run.postgresContainerIdPath, /\.artifacts[\\/]practicum-e2e[\\/]contract-run[\\/]postgres-container-id$/)
})

test('isolated E2E database URLs reject remote, shared, and wrong-run database targets', () => {
  const run = createIsolatedE2eRun({ runId: 'contract-run', projectRoot: 'C:/project' })

  assert.throws(
    () => assertIsolatedDatabaseUrl('postgresql://user:password@47.112.10.126:5432/practicum_e2e_contract_run', run),
    /loopback host/,
  )
  assert.throws(
    () => assertIsolatedDatabaseUrl('postgresql://user:password@127.0.0.1:55432/digital_commerce_practicum', run),
    /practicum_e2e_/,
  )
  assert.throws(
    () => assertIsolatedDatabaseUrl('postgresql://user:password@127.0.0.1:55432/practicum_e2e_other_run', run),
    /must match this isolated E2E run/,
  )
  assert.doesNotThrow(
    () => assertIsolatedDatabaseUrl('postgresql://user:password@127.0.0.1:55432/practicum_e2e_contract_run', run),
  )
})

test('isolated E2E runner owns a labelled PostgreSQL container and rejects unsafe invocations', async () => {
  const [runner, config] = await Promise.all([
    readFile(new URL('../../scripts/run-isolated-e2e.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../playwright.config.ts', import.meta.url), 'utf8'),
  ])

  assert.match(runner, /assertNoCommandLineFlags\(testFiles\)/)
  assert.match(runner, /assertPortAvailable\(port\)/)
  assert.match(runner, /await assertPortAvailable\(port\)\n  throwIfInterrupted\(\)/)
  assert.match(runner, /startIsolatedPostgres\(\)/)
  assert.match(runner, /run\.postgresContainerName/)
  assert.match(runner, /run\.postgresContainerLabel/)
  assert.match(runner, /run\.postgresContainerIdPath/)
  assert.match(runner, /--cidfile/)
  assert.match(runner, /--label/)
  assert.match(runner, /postgres:17/)
  assert.match(runner, /waitForPostgres\(60_000\)/)
  assert.match(runner, /await createIsolatedDatabase\(\)\n  throwIfInterrupted\(\)\n  await runCommand\(process\.execPath, \['node_modules\/prisma\/build\/index\.js', 'migrate', 'deploy'\]/)
  assert.match(runner, /async function createIsolatedDatabase\(\) \{[\s\S]*assertRunDatabaseName\(databaseUrl\.pathname\.slice\(1\)\)[\s\S]*\['exec', postgresContainerId, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'practicum', '-d', 'postgres', '-c', `CREATE DATABASE "\$\{databaseName\}"`\]/)
  assert.match(runner, /function assertRunDatabaseName\(databaseName\) \{\n  if \(databaseName !== run\.databaseName\) \{\n    throw new Error\(`Isolated E2E database name must match this run: \$\{run\.databaseName\}\.`\)\n  \}/)
  assert.match(runner, /seed-isolated-e2e-fixtures\.mjs/)
  assert.match(runner, /await runCommand\(process\.execPath, \['node_modules\/nuxt\/bin\/nuxt\.mjs', 'build'\], 180_000\)/)
  assert.match(runner, /const productionServerArgs = \['\.output\/server\/index\.mjs'\]/)
  assert.match(runner, /HOST: host/)
  assert.match(runner, /PORT: String\(port\)/)
  assert.match(runner, /assertDevServerOwnsPort\(devServer, port\)/)
  assert.match(runner, /cleanupRunResources\(\)/)
  assert.match(runner, /process\.once\('SIGINT'/)
  assert.match(runner, /process\.once\('SIGTERM'/)
  assert.match(runner, /databaseEvidencePath/)
  assert.match(runner, /databaseDumpPath/)
  assert.match(runner, /pg_dump/)
  assert.doesNotMatch(runner, /digital-commerce-practicum-postgres/)
  assert.doesNotMatch(runner, /taskkill|Stop-Process|killPorts|docker\.exe'.*\['rm'.*postgresContainerName/)
  assert.match(config, /retries:\s*0/)
})

test('public direct E2E entry delegates to the isolated runner', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  )

  assert.equal(packageJson.scripts['test:e2e:direct'], 'npm run test:e2e:isolated --')
  assert.doesNotMatch(packageJson.scripts['test:e2e:direct'], /playwright test/)
})

test('three-role E2E guidance names only the isolated npm entry', async () => {
  const spec = await readFile(
    new URL('../e2e/practicum/three-role-integrated-closure.spec.ts', import.meta.url),
    'utf8',
  )

  assert.match(spec, /npm\.cmd run test:e2e:isolated/)
  assert.doesNotMatch(spec, /npx\s+playwright/)
})
