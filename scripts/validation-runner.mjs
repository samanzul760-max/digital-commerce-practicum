import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const TERMINAL_STATUSES = new Set(['PASS', 'FAIL', 'TIMEOUT', 'BLOCKED'])
const STATUSES = ['PENDING', 'RUNNING', ...TERMINAL_STATUSES]

export function createRunManifest(groups, runId) {
  if (!runId) throw new Error('runId is required')

  return {
    version: 1,
    runId,
    createdAt: new Date().toISOString(),
    groups: groups.map(group => ({
      id: group.id,
      title: group.title,
      command: [...group.command],
      status: 'PENDING',
      attempts: 0,
      result: null,
    })),
  }
}

export function nextPendingGroup(manifest) {
  return manifest.groups.find(group => group.status === 'PENDING') ?? null
}

export function markGroupRunning(manifest, groupId) {
  const group = findGroup(manifest, groupId)
  if (group.status !== 'PENDING') {
    throw new Error(`group ${groupId} is not pending`)
  }

  group.status = 'RUNNING'
  group.attempts += 1
  return group
}

export function recordGroupResult(manifest, groupId, status, result = {}) {
  const group = findGroup(manifest, groupId)
  if (!TERMINAL_STATUSES.has(status)) {
    throw new Error(`invalid terminal status: ${status}`)
  }
  if (TERMINAL_STATUSES.has(group.status)) {
    throw new Error(`group ${groupId} already has a terminal status`)
  }
  if (group.status === 'PENDING') {
    group.attempts += 1
  }

  group.status = status
  group.result = {
    ...result,
    finishedAt: new Date().toISOString(),
  }
  return group
}

export function summarizeManifest(manifest) {
  return STATUSES.reduce((summary, status) => {
    summary[status] = manifest.groups.filter(group => group.status === status).length
    return summary
  }, {})
}

export async function writeManifest(filePath, manifest) {
  await mkdir(dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, filePath)
}

export async function assertFreshManifestPath(filePath) {
  try {
    await access(filePath)
  } catch {
    return
  }
  throw new Error(`Validation manifest already exists: ${filePath}`)
}

export async function readManifest(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

export function recoverInterruptedGroups(manifest) {
  for (const group of manifest.groups) {
    if (group.status !== 'RUNNING') continue
    group.status = 'BLOCKED'
    group.result = {
      error: 'Validation process ended before this group reached a terminal result.',
      finishedAt: new Date().toISOString(),
    }
  }
  return manifest
}

function findGroup(manifest, groupId) {
  const group = manifest.groups.find(candidate => candidate.id === groupId)
  if (!group) throw new Error(`unknown validation group: ${groupId}`)
  return group
}
