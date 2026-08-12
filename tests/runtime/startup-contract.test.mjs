import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'))
const startServer = await readFile(new URL('../../start-server.bat', import.meta.url), 'utf8')
const ensureDevEnv = await readFile(new URL('../../scripts/ensure-dev-env.js', import.meta.url), 'utf8')
const coursesAlias = await readFile(new URL('../../pages/courses.vue', import.meta.url), 'utf8')
const learnAlias = await readFile(new URL('../../pages/learn.vue', import.meta.url), 'utf8')

test('production runtime exposes a direct Nitro start command', () => {
  assert.equal(packageJson.scripts.start, 'set NITRO_PORT=4310&& set PORT=4310&& node --env-file=.env .output/server/index.mjs')
})

test('safe local runtime builds before starting Nitro', () => {
  assert.equal(packageJson.scripts['start:safe'], 'npm run build && npm run start')
})

test('finite Playwright validation uses the single-run manifest runner', () => {
  assert.equal(packageJson.scripts['test:e2e:once'], 'node scripts/validate-practicum-once.mjs')
})

test('local runtime reserves port 4310 for the real Nuxt application', () => {
  assert.match(packageJson.scripts.dev, /--port 4310/)
  assert.match(startServer, /set NITRO_PORT=4310/)
  assert.match(startServer, /set PORT=4310/)
  assert.match(startServer, /node --env-file=.env .output\\server\\index.mjs/)
  assert.doesNotMatch(startServer, /127\.0\.0\.1:3000/)
  assert.match(ensureDevEnv, /DEV_PORT \?\? 4310/)
})

test('legacy LearnEC course and learn URLs forward into authenticated real-workbench routes', () => {
  assert.match(coursesAlias, /navigateTo\('\/practicum\/courses'/)
  assert.match(learnAlias, /navigateTo\('\/practicum\/courses'/)
})
