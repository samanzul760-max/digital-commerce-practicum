/**
 * ensure-dev-env.js — 轻量环境预检与自愈脚本
 *
 * 用法:
 *   node scripts/ensure-dev-env.js            # 检查 dev 端口 + 数据库，异常则自动后台重启
 *   node scripts/ensure-dev-env.js --db-only  # 只检查/恢复数据库（供 E2E 编排脚本复用）
 *   node scripts/ensure-dev-env.js --check    # 只报告状态，不做任何恢复动作
 *
 * 行为:
 *   1. 健康（端口可达 + 数据库可达）=> 直接退出 0（跳过）
 *   2. 数据库断开 => 自动 `docker compose up -d` 并轮询等待恢复（后台）
 *   3. dev 端口断开 => 自动后台启动 Nuxt dev server 并轮询等待就绪
 *   4. 任何一步失败 => 退出码 1
 *
 * 环境变量: DEV_PORT(默认 3000), DB_PORT(默认 55432), E2E_HARD_TIMEOUT_MS
 */
const { spawn, spawnSync } = require('node:child_process')
const { openSync, rmSync } = require('node:fs')
const net = require('node:net')
const path = require('node:path')

const args = process.argv.slice(2)
const dbOnly = args.includes('--db-only')
const checkOnly = args.includes('--check')

const host = '127.0.0.1'
const devPort = Number(process.env.DEV_PORT ?? 3000)
const dbPort = Number(process.env.DB_PORT ?? 55432)
const isWindows = process.platform === 'win32'
const outLog = 'dev-env.out.log'
const errLog = 'dev-env.err.log'

function log(message) {
  console.log(`[ensure-dev-env] ${message}`)
}

function isHealthy() {
  return { dev: checkTcp(devPort, 800), db: checkTcp(dbPort, 800) }
}

function checkTcp(targetPort, timeoutMs) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: targetPort })
    const timer = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, timeoutMs)
    socket.once('connect', () => {
      clearTimeout(timer)
      socket.end()
      resolve(true)
    })
    socket.once('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })
}

function waitForTcpPort(targetPort, timeoutMs) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs
    const poll = () => {
      if (Date.now() > deadline) return resolve(false)
      checkTcp(targetPort, 800).then((ok) => (ok ? resolve(true) : setTimeout(poll, 1000)))
    }
    poll()
  })
}

function restartDockerPostgres() {
  log('database unreachable, restarting Docker PostgreSQL in background')
  const composeFile = path.join(process.cwd(), 'docker-compose.yml')
  const result = isWindows
    ? spawnSync('docker.exe', ['compose', '-f', composeFile, 'up', '-d'], { cwd: process.cwd(), encoding: 'utf8', timeout: 120_000, windowsHide: true })
    : spawnSync('docker', ['compose', '-f', composeFile, 'up', '-d'], { cwd: process.cwd(), encoding: 'utf8', timeout: 120_000 })
  if (result.status !== 0) {
    throw new Error(`docker compose up failed: ${result.stderr || result.stdout}`)
  }
  log('docker compose up returned, waiting for database')
}

function startDevServer() {
  log(`dev server unreachable on ${devPort}, starting Nuxt dev in background`)
  for (const file of [outLog, errLog]) rmSync(file, { force: true })
  const outFd = openSync(outLog, 'a')
  const errFd = openSync(errLog, 'a')
  const nuxiCli = path.join('node_modules', '@nuxt', 'cli', 'bin', 'nuxi.mjs')
  const env = {
    ...process.env,
    NUXT_HOST: host,
    NUXT_PORT: String(devPort),
    NUXT_IGNORE_LOCK: '1',
    NO_COLOR: '1',
  }
  delete env.FORCE_COLOR
  const child = spawn(process.execPath, [nuxiCli, 'dev', '--host', host, '--port', String(devPort)], {
    cwd: process.cwd(),
    env,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', outFd, errFd],
  })
  child.unref()
  log(`Nuxt dev PID: ${child.pid}`)
}

async function main() {
  const { dev, db } = await isHealthy()
  if (checkOnly) {
    log(`status -> dev port ${devPort}: ${dev ? 'OK' : 'DOWN'}, db port ${dbPort}: ${db ? 'OK' : 'DOWN'}`)
    process.exit(dev && db ? 0 : 1)
  }
  if (dev && db) {
    log(`healthy (dev ${devPort} + db ${dbPort}), skipping`)
    process.exit(0)
  }
  if (!db) {
    try {
      restartDockerPostgres()
    } catch (error) {
      console.error(`[ensure-dev-env] ${error.message}`)
      process.exit(1)
    }
    const dbRecovered = await waitForTcpPort(dbPort, 120_000)
    if (!dbRecovered) {
      console.error(`[ensure-dev-env] database still unreachable on ${dbPort}`)
      process.exit(1)
    }
    log(`database recovered on ${dbPort}`)
  }
  if (!dbOnly && !dev) {
    startDevServer()
    const devRecovered = await waitForTcpPort(devPort, 120_000)
    if (!devRecovered) {
      console.error(`[ensure-dev-env] dev server still unreachable on ${devPort}\n--- ${errLog} ---\n${readTail(errLog)}\n--- ${outLog} ---\n${readTail(outLog)}`)
      process.exit(1)
    }
    log(`dev server recovered on ${devPort}`)
  }
  log('environment ready')
  process.exit(0)
}

function readTail(filePath, lines = 30) {
  try {
    const { readFileSync } = require('node:fs')
    const parts = readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean)
    return parts.slice(-lines).join('\n') || '(empty)'
  } catch {
    return '(no log)'
  }
}

main()
