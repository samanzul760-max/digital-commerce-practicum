import { createError } from 'h3'
import {
  AssignmentStatus,
  MediaKind,
  Prisma,
  QuestionType,
  ResourceSource,
  SandboxType,
  TaskSectionType,
  TrainingRoomType,
} from '@prisma/client'
import { prisma } from '../db/client'
import type { AuthUser } from '../utils/auth-store'
import { requireClassStaff } from './class-scope'

type RecordValue = Record<string, unknown>

export interface WorkOrderSectionInput {
  clientKey?: unknown
  parentClientKey?: unknown
  resourceId?: unknown
  type?: unknown
  title?: unknown
  description?: unknown
  sort?: unknown
  required?: unknown
  weightPercent?: unknown
  config?: unknown
  mediaItems?: unknown
  questions?: unknown
  sandbox?: unknown
}

export interface WorkOrderInput {
  classId?: unknown
  title?: unknown
  description?: unknown
  autoScoreWeight?: unknown
  manualScoreWeight?: unknown
  timeLimitMinutes?: unknown
  availableAt?: unknown
  dueAt?: unknown
  lateAllowed?: unknown
  sections?: unknown
}

const taskInclude = {
  class: { select: { id: true, name: true, organizationId: true, roomId: true } },
  sections: {
    orderBy: { sort: 'asc' as const },
    include: {
      resource: { select: { id: true, source: true, title: true, summary: true } },
      mediaItems: { orderBy: { sort: 'asc' as const } },
      questions: { orderBy: { sort: 'asc' as const } },
      sandboxSpec: {
        include: {
          steps: { orderBy: { sort: 'asc' as const } },
          rubricItems: { orderBy: { sort: 'asc' as const } },
        },
      },
    },
  },
} satisfies Prisma.PlanAssignmentInclude

type WorkOrderRecord = Prisma.PlanAssignmentGetPayload<{ include: typeof taskInclude }>

function fail(code: string, statusCode = 422): never {
  throw createError({ statusCode, statusMessage: code, data: { code } })
}

function text(value: unknown, maximum: number, required = false) {
  const result = typeof value === 'string' ? value.trim() : ''
  if ((required && !result) || result.length > maximum) fail('WORK_ORDER_INVALID')
  return result
}

function finiteNumber(value: unknown, fallback: number) {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) fail('WORK_ORDER_INVALID')
  return parsed
}

function json(value: unknown, fallback: Prisma.InputJsonValue): Prisma.InputJsonValue {
  if (value === undefined || value === null) return fallback
  try {
    JSON.stringify(value)
    return value as Prisma.InputJsonValue
  } catch {
    return fallback
  }
}

function optionalDate(value: unknown, fallback: Date | null) {
  if (value === undefined) return fallback
  if (value === null || value === '') return null
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) fail('WORK_ORDER_INVALID')
  return parsed
}

function enumValue<T extends string>(value: unknown, values: readonly T[], code = 'WORK_ORDER_SECTION_INVALID'): T {
  if (typeof value !== 'string' || !values.includes(value as T)) fail(code)
  return value as T
}

function scoreWeights(autoValue: unknown, manualValue: unknown, fallbackAuto = 70, fallbackManual = 30) {
  const autoScoreWeight = finiteNumber(autoValue, fallbackAuto)
  const manualScoreWeight = finiteNumber(manualValue, fallbackManual)
  if (autoScoreWeight < 0 || manualScoreWeight < 0 || autoScoreWeight > 100 || manualScoreWeight > 100 || Math.abs(autoScoreWeight + manualScoreWeight - 100) > 0.001) {
    fail('WORK_ORDER_WEIGHT_INVALID')
  }
  return { autoScoreWeight, manualScoreWeight }
}

