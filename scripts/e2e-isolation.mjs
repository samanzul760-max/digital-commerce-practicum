import { join, resolve } from 'node:path'

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1'])

export function createIsolatedE2eRun({ runId, projectRoot }) {
  const safeRunId = normalizeRunId(runId)
  const root = resolve(projectRoot, '.artifacts', 'practicum-e2e', safeRunId)

  return {
    runId: safeRunId,
    root,
    dataDir: join(root, 'data'),
    authStatePath: join(root, 'auth-state.json'),
    serverLogPath: join(root, 'nuxt.log'),
    serverErrorLogPath: join(root, 'nuxt-error.log'),
    databaseEvidencePath: join(root, 'database-evidence.json'),
    databaseDumpPath: join(root, 'database-dump.sql'),
    postgresContainerIdPath: join(root, 'postgres-container-id'),
    databaseName: `practicum_e2e_${safeRunId.replaceAll('-', '_')}`,
    postgresContainerName: `digital-commerce-practicum-e2e-${safeRunId}`,
    postgresContainerLabel: `digital-commerce-practicum.e2e-run=${safeRunId}`,
  }
}

export function assertIsolatedDatabaseUrl(value, run, expectedPort) {
  const url = new URL(value)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('Isolated E2E database URL must use PostgreSQL.')
  }
  if (!loopbackHosts.has(url.hostname)) {
    throw new Error('Isolated E2E database URL must use a loopback host.')
  }
  const databaseName = url.pathname.replace(/^\//, '')
  if (!databaseName.startsWith('practicum_e2e_')) {
    throw new Error('Isolated E2E database name must start with practicum_e2e_.')
  }
  if (run && databaseName !== run.databaseName) {
    throw new Error('Isolated E2E database name must match this isolated E2E run.')
  }
  if (expectedPort !== undefined && url.port !== String(expectedPort)) {
    throw new Error('Isolated E2E database URL must use this run\'s dedicated PostgreSQL port.')
  }
  return url
}

function normalizeRunId(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new Error('Isolated E2E run id must contain lowercase letters, numbers, and single hyphens only.')
  }
  return normalized
}
