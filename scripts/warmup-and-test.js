const { spawn, spawnSync } = require('node:child_process')
const { existsSync, readFileSync, rmSync, openSync } = require('node:fs')
const http = require('node:http')
const net = require('node:net')
const path = require('node:path')

const host = '127.0.0.1'
const port = 4175
const dockerPort = 55432
const cleanupPorts = [3000, 4175]
const baseURL = `http://${host}:${port}`
const dockerDatabaseUrl = 'postgresql://practicum:practicum_dev_password@127.0.0.1:55432/digital_commerce_practicum'
const databaseUrl = process.env.PLAYWRIGHT_DATABASE_URL ?? scopedE2eDatabaseUrl(dockerDatabaseUrl)
const playwrightArgs = process.argv.slice(2)
const isWindows = process.platform === 'win32'
const hardTimeoutMs = Number(process.env.E2E_HARD_TIMEOUT_MS ?? 420_000)
const outLog = 'dev-ai-e2e.out.log'
const errLog = 'dev-ai-e2e.err.log'

let devServerPid
let hardTimer
const activeChildren = new Set()

function log(message) {
  console.log(`[ai-e2e] ${message}`)
}

function scopedE2eDatabaseUrl(value) {
  const url = new URL(value)
  url.searchParams.set('schema', 'playwright_e2e')
  return url.toString()
}

function makeEnv() {
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    PLAYWRIGHT_BASE_URL: baseURL,
    NITRO_HOST: host,
    NITRO_PORT: String(port),
    NUXT_HOST: host,
    NUXT_PORT: String(port),
    NUXT_IGNORE_LOCK: '1',
    PRACTICUM_DATA_DIR: '.data-e2e',
    PRACTICUM_DEMO_ACHIEVEMENTS: '1',
    E2E_STATE_PREPARED: '1',
    NO_COLOR: '1',
  }
  delete env.FORCE_COLOR
  return env
}

function tailLogFile(filePath, lines = 40) {
  try {
    const content = readFileSync(filePath, 'utf8')
    const parts = content.split(/\r?\n/).filter(Boolean)
    if (parts.length === 0) return `(log is empty: ${filePath})`
    return parts.slice(-lines).join('\n')
  } catch {
    return `(no log at ${filePath})`
  }
}

function nuxtLogTail() {
  return `--- ${errLog} ---\n${tailLogFile(errLog)}\n--- ${outLog} ---\n${tailLogFile(outLog)}`
}

function processSnapshot(pid) {
  if (!isWindows || !pid) return ''
  const ps = spawnSync('powershell.exe', [
    '-NoProfile', '-Command',
    `Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq ${pid} -or $_.ParentProcessId -eq ${pid} } | Select-Object ProcessId,ParentProcessId,Name | ConvertTo-Json -Compress`,
  ], { encoding: 'utf8', timeout: 10_000, windowsHide: true })
  return `--- process snapshot for PID ${pid} ---\n${ps.stdout?.trim() || 'no such process'}`
}

function killTree(pid) {
  if (!pid) return
  if (isWindows) {
    spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'pipe', windowsHide: true })
    return
  }
  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    // Best effort.
  }
  try {
    process.kill(pid, 'SIGKILL')
  } catch {
    // Best effort.
  }
}

function track(child) {
  activeChildren.add(child)
  child.once('exit', () => activeChildren.delete(child))
}

function runAsync(command, args, options = {}) {
  const { timeoutMs = 0, stdio = 'inherit', env = makeEnv(), detached = false, cwd = process.cwd() } = options
  return new Promise((resolve) => {
    let timedOut = false
    let stdout = ''
    let stderr = ''
    const child = spawn(command, args, { cwd, env, stdio, windowsHide: true, detached })
    track(child)
    if (stdio === 'pipe') {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk
      })
      child.stderr?.on('data', (chunk) => {
        stderr += chunk
      })
    }
    const timer = timeoutMs > 0
      ? setTimeout(() => {
        timedOut = true
        log(`command timeout after ${timeoutMs}ms, killing: ${command} ${args.join(' ')}`)
        killTree(child.pid)
      }, timeoutMs)
      : null
    child.once('error', (error) => {
      if (timer) clearTimeout(timer)
      resolve({ status: -1, signal: null, timedOut, stdout, stderr, error })
    })
    child.once('exit', (code, signal) => {
      if (timer) clearTimeout(timer)
      resolve({ status: code ?? 1, signal, timedOut, stdout, stderr })
    })
  })
}

function killPorts() {
  log(`clean ports: ${cleanupPorts.join(', ')}`)
  if (isWindows) {
    const ps = [
      '$ports = @(3000,4175)',
      '$pids = foreach ($port in $ports) { Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique }',
      'foreach ($pidValue in $pids) { if ($pidValue -and $pidValue -ne 0) { Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue } }',
    ].join('; ')
    spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
      cwd: process.cwd(),
      env: makeEnv(),
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 30_000,
      windowsHide: true,
    })
    return
  }
  spawnSync('sh', ['-c', 'if command -v lsof >/dev/null 2>&1; then lsof -ti tcp:3000 tcp:4175 | xargs -r kill -TERM; fi'], {
    cwd: process.cwd(),
    env: makeEnv(),
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30_000,
  })
}