function sectionArray(value: unknown) {
  if (!Array.isArray(value)) fail('WORK_ORDER_SECTION_INVALID')
  const keys = new Set<string>()
  const sorts = new Set<number>()
  const sections = value.map((raw, index) => {
    if (!raw || typeof raw !== 'object') fail('WORK_ORDER_SECTION_INVALID')
    const input = raw as WorkOrderSectionInput
    const clientKey = text(input.clientKey ?? `section-${index}`, 80, true)
    const parentClientKey = text(input.parentClientKey, 80)
    const resourceId = text(input.resourceId, 120)
    const type = enumValue(input.type, Object.values(TaskSectionType))
    const title = text(input.title, 120, true)
    const description = text(input.description, 2000)
    const sort = Math.trunc(finiteNumber(input.sort, index))
    const weightPercent = finiteNumber(input.weightPercent, 0)
    if (sort < 0 || weightPercent < 0 || weightPercent > 100 || keys.has(clientKey) || sorts.has(sort) || (type === TaskSectionType.WORK_ORDER && weightPercent !== 0)) {
      fail('WORK_ORDER_SECTION_INVALID')
    }
    keys.add(clientKey)
    sorts.add(sort)
    return {
      clientKey, parentClientKey, resourceId, type, title, description, sort,
      required: input.required !== false,
      weightPercent,
      config: json(input.config, {}),
      mediaItems: Array.isArray(input.mediaItems) ? input.mediaItems as RecordValue[] : [],
      questions: Array.isArray(input.questions) ? input.questions as RecordValue[] : [],
      sandbox: input.sandbox && typeof input.sandbox === 'object' ? input.sandbox as RecordValue : null,
    }
  }).sort((left, right) => left.sort - right.sort)

  for (const section of sections) {
    if (section.parentClientKey && (!keys.has(section.parentClientKey) || sections.findIndex(item => item.clientKey === section.parentClientKey) >= sections.findIndex(item => item.clientKey === section.clientKey))) {
      fail('WORK_ORDER_SECTION_INVALID')
    }
    if (section.type === TaskSectionType.MEDIA && section.mediaItems.length === 0) fail('WORK_ORDER_SECTION_INVALID')
    if (section.type === TaskSectionType.QUIZ && section.questions.length === 0) fail('WORK_ORDER_SECTION_INVALID')
    if (section.type === TaskSectionType.SANDBOX) {
      if (!section.sandbox) fail('WORK_ORDER_SECTION_INVALID')
      const steps = Array.isArray(section.sandbox.steps) ? section.sandbox.steps : []
      const rubricItems = Array.isArray(section.sandbox.rubricItems) ? section.sandbox.rubricItems : []
      if (!steps.length || !rubricItems.length) fail('WORK_ORDER_SECTION_INVALID')
    }
  }
  const scoring = sections.filter(section => section.type !== TaskSectionType.WORK_ORDER)
  if (scoring.length && Math.abs(scoring.reduce((sum, section) => sum + section.weightPercent, 0) - 100) > 0.001) fail('WORK_ORDER_WEIGHT_INVALID')
  return sections
}

function serializeQuestion(question: WorkOrderRecord['sections'][number]['questions'][number], includeAnswerKey: boolean) {
  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    ...(includeAnswerKey ? { answerKey: question.answerKey } : {}),
    explanation: includeAnswerKey ? question.explanation : '',
    points: Number(question.points),
    sort: question.sort,
    required: question.required,
  }
}

function sectionsSnapshot(task: WorkOrderRecord, includeAnswerKey: boolean) {
  return task.sections.map(section => ({
    clientKey: section.id,
    parentClientKey: section.parentId ?? '',
    resourceId: section.resourceId ?? '',
    type: section.type,
    title: section.title,
    description: section.description,
    sort: section.sort,
    required: section.required,
    weightPercent: Number(section.weightPercent),
    config: section.config,
    resource: section.resource,
    mediaItems: section.mediaItems.map(item => ({ ...item, createdAt: undefined, updatedAt: undefined })),
    questions: section.questions.map(question => serializeQuestion(question, includeAnswerKey)),
    sandbox: section.sandboxSpec ? {
      sandboxType: section.sandboxSpec.sandboxType,
      appKey: section.sandboxSpec.appKey,
      version: section.sandboxSpec.version,
      config: section.sandboxSpec.config,
      steps: section.sandboxSpec.steps.map(step => ({ title: step.title, instruction: step.instruction, sort: step.sort, required: step.required, fields: step.fields, evidenceKey: step.evidenceKey })),
      rubricItems: section.sandboxSpec.rubricItems.map(item => ({ title: item.title, description: item.description, points: Number(item.points), stepId: item.stepId, sort: item.sort })),
    } : null,
  }))
}

