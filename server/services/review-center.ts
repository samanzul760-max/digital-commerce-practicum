import ExcelJS from 'exceljs'
import { TaskStatus, type Prisma } from '@prisma/client'
import { createError } from 'h3'
import { prisma } from '../db/client'
import { requireClassStaff } from './class-scope'
import type { AuthUser } from '../utils/auth-store'

const queueStatuses = new Set<TaskStatus>([TaskStatus.SUBMITTED, TaskStatus.GRADED, TaskStatus.RETURNED])

function reviewError(statusCode: number, code: string, extra: Record<string, unknown> = {}): never {
  throw createError({ statusCode, statusMessage: code, data: { code, ...extra } })
}

function number(value: Prisma.Decimal | number | null | undefined) {
  return Number(value ?? 0)
}

function rounded(value: number) {
  return Math.round(value * 100) / 100
}

const taskInclude = {
  planAssignment: { include: { class: true } },
  submissions: {
    include: {
      versions: { orderBy: { version: 'desc' as const }, include: { parts: true } },
      grade: { include: { revisions: { orderBy: { revision: 'desc' as const } } } },
    },
  },
} satisfies Prisma.StudentTaskInclude

type ReviewTask = Prisma.StudentTaskGetPayload<{ include: typeof taskInclude }>

async function scopedTask(actor: AuthUser, studentTaskId: string) {
  const task = await prisma.studentTask.findFirst({
    where: { id: studentTaskId, planAssignment: { class: { roomId: { in: actor.roomIds } } } },
    include: taskInclude,
  })
  if (!task || !task.submissions[0]) reviewError(404, 'REVIEW_SUBMISSION_NOT_FOUND')
  await requireClassStaff(actor, task.planAssignment.classId)
  return task
}

function submissionFor(task: ReviewTask) {
  const submission = task.submissions[0]
  if (!submission) reviewError(404, 'REVIEW_SUBMISSION_NOT_FOUND')
  const current = submission.versions.find(version => version.version === submission.currentVersion)
  if (!current) reviewError(409, 'REVIEW_VERSION_NOT_FOUND')
  return { submission, current }
}

function automaticScore(task: ReviewTask) {
  const { current } = submissionFor(task)
  if (!current.parts.length) return 0
  const total = current.parts.reduce((sum, part) => sum + (part.autoScore === null ? (part.status === 'COMPLETED' ? 100 : 0) : number(part.autoScore)), 0)
  return rounded(total / current.parts.length)
}

function gradeView(grade: NonNullable<ReviewTask['submissions'][number]['grade']>) {
  return {
    id: grade.id,
    autoScore: number(grade.autoScore),
    manualScore: number(grade.manualScore),
    autoWeight: number(grade.autoWeight),
    manualWeight: number(grade.manualWeight),
    score: number(grade.score),
    feedback: grade.feedback,
    gradedAt: grade.gradedAt,
    releasedAt: grade.releasedAt,
    releasedById: grade.releasedById,
    revisionCount: grade.revisions.length,
    revisions: grade.revisions.map(revision => ({
      revision: revision.revision,
      autoScore: number(revision.autoScore),
      manualScore: number(revision.manualScore),
      autoWeight: number(revision.autoWeight),
      manualWeight: number(revision.manualWeight),
      score: number(revision.score),
      feedback: revision.feedback,
      createdAt: revision.createdAt,
    })),
  }
}

async function reviewerNames(tasks: ReviewTask[]) {
  const ids = [...new Set(tasks.map(task => task.studentId))]
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, identifier: true, displayName: true } })
  return new Map(users.map(user => [user.id, user]))
}

