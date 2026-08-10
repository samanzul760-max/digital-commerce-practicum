import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assertIsolatedDatabaseUrl, createIsolatedE2eRun } from './e2e-isolation.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const host = '127.0.0.1'
const port = Number(process.env.ISOLATED_E2E_PORT ?? 4186)
const runId = process.env.ISOLATED_E2E_RUN_ID ?? `run-${new Date().toISOString().replace(/[:.]/g, '-')}`
const run = createIsolatedE2eRun({ runId, projectRoot })
const testFiles = process.argv.slice(2)
const outputDir = process.env.ISOLATED_E2E_OUTPUT_DIR ?? '.output'
const productionServerArgs = [`${outputDir}/server/index.mjs`]
const playwrightArgs = [
  'node_modules/@playwright/test/cli.js',
  'test',
  ...(testFiles.length ? testFiles : ['tests/e2e/practicum/three-role-integrated-closure.spec.ts']),
  '--reporter=list',
]
const baseEnvironment = { ...process.env, NO_COLOR: '1' }
const e2eAdminPassword = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(18).toString('base64url')
const e2eStudentPassword = process.env.SEED_STUDENT1_PASSWORD ?? randomBytes(18).toString('base64url')

let activeCommand
let cleanupPromise
let databaseUrl
let devServer
let devServerStartError
let environment
let postgresContainerId
let signalReceived

registerSignalHandlers()

async function main() {
  assertNoCommandLineFlags(testFiles)
  await assertPortAvailable(port)
  throwIfInterrupted()
  createRunDirectories()
  await startIsolatedPostgres()
  throwIfInterrupted()
  await waitForPostgres(60_000)
  throwIfInterrupted()
  const postgresPort = await getPostgresPort()
  throwIfInterrupted()
  databaseUrl = assertIsolatedDatabaseUrl(
    process.env.ISOLATED_E2E_DATABASE_URL ?? `postgresql://practicum:practicum_dev_password@${host}:${postgresPort}/${run.databaseName}`,
    run,
    postgresPort,
  )
  environment = createEnvironment(databaseUrl)
  await createIsolatedDatabase()
  throwIfInterrupted()
  await runCommand(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], 180_000)
  throwIfInterrupted()
  await runCommand(process.execPath, ['scripts/seed-isolated-e2e-fixtures.mjs'], 180_000)
  throwIfInterrupted()
  await runCommand(process.execPath, ['node_modules/nuxt/bin/nuxt.mjs', 'build'], 180_000)
  throwIfInterrupted()
  devServer = startDevServer()
  await waitForHealthyServer(90_000)
  throwIfInterrupted()
  await runCommand(process.execPath, playwrightArgs, 180_000)
  throwIfInterrupted()
}

function assertNoCommandLineFlags(args) {
  const invalidFlag = args.find(argument => argument.startsWith('-'))
  if (invalidFlag) {
    throw new Error(`Isolated E2E rejects Playwright command-line flags: ${invalidFlag}`)
  }
}

function assertPortAvailable(portNumber) {
  return new Promise((resolvePort, rejectPort) => {
    const probe = createServer()
    probe.once('error', error => {
      rejectPort(new Error(`Isolated E2E port ${portNumber} must be unused before startup: ${error.message}`))
    })
    probe.listen({ host, port: portNumber, exclusive: true }, () => {
      probe.close(error => {
        if (error) rejectPort(error)
        else resolvePort()
      })
    })
  })
}

function createRunDirectories() {
  mkdirSync(run.dataDir, { recursive: true })
  mkdirSync(dirname(run.authStatePath), { recursive: true })
}

async function startIsolatedPostgres() {
  postgresContainerId = (await runCommand(
    'docker.exe',
    [
      'run', '--detach', '--name', run.postgresContainerName,
      '--label', run.postgresContainerLabel,
      '--cidfile', run.postgresContainerIdPath,
      '--publish', `${host}::5432`,
      '--env', 'POSTGRES_USER=practicum',
      '--env', 'POSTGRES_PASSWORD=practicum_dev_password',
      '--env', 'POSTGRES_DB=postgres',
      'postgres:17',
    ],
    120_000,
    { captureOutput: true },
  )).trim()
  if (!postgresContainerId) throw new Error('Docker did not return an isolated PostgreSQL container ID.')
}

