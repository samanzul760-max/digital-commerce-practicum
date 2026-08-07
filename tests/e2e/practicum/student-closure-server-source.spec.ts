import { expect, test, type Page } from '@playwright/test'
import { csrfHeaders } from './csrf'
import { loginAsOwner, loginAsStudent, loginAsTeacher } from './auth-helpers'

const FEATURE_ID = '[BDD-STUDENT-SERVER-SOURCE-001]'

async function createPublishedActivity(owner: Page, label: string) {
  const key = `student-server-source-${label}-${Date.now()}`
  const planResponse = await owner.request.post('/api/practicum/plans', {
    headers: await csrfHeaders(owner, { 'Idempotency-Key': `${key}-plan` }),
    data: { roomId: 'room-001', title: `Student server source ${label}`, description: 'Isolated server-source fixture.' },
  })
  expect(planResponse.status()).toBe(201)
  const plan = (await planResponse.json()).plan

  const moduleResponse = await owner.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
    headers: await csrfHeaders(owner),
    data: { title: `Server source module ${label}`, level: 1, parentId: null, version: plan.version },
  })
  expect(moduleResponse.status()).toBe(201)
  const moduleSnapshot = await moduleResponse.json()
  const module = moduleSnapshot.nodes.find((node: { level: number }) => node.level === 1)

  const unitResponse = await owner.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
    headers: await csrfHeaders(owner),
    data: { title: `Server source unit ${label}`, level: 2, parentId: module.id, version: moduleSnapshot.plan.version },
  })
  expect(unitResponse.status()).toBe(201)
  const unitSnapshot = await unitResponse.json()

  const activityResponse = await owner.request.post(`/api/practicum/plans/${plan.id}/activities`, {
    headers: await csrfHeaders(owner),
    data: { parentId: unitSnapshot.nodes.find((node: { level: number }) => node.level === 2).id, title: `Server source activity ${label}`, type: 'PRACTICE_ACTIVITY', version: unitSnapshot.plan.version },
  })
  expect(activityResponse.status()).toBe(201)
  const activity = (await activityResponse.json()).nodes.find((node: { level: number }) => node.level === 3)
  expect((await owner.request.post(`/api/practicum/plans/${plan.id}/publish`, { headers: await csrfHeaders(owner) })).status()).toBe(200)
  return activity.id as string
}

async function submit(student: Page, activityId: string, text: string, key: string) {
  return student.request.post('/api/practicum/submissions', {
    headers: await csrfHeaders(student, { 'Idempotency-Key': key }),
    data: { activityId, text },
  })
}

test(`${FEATURE_ID} clearing browser state keeps the server submission visible`, async ({ browser }) => {
  const ownerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  await loginAsOwner(owner)
  const activityId = await createPublishedActivity(owner, 'clear')
  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  expect((await submit(student, activityId, 'Server submission survives browser state clearing.', `clear-${Date.now()}`)).status()).toBe(201)
  await student.goto('/practicum')
  await student.evaluate(() => window.localStorage.clear())
  const refreshed = await student.request.get(`/api/practicum/submissions/${activityId}`)
  expect(refreshed.status()).toBe(200)
  expect((await refreshed.json()).submission).toEqual(expect.objectContaining({ status: 'SUBMITTED', versions: expect.arrayContaining([expect.objectContaining({ version: 1 })]) }))
  await studentContext.close()
  await ownerContext.close()
})

test(`${FEATURE_ID} return requires feedback and persists after refresh`, async ({ browser }) => {
  const ownerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  await loginAsOwner(owner)
  const activityId = await createPublishedActivity(owner, 'return')
  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  expect((await submit(student, activityId, 'Submission requiring feedback.', `return-${Date.now()}`)).status()).toBe(201)
  const missingFeedback = await owner.request.post(`/api/practicum/submissions/${activityId}/return`, { headers: await csrfHeaders(owner), data: { feedback: ' ' } })
  expect(missingFeedback.status()).toBe(422)
  const returned = await owner.request.post(`/api/practicum/submissions/${activityId}/return`, { headers: await csrfHeaders(owner), data: { feedback: 'Please add the source evidence.' } })
  expect(returned.status()).toBe(200)
  await student.reload()
  const refreshed = await student.request.get(`/api/practicum/submissions/${activityId}`)
  expect((await refreshed.json()).submission).toEqual(expect.objectContaining({
    status: 'RETURNED',
    feedback: 'Please add the source evidence.',
    feedbackEntries: expect.arrayContaining([expect.objectContaining({ text: 'Please add the source evidence.' })]),
  }))
  await studentContext.close()
  await ownerContext.close()
})

test(`${FEATURE_ID} resubmission increments immutable versions`, async ({ browser }) => {
  const ownerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  await loginAsOwner(owner)
  const activityId = await createPublishedActivity(owner, 'version')
  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  expect((await submit(student, activityId, 'Immutable version one.', `version-one-${Date.now()}`)).status()).toBe(201)
  expect((await owner.request.post(`/api/practicum/submissions/${activityId}/return`, { headers: await csrfHeaders(owner), data: { feedback: 'Revise the evidence.' } })).status()).toBe(200)
  const revision = await submit(student, activityId, 'Immutable version two.', `version-two-${Date.now()}`)
  expect(revision.status()).toBe(201)
  const versions = (await revision.json()).submission.versions
  expect(versions.map((version: { version: number }) => version.version).sort()).toEqual([1, 2])
  expect(versions.find((version: { version: number }) => version.version === 1).text).toBe('Immutable version one.')
  await student.reload()
  const refreshed = await student.request.get(`/api/practicum/submissions/${activityId}`)
  expect((await refreshed.json()).submission.versions).toEqual(expect.arrayContaining([expect.objectContaining({ version: 1, text: 'Immutable version one.' }), expect.objectContaining({ version: 2, text: 'Immutable version two.' })]))
  await studentContext.close()
  await ownerContext.close()
})

test(`${FEATURE_ID} unauthorized role cannot read or mutate a student submission`, async ({ browser }) => {
  const ownerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  await loginAsOwner(owner)
  const activityId = await createPublishedActivity(owner, 'permission')
  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  expect((await submit(student, activityId, 'Private student submission.', `permission-${Date.now()}`)).status()).toBe(201)
  const teacherContext = await browser.newContext()
  const teacher = await teacherContext.newPage()
  await loginAsTeacher(teacher)
  const read = await teacher.request.get(`/api/practicum/submissions/${activityId}`)
  expect(read.status()).toBe(403)
  expect((await read.json()).submission).toBeUndefined()
  const mutate = await teacher.request.post(`/api/practicum/submissions/${activityId}/return`, { headers: await csrfHeaders(teacher), data: { feedback: 'Unauthorized mutation.' } })
  expect(mutate.status()).toBe(403)
  const unchanged = await student.request.get(`/api/practicum/submissions/${activityId}`)
  expect((await unchanged.json()).submission.status).toBe('SUBMITTED')
  await teacherContext.close()
  await studentContext.close()
  await ownerContext.close()
})