export async function listReviewQueue(actor: AuthUser, rawStatus?: string) {
  const status = rawStatus ? rawStatus as TaskStatus : undefined
  if (status && !queueStatuses.has(status)) reviewError(422, 'REVIEW_STATUS_INVALID')
  const staffClassIds = actor.role === 'OWNER'
    ? undefined
    : (await prisma.classEnrollment.findMany({
        where: { userId: actor.id, active: true, role: { in: ['TEACHER', 'MENTOR', 'ASSISTANT', 'HEAD_TEACHER'] } },
        select: { classId: true },
      })).map(enrollment => enrollment.classId)
  const tasks = await prisma.studentTask.findMany({
    where: {
      status,
      planAssignment: {
        ...(staffClassIds ? { classId: { in: staffClassIds } } : {}),
        class: { roomId: { in: actor.roomIds } },
      },
      submissions: { some: {} },
    },
    include: taskInclude,
    orderBy: [{ submissions: { _count: 'desc' } }, { id: 'desc' }],
  })
  const users = await reviewerNames(tasks)
  return tasks.map(task => {
    const { submission, current } = submissionFor(task)
    const student = users.get(task.studentId)
    return {
      studentTaskId: task.id,
      status: task.status,
      title: task.planAssignment.title,
      classId: task.planAssignment.classId,
      className: task.planAssignment.class.name,
      student: { id: task.studentId, identifier: student?.identifier ?? task.studentId, displayName: student?.displayName ?? '未知学生' },
      submittedAt: submission.submittedAt,
      currentVersion: current.version,
      autoScore: automaticScore(task),
      grade: submission.grade ? gradeView(submission.grade) : null,
    }
  })
}

export async function getReviewDetail(actor: AuthUser, studentTaskId: string) {
  const task = await scopedTask(actor, studentTaskId)
  const { submission, current } = submissionFor(task)
  const [student, snapshots, events] = await Promise.all([
    prisma.user.findUnique({ where: { id: task.studentId }, select: { id: true, identifier: true, displayName: true } }),
    prisma.sandboxSnapshot.findMany({ where: { studentTaskId: task.id }, orderBy: { createdAt: 'asc' } }),
    prisma.taskEvent.findMany({ where: { studentTaskId: task.id }, orderBy: { createdAt: 'asc' } }),
  ])
  return {
    task: { id: task.id, status: task.status, title: task.planAssignment.title, classId: task.planAssignment.classId, className: task.planAssignment.class.name },
    student: student ?? { id: task.studentId, identifier: task.studentId, displayName: '未知学生' },
    submission: { id: submission.id, currentVersion: submission.currentVersion, submittedAt: submission.submittedAt, current },
    evidence: { snapshots, events },
    grading: {
      autoScore: automaticScore(task),
      autoWeight: number(task.planAssignment.autoScoreWeight),
      manualWeight: number(task.planAssignment.manualScoreWeight),
      grade: submission.grade ? gradeView(submission.grade) : null,
    },
  }
}

