import { createError } from 'h3'
import { Prisma, SandboxType, TaskSectionType, TaskStatus } from '@prisma/client'
import { prisma } from '../db/client'
import type { AuthUser } from '../utils/auth-store'

type JsonRecord = Record<string, unknown>
type PublishedSection = JsonRecord & {
  id?: string
  clientKey?: string
  type?: string
  title?: string
  description?: string
  required?: boolean
  weightPercent?: number
  mediaItems?: JsonRecord[]
  questions?: JsonRecord[]
  sandbox?: JsonRecord | null
}

const sandboxFields: Record<SandboxType, string[]> = {
  STORE_BASICS: ['storeName', 'businessCategory', 'withdrawalAccount', 'freightTemplateName', 'freightChargeType', 'result'],
  PRODUCT_MANAGEMENT: ['productTitle', 'category', 'price', 'stock', 'warningStock', 'reviewReply', 'result'],
  STORE_DECORATION: ['deviceMode', 'components', 'result'],
  MARKETING: ['activityType', 'activityName', 'discountValue', 'startsAt', 'endsAt', 'productName', 'result'],
  BUSINESS_ANALYTICS: ['selectedMetric', 'analysisNote', 'result'],
}

const sandboxLabels: Record<SandboxType, string> = {
  STORE_BASICS: '店铺基础',
  PRODUCT_MANAGEMENT: '商品管理',
  STORE_DECORATION: '店铺装修',
  MARKETING: '营销活动',
  BUSINESS_ANALYTICS: '经营分析',
}

function fail(code: string, statusCode = 422, extra?: JsonRecord): never {
  throw createError({ statusCode, statusMessage: code, data: { code, ...extra } })
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function asSections(snapshot: unknown): PublishedSection[] {
  const record = asRecord(snapshot)
  return Array.isArray(record.sections) ? record.sections.map(asRecord) as PublishedSection[] : []
}

function sectionId(section: PublishedSection, index: number) {
  return typeof section.id === 'string' && section.id ? section.id : typeof section.clientKey === 'string' && section.clientKey ? section.clientKey : `section-${index}`
}

function stepId(sectionIdValue: string, step: JsonRecord, index: number) {
  return typeof step.id === 'string' && step.id ? step.id : `${sectionIdValue}:step:${typeof step.sort === 'number' ? step.sort : index}`
}

function sandboxType(section: PublishedSection) {
  const value = asRecord(section.sandbox).sandboxType
  return typeof value === 'string' && Object.values(SandboxType).includes(value as SandboxType) ? value as SandboxType : null
}

function sanitizeSection(section: PublishedSection, index: number): JsonRecord {
  const id = sectionId(section, index)
  const type = typeof section.type === 'string' ? section.type : 'WORK_ORDER'
  const result: JsonRecord = {
    id,
    type,
    title: typeof section.title === 'string' ? section.title : '',
    description: typeof section.description === 'string' ? section.description : '',
    required: section.required !== false,
    weightPercent: Number(section.weightPercent ?? 0),
  }
  if (type === TaskSectionType.MEDIA) {
    result.mediaItems = (Array.isArray(section.mediaItems) ? section.mediaItems : []).map(item => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      url: item.url,
      durationSec: item.durationSec,
      sort: item.sort,
    }))
  }
  if (type === TaskSectionType.QUIZ) {
    result.questions = (Array.isArray(section.questions) ? section.questions : []).map(item => ({
      id: item.id,
      type: item.type,
      prompt: item.prompt,
      options: item.options,
      explanation: '',
      points: item.points,
      sort: item.sort,
      required: item.required !== false,
    }))
  }
  if (type === TaskSectionType.SANDBOX) {
    const typeValue = sandboxType(section)
    const sandbox = asRecord(section.sandbox)
    result.sandbox = {
      sandboxType: typeValue,
      appKey: sandbox.appKey,
      version: sandbox.version,
      config: sandbox.config,
      steps: (Array.isArray(sandbox.steps) ? sandbox.steps : []).map((raw, stepIndex) => {
        const step = asRecord(raw)
        return {
          id: stepId(id, step, stepIndex),
          title: step.title,
          instruction: step.instruction,
          sort: step.sort ?? stepIndex,
          required: step.required !== false,
          fields: step.fields,
          evidenceKey: step.evidenceKey,
        }
      }),
      rubricItems: Array.isArray(sandbox.rubricItems) ? sandbox.rubricItems : [],
    }
  }
  return result
}

