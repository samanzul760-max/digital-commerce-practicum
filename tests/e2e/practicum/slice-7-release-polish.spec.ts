import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Given Slice 6 release evidence is part of the current practicum project
 * When the release polish audit scans the files
 * Then the evidence uses current test counts and no Owner Teacher residue remains
 */
test('[ORIGINAL-S7-001] slice six release evidence is current and two-role clean', async () => {
  const projectRoot = process.cwd()
  const progress = fs.readFileSync(path.join(projectRoot, 'pages/practicum/progress.vue'), 'utf8')
  const slice6Report = fs.readFileSync(path.join(projectRoot, 'docs/parity/practicum-slice-6-quality-release.md'), 'utf8')

  expect(progress).not.toContain('Owner/Teacher')
  expect(slice6Report).toContain('90/90')
  expect(slice6Report).toContain('11/11')
  expect(slice6Report).not.toContain('84/84 passed')
  expect(slice6Report).not.toContain('5/5 green')
})
