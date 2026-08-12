import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createRunManifest,
  assertFreshManifestPath,
  markGroupRunning,
  nextPendingGroup,
  readManifest,
  recoverInterruptedGroups,
  recordGroupResult,
  summarizeManifest,
  writeManifest,
} from './validation-runner.mjs'
import { validationGroups } from './practicum-validation-groups.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultBaseURL = 'http://127.0.0.1:3001'
const defaultGroupTimeoutMs = 8 * 60 * 1000
const defaultTotalTimeoutMs = 45 * 60 * 1000

const options = parseOptions(process.argv.slice(2))
const baseURL = options.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? defaultBaseURL
const groupTimeoutMs = Number(process.env.VALIDATION_GROUP_TIMEOUT_MS ?? defaultGroupTimeoutMs)
const totalTimeoutMs = Number(process.env.VALIDATION_TOTAL_TIMEOUT_MS ?? defaultTotalTimeoutMs)

if (!Number.isFinite(groupTimeoutMs) || groupTimeoutMs <= 0) {
  throw new Error('VALIDATION_GROUP_TIMEOUT_MS must be a positive number')
}
if (!Number.isFinite(totalTimeoutMs) || totalTimeoutMs <= 0) {
  throw new Error('VALIDATION_TOTAL_TIMEOUT_MS must be a positive number')
}

const runId = options.runId ?? new Date().toISOString().replace(/[:.]/g, '-')
const manifestPath = resolve(projectRoot, options.manifest ?? `output/playwright/validation-runs/${runId}.json`)

let manifest
if (options.resume) {
  manifest = await readManifest(manifestPath)
  recoverInterruptedGroups(manifest)
  await writeManifest(manifestPath, manifest)
} else {
  await assertFreshManifestPath(manifestPath)
  manifest = createRunManifest(validationGroups, runId)
  await writeManifest(manifestPath, manifest)
}

if (options.dryRun) {
  printSummary(manifest, manifestPath)
  process.exit(0)
}

assertLoopbackURL(baseURL)
await assertServiceHealth(baseURL)

const deadline = Date.now() + totalTimeoutMs
let nextGroup = nextPendingGroup(manifest)
while (nextGroup) {
  if (Date.now() >= deadline) {
    console.error(`Validation batch timeout reached: ${totalTimeoutMs}ms`)
    break
  }

  markGroupRunning(manifest, nextGroup.id)
  await writeManifest(manifestPath, manifest)
  const result = await runPlaywrightGroup(nextGroup.command, baseURL, Math.min(groupTimeoutMs, deadline - Date.now()))
  recordGroupResult(manifest, nextGroup.id, result.status, result.details)
  await writeManifest(manifestPath, manifest)
  printSummary(manifest, manifestPath)

  if (result.status !== 'PASS') {
    console.error(`Validation stopped after group ${nextGroup.id} reached ${result.status}.`)
    break
  }
  nextGroup = nextPendingGroup(manifest)
}

printSummary(manifest, manifestPath)
process.exitCode = exitCodeFor(manifest)

function parseOptions(args) {
  const parsed = { dryRun: false, resume: false }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--dry-run') parsed.dryRun = true
    else if (arg === '--resume') parsed.resume = true
    else if (arg === '--run-id') parsed.runId = args[++index]
    else if (arg === '--manifest') parsed.manifest = args[++index]
    else if (arg === '--base-url') parsed.baseURL = args[++index]
    else if (arg === '--help') {
      console.log('Usage: node scripts/validate-practicum-once.mjs [--resume] [--dry-run] [--run-id ID] [--manifest PATH] [--base-url URL]')
      process.exit(0)
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }
  return parsed
}

function assertLoopbackURL(value) {
  const url = new URL(value)
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new Error(`Refusing non-local validation target: ${url.hostname}`)
  }
}

async function assertServiceHealth(value) {
  try {
    const response = await fetch(new URL('/practicum', value), { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error) {
    throw new Error(`Validation service is unavailable at ${value}: ${error.message}`)
  }
}

function runPlaywrightGroup(command, targetURL, timeoutMs) {
  return new Promise(resolveResult => {
    const playwrightCli = resolve(projectRoot, 'node_modules/@playwright/test/cli.js')
    const child = spawn(process.execPath, [playwrightCli, 'test', ...command, '--reporter=list'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: targetURL,
        NO_COLOR: '1',
      },
      stdio: 'inherit',
      windowsHide: true,
    })
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      terminateProcessTree(child.pid)
    }, timeoutMs)

    child.once('error', error => {
      clearTimeout(timer)
      resolveResult({ status: 'FAIL', details: { error: error.message, exitCode: -1 } })
    })
    child.once('exit', (code, signal) => {
      clearTimeout(timer)
      if (timedOut) {
        resolveResult({ status: 'TIMEOUT', details: { error: `Group timeout after ${timeoutMs}ms`, exitCode: 124 } })
      } else {
        resolveResult({
          status: code === 0 ? 'PASS' : 'FAIL',
          details: { exitCode: code ?? 1, signal },
        })
      }
    })
  })
}

function terminateProcessTree(pid) {
  if (!pid) return
  if (process.platform === 'win32') {
    spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
    return
  }
  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    // The child may have exited between the timeout and cleanup.
  }
}

function printSummary(currentManifest, filePath) {
  console.log(`Validation manifest: ${filePath}`)
  console.log(JSON.stringify(summarizeManifest(currentManifest)))
}

function exitCodeFor(currentManifest) {
  const summary = summarizeManifest(currentManifest)
  if (summary.FAIL > 0) return 1
  if (summary.TIMEOUT > 0 || summary.BLOCKED > 0 || summary.PENDING > 0 || summary.RUNNING > 0) return 2
  return 0
}
