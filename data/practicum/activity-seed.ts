import type { Activity } from '../../domain/practicum/types'

export const seedActivities: Activity[] = [
  // Module 1, Unit 1: 网店开设 — SOFTWARE_ACTION activities
  {
    id: 'activity-act-01-001',
    type: 'SOFTWARE_ACTION',
    title: '商家入驻',
    objective: '完成商家入驻流程',
    instructions: ['登录商家后台', '填写商家信息', '提交入驻申请'],
    required: true,
    resourceIds: [],
    config: {
      type: 'SOFTWARE_ACTION' as const,
      steps: [
        { id: 'step-1-1', label: '阅读并同意平台入驻协议', required: true },
        { id: 'step-1-2', label: '上传营业执照', required: true },
        { id: 'step-1-3', label: '填写店铺基本信息', required: false },
      ],
    },
  },
  {
    id: 'activity-act-01-002',
    type: 'TRAINING',
    title: '店铺信息设置训练',
    objective: '掌握店铺信息设置方法',
    instructions: ['阅读训练题目', '根据要求完成设置', '提交答案'],
    required: true,
    resourceIds: [],
    config: {
      type: 'TRAINING' as const,
      maxAttempts: 3,
      timeLimitMinutes: 15,
    },
  },
  {
    id: 'activity-act-01-003',
    type: 'PRACTICE_ACTIVITY',
    title: '店铺基本设置',
    objective: '独立完成店铺基本设置任务',
    instructions: ['审阅任务说明', '完成店铺设置', '提交成果'],
    required: true,
    resourceIds: [],
    config: {
      type: 'PRACTICE_ACTIVITY' as const,
      deliverables: ['店铺设置截图', '设置说明文档'],
      rubric: [
        { id: 'rubric-1', label: '设置完整性', maxScore: 40, required: true },
        { id: 'rubric-2', label: '操作规范性', maxScore: 30, required: true },
        { id: 'rubric-3', label: '文档清晰度', maxScore: 30, required: false },
      ],
    },
  },
]