export async function gradeSubmission(actor: AuthUser, studentTaskId: string, input: { manualScore?: unknown; feedback?: unknown; expectedVersion?: unknown }) {
  const task = await scopedTask(actor, studentTaskId)
  const { submission, current } = submissionFor(task)
  const manualScore = Number(input.manualScore)
  const feedback = typeof input.feedback === 'string' ? input.feedback.trim() : ''
  const expectedVersion = Number(input.expectedVersion)
  if (!Number.isFinite(manualScore) || manualScore < 0 || manualScore > 100 || !feedback || feedback.length > 2000) reviewError(422, 'REVIEW_GRADE_INVALID')
  if (!Number.isInteger(expectedVersion) || expectedVersion !== submission.currentVersion) reviewError(409, 'REVIEW_VERSION_CONFLICT')
  if (!([TaskStatus.SUBMITTED, TaskStatus.GRADED] as TaskStatus[]).includes(task.status)) reviewError(409, 'REVIEW_TASK_STATE_INVALID')
  const autoScore = automaticScore(task)
  const autoWeight = number(task.planAssignment.autoScoreWeight)
  const manualWeight = number(task.planAssignment.manualScoreWeight)
  const score = rounded(autoScore * autoWeight / 100 + manualScore * manualWeight / 100)
  const grade = await prisma.$transaction(async tx => {
    const transitioned = await tx.studentTask.updateMany({
      where: { id: task.id, status: { in: [TaskStatus.SUBMITTED, TaskStatus.GRADED] } },
      data: { status: TaskStatus.GRADED },
    })
    if (transitioned.count !== 1) reviewError(409, 'REVIEW_TASK_STATE_INVALID')
    const liveSubmission = await tx.submission.findUniqueOrThrow({ where: { id: submission.id }, select: { currentVersion: true } })
    if (liveSubmission.currentVersion !== expectedVersion) reviewError(409, 'REVIEW_VERSION_CONFLICT')
    const previousGrade = await tx.grade.findUnique({ where: { submissionId: submission.id }, select: { id: true, releasedAt: true } })
    const currentGrade = await tx.grade.upsert({
      where: { submissionId: submission.id },
      create: { submissionId: submission.id, reviewerId: actor.id, feedback, autoScore, manualScore, autoWeight, manualWeight, score, releasedAt: null, releasedById: null },
      update: { reviewerId: actor.id, feedback, autoScore, manualScore, autoWeight, manualWeight, score, gradedAt: new Date(), releasedAt: null, releasedById: null },
      include: { revisions: { orderBy: { revision: 'desc' } } },
    })
    const revision = (currentGrade.revisions[0]?.revision ?? 0) + 1
    await tx.gradeRevision.create({ data: { gradeId: currentGrade.id, revision, reviewerId: actor.id, feedback, autoScore, manualScore, autoWeight, manualWeight, score } })
    await tx.taskEvent.create({ data: { studentTaskId: task.id, eventType: 'GRADED', payload: { submissionId: submission.id, version: current.version, autoScore, manualScore, score } } })
    await tx.auditEvent.create({ data: { trainingRoomId: task.planAssignment.class.roomId, actorId: actor.id, actorRole: actor.role, entityType: 'StudentTask', entityId: task.id, eventType: 'GRADE_SAVED', metadata: { submissionId: submission.id, version: current.version, autoScore, manualScore, score } } })
    if (previousGrade?.releasedAt) {
      await tx.taskEvent.create({ data: { studentTaskId: task.id, eventType: 'GRADE_WITHDRAWN', payload: { gradeId: currentGrade.id, reason: 'GRADE_REVISED' } } })
      await tx.auditEvent.create({ data: { trainingRoomId: task.planAssignment.class.roomId, actorId: actor.id, actorRole: actor.role, entityType: 'Grade', entityId: currentGrade.id, eventType: 'GRADE_AUTO_WITHDRAWN', metadata: { studentTaskId: task.id, reason: 'GRADE_REVISED' } } })
    }
    return await tx.grade.findUniqueOrThrow({ where: { id: currentGrade.id }, include: { revisions: { orderBy: { revision: 'desc' } } } })
  })
  return { grade: gradeView(grade) }
}

export async function releaseGrade(actor: AuthUser, studentTaskId: string) {
  const task = await scopedTask(actor, studentTaskId)
  const { submission } = submissionFor(task)
  const grade = submission.grade
  if (!grade) reviewError(404, 'GRADE_NOT_FOUND')
  if (grade.releasedAt) reviewError(409, 'GRADE_ALREADY_RELEASED')
  const releasedAt = new Date()
  const updated = await prisma.$transaction(async tx => {
    const released = await tx.grade.updateMany({
      where: { id: grade.id, releasedAt: null },
      data: { releasedAt, releasedById: actor.id },
    })
    if (released.count !== 1) reviewError(409, 'GRADE_ALREADY_RELEASED')
    await tx.taskEvent.create({ data: { studentTaskId: task.id, eventType: 'GRADE_RELEASED', payload: { gradeId: grade.id, releasedAt: releasedAt.toISOString(), releasedById: actor.id } } })
    await tx.auditEvent.create({ data: { trainingRoomId: task.planAssignment.class.roomId, actorId: actor.id, actorRole: actor.role, entityType: 'Grade', entityId: grade.id, eventType: 'GRADE_RELEASED', metadata: { studentTaskId: task.id, releasedAt: releasedAt.toISOString() } } })
    return await tx.grade.findUniqueOrThrow({ where: { id: grade.id }, include: { revisions: { orderBy: { revision: 'desc' } } } })
  })
  return { grade: gradeView(updated) }
}