function serializeTask(task: WorkOrderRecord, includeAnswerKey = true) {
  return {
    id: task.id,
    classId: task.classId,
    className: task.class.name,
    title: task.title,
    description: task.description,
    status: task.status,
    templateId: task.templateId,
    autoScoreWeight: Number(task.autoScoreWeight),
    manualScoreWeight: Number(task.manualScoreWeight),
    timeLimitMinutes: task.timeLimitMinutes,
    assignmentVersion: task.assignmentVersion,
    availableAt: task.availableAt.toISOString(),
    dueAt: task.dueAt?.toISOString() ?? null,
    lateAllowed: task.lateAllowed,
    publishedAt: task.publishedAt?.toISOString() ?? null,
    sections: sectionsSnapshot(task, includeAnswerKey),
  }
}

async function scopedTask(actor: AuthUser, taskId: string) {
  const task = await prisma.planAssignment.findUnique({ where: { id: taskId }, include: taskInclude })
  if (!task) fail('WORK_ORDER_NOT_FOUND', 404)
  await requireClassStaff(actor, task.classId)
  return task
}

async function replaceSections(transaction: Prisma.TransactionClient, assignmentId: string, rawSections: unknown) {
  const sections = sectionArray(rawSections)
  await transaction.taskSection.deleteMany({ where: { assignmentId } })
  const ids = new Map<string, string>()
  for (const section of sections) {
    const sandbox = section.sandbox
    const created = await transaction.taskSection.create({
      data: {
        assignmentId,
        parentId: section.parentClientKey ? ids.get(section.parentClientKey) : undefined,
        resourceId: section.resourceId || undefined,
        type: section.type,
        title: section.title,
        description: section.description,
        sort: section.sort,
        required: section.required,
        weightPercent: section.weightPercent,
        config: section.config,
        mediaItems: section.type === TaskSectionType.MEDIA ? {
          create: section.mediaItems.map((item, index) => ({
            kind: enumValue(item.kind, Object.values(MediaKind)),
            title: text(item.title, 120, true),
            url: text(item.url, 2000) || null,
            storageKey: text(item.storageKey, 500) || null,
            mimeType: text(item.mimeType, 120) || null,
            durationSec: item.durationSec === undefined ? null : Math.max(0, Math.trunc(finiteNumber(item.durationSec, 0))),
            sort: Math.trunc(finiteNumber(item.sort, index)),
            metadata: json(item.metadata, {}),
          })),
        } : undefined,
        questions: section.type === TaskSectionType.QUIZ ? {
          create: section.questions.map((item, index) => ({
            type: enumValue(item.type, Object.values(QuestionType)),
            prompt: text(item.prompt, 2000, true),
            options: json(item.options, []),
            answerKey: json(item.answerKey, {}),
            explanation: text(item.explanation, 2000),
            points: finiteNumber(item.points, 0),
            sort: Math.trunc(finiteNumber(item.sort, index)),
            required: item.required !== false,
          })),
        } : undefined,
        sandboxSpec: section.type === TaskSectionType.SANDBOX && sandbox ? {
          create: {
            sandboxType: enumValue(sandbox.sandboxType, Object.values(SandboxType)),
            appKey: text(sandbox.appKey, 100, true),
            version: Math.max(1, Math.trunc(finiteNumber(sandbox.version, 1))),
            config: json(sandbox.config, {}),
            steps: {
              create: (Array.isArray(sandbox.steps) ? sandbox.steps as RecordValue[] : []).map((step, index) => ({
                title: text(step.title, 120, true), instruction: text(step.instruction, 4000, true), sort: Math.trunc(finiteNumber(step.sort, index)), required: step.required !== false, fields: json(step.fields, []), evidenceKey: text(step.evidenceKey, 120) || null,
              })),
            },
            rubricItems: {
              create: (Array.isArray(sandbox.rubricItems) ? sandbox.rubricItems as RecordValue[] : []).map((item, index) => ({
                title: text(item.title, 120, true), description: text(item.description, 2000), points: finiteNumber(item.points, 0), stepId: text(item.stepId, 120) || null, sort: Math.trunc(finiteNumber(item.sort, index)),
              })),
            },
          },
        } : undefined,
      },
    })
    ids.set(section.clientKey, created.id)
  }
}

export async function listAdminClasses(actor: AuthUser) {
  if (!actor.roomIds.length) return []
  const classes = await prisma.class.findMany({
    where: { roomId: { in: actor.roomIds } },
    select: { id: true, name: true, roomId: true, organizationId: true, _count: { select: { enrollments: { where: { active: true, role: 'STUDENT' } } } } },
    orderBy: { name: 'asc' },
  })
  return classes.map(item => ({ ...item, studentCount: item._count.enrollments, _count: undefined }))
}