async function waitForPortsToClose() {
  log(`wait for ports to close: ${cleanupPorts.join(', ')}`)
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    const open = []
    for (const cleanupPort of cleanupPorts) {
      try {
        await waitForTcpPort(cleanupPort, 500)
        open.push(cleanupPort)
      } catch {
        // Closed.
      }
    }
    if (open.length === 0) return
    await delay(500)
  }
  throw new Error(`ports still in use after cleanup: ${cleanupPorts.join(', ')}`)
}

function clearNuxtLock() {
  const lockPath = path.join(process.cwd(), '.nuxt', 'nuxt.lock')
  if (!existsSync(lockPath)) return
  log('clear stale Nuxt lock')
  const lockText = readFileSync(lockPath, 'utf8')
  const pid = Number(lockText.match(/"pid"\s*:\s*(\d+)/)?.[1])
  if (pid && isProcessRunning(pid)) {
    try {
      process.kill(pid)
    } catch {
      // Best effort.
    }
  }
  rmSync(lockPath, { force: true })
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function ensureDockerPostgres() {
  log('preflight via ensure-dev-env.js (fast path when healthy)')
  const ensureScript = path.join(process.cwd(), 'scripts', 'ensure-dev-env.js')
  const fast = await runAsync(process.execPath, [ensureScript, '--db-only'], { timeoutMs: 150_000, stdio: 'pipe' })
  if (fast.status === 0) {
    log('preflight healthy, Docker PostgreSQL reachable at 127.0.0.1:55432')
    return
  }
  log(`preflight degraded (${fast.stderr || fast.stdout || 'unknown'}), falling back to full docker bootstrap`)
  const ps1Path = path.join(process.cwd(), 'scripts', 'use-docker-postgres.ps1')
  const result = isWindows
    ? await runAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1Path], { timeoutMs: 240_000, stdio: 'pipe' })
    : await runAsync('npm', ['run', 'db:up'], { timeoutMs: 240_000, stdio: 'pipe' })
  if (result.timedOut || result.status !== 0) {
    throw new Error(`Docker PostgreSQL failed to start: ${result.stderr || result.stdout}`)
  }
  await waitForTcpPort(dockerPort, 10_000)
  log('Docker PostgreSQL healthy at 127.0.0.1:55432')
}

async function prepareE2eState() {
  log('reset E2E database and local data before Nuxt starts')
  rmSync('.data-e2e', { recursive: true, force: true })
  rmSync(path.join('output', 'playwright', 'auth-state.json'), { force: true })

  const resetPrisma = async () => {
    const result = await runAsync(process.execPath, [
      path.join('node_modules', 'prisma', 'build', 'index.js'),
      'migrate',
      'reset',
      '--force',
      '--skip-seed',
      '--skip-generate',
    ], { timeoutMs: 240_000, stdio: 'pipe' })
    if (result.timedOut || result.status !== 0) {
      throw new Error(`Prisma migrate reset failed: ${result.stderr || result.stdout}`)
    }
  }

  if (isWindows) {
    const dropResult = await runAsync('docker.exe', [
      'exec', 'digital-commerce-practicum-postgres',
      'psql', '-U', 'practicum', '-d', 'digital_commerce_practicum',
      '-c', 'DROP SCHEMA IF EXISTS playwright_e2e CASCADE; CREATE SCHEMA playwright_e2e;',
    ], { timeoutMs: 60_000, stdio: 'pipe' })
    if (dropResult.timedOut || dropResult.status !== 0) {
      log('explicit DROP SCHEMA failed, falling back to prisma-only reset')
    } else {
      log('playwright_e2e schema dropped and recreated')
    }
  }

  await resetPrisma()
}

const nuxiCli = path.join('node_modules', '@nuxt', 'cli', 'bin', 'nuxi.mjs')

async function startDevServer() {
  log(`start Nuxt dev in background: ${baseURL}`)
  for (const file of [outLog, errLog]) rmSync(file, { force: true })
  const outFd = openSync(outLog, 'a')
  const errFd = openSync(errLog, 'a')
  const child = spawn(process.execPath, [nuxiCli, 'dev', '--host', host, '--port', String(port)], {
    cwd: process.cwd(),
    env: makeEnv(),
    detached: true,
    windowsHide: true,
    stdio: ['ignore', outFd, errFd],
  })
  devServerPid = child.pid
  track(child)
  child.unref()
  child.once('error', (error) => {
    log(`Nuxt dev spawn error: ${error.message}`)
  })
  log(`Nuxt dev PID: ${devServerPid}`)
}