function availability(task: { availableAt: Date; dueAt: Date | null; planAssignment: { lateAllowed: boolean; status: string } }, now = new Date()) {
  if (task.planAssignment.status !== 'PUBLISHED' || task.availableAt > now) return 'NOT_YET_AVAILABLE'
  if (task.dueAt && task.dueAt < now && !task.planAssignment.lateAllowed) return 'CLOSED'
  return 'AVAILABLE'
}

function serializeTask(task: { id: string; planAssignmentId: string; activityId: string; status: TaskStatus; availableAt: Date; dueAt: Date | null; planAssignment: { id: string; title: string; description: string; status: string; timeLimitMinutes: number | null; autoScoreWeight: Prisma.Decimal; manualScoreWeight: Prisma.Decimal; publishedSnapshot: Prisma.JsonValue; dueAt: Date | null; lateAllowed: boolean } }, now = new Date()) {
  return {
    id: task.id,
    assignmentId: task.planAssignmentId,
    activityId: task.activityId,
    title: task.planAssignment.title,
    description: task.planAssignment.description,
    status: task.status,
    availability: availability(task, now),
    availableAt: task.availableAt.toISOString(),
    dueAt: task.dueAt?.toISOString() ?? null,
    timeLimitMinutes: task.planAssignment.timeLimitMinutes,
    autoScoreWeight: Number(task.planAssignment.autoScoreWeight),
    manualScoreWeight: Number(task.planAssignment.manualScoreWeight),
    lateAllowed: task.planAssignment.lateAllowed,
  }
}

async function ownedTask(studentId: string, taskId: string) {
  const task = await prisma.studentTask.findFirst({ where: { id: taskId, studentId }, include: { planAssignment: true } })
  if (!task) fail('STUDENT_TASK_NOT_FOUND', 404)
  return task
}

function ensureTaskCanStart(task: Awaited<ReturnType<typeof ownedTask>>) {
  const state = availability(task)
  if (task.status === TaskStatus.LOCKED || state !== 'AVAILABLE') fail('TASK_NOT_AVAILABLE', 409)
  if (task.status === TaskStatus.SUBMITTED || task.status === TaskStatus.GRADED || task.status === TaskStatus.CLOSED) fail('TASK_STATE_INVALID', 409)
}

async function sessionFor(taskId: string, state?: Prisma.InputJsonValue) {
  return await prisma.sandboxSession.upsert({ where: { studentTaskId: taskId }, create: { studentTaskId: taskId, state: state ?? {} }, update: state === undefined ? {} : { state } })
}

function sanitizeValues(type: SandboxType, value: unknown): JsonRecord {
  const raw = asRecord(value)
  const output: JsonRecord = {}
  for (const key of sandboxFields[type]) {
    if (!(key in raw)) continue
    const candidate = raw[key]
    if (key === 'components') {
      if (!Array.isArray(candidate) || candidate.length > 30) fail('TASK_DRAFT_INVALID')
      output[key] = candidate.slice(0, 30).map(item => asRecord(item))
    } else if (key === 'price' || key === 'stock' || key === 'warningStock' || key === 'discountValue') {
      if (candidate !== '' && (typeof candidate !== 'number' || !Number.isFinite(candidate))) fail('TASK_DRAFT_INVALID')
      output[key] = candidate
    } else {
      if (typeof candidate !== 'string' && candidate !== null) fail('TASK_DRAFT_INVALID')
      output[key] = typeof candidate === 'string' ? candidate.slice(0, 500) : candidate
    }
  }
  return output
}

function normalizedState(value: unknown): JsonRecord {
  const root = asRecord(value)
  return {
    sections: asRecord(root.sections),
    answers: asRecord(root.answers),
    mediaProgress: asRecord(root.mediaProgress),
  }
}