export async function listResourceCatalog(source?: string) {
  const parsedSource = source ? enumValue(source, Object.values(ResourceSource), 'RESOURCE_SOURCE_INVALID') : undefined
  return await prisma.resourceCatalogItem.findMany({ where: { enabled: true, source: parsedSource }, orderBy: [{ source: 'asc' }, { title: 'asc' }] })
}

export async function listWorkOrders(actor: AuthUser, status?: string) {
  const parsedStatus = status ? enumValue(status, Object.values(AssignmentStatus), 'WORK_ORDER_STATUS_INVALID') : undefined
  const tasks = await prisma.planAssignment.findMany({
    where: { class: { roomId: { in: actor.roomIds } }, status: parsedStatus },
    include: { class: { select: { name: true } }, _count: { select: { sections: true, tasks: true } } },
    orderBy: { id: 'desc' },
  })
  return tasks.map(task => ({ ...task, autoScoreWeight: Number(task.autoScoreWeight), manualScoreWeight: Number(task.manualScoreWeight), className: task.class.name, sectionCount: task._count.sections, studentTaskCount: task._count.tasks }))
}

export async function createWorkOrder(actor: AuthUser, path: string, idempotencyKey: string, input: WorkOrderInput) {
  if (!idempotencyKey) fail('IDEMPOTENCY_KEY_REQUIRED')
  const classId = text(input.classId, 120, true)
  const title = text(input.title, 120, true)
  const description = text(input.description, 2000)
  await requireClassStaff(actor, classId)
  const availableAt = optionalDate(input.availableAt, new Date()) ?? new Date()
  const dueAt = optionalDate(input.dueAt, null)
  if (dueAt && dueAt <= availableAt) fail('WORK_ORDER_INVALID')
  const weights = scoreWeights(input.autoScoreWeight, input.manualScoreWeight)
  const timeLimitMinutes = input.timeLimitMinutes === undefined || input.timeLimitMinutes === null || input.timeLimitMinutes === '' ? null : Math.trunc(finiteNumber(input.timeLimitMinutes, 0))
  if (timeLimitMinutes !== null && timeLimitMinutes <= 0) fail('WORK_ORDER_INVALID')
  const existing = await prisma.planAssignmentIdempotencyKey.findUnique({ where: { userId_method_path_key: { userId: actor.id, method: 'POST', path, key: idempotencyKey } }, include: { planAssignment: { include: taskInclude } } })
  if (existing) return { task: serializeTask(existing.planAssignment), replayed: true }
  const task = await prisma.$transaction(async transaction => {
    const created = await transaction.planAssignment.create({
      data: { classId, planId: 'learnec-work-order', title, description, availableAt, dueAt, lateAllowed: Boolean(input.lateAllowed), timeLimitMinutes, ...weights },
    })
    if (Array.isArray(input.sections) && input.sections.length) await replaceSections(transaction, created.id, input.sections)
    await transaction.planAssignmentIdempotencyKey.create({ data: { userId: actor.id, method: 'POST', path, key: idempotencyKey, planAssignmentId: created.id } })
    return await transaction.planAssignment.findUniqueOrThrow({ where: { id: created.id }, include: taskInclude })
  })
  return { task: serializeTask(task), replayed: false }
}

export async function getWorkOrder(actor: AuthUser, taskId: string) {
  return serializeTask(await scopedTask(actor, taskId))
}

export async function updateWorkOrderDraft(actor: AuthUser, taskId: string, input: WorkOrderInput) {
  const current = await scopedTask(actor, taskId)
  if (current.status !== AssignmentStatus.DRAFT) fail('WORK_ORDER_NOT_EDITABLE', 409)
  const classId = input.classId === undefined ? current.classId : text(input.classId, 120, true)
  await requireClassStaff(actor, classId)
  const title = input.title === undefined ? current.title : text(input.title, 120, true)
  const description = input.description === undefined ? current.description : text(input.description, 2000)
  const weights = scoreWeights(input.autoScoreWeight, input.manualScoreWeight, Number(current.autoScoreWeight), Number(current.manualScoreWeight))
  const timeLimitMinutes = input.timeLimitMinutes === undefined ? current.timeLimitMinutes : input.timeLimitMinutes === null || input.timeLimitMinutes === '' ? null : Math.trunc(finiteNumber(input.timeLimitMinutes, 0))
  if (timeLimitMinutes !== null && timeLimitMinutes <= 0) fail('WORK_ORDER_INVALID')
  const availableAt = optionalDate(input.availableAt, current.availableAt) ?? current.availableAt
  const dueAt = optionalDate(input.dueAt, current.dueAt)
  if (dueAt && dueAt <= availableAt) fail('WORK_ORDER_INVALID')
  if (input.sections !== undefined) sectionArray(input.sections)

  const task = await prisma.$transaction(async transaction => {
    await transaction.planAssignment.update({ where: { id: taskId }, data: { classId, title, description, ...weights, timeLimitMinutes, availableAt, dueAt, lateAllowed: input.lateAllowed === undefined ? current.lateAllowed : Boolean(input.lateAllowed) } })
    if (input.sections !== undefined) await replaceSections(transaction, taskId, input.sections)
    return await transaction.planAssignment.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude })
  })
  return serializeTask(task)
}