async function getPostgresPort() {
  const postgresPort = (await runCommand(
    'docker.exe',
    ['inspect', '--format', '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}', postgresContainerId],
    30_000,
    { captureOutput: true },
  )).trim()
  if (!/^\d+$/.test(postgresPort)) throw new Error('Docker did not publish a dedicated PostgreSQL port.')
  return Number(postgresPort)
}

async function waitForPostgres(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let lastError = 'PostgreSQL did not report ready'
  while (Date.now() < deadline) {
    try {
      await runCommand(
        'docker.exe',
        ['exec', postgresContainerId, 'pg_isready', '-U', 'practicum', '-d', 'postgres'],
        10_000,
      )
      return
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      await delay(1_000)
      throwIfInterrupted()
    }
  }
  throw new Error(`Isolated E2E database was not ready within ${timeoutMs}ms: ${lastError}`)
}

async function createIsolatedDatabase() {
  const databaseName = assertRunDatabaseName(databaseUrl.pathname.slice(1))
  await runCommand(
    'docker.exe',
    ['exec', postgresContainerId, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'practicum', '-d', 'postgres', '-c', `CREATE DATABASE "${databaseName}"`],
    30_000,
  )
}

function assertRunDatabaseName(databaseName) {
  if (databaseName !== run.databaseName) {
    throw new Error(`Isolated E2E database name must match this run: ${run.databaseName}.`)
  }
  return databaseName
}

function createEnvironment(url) {
  return {
    ...baseEnvironment,
    DATABASE_URL: url.toString(),
    HOST: host,
    PORT: String(port),
    NUXT_HOST: host,
    NUXT_PORT: String(port),
    NUXT_IGNORE_LOCK: '1',
    CENTER_PREVIEW_OUTPUT_DIR: outputDir,
    PLAYWRIGHT_BASE_URL: `http://${host}:${port}`,
    PLAYWRIGHT_AUTH_STATE_PATH: run.authStatePath,
    PRACTICUM_DATA_DIR: run.dataDir,
    PRACTICUM_E2E_RUN_ID: run.runId,
    SEED_ADMIN_PASSWORD: e2eAdminPassword,
    SEED_STUDENT1_PASSWORD: e2eStudentPassword,
  }
}

function startDevServer() {
  const outFd = openSync(run.serverLogPath, 'a')
  const errFd = openSync(run.serverErrorLogPath, 'a')
  const child = spawn(process.execPath, productionServerArgs, {
    cwd: projectRoot,
    env: environment,
    windowsHide: true,
    stdio: ['ignore', outFd, errFd],
  })
  child.once('error', error => { devServerStartError = error })
  return child
}

async function waitForHealthyServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let lastError = 'server did not respond'
  while (Date.now() < deadline) {
    try {
      if (devServerStartError) throw devServerStartError
      if (devServer.exitCode !== null) throw new Error(`Nuxt exited with code ${devServer.exitCode}`)
      await assertDevServerOwnsPort(devServer, port)
      const response = await fetch(`http://${host}:${port}/api/auth/session`, { signal: AbortSignal.timeout(5_000) })
      if (response.status < 500) return
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await delay(1_000)
    throwIfInterrupted()
  }
  throw new Error(`Isolated E2E server was not ready within ${timeoutMs}ms: ${lastError}`)
}

async function assertDevServerOwnsPort(server, portNumber) {
  if (process.platform !== 'win32') {
    throw new Error('Isolated E2E requires Windows listener ownership checks.')
  }
  const netstat = await runCommand('netstat.exe', ['-ano', '-p', 'tcp'], 10_000, { captureOutput: true })
  const listener = netstat.split(/\r?\n/).map(line => line.trim().split(/\s+/)).find(columns => (
    columns[0] === 'TCP'
    && columns[1]?.endsWith(`:${portNumber}`)
    && columns[3] === 'LISTENING'
  ))
  const listenerPid = listener?.[4]
  if (!listenerPid || Number(listenerPid) !== server.pid) {
    throw new Error(`Health probe rejected port ${portNumber}: listener PID ${listenerPid ?? 'none'} is not Nuxt PID ${server.pid}.`)
  }
}

