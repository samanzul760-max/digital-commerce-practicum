import type { CurriculumNode, Organization, Plan, TrainingRoom } from '../../domain/practicum/types'
import { seedModules, seedUnits, seedActivities } from './curriculum-seed'
import { seedActivityTypes } from './activity-type-seed'

export const seedRoom: TrainingRoom = {
  id: 'room-001',
  title: '数字商贸实训室',
  description: '面向电子商务与网络营销岗位的综合性实训平台',
  organizationId: 'org-demo',
  planIds: ['plan-wdds', 'plan-wdsj'],
  status: 'ONLINE',
  teachingMode: 'TEACHING',
}

export const seedRooms: TrainingRoom[] = [seedRoom, {
  id: 'room-002',
  title: '数据运营实训室',
  description: '面向数据分析与运营决策的综合实训空间',
  organizationId: 'org-data',
  planIds: [],
  status: 'ONLINE',
  teachingMode: 'SELF_DIRECTED',
}]

export const seedOrganizations: Organization[] = [{
  id: 'org-demo',
  name: '演示职业学院',
  roomIds: ['room-001'],
}, {
  id: 'org-data',
  name: '演示职业学院数据中心',
  roomIds: ['room-002'],
}]

export const seedPlans: Plan[] = [
  {
    id: 'plan-wdds',
    roomId: 'room-001',
    title: '网店运营',
    description: '涵盖网店开通、商品发布、交易管理、推广、客户服务与数据分析六大模块的完整运营实训',
    status: 'PUBLISHED',
    sort: 1,
    moduleIds: ['mod-01', 'mod-02', 'mod-03', 'mod-04', 'mod-05', 'mod-06'],
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-07-15T10:00:00Z',
  },
  {
    id: 'plan-wdsj',
    roomId: 'room-001',
    title: '网店视觉设计',
    description: '内容待授权导入',
    status: 'DRAFT',
    sort: 2,
    moduleIds: [],
    createdAt: '2026-06-15T08:00:00Z',
    updatedAt: '2026-06-15T08:00:00Z',
  },
]

const typedActivities: CurriculumNode[] = seedActivities.map(activity => ({
  ...activity,
  activityType: seedActivityTypes[activity.id],
}))

export const seedNodes: CurriculumNode[] = [...seedModules, ...seedUnits, ...typedActivities]
