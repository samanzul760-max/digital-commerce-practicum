import type { Prisma } from '@prisma/client'

export async function unlockDependentTasks(tx: Prisma.TransactionClient, input: { planAssignmentId: string; studentId: string; now: Date }) {
  const lockedTasks = await tx.studentTask.findMany({
    where: { planAssignmentId: input.planAssignmentId, studentId: input.studentId, status: 'LOCKED', availableAt: { lte: input.now } },
    select: { id: true, activityId: true },
  })

  for (const task of lockedTasks) {
    const dependencies = await tx.taskDependency.findMany({
      where: { planAssignmentId: input.planAssignmentId, activityId: task.activityId },
      select: { prerequisiteActivityId: true },
    })
    if (!dependencies.length) continue

    const prerequisites = await tx.studentTask.findMany({
      where: {
        planAssignmentId: input.planAssignmentId,
        studentId: input.studentId,
        activityId: { in: dependencies.map(dependency => dependency.prerequisiteActivityId) },
      },
      select: { status: true },
    })
    const isUnlocked = prerequisites.length === dependencies.length && prerequisites.every(prerequisite => prerequisite.status === 'GRADED')
    if (isUnlocked) {
      await tx.studentTask.updateMany({ where: { id: task.id, status: 'LOCKED' }, data: { status: 'AVAILABLE' } })
    }
  }
}