function missingFor(sections: PublishedSection[], state: JsonRecord) {
  const sectionState = asRecord(state.sections)
  const missing: JsonRecord[] = []
  for (const [index, section] of sections.entries()) {
    const id = sectionId(section, index)
    const current = asRecord(sectionState[id])
    if (section.required !== false && section.type === TaskSectionType.SANDBOX) {
      const sandbox = asRecord(section.sandbox)
      const type = sandboxType(section)
      if (!type) { missing.push({ sectionId: id, title: section.title, reason: '沙盘定义无效' }); continue }
      const details: JsonRecord[] = []
      const completed = Array.isArray(current.completedStepIds) ? current.completedStepIds : []
      for (const [stepIndex, rawStep] of (Array.isArray(sandbox.steps) ? sandbox.steps : []).entries()) {
        const step = asRecord(rawStep)
        const idValue = stepId(id, step, stepIndex)
        if (step.required !== false && !completed.includes(idValue)) details.push({ stepId: idValue, title: step.title ?? sandboxLabels[type], reason: '步骤未完成' })
      }
      const values = asRecord(current.values)
      for (const field of sandboxFields[type].filter(item => item !== 'result')) {
        const value = values[field]
        if (value === undefined || value === null || value === '' || (field === 'components' && (!Array.isArray(value) || value.length === 0))) details.push({ field, reason: '必填字段未完成' })
      }
      if (details.length) missing.push({ sectionId: id, title: sandboxLabels[type], reason: '模块尚未完成', details })
    }
    if (section.required !== false && section.type === TaskSectionType.MEDIA) {
      for (const media of Array.isArray(section.mediaItems) ? section.mediaItems : []) {
        const progress = Number(asRecord(rootValue(state, 'mediaProgress'))[String(media.id)] ?? 0)
        const threshold = Number(asRecord(media.metadata).requiredProgress ?? 100)
        if (media.id && progress < threshold) missing.push({ sectionId: id, mediaId: media.id, title: media.title, reason: '媒体学习进度不足' })
      }
    }
  }
  return missing
}

function rootValue(state: JsonRecord, key: string) { return asRecord(state[key]) }

function partStatus(section: PublishedSection, current: JsonRecord): 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' {
  if (section.type === TaskSectionType.SANDBOX) {
    const sandbox = asRecord(section.sandbox)
    const steps = Array.isArray(sandbox.steps) ? sandbox.steps : []
    const completed = Array.isArray(current.completedStepIds) ? current.completedStepIds : []
    if (steps.length && steps.every((step, index) => asRecord(step).required === false || completed.includes(stepId(sectionId(section, 0), asRecord(step), index)))) return 'COMPLETED'
    if (completed.length || Object.keys(asRecord(current.values)).length) return 'IN_PROGRESS'
  }
  return 'NOT_STARTED'
}

export async function listStudentAssignments(actor: AuthUser, status?: string) {
  const allowed = status && Object.values(TaskStatus).includes(status as TaskStatus) ? status as TaskStatus : undefined
  if (status && !allowed) fail('TASK_STATUS_INVALID')
  const now = new Date()
  const tasks = await prisma.studentTask.findMany({ where: { studentId: actor.id, status: allowed }, include: { planAssignment: true }, orderBy: [{ dueAt: 'asc' }, { availableAt: 'desc' }] })
  return tasks.map(task => serializeTask(task, now))
}

export async function getStudentWorkOrder(actor: AuthUser, taskId: string) {
  const task = await ownedTask(actor.id, taskId)
  const session = await prisma.sandboxSession.findUnique({ where: { studentTaskId: task.id } })
  const sections = asSections(task.planAssignment.publishedSnapshot).map(sanitizeSection)
  return { task: serializeTask(task), sections, session: session ? { id: session.id, state: session.state, startedAt: session.startedAt, updatedAt: session.updatedAt } : null }
}

export async function startStudentWorkOrder(actor: AuthUser, taskId: string) {
  const task = await ownedTask(actor.id, taskId)
  ensureTaskCanStart(task)
  const now = new Date()
  const updated = await prisma.$transaction(async tx => {
    const current = await tx.studentTask.findFirstOrThrow({ where: { id: task.id, studentId: actor.id }, include: { planAssignment: true } })
    const session = await tx.sandboxSession.upsert({ where: { studentTaskId: current.id }, create: { studentTaskId: current.id, state: { sections: {}, answers: {}, mediaProgress: {} }, startedAt: now }, update: { startedAt: current.status === TaskStatus.AVAILABLE ? now : undefined } })
    if (current.status === TaskStatus.AVAILABLE) {
      await tx.studentTask.update({ where: { id: current.id }, data: { status: TaskStatus.IN_PROGRESS } })
      await tx.taskEvent.create({ data: { studentTaskId: current.id, eventType: 'STARTED', payload: { startedAt: now.toISOString() } } })
    }
    return { task: await tx.studentTask.findFirstOrThrow({ where: { id: current.id }, include: { planAssignment: true } }), session }
  })
  return { task: serializeTask(updated.task), session: { id: updated.session.id, state: updated.session.state, startedAt: updated.session.startedAt } }
}