export async function previewWorkOrder(actor: AuthUser, taskId: string) {
  return serializeTask(await scopedTask(actor, taskId), false)
}

export async function listWorkOrderTemplates(actor: AuthUser) {
  const organizationIds = await prisma.class.findMany({ where: { roomId: { in: actor.roomIds } }, distinct: ['organizationId'], select: { organizationId: true } })
  const templates = await prisma.workOrderTemplate.findMany({ where: { organizationId: { in: organizationIds.map(item => item.organizationId) } }, orderBy: { updatedAt: 'desc' } })
  return templates.map(template => ({ ...template, defaultAutoWeight: Number(template.defaultAutoWeight), defaultManualWeight: Number(template.defaultManualWeight) }))
}

export async function createWorkOrderTemplate(actor: AuthUser, path: string, idempotencyKey: string, input: { taskId?: unknown; title?: unknown; description?: unknown }) {
  if (!idempotencyKey) fail('IDEMPOTENCY_KEY_REQUIRED')
  const replay = await prisma.workOrderTemplate.findUnique({ where: { createdById_idempotencyKey: { createdById: actor.id, idempotencyKey } } })
  if (replay) return { template: { ...replay, defaultAutoWeight: Number(replay.defaultAutoWeight), defaultManualWeight: Number(replay.defaultManualWeight) }, replayed: true }
  const task = await scopedTask(actor, text(input.taskId, 120, true))
  const title = text(input.title, 120, true)
  const description = input.description === undefined ? task.description : text(input.description, 2000)
  const template = await prisma.workOrderTemplate.create({
    data: { organizationId: task.class.organizationId, title, description, defaultAutoWeight: task.autoScoreWeight, defaultManualWeight: task.manualScoreWeight, sectionsSnapshot: sectionsSnapshot(task, true) as Prisma.InputJsonValue, createdById: actor.id, idempotencyKey },
  })
  return { template: { ...template, defaultAutoWeight: Number(template.defaultAutoWeight), defaultManualWeight: Number(template.defaultManualWeight) }, replayed: false }
}

export async function copyWorkOrderTemplate(actor: AuthUser, path: string, idempotencyKey: string, templateId: string, input: { classId?: unknown; title?: unknown }) {
  if (!idempotencyKey) fail('IDEMPOTENCY_KEY_REQUIRED')
  const classId = text(input.classId, 120, true)
  const classroom = await requireClassStaff(actor, classId)
  const template = await prisma.workOrderTemplate.findFirst({ where: { id: templateId, organizationId: classroom.organizationId } })
  if (!template) fail('WORK_ORDER_TEMPLATE_NOT_FOUND', 404)
  const existing = await prisma.planAssignmentIdempotencyKey.findUnique({ where: { userId_method_path_key: { userId: actor.id, method: 'POST', path, key: idempotencyKey } }, include: { planAssignment: { include: taskInclude } } })
  if (existing) return { task: serializeTask(existing.planAssignment), replayed: true }
  const title = text(input.title ?? template.title, 120, true)
  const sections = template.sectionsSnapshot as unknown
  const task = await prisma.$transaction(async transaction => {
    const created = await transaction.planAssignment.create({ data: { classId, planId: 'learnec-work-order', title, description: template.description, templateId: template.id, availableAt: new Date(), autoScoreWeight: template.defaultAutoWeight, manualScoreWeight: template.defaultManualWeight } })
    await replaceSections(transaction, created.id, sections)
    await transaction.planAssignmentIdempotencyKey.create({ data: { userId: actor.id, method: 'POST', path, key: idempotencyKey, planAssignmentId: created.id } })
    return await transaction.planAssignment.findUniqueOrThrow({ where: { id: created.id }, include: taskInclude })
  })
  return { task: serializeTask(task), replayed: false }
}