function runCommand(command, args, timeoutMs, { captureOutput = false } = {}) {
  return new Promise((resolveCommand, rejectCommand) => {
    let output = ''
    let settled = false
    let timedOut = false
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: environment ?? baseEnvironment,
      windowsHide: true,
      stdio: captureOutput ? 'pipe' : 'inherit',
    })
    activeCommand = child
    if (captureOutput) {
      child.stdout?.on('data', chunk => { output += chunk })
      child.stderr?.on('data', chunk => { output += chunk })
    }
    const finish = callback => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (activeCommand === child) activeCommand = undefined
      callback()
    }
    const timer = setTimeout(async () => {
      timedOut = true
      await stopChild(child)
      finish(() => rejectCommand(new Error(`Command timed out after ${timeoutMs}ms: ${command} ${args.join(' ')}`)))
    }, timeoutMs)
    child.once('error', error => finish(() => rejectCommand(error)))
    child.once('close', code => {
      if (timedOut) return
      if (code === 0) finish(() => resolveCommand(output))
      else finish(() => rejectCommand(new Error(`Command failed with exit code ${code ?? 1}: ${command} ${args.join(' ')}`)))
    })
  })
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  await new Promise(resolveChild => {
    child.once('close', resolveChild)
    child.kill('SIGTERM')
  })
}

function registerSignalHandlers() {
  process.once('SIGINT', () => { void handleSignal('SIGINT') })
  process.once('SIGTERM', () => { void handleSignal('SIGTERM') })
}

async function handleSignal(signal) {
  if (signalReceived) return
  signalReceived = signal
  process.exitCode = signal === 'SIGINT' ? 130 : 143
  await stopChild(activeCommand)
  await cleanupRunResources()
}

function throwIfInterrupted() {
  if (signalReceived) throw new Error(`Isolated E2E interrupted by ${signalReceived}.`)
}

function delay(milliseconds) {
  return new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds))
}

function cleanupRunResources() {
  if (cleanupPromise) return cleanupPromise
  cleanupPromise = (async () => {
    await stopChild(activeCommand)
    await stopChild(devServer)
    if (!postgresContainerId && existsSync(run.postgresContainerIdPath)) {
      postgresContainerId = readFileSync(run.postgresContainerIdPath, 'utf8').trim()
    }
    if (!postgresContainerId) return

    let inspectOutput = ''
    let logsOutput = ''
    let dumpOutput = ''
    let logsError = ''
    let dumpError = ''
    let labelVerified = false
    try {
      inspectOutput = await runCommand('docker.exe', ['inspect', postgresContainerId], 30_000, { captureOutput: true })
      const [container] = JSON.parse(inspectOutput)
      const label = container?.Config?.Labels?.['digital-commerce-practicum.e2e-run']
      if (label !== run.runId) {
        throw new Error(`Refusing to remove container ${postgresContainerId}: run label did not match ${run.runId}.`)
      }
      labelVerified = true
      try {
        logsOutput = await runCommand('docker.exe', ['logs', postgresContainerId], 30_000, { captureOutput: true })
      } catch (error) {
        logsError = error instanceof Error ? error.message : String(error)
      }
      try {
        dumpOutput = await runCommand(
          'docker.exe',
          ['exec', postgresContainerId, 'pg_dump', '-U', 'practicum', '-d', run.databaseName],
          60_000,
          { captureOutput: true },
        )
      } catch (error) {
        dumpError = error instanceof Error ? error.message : String(error)
      }
    } finally {
      let evidenceError
      try {
        writeFileSync(run.databaseDumpPath, dumpOutput)
        writeFileSync(run.databaseEvidencePath, JSON.stringify({
          capturedAt: new Date().toISOString(),
          runId: run.runId,
          databaseName: run.databaseName,
          databaseUrl: databaseUrl?.toString(),
          postgresContainerId,
          postgresContainerName: run.postgresContainerName,
          postgresContainerLabel: run.postgresContainerLabel,
          inspectOutput,
          logsOutput,
          logsError,
          dumpError,
        }, null, 2))
      } catch (error) {
        evidenceError = error
      }
      if (labelVerified) {
        await runCommand('docker.exe', ['rm', '--force', postgresContainerId], 30_000)
      }
      if (evidenceError) throw evidenceError
    }
  })()
  return cleanupPromise
}

main()
  .catch(error => {
    console.error(`[isolated-e2e] ${error instanceof Error ? error.message : String(error)}`)
    if (!signalReceived) process.exitCode = 1
  })
  .finally(async () => {
    try {
      await cleanupRunResources()
    } catch (error) {
      console.error(`[isolated-e2e] cleanup failed: ${error instanceof Error ? error.message : String(error)}`)
      if (!signalReceived) process.exitCode = 1
    }
  })