export async function saveStudentDraft(actor: AuthUser, taskId: string, input: { sectionId?: unknown; values?: unknown; completedStepIds?: unknown; answers?: unknown; mediaProgress?: unknown }) {
  const task = await ownedTask(actor.id, taskId)
  ensureTaskCanStart(task)
  if (!['AVAILABLE', 'IN_PROGRESS', 'RETURNED'].includes(task.status)) fail('TASK_STATE_INVALID', 409)
  const sections = asSections(task.planAssignment.publishedSnapshot)
  const sectionIndex = sections.findIndex((item, index) => sectionId(item, index) === input.sectionId)
  if (sectionIndex < 0) fail('TASK_SECTION_INVALID')
  const section = sections[sectionIndex]
  const current = await prisma.sandboxSession.findUnique({ where: { studentTaskId: task.id } })
  const state = normalizedState(current?.state)
  const id = sectionId(section, sectionIndex)
  const sectionsState = asRecord(state.sections)
  const currentSection = asRecord(sectionsState[id])
  const next: JsonRecord = { ...currentSection }
  if (section.type === TaskSectionType.SANDBOX) {
    const type = sandboxType(section)
    if (!type) fail('TASK_SECTION_INVALID')
    next.values = sanitizeValues(type, input.values)
    const steps: unknown[] = Array.isArray(asRecord(section.sandbox).steps) ? asRecord(section.sandbox).steps as unknown[] : []
    const completed = Array.isArray(input.completedStepIds) ? [...new Set(input.completedStepIds.filter(item => typeof item === 'string'))] : []
    const allowedSteps = new Set(steps.map((step, index) => stepId(id, asRecord(step), index)))
    if (completed.some(item => !allowedSteps.has(item))) fail('TASK_DRAFT_INVALID')
    next.completedStepIds = completed
  } else if (section.type === TaskSectionType.QUIZ) {
    next.answers = asRecord(input.answers)
  } else if (section.type === TaskSectionType.MEDIA) {
    const progress = asRecord(input.mediaProgress)
    const allowed = new Set((Array.isArray(section.mediaItems) ? section.mediaItems : []).map(item => String(item.id)))
    if (Object.keys(progress).some(key => !allowed.has(key) || typeof progress[key] !== 'number' || Number(progress[key]) < 0 || Number(progress[key]) > 100)) fail('TASK_DRAFT_INVALID')
    next.mediaProgress = progress
  }
  sectionsState[id] = next
  state.sections = sectionsState
  const updatedSession = await prisma.$transaction(async tx => {
    const session = await tx.sandboxSession.upsert({ where: { studentTaskId: task.id }, create: { studentTaskId: task.id, state: state as Prisma.InputJsonValue, startedAt: new Date() }, update: { state: state as Prisma.InputJsonValue } })
    await tx.sandboxSnapshot.create({ data: { sandboxSessionId: session.id, studentTaskId: task.id, sectionId: id, sandboxType: section.type === TaskSectionType.SANDBOX ? sandboxType(section) : undefined, artifact: next as Prisma.InputJsonValue } })
    await tx.taskEvent.create({ data: { studentTaskId: task.id, eventType: 'DRAFT_SAVED', payload: { sectionId: id, sandboxType: section.type === TaskSectionType.SANDBOX ? sandboxType(section) : null } } })
    if (task.status === TaskStatus.AVAILABLE) await tx.studentTask.update({ where: { id: task.id }, data: { status: TaskStatus.IN_PROGRESS } })
    return session
  })
  return { snapshot: { id: updatedSession.id, studentTaskId: task.id, sectionId: id, artifact: next }, session: { id: updatedSession.id, state: updatedSession.state } }
}

export async function recordStudentTaskEvent(actor: AuthUser, taskId: string, input: { eventType?: unknown; payload?: unknown }) {
  const task = await ownedTask(actor.id, taskId)
  const eventType = typeof input.eventType === 'string' ? input.eventType.slice(0, 80) : ''
  if (!eventType || ['SUBMITTED', 'DRAFT_SAVED'].includes(eventType)) fail('TASK_EVENT_INVALID')
  const event = await prisma.taskEvent.create({ data: { studentTaskId: task.id, eventType, payload: asRecord(input.payload) as Prisma.InputJsonValue } })
  return { event: { id: event.id, studentTaskId: task.id, eventType: event.eventType, createdAt: event.createdAt, payload: event.payload } }
}

