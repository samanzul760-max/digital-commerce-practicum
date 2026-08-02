import type { Prisma, RoomMemberRole } from '@prisma/client'
import { prisma } from '../db/client'

export const defaultSkillLabels = ['商品运营', '数据分析', '内容策划', '视觉呈现', '营销投放', '客户服务']

type SkillMetric = { skill: string; score: number }
type PlanProgress = { planId: string; title: string; activityCount: number; gradedCount: number; completionPercent: number }

const demoGroups = [
  { name: '运营一组', key: 'operations', completions: [96, 91, 87, 82, 78, 73, 68, 61, 54, 42] },
  { name: '数据二组', key: 'data', completions: [94, 89, 84, 80, 76, 71, 65, 59, 50, 35] },
]

function demoEnabled() {
  const setting = process.env.PRACTICUM_DEMO_ACHIEVEMENTS
  return setting === '1' || (setting !== '0' && process.env.NODE_ENV !== 'production')
}

function asSkillMetrics(value: Prisma.JsonValue): SkillMetric[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    return typeof record.skill === 'string' && typeof record.score === 'number' ? [{ skill: record.skill, score: record.score }] : []
  })
}

function asPlanProgress(value: Prisma.JsonValue): PlanProgress[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    if (typeof record.planId !== 'string' || typeof record.title !== 'string') return []
    return [{ planId: record.planId, title: record.title, activityCount: Number(record.activityCount) || 0, gradedCount: Number(record.gradedCount) || 0, completionPercent: Number(record.completionPercent) || 0 }]
  })
}

async function ensureDemoMembers(roomId: string) {
  if (!demoEnabled()) return
  if (await prisma.roomMember.count({ where: { roomId } })) return

  await prisma.organization.upsert({ where: { id: 'org-demo' }, update: {}, create: { id: 'org-demo', name: '演示职业学院' } })
  await prisma.trainingRoom.upsert({ where: { id: roomId }, update: {}, create: { id: roomId, organizationId: 'org-demo', name: '数字商贸实训室' } })

  for (const [groupIndex, group] of demoGroups.entries()) {
    const virtualGroup = await prisma.virtualGroup.upsert({ where: { roomId_name: { roomId, name: group.name } }, update: {}, create: { roomId, name: group.name } })
    for (const [index, completionPercent] of group.completions.entries()) {
      const avgScore = Math.max(58, Math.min(96, 68 + Math.round(completionPercent * 0.24) - index + groupIndex * 2))
      const skillOffsets = [8, -4, 2, -9, 5, -2]
      const skillMetrics = defaultSkillLabels.map((skill, skillIndex) => ({ skill, score: Math.max(35, Math.min(98, avgScore + skillOffsets[skillIndex] + (groupIndex ? -2 : 3) - (index % 3))) }))
      const planOffsets = [4, -9, 7]
      const planProgress = ['网店搭建', '网店视觉设计', '实践案例'].map((title, planIndex) => {
        const percent = Math.max(10, Math.min(100, completionPercent + planOffsets[planIndex]))
        return { planId: `demo-plan-${planIndex + 1}`, title, activityCount: 10, gradedCount: Math.round(percent / 10), completionPercent: percent }
      })
      const ordinal = String(index + 1).padStart(2, '0')
      await prisma.roomMember.create({ data: {
        id: groupIndex === 0 && index === 0 ? 'member-001' : `demo-member-${group.key}-${ordinal}`,
        roomId,
        displayName: groupIndex === 0 && index === 0 ? '学生 001' : `${group.name} ${ordinal}号学员`,
        role: 'STUDENT',
        groupId: virtualGroup.id,
        isDemo: true,
        completionPercent,
        gradedCount: Math.round(completionPercent * 12 / 100),
        avgScore,
        skillMetrics,
        planProgress,
      } })
    }
  }
}

export async function listRoomMembers(roomId: string, input: { page: number; pageSize: number; keyword: string }) {
  await ensureDemoMembers(roomId)
  const where: Prisma.RoomMemberWhereInput = { roomId, ...(input.keyword ? { OR: [
    { displayName: { contains: input.keyword, mode: 'insensitive' } },
    { group: { name: { contains: input.keyword, mode: 'insensitive' } } },
  ] } : {}) }
  const [total, members, groups] = await prisma.$transaction([
    prisma.roomMember.count({ where }),
    prisma.roomMember.findMany({ where, include: { group: true }, orderBy: [{ createdAt: 'asc' }, { displayName: 'asc' }], skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
    prisma.virtualGroup.findMany({ where: { roomId }, include: { _count: { select: { members: true } } }, orderBy: { name: 'asc' } }),
  ])
  return {
    items: members.map(member => ({ id: member.id, label: member.displayName, role: member.role, group: member.group?.name ?? '未分组', isDemo: member.isDemo })),
    groups: groups.filter(group => group._count.members > 0).map(group => ({ id: group.id, name: group.name, memberCount: group._count.members })),
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
  }
}

export async function updateRoomMember(roomId: string, memberId: string, input: { group?: string; role?: RoomMemberRole }) {
  if (!await prisma.roomMember.findFirst({ where: { id: memberId, roomId } })) return null
  let groupId: string | null | undefined
  if (input.group !== undefined) {
    const name = input.group.trim()
    groupId = !name || name === '未分组' ? null : (await prisma.virtualGroup.upsert({ where: { roomId_name: { roomId, name } }, update: {}, create: { roomId, name } })).id
  }
  const updated = await prisma.roomMember.update({ where: { id: memberId }, data: { ...(groupId !== undefined ? { groupId } : {}), ...(input.role ? { role: input.role } : {}) }, include: { group: true } })
  return { id: updated.id, label: updated.displayName, role: updated.role, group: updated.group?.name ?? '未分组', isDemo: updated.isDemo }
}

export async function removeRoomMember(roomId: string, memberId: string) {
  return (await prisma.roomMember.deleteMany({ where: { id: memberId, roomId } })).count > 0
}

export async function getRoomMemberRows(roomId: string) {
  await ensureDemoMembers(roomId)
  const members = await prisma.roomMember.findMany({ where: { roomId, role: 'STUDENT' }, include: { group: true } })
  return members.map(member => ({
    memberId: member.id,
    learnerLabel: member.displayName,
    groupLabel: member.group?.name ?? '未分组',
    isDemo: member.isDemo,
    completionPercent: member.completionPercent,
    gradedCount: member.gradedCount,
    avgScore: member.avgScore,
    skillMetrics: asSkillMetrics(member.skillMetrics),
    planProgress: asPlanProgress(member.planProgress),
  }))
}

export async function getRoomMemberRow(roomId: string, memberId: string) {
  return (await getRoomMemberRows(roomId)).find(member => member.memberId === memberId) ?? null
}
