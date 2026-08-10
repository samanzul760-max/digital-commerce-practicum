import { randomBytes, scryptSync } from 'node:crypto'
import { PrismaClient, ResourceSource, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

function requiredPassword(name) {
  const value = process.env[name]
  if (!value || value.length < 8) throw new Error(`${name} must be set to an uncommitted password of at least 8 characters.`)
  return value
}

function passwordFields(password) {
  const passwordSalt = randomBytes(16).toString('hex')
  return { passwordSalt, passwordHash: scryptSync(password, passwordSalt, 32).toString('hex') }
}

async function upsertUser({ identifier, displayName, role, password }) {
  const fields = passwordFields(password)
  const user = await prisma.user.upsert({
    where: { identifier },
    update: { displayName, role, enabled: true, ...fields },
    create: { identifier, displayName, role, ...fields, roleGrants: { create: { role } } },
  })
  await prisma.userRoleGrant.upsert({ where: { userId_role: { userId: user.id, role } }, update: {}, create: { userId: user.id, role } })
  return user
}

async function main() {
  const admin = await upsertUser({
    identifier: 'admin', displayName: '平台管理员', role: UserRole.ADMIN, password: requiredPassword('SEED_ADMIN_PASSWORD'),
  })
  const student = await upsertUser({
    identifier: 'student1', displayName: '学生 1', role: UserRole.STUDENT, password: requiredPassword('SEED_STUDENT1_PASSWORD'),
  })

  const organization = await prisma.organization.upsert({
    where: { id: 'learnec-org' }, update: { name: 'LearnEC 教学组织' }, create: { id: 'learnec-org', name: 'LearnEC 教学组织' },
  })
  const room = await prisma.trainingRoom.upsert({
    where: { id: 'learnec-room' }, update: { organizationId: organization.id, name: 'LearnEC 默认实训室' },
    create: { id: 'learnec-room', organizationId: organization.id, name: 'LearnEC 默认实训室' },
  })
  const cohort = await prisma.cohort.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'LearnEC 默认届别' } },
    update: {}, create: { organizationId: organization.id, name: 'LearnEC 默认届别', startsAt: new Date('2026-01-01'), endsAt: new Date('2026-12-31') },
  })
  const classroom = await prisma.class.upsert({
    where: { cohortId_name: { cohortId: cohort.id, name: 'LearnEC 默认班级' } },
    update: { organizationId: organization.id, roomId: room.id },
    create: { organizationId: organization.id, roomId: room.id, cohortId: cohort.id, name: 'LearnEC 默认班级' },
  })
  await prisma.classEnrollment.upsert({
    where: { classId_userId: { classId: classroom.id, userId: admin.id } }, update: { role: 'TEACHER', active: true },
    create: { classId: classroom.id, userId: admin.id, role: 'TEACHER', active: true },
  })
  await prisma.classEnrollment.upsert({
    where: { classId_userId: { classId: classroom.id, userId: student.id } }, update: { role: 'STUDENT', active: true },
    create: { classId: classroom.id, userId: student.id, role: 'STUDENT', active: true },
  })

  const resources = [
    { id: 'resource-software-merchant-entry', source: ResourceSource.SOFTWARE_CENTER, title: '商家入驻', summary: '完成平台商家资料与经营类目配置。', capabilityTags: ['入驻', '资质'], configuration: { sectionType: 'SANDBOX', sandboxType: 'STORE_BASICS', appKey: 'merchant-entry' } },
    { id: 'resource-software-shop-open', source: ResourceSource.SOFTWARE_CENTER, title: '网店开通', summary: '完成店铺开通与基础信息设置。', capabilityTags: ['开店', '基础设置'], configuration: { sectionType: 'SANDBOX', sandboxType: 'STORE_BASICS', appKey: 'store-basics' } },
    { id: 'resource-camp-product', source: ResourceSource.SKILL_CAMP, title: '商品发布训练', summary: '训练商品信息、SKU、库存与运费设置。', capabilityTags: ['商品', 'SKU'], configuration: { sectionType: 'SANDBOX', sandboxType: 'PRODUCT_MANAGEMENT', appKey: 'product-management' } },
    { id: 'resource-camp-decoration', source: ResourceSource.SKILL_CAMP, title: '店铺装修训练', summary: '训练移动端与 PC 端组件编排。', capabilityTags: ['装修', '组件'], configuration: { sectionType: 'SANDBOX', sandboxType: 'STORE_DECORATION', appKey: 'store-decoration' } },
    { id: 'resource-enterprise-marketing', source: ResourceSource.ENTERPRISE_TASK_LIBRARY, title: '营销活动策划', summary: '创建优惠券、秒杀、拼团与砍价活动。', capabilityTags: ['营销', '活动'], configuration: { sectionType: 'SANDBOX', sandboxType: 'MARKETING', appKey: 'marketing' } },
    { id: 'resource-enterprise-analytics', source: ResourceSource.ENTERPRISE_TASK_LIBRARY, title: '经营分析任务', summary: '读取教学模拟指标并完成商品排行分析。', capabilityTags: ['分析', '复盘'], configuration: { sectionType: 'SANDBOX', sandboxType: 'BUSINESS_ANALYTICS', appKey: 'business-analytics' } },
  ]
  for (const resource of resources) {
    await prisma.resourceCatalogItem.upsert({
      where: { id: resource.id },
      update: resource,
      create: resource,
    })
  }

  await prisma.workOrderTemplate.upsert({
    where: { id: 'template-store-opening-001' },
    update: { organizationId: organization.id, title: '网店开通基础工单', description: '商家入驻、网店开通与基础设置组合模板。', createdById: admin.id },
    create: {
      id: 'template-store-opening-001', organizationId: organization.id, title: '网店开通基础工单', description: '商家入驻、网店开通与基础设置组合模板。', createdById: admin.id,
      sectionsSnapshot: [
        { clientKey: 'work-order', type: 'WORK_ORDER', title: '网店开通基础工单', description: '按顺序完成入驻和开店设置。', sort: 0, required: true, weightPercent: 0 },
        { clientKey: 'store-basics', parentClientKey: 'work-order', resourceId: 'resource-software-shop-open', type: 'SANDBOX', title: '网店开通与基础设置', description: '完成受控店铺基础配置。', sort: 1, required: true, weightPercent: 100, sandbox: { sandboxType: 'STORE_BASICS', appKey: 'store-basics', steps: [{ title: '完善店铺信息', instruction: '填写店铺名称并保存。', sort: 0, required: true, fields: [], evidenceKey: 'shop-profile' }], rubricItems: [{ title: '基础信息完整', description: '店铺名称与经营信息完整。', points: 100, sort: 0 }] } },
      ],
    },
  })

  const sandboxDefinitions = [
    { id: 'phase-c-demo-store', sandboxType: 'STORE_BASICS', title: '店铺基础', description: '完成店铺设置、提现账号与运费模板配置。', appKey: 'store-basics' },
    { id: 'phase-c-demo-product', sandboxType: 'PRODUCT_MANAGEMENT', title: '商品管理', description: '完成商品、库存预警与评价回复配置。', appKey: 'product-management' },
    { id: 'phase-c-demo-decoration', sandboxType: 'STORE_DECORATION', title: '店铺装修', description: '完成移动端或 PC 端装修组件编排。', appKey: 'store-decoration' },
    { id: 'phase-c-demo-marketing', sandboxType: 'MARKETING', title: '营销活动', description: '创建优惠券、秒杀、拼团或砍价活动。', appKey: 'marketing' },
    { id: 'phase-c-demo-analytics', sandboxType: 'BUSINESS_ANALYTICS', title: '经营分析', description: '阅读模拟趋势与排行榜并形成分析结论。', appKey: 'business-analytics' },
  ]
  const rootSection = {
    clientKey: 'phase-c-demo-root', type: 'WORK_ORDER', title: '电商五模块综合实训', description: '依次完成五个受控电商子业务沙盘。', sort: 0, required: true, weightPercent: 0,
  }
  const demoSections = [rootSection, ...sandboxDefinitions.map((item, index) => ({
    clientKey: item.id,
    parentClientKey: rootSection.clientKey,
    type: 'SANDBOX',
    title: item.title,
    description: item.description,
    sort: index + 1,
    required: true,
    weightPercent: 20,
    sandbox: {
      sandboxType: item.sandboxType,
      appKey: item.appKey,
      version: 1,
      config: {},
      steps: [{ title: `完成${item.title}`, instruction: `根据左侧指导书完成${item.title}配置并保存。`, sort: 0, required: true, fields: [{ key: 'result', label: '完成结果', required: true }], evidenceKey: `${item.appKey}-result` }],
      rubricItems: [{ title: `${item.title}配置完整`, description: '必填字段完整且步骤已留证。', points: 20, sort: 0 }],
    },
  }))]
  const demoAvailableAt = new Date('2026-01-01T00:00:00.000Z')
  const demoDueAt = new Date('2027-12-31T23:59:59.000Z')
  const demoAssignment = await prisma.planAssignment.upsert({
    where: { id: 'phase-c-demo-assignment' },
    update: {
      classId: classroom.id, title: '电商五模块综合实训', description: '店铺基础、商品管理、店铺装修、营销活动与经营分析完整工单。',
      status: 'PUBLISHED', availableAt: demoAvailableAt, dueAt: demoDueAt, autoScoreWeight: 70, manualScoreWeight: 30, timeLimitMinutes: 120,
      publishedSnapshot: { assignmentVersion: 1, autoScoreWeight: 70, manualScoreWeight: 30, timeLimitMinutes: 120, sections: demoSections },
    },
    create: {
      id: 'phase-c-demo-assignment', classId: classroom.id, planId: 'learnec-work-order', title: '电商五模块综合实训',
      description: '店铺基础、商品管理、店铺装修、营销活动与经营分析完整工单。', status: 'PUBLISHED', availableAt: demoAvailableAt, dueAt: demoDueAt,
      autoScoreWeight: 70, manualScoreWeight: 30, timeLimitMinutes: 120, publishedAt: new Date(),
      publishedSnapshot: { assignmentVersion: 1, autoScoreWeight: 70, manualScoreWeight: 30, timeLimitMinutes: 120, sections: demoSections },
    },
  })
  await prisma.taskSection.upsert({
    where: { id: rootSection.clientKey },
    update: { assignmentId: demoAssignment.id, title: rootSection.title, description: rootSection.description },
    create: { id: rootSection.clientKey, assignmentId: demoAssignment.id, type: 'WORK_ORDER', title: rootSection.title, description: rootSection.description, sort: 0, required: true, weightPercent: 0 },
  })
  for (const [index, definition] of sandboxDefinitions.entries()) {
    await prisma.taskSection.upsert({
      where: { id: definition.id },
      update: { assignmentId: demoAssignment.id, parentId: rootSection.clientKey, title: definition.title, description: definition.description, sort: index + 1, weightPercent: 20 },
      create: { id: definition.id, assignmentId: demoAssignment.id, parentId: rootSection.clientKey, type: 'SANDBOX', title: definition.title, description: definition.description, sort: index + 1, required: true, weightPercent: 20 },
    })
    await prisma.sandboxSpec.upsert({
      where: { sectionId: definition.id },
      update: { sandboxType: definition.sandboxType, appKey: definition.appKey, version: 1 },
      create: {
        sectionId: definition.id, sandboxType: definition.sandboxType, appKey: definition.appKey, version: 1,
        steps: { create: { title: `完成${definition.title}`, instruction: `根据左侧指导书完成${definition.title}配置并保存。`, sort: 0, required: true, fields: [{ key: 'result', label: '完成结果', required: true }], evidenceKey: `${definition.appKey}-result` } },
        rubricItems: { create: { title: `${definition.title}配置完整`, description: '必填字段完整且步骤已留证。', points: 20, sort: 0 } },
      },
    })
  }
  await prisma.studentTask.upsert({
    where: { planAssignmentId_studentId_activityId: { planAssignmentId: demoAssignment.id, studentId: student.id, activityId: demoAssignment.id } },
    update: { availableAt: demoAvailableAt, dueAt: demoDueAt },
    create: { id: 'phase-c-demo-student-task', planAssignmentId: demoAssignment.id, studentId: student.id, activityId: demoAssignment.id, status: 'AVAILABLE', availableAt: demoAvailableAt, dueAt: demoDueAt },
  })
}

main().finally(async () => { await prisma.$disconnect() })