async function waitForServer() {
  log('wait for TCP port 4175')
  const deadline = Date.now() + 90_000
  let lastError
  while (Date.now() < deadline) {
    try {
      await waitForTcpPort(port, 2_000)
      return
    } catch (error) {
      lastError = error
    }
    await delay(1_000)
  }
  throw new Error(`Nuxt dev startup timeout: ${lastError?.message ?? 'port not reachable'}\n${nuxtLogTail()}\n${processSnapshot(devServerPid)}`)
}

function waitForTcpPort(targetPort, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port: targetPort })
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error('TCP connect timeout'))
    }, timeoutMs)
    socket.once('connect', () => {
      clearTimeout(timer)
      socket.end()
      resolve()
    })
    socket.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

async function requestWithTimeout(pathname, timeoutMs) {
  return new Promise((resolve, reject) => {
    const request = http.request({ host, port, path: pathname, method: 'GET', timeout: timeoutMs, headers: { 'user-agent': 'ai-e2e-warmup' } }, (response) => {
      response.resume()
      response.once('end', () => resolve({ status: response.statusCode ?? 0 }))
    })
    request.once('timeout', () => request.destroy(new Error(`HTTP timeout after ${timeoutMs}ms`)))
    request.once('error', reject)
    request.end()
  })
}

async function warmupRoutes() {
  const requiredRoutes = ['/api/auth/bootstrap']
  const optionalRoutes = ['/', '/login', '/practicum/login', '/api/auth/session', '/api/practicum/context', '/api/practicum/shop', '/api/practicum/shop/products', '/api/practicum/shop/freight-templates']
  log('warm up required routes')
  for (const route of requiredRoutes) {
    const response = await waitForWarmRoute(route, { required: true })
    log(`required warmup ok ${route} -> HTTP ${response.status}`)
  }
  log('warm up optional routes (parallel, non-blocking)')
  const results = await Promise.allSettled(optionalRoutes.map((route) => waitForWarmRoute(route, { required: false })))
  for (let index = 0; index < results.length; index++) {
    const result = results[index]
    if (result.status === 'fulfilled' && result.value) {
      log(`optional warmup ok ${optionalRoutes[index]} -> HTTP ${result.value.status}`)
    }
  }
}

async function waitForWarmRoute(route, { required }) {
  const deadline = Date.now() + (required ? 240_000 : 10_000)
  let lastError
  while (Date.now() < deadline) {
    try {
      const response = await requestWithTimeout(route, required ? 120_000 : 60_000)
      if (response.status >= 200 && response.status < 400) return response
      if (!required && response.status < 500) return response
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await delay(1_000)
  }
  if (!required) {
    log(`optional warmup skipped ${route}: ${lastError?.message ?? 'no response'}`)
    return null
  }
  throw new Error(`required warmup failed ${route}: ${lastError?.message ?? 'no response'}\n${nuxtLogTail()}`)
}

async function runPlaywright() {
  log(`run Playwright (local cli.js)${playwrightArgs.length ? `: ${playwrightArgs.join(' ')}` : ''}`)
  const playwrightCli = path.join('node_modules', '@playwright', 'test', 'cli.js')
  const child = spawn(process.execPath, [playwrightCli, 'test', ...playwrightArgs], {
    cwd: process.cwd(),
    env: makeEnv(),
    stdio: 'inherit',
    windowsHide: true,
  })
  track(child)
  return await waitForExit(child)
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once('error', (error) => {
      log(`Playwright spawn error: ${error.message}`)
      resolve(1)
    })
    child.once('exit', (code) => resolve(code ?? 1))
  })
}

async function stopDevServer() {
  log('stop Nuxt dev server')
  if (devServerPid) {
    killTree(devServerPid)
    devServerPid = undefined
  }
  killPorts()
  try {
    await waitForPortsToClose()
  } catch (error) {
    log(`port cleanup incomplete: ${error.message}`)
  }
}

function armHardTimeout() {
  hardTimer = setTimeout(() => {
    console.error(`[ai-e2e] hard timeout after ${hardTimeoutMs}ms, killing everything`)
    for (const child of activeChildren) killTree(child.pid)
    stopDevServer().finally(() => process.exit(124))
  }, hardTimeoutMs)
  if (hardTimer.unref) hardTimer.unref()
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  let exitCode = 1
  armHardTimeout()
  try {
    killPorts()
    await ensureDockerPostgres()
    await prepareE2eState()
    killPorts()
    clearNuxtLock()
    await waitForPortsToClose()
    await startDevServer()
    await waitForServer()
    await warmupRoutes()
    exitCode = await runPlaywright()
  } catch (error) {
    console.error(`[ai-e2e] ${error.message}`)
    exitCode = 1
  } finally {
    if (hardTimer) clearTimeout(hardTimer)
    await stopDevServer()
    killPorts()
    log(`done, exit code ${exitCode}`)
  }
  process.exit(exitCode)
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    console.error(`[ai-e2e] received ${signal}, cleaning up`)
    for (const child of activeChildren) killTree(child.pid)
    stopDevServer().finally(() => process.exit(130))
  })
}

main()