export async function withdrawGrade(actor: AuthUser, studentTaskId: string) {
  const task = await scopedTask(actor, studentTaskId)
  const { submission } = submissionFor(task)
  const grade = submission.grade
  if (!grade?.releasedAt) reviewError(409, 'GRADE_NOT_RELEASED')
  const updated = await prisma.$transaction(async tx => {
    const withdrawn = await tx.grade.updateMany({
      where: { id: grade.id, releasedAt: { not: null } },
      data: { releasedAt: null, releasedById: null },
    })
    if (withdrawn.count !== 1) reviewError(409, 'GRADE_NOT_RELEASED')
    await tx.taskEvent.create({ data: { studentTaskId: task.id, eventType: 'GRADE_WITHDRAWN', payload: { gradeId: grade.id, withdrawnById: actor.id } } })
    await tx.auditEvent.create({ data: { trainingRoomId: task.planAssignment.class.roomId, actorId: actor.id, actorRole: actor.role, entityType: 'Grade', entityId: grade.id, eventType: 'GRADE_WITHDRAWN', metadata: { studentTaskId: task.id } } })
    return await tx.grade.findUniqueOrThrow({ where: { id: grade.id }, include: { revisions: { orderBy: { revision: 'desc' } } } })
  })
  return { grade: gradeView(updated) }
}

export async function returnSubmission(actor: AuthUser, studentTaskId: string, input: { feedback?: unknown; expectedVersion?: unknown }) {
  const task = await scopedTask(actor, studentTaskId)
  const { submission, current } = submissionFor(task)
  const feedback = typeof input.feedback === 'string' ? input.feedback.trim() : ''
  const expectedVersion = Number(input.expectedVersion)
  if (!feedback || feedback.length > 2000) reviewError(422, 'RETURN_FEEDBACK_REQUIRED')
  if (!Number.isInteger(expectedVersion) || expectedVersion !== submission.currentVersion) reviewError(409, 'REVIEW_VERSION_CONFLICT')
  if (task.status !== TaskStatus.SUBMITTED) reviewError(409, 'REVIEW_TASK_STATE_INVALID')
  const updated = await prisma.$transaction(async tx => {
    const transitioned = await tx.studentTask.updateMany({
      where: { id: task.id, status: TaskStatus.SUBMITTED },
      data: { status: TaskStatus.RETURNED },
    })
    if (transitioned.count !== 1) reviewError(409, 'REVIEW_TASK_STATE_INVALID')
    const liveSubmission = await tx.submission.findUniqueOrThrow({ where: { id: submission.id }, select: { currentVersion: true } })
    if (liveSubmission.currentVersion !== expectedVersion) reviewError(409, 'REVIEW_VERSION_CONFLICT')
    await tx.taskEvent.create({ data: { studentTaskId: task.id, eventType: 'RETURNED', payload: { feedback, actorId: actor.id, submissionId: submission.id, version: current.version } } })
    await tx.auditEvent.create({ data: { trainingRoomId: task.planAssignment.class.roomId, actorId: actor.id, actorRole: actor.role, entityType: 'StudentTask', entityId: task.id, eventType: 'SUBMISSION_RETURNED', metadata: { feedback, submissionId: submission.id, version: current.version } } })
    return await tx.studentTask.findUniqueOrThrow({ where: { id: task.id } })
  })
  return { task: { id: updated.id, status: updated.status } }
}

