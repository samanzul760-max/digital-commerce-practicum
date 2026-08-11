import type { Prisma } from '@prisma/client'

type GradeProjection = {
  id: string
  score: Prisma.Decimal | number
  feedback: string
  gradedAt: Date
  releasedAt: Date | null
}

function number(value: Prisma.Decimal | number) {
  return Number(value)
}

export function studentGradeView(grade: GradeProjection | null | undefined) {
  if (!grade?.releasedAt) return null
  return {
    id: grade.id,
    score: number(grade.score),
    feedback: grade.feedback,
    gradedAt: grade.gradedAt,
    releasedAt: grade.releasedAt,
  }
}

export function studentSubmissionView<T extends { id: string; currentVersion: number; submittedAt: Date | null; versions: unknown[]; grade?: GradeProjection | null }>(submission: T | null | undefined) {
  if (!submission) return null
  return {
    id: submission.id,
    currentVersion: submission.currentVersion,
    submittedAt: submission.submittedAt,
    versions: submission.versions,
    grade: studentGradeView(submission.grade),
  }
}