export async function publishWorkOrder(actor: AuthUser, taskId: string, path: string, idempotencyKey: string, input: { classId?: unknown; availableAt?: unknown; dueAt?: unknown; lateAllowed?: unknown }) {
  if (!idempotencyKey) fail('IDEMPOTENCY_KEY_REQUIRED')
  const replay = await prisma.planAssignmentIdempotencyKey.findUnique({ where: { userId_method_path_key: { userId: actor.id, method: 'POST', path, key: idempotencyKey } }, include: { planAssignment: true } })
  if (replay) {
    const taskCount = await prisma.studentTask.count({ where: { planAssignmentId: replay.planAssignmentId } })
    return { assignment: replay.planAssignment, taskCount, replayed: true }
  }
  const task = await scopedTask(actor, taskId)
  if (task.status !== AssignmentStatus.DRAFT) fail('WORK_ORDER_ALREADY_PUBLISHED', 409)
  const classId = input.classId === undefined ? task.classId : text(input.classId, 120, true)
  const classroom = await requireClassStaff(actor, classId)
  const availableAt = optionalDate(input.availableAt, task.availableAt) ?? task.availableAt
  const dueAt = optionalDate(input.dueAt, task.dueAt)
  if (dueAt && dueAt <= availableAt) fail('WORK_ORDER_INVALID')
  scoreWeights(task.autoScoreWeight, task.manualScoreWeight)
  const snapshot = sectionsSnapshot(task, true)
  const validatedSections = sectionArray(snapshot)
  if (!validatedSections.some(section => section.type !== TaskSectionType.WORK_ORDER)) fail('WORK_ORDER_SECTION_INVALID')
  const students = await prisma.classEnrollment.findMany({ where: { classId, active: true, role: 'STUDENT' }, select: { userId: true } })
  const publishedAt = new Date()
  return await prisma.$transaction(async transaction => {
    const assignment = await transaction.planAssignment.update({ where: { id: taskId }, data: { classId, availableAt, dueAt, lateAllowed: input.lateAllowed === undefined ? task.lateAllowed : Boolean(input.lateAllowed), status: AssignmentStatus.PUBLISHED, publishedAt, publishedSnapshot: { assignmentVersion: task.assignmentVersion, autoScoreWeight: Number(task.autoScoreWeight), manualScoreWeight: Number(task.manualScoreWeight), timeLimitMinutes: task.timeLimitMinutes, sections: snapshot } } })
    await transaction.studentTask.createMany({ data: students.map(student => ({ planAssignmentId: taskId, studentId: student.userId, activityId: taskId, status: 'AVAILABLE' as const, availableAt, dueAt })), skipDuplicates: true })
    await transaction.planAssignmentIdempotencyKey.create({ data: { userId: actor.id, method: 'POST', path, key: idempotencyKey, planAssignmentId: taskId } })
    await transaction.auditEvent.create({ data: { trainingRoomId: classroom.roomId, actorId: actor.id, actorRole: actor.role, entityType: 'PLAN_ASSIGNMENT', entityId: taskId, eventType: 'WORK_ORDER_PUBLISHED', metadata: { studentTaskCount: students.length } } })
    return { assignment, taskCount: students.length, replayed: false }
  })
}

export async function getPublicationSummary(actor: AuthUser, taskId: string) {
  const task = await scopedTask(actor, taskId)
  const [taskCount, statusCounts] = await Promise.all([
    prisma.studentTask.count({ where: { planAssignmentId: taskId } }),
    prisma.studentTask.groupBy({ by: ['status'], where: { planAssignmentId: taskId }, _count: { _all: true } }),
  ])
  return { taskId, status: task.status, publishedAt: task.publishedAt?.toISOString() ?? null, taskCount, statusCounts: Object.fromEntries(statusCounts.map(item => [item.status, item._count._all])) }
}

export async function listTrainingCenters(actor: AuthUser) {
  const rooms = await prisma.trainingRoom.findMany({ where: { id: { in: actor.roomIds } }, select: { id: true, name: true, type: true, organizationId: true }, orderBy: { name: 'asc' } })
  return Object.values(TrainingRoomType).map(type => ({ type, capabilityStatus: type === TrainingRoomType.TEACHING ? 'AVAILABLE' : 'COMING_SOON', rooms: rooms.filter(room => room.type === type) }))
}
