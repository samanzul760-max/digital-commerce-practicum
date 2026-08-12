export interface LearnecCenterDemoCase {
  id: string
  label: '演示内容'
  title: string
  location: string
  description: string
  status: string
  actionLabel: string
  to: string
}

export const learnecCenterDemoCases: readonly LearnecCenterDemoCase[] = [
  {
    id: 'title-optimization',
    label: '演示内容',
    title: '商品标题优化',
    location: '我的课程',
    description: '查看课程进度、学习目标和下一节内容。',
    status: '进行中',
    actionLabel: '继续学习',
    to: '/practicum/courses',
  },
  {
    id: 'shop-diagnosis',
    label: '演示内容',
    title: '店铺首页诊断',
    location: '模拟店铺',
    description: '查看店铺任务、问题清单和处理状态。',
    status: '待诊断',
    actionLabel: '查看诊断',
    to: '/practicum/shop/products',
  },
  {
    id: 'detail-materials',
    label: '演示内容',
    title: '详情页素材方案',
    location: '作业 / 作品集',
    description: '查看提交状态、反馈摘要和版本信息。',
    status: '待提交',
    actionLabel: '查看作品',
    to: '/practicum/tasks',
  },
]

export const learnecCenterDemoAchievements = [
  {
    id: 'first-step',
    label: '演示内容',
    title: '实训启程',
    description: '完成第一项学习任务后解锁。',
    status: '已解锁',
  },
  {
    id: 'steady-progress',
    label: '演示内容',
    title: '持续成长',
    description: '连续完成学习计划可获得。',
    status: '进行中',
  },
  {
    id: 'portfolio-builder',
    label: '演示内容',
    title: '作品集新星',
    description: '提交一份完整作品后解锁。',
    status: '待解锁',
  },
] as const
