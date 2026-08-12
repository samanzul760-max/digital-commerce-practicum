import { readdirSync } from 'node:fs'

const foundationFiles = new Set([
  'access.spec.ts',
  'admin-console-ui.spec.ts',
  'auth-bootstrap.spec.ts',
  'auth-cookie-security.spec.ts',
  'auth-session.spec.ts',
  'context-api.spec.ts',
  'context-ui.spec.ts',
  'home-hero-entry-ui.spec.ts',
  'isolation.spec.ts',
  'learnec-template-parity.spec.ts',
  'navigation-permissions.spec.ts',
  'phase-a-foundation.spec.ts',
  'role-consolidation.spec.ts',
  'shell.spec.ts',
  'ui-baseline.spec.ts',
])

const studentFiles = new Set([
  'achievements.spec.ts',
  'commerce-cases.spec.ts',
  'course-card-alignment.spec.ts',
  'course-hall-ui.spec.ts',
  'courses-hall.spec.ts',
  'curriculum.spec.ts',
  'frontend-backend-bridge.spec.ts',
  'progress-mobile.spec.ts',
  'progress-notifications.spec.ts',
  'student-activities.spec.ts',
  'student-activities-s3-001.spec.ts',
  'student-activities-s3-002.spec.ts',
  'student-activities-s3-003.spec.ts',
  'student-activities-s3-004.spec.ts',
  'student-activities-s3-005.spec.ts',
  'student-activities-s3-006.spec.ts',
  'student-activities-s3-007.spec.ts',
  'student-activities-s3-008.spec.ts',
  'student-activities-s3-009.spec.ts',
  'student-activities-s3-010.spec.ts',
  'student-activity-detail-closure.spec.ts',
  'student-learning-closure.spec.ts',
  'student-tasks-api.spec.ts',
  'student-visible-content-polish.spec.ts',
])

const teacherFiles = new Set([
  'assignments-api.spec.ts',
  'class-assignments-api.spec.ts',
  'classes-api.spec.ts',
  'classroom-management-ui.spec.ts',
  'submissions-api.spec.ts',
  'submission-server-source.spec.ts',
  'task-dependency-api.spec.ts',
  'teacher-review.spec.ts',
  'teacher-review-page-closure.spec.ts',
])

const adminFiles = new Set([
  'admin-achievements.spec.ts',
  'admin-publishing.spec.ts',
  'administration.spec.ts',
  'curriculum-api.spec.ts',
  'curriculum-editor.spec.ts',
  'plan-server-source.spec.ts',
  'plans-api.spec.ts',
])

const analyticsFiles = new Set([
  'analytics-export-api.spec.ts',
  'analytics-export-page.spec.ts',
  'analytics-member-page.spec.ts',
  'analytics-members-api.spec.ts',
  'analytics-member-skill-map-api.spec.ts',
  'analytics-plan-api.spec.ts',
  'data-center-server-source.spec.ts',
  'learnec-secondary-pages-ui.spec.ts',
])

const commerceFiles = new Set([
  'product-and-freight.spec.ts',
  'platform-api.spec.ts',
])

const qualityFiles = new Set([
  'opendesign-ui-integration.spec.ts',
  'slice-6-quality.spec.ts',
  'slice-7-release-polish.spec.ts',
  'tutorials.spec.ts',
])

const groupDefinitions = [
  ['foundation', '基础认证、壳层和权限', foundationFiles],
  ['student', '学生学习和提交闭环', studentFiles],
  ['teacher', '教师班级和审核闭环', teacherFiles],
  ['admin', '管理员计划和课程管理', adminFiles],
  ['analytics', '成员、资源和数据中心', analyticsFiles],
  ['commerce', '商品、运费和平台接口', commerceFiles],
  ['quality', '视觉回归和发布质量', qualityFiles],
]

const specFiles = readdirSync(new URL('../tests/e2e/practicum/', import.meta.url))
  .filter(file => file.endsWith('.spec.ts'))
  .sort()

const assignments = new Map()
for (const [groupId, , files] of groupDefinitions) {
  for (const file of files) assignments.set(file, groupId)
}

const unassigned = specFiles.filter(file => !assignments.has(file))
if (unassigned.length > 0) {
  throw new Error(`Unassigned practicum specs: ${unassigned.join(', ')}`)
}

export const validationGroups = groupDefinitions.map(([id, title]) => ({
  id,
  title,
  command: specFiles
    .filter(file => assignments.get(file) === id)
    .map(file => `tests/e2e/practicum/${file}`),
}))