export async function submitStudentWorkOrder(actor: AuthUser, taskId: string, idempotencyKey: string, path: string) {
  if (!idempotencyKey) fail('IDEMPOTENCY_KEY_REQUIRED')
  const task = await ownedTask(actor.id, taskId)
  const existingKey = await prisma.submissionIdempotencyKey.findUnique({ where: { userId_method_path_key: { userId: actor.id, method: 'POST', path, key: idempotencyKey } }, include: { submission: { include: { versions: { orderBy: { version: 'desc' } }, grade: true } } } })
  if (existingKey) return { replayed: true, task: { id: task.id, status: task.status }, submission: existingKey.submission }
  if (!([TaskStatus.AVAILABLE, TaskStatus.IN_PROGRESS, TaskStatus.RETURNED] as TaskStatus[]).includes(task.status)) fail('TASK_STATE_INVALID', 409)
  if (availability(task) !== 'AVAILABLE') fail('TASK_UNAVAILABLE', 409)
  const session = await prisma.sandboxSession.findUnique({ where: { studentTaskId: task.id } })
  const state = normalizedState(session?.state)
  const sections = asSections(task.planAssignment.publishedSnapshot)
  const missingItems = missingFor(sections, state)
  if (missingItems.length) fail('TASK_INCOMPLETE', 422, { missingItems })
  const sectionState = asRecord(state.sections)
  const artifact: JsonRecord = { sections: {} }
  const parts: Array<{ sectionId: string; status: 'COMPLETED'; answer: JsonRecord; evidence: JsonRecord; autoScore: number | null }> = []
  for (const [index, section] of sections.entries()) {
    const id = sectionId(section, index)
    const current = asRecord(sectionState[id])
    const answer = section.type === TaskSectionType.SANDBOX ? { sandboxType: sandboxType(section), values: asRecord(current.values), completedStepIds: Array.isArray(current.completedStepIds) ? current.completedStepIds : [] } : current
    ;(artifact.sections as JsonRecord)[id] = { sectionId: id, type: section.type, title: section.title, ...answer }
    parts.push({ sectionId: id, status: 'COMPLETED', answer: answer as JsonRecord, evidence: { snapshots: true }, autoScore: null })
  }
  const now = new Date()
  const result = await prisma.$transaction(async tx => {
    const replay = await tx.submissionIdempotencyKey.findUnique({ where: { userId_method_path_key: { userId: actor.id, method: 'POST', path, key: idempotencyKey } }, include: { submission: { include: { versions: { orderBy: { version: 'desc' } }, grade: true } } } })
    if (replay) return { replayed: true, submission: replay.submission, task: await tx.studentTask.findUniqueOrThrow({ where: { id: task.id } }) }
    const submission = await tx.submission.upsert({ where: { studentTaskId: task.id }, create: { studentTaskId: task.id, currentVersion: 0 }, update: {} })
    const versionNumber = submission.currentVersion + 1
    const version = await tx.submissionVersion.create({ data: { submissionId: submission.id, version: versionNumber, artifact: artifact as Prisma.InputJsonValue, operationSummary: { sections: sections.length, completedAt: now.toISOString() }, parts: { create: parts.map(part => ({ sectionId: part.sectionId, status: part.status, answer: part.answer as Prisma.InputJsonValue, evidence: part.evidence as Prisma.InputJsonValue, autoScore: part.autoScore })) } }, include: { parts: true } })
    const updatedSubmission = await tx.submission.update({ where: { id: submission.id }, data: { currentVersion: versionNumber, submittedAt: now }, include: { versions: { orderBy: { version: 'desc' } }, grade: true } })
    await tx.submissionIdempotencyKey.create({ data: { userId: actor.id, method: 'POST', path, key: idempotencyKey, submissionId: submission.id } })
    await tx.sandboxSnapshot.create({ data: { sandboxSessionId: session?.id ?? (await tx.sandboxSession.create({ data: { studentTaskId: task.id, state: state as Prisma.InputJsonValue } })).id, studentTaskId: task.id, artifact: artifact as Prisma.InputJsonValue } })
    await tx.taskEvent.create({ data: { studentTaskId: task.id, eventType: 'SUBMITTED', payload: { submissionId: submission.id, version: versionNumber } } })
    const updatedTask = await tx.studentTask.update({ where: { id: task.id }, data: { status: TaskStatus.SUBMITTED } })
    return { replayed: false, submission: updatedSubmission, task: updatedTask, version }
  })
  return { replayed: result.replayed, task: { id: result.task.id, status: result.task.status }, submission: { ...result.submission, latestVersion: result.version ?? result.submission.versions[0] } }
}
