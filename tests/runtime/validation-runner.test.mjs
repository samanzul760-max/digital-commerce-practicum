import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  createRunManifest,
  assertFreshManifestPath,
  markGroupRunning,
  nextPendingGroup,
  readManifest,
  recoverInterruptedGroups,
  recordGroupResult,
  writeManifest,
  summarizeManifest,
} from '../../scripts/validation-runner.mjs'
import { validationGroups } from '../../scripts/practicum-validation-groups.mjs'

const groups = [
  { id: 'smoke', title: '基础 smoke', command: ['tests/e2e/practicum/shell.spec.ts'] },
  { id: 'student', title: '学生闭环', command: ['tests/e2e/practicum/student-learning-closure.spec.ts'] },
]

test('new validation runs start with every group pending', () => {
  const manifest = createRunManifest(groups, 'test-run')

  assert.equal(manifest.runId, 'test-run')
  assert.deepEqual(manifest.groups.map(group => group.status), ['PENDING', 'PENDING'])
  assert.deepEqual(summarizeManifest(manifest), {
    PENDING: 2,
    RUNNING: 0,
    PASS: 0,
    FAIL: 0,
    TIMEOUT: 0,
    BLOCKED: 0,
  })
})

test('completed groups are terminal and are never selected again', () => {
  const manifest = createRunManifest(groups, 'test-run')

  recordGroupResult(manifest, 'smoke', 'PASS', { exitCode: 0 })
  assert.equal(nextPendingGroup(manifest).id, 'student')

  recordGroupResult(manifest, 'student', 'FAIL', { exitCode: 1, error: 'assertion failed' })
  assert.equal(nextPendingGroup(manifest), null)
  assert.equal(manifest.groups[1].attempts, 1)
})

test('a group cannot be recorded twice in the same run', () => {
  const manifest = createRunManifest(groups, 'test-run')

  recordGroupResult(manifest, 'smoke', 'TIMEOUT', { exitCode: 124 })

  assert.throws(
    () => recordGroupResult(manifest, 'smoke', 'PASS', { exitCode: 0 }),
    /terminal status/,
  )
})

test('validation groups cover every practicum spec exactly once', async () => {
  const specFiles = (await readdir(new URL('../e2e/practicum/', import.meta.url)))
    .filter(file => file.endsWith('.spec.ts'))
    .sort()
  const assignedFiles = validationGroups.flatMap(group => group.command).sort()

  assert.deepEqual(assignedFiles, specFiles.map(file => `tests/e2e/practicum/${file}`))
})

test('interrupted groups become blocked without being rerun', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'practicum-validation-'))
  try {
    const manifest = createRunManifest(groups, 'test-run')
    markGroupRunning(manifest, 'smoke')
    const filePath = join(directory, 'manifest.json')
    await writeManifest(filePath, manifest)

    const restored = await readManifest(filePath)
    recoverInterruptedGroups(restored)

    assert.equal(restored.groups[0].status, 'BLOCKED')
    assert.equal(restored.groups[0].attempts, 1)
    assert.equal(nextPendingGroup(restored).id, 'student')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('a new run cannot overwrite an existing manifest', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'practicum-validation-'))
  const filePath = join(directory, 'manifest.json')
  try {
    await writeFile(filePath, '{}', 'utf8')
    await assert.rejects(() => assertFreshManifestPath(filePath), /already exists/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