export async function getClassLearningData(actor: AuthUser, classId: string) {
  const classroom = await requireClassStaff(actor, classId)
  const tasks = await prisma.studentTask.findMany({
    where: { planAssignment: { classId } },
    include: { planAssignment: true, submissions: { include: { grade: true, versions: { orderBy: { version: 'desc' }, include: { parts: true } } } } },
    orderBy: { studentId: 'asc' },
  })
  const students = await prisma.user.findMany({ where: { id: { in: [...new Set(tasks.map(task => task.studentId))] } }, select: { id: true, identifier: true, displayName: true } })
  const studentsById = new Map(students.map(student => [student.id, student]))
  const graded = tasks.filter(task => task.status === TaskStatus.GRADED && task.submissions[0]?.grade)
  const partRows = tasks.flatMap(task => task.submissions[0]?.versions.find(version => version.version === task.submissions[0]?.currentVersion)?.parts ?? [])
  const rankings = [...new Set(tasks.map(task => task.studentId))].map(studentId => {
    const own = graded.filter(task => task.studentId === studentId)
    const student = studentsById.get(studentId)
    return { studentId, studentName: student?.displayName ?? '未知学生', studentNumber: student?.identifier ?? studentId, gradedCount: own.length, averageScore: own.length ? rounded(own.reduce((sum, task) => sum + number(task.submissions[0]?.grade?.score), 0) / own.length) : 0 }
  }).sort((left, right) => right.averageScore - left.averageScore || left.studentNumber.localeCompare(right.studentNumber))
  return {
    class: { id: classroom.id, name: classroom.name },
    overview: { taskCount: tasks.length, submittedCount: tasks.filter(task => task.status === TaskStatus.SUBMITTED || task.status === TaskStatus.GRADED).length, gradedCount: graded.length, completionPercent: tasks.length ? Math.round(graded.length * 100 / tasks.length) : 0, averageScore: graded.length ? rounded(graded.reduce((sum, task) => sum + number(task.submissions[0]?.grade?.score), 0) / graded.length) : 0 },
    sectionScoreRate: partRows.length ? rounded(partRows.reduce((sum, part) => sum + (part.autoScore === null ? (part.status === 'COMPLETED' ? 100 : 0) : number(part.autoScore)), 0) / partRows.length) : 0,
    rankings,
  }
}

export async function exportClassGradebook(actor: AuthUser, classId: string) {
  const classroom = await requireClassStaff(actor, classId)
  const tasks = await prisma.studentTask.findMany({ where: { planAssignment: { classId } }, include: { planAssignment: true, submissions: { include: { grade: true } } }, orderBy: { studentId: 'asc' } })
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set(tasks.map(task => task.studentId))] } }, select: { id: true, identifier: true, displayName: true } })
  const usersById = new Map(users.map(user => [user.id, user]))
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('班级成绩单')
  sheet.columns = [
    { header: '学号', key: 'studentNumber', width: 18 }, { header: '姓名', key: 'studentName', width: 16 }, { header: '工单名', key: 'assignmentTitle', width: 30 },
    { header: '自动分', key: 'autoScore', width: 12 }, { header: '人工分', key: 'manualScore', width: 12 }, { header: '总分', key: 'score', width: 12 }, { header: '提交时间', key: 'submittedAt', width: 23 },
  ]
  tasks.forEach(task => {
    const user = usersById.get(task.studentId)
    const grade = task.submissions[0]?.grade
    sheet.addRow({ studentNumber: user?.identifier ?? task.studentId, studentName: user?.displayName ?? '未知学生', assignmentTitle: task.planAssignment.title, autoScore: grade ? number(grade.autoScore) : '', manualScore: grade ? number(grade.manualScore) : '', score: grade ? number(grade.score) : '', submittedAt: task.submissions[0]?.submittedAt?.toISOString() ?? '' })
  })
  sheet.getRow(1).font = { bold: true }
  await prisma.auditEvent.create({ data: { trainingRoomId: classroom.roomId, actorId: actor.id, actorRole: actor.role, entityType: 'Class', entityId: classId, eventType: 'GRADEBOOK_EXPORTED', metadata: { rowCount: tasks.length, columns: ['studentNumber', 'studentName', 'assignmentTitle', 'autoScore', 'manualScore', 'score', 'submittedAt'] } } })
  return Buffer.from(await workbook.xlsx.writeBuffer())
}
