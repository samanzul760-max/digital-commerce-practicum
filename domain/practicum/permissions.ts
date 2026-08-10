/**
 * 实训平台权限模块（prototype）
 *
 * 当前阶段使用前端权限守卫，服务端权限层待后续接入。
 * 权限覆盖维度：
 *   1. 导航显示权限
 *   2. 页面渲染权限
 *   3. 直接 URL 权限
 *   4. 操作按钮权限
 *   5. 数据可见性
 *   6. 状态变更权限
 */

import type { PracticumRole } from './types'

// ── 角色定义 ──────────────────────────────────────────────

/** 当前可用的运行时角色。 */
export const AVAILABLE_ROLES: PracticumRole[] = ['ADMIN', 'STUDENT']

/** 角色中文标签 */
export const ROLE_LABELS: Record<PracticumRole, string> = {
  ADMIN: '管理员',
  OWNER: '管理员',
  TEACHER: '教师',
  MENTOR: '导师',
  STUDENT: '学生',
}

// ── 路由权限分组 ──────────────────────────────────────────

/** OWNER 专属路由前缀 */
const OWNER_ONLY_PREFIXES = [
  '/practicum/resources',
  '/practicum/members',
  '/practicum/room-settings',
  '/practicum/templates',
  '/practicum/reviews',
  '/practicum/data-center',
  '/practicum/submissions',
]

/** 编辑路由匹配模式 */
const EDIT_ROUTE_PATTERN = /\/practicum\/plans\/[^/]+\/edit/

// ── 权限检查函数 ──────────────────────────────────────────

/**
 * 检查角色是否可以查看指定路由。
 * 覆盖：直接 URL 权限、页面渲染权限。
 */
export function canAccessRoute(role: PracticumRole | null, routePath: string): boolean {
  if (!role) return routePath === '/practicum' || routePath.startsWith('/practicum/profile')

  // OWNER 可以访问所有路由
  if (role === 'ADMIN' || role === 'OWNER') return true

  // STUDENT 权限检查
  if (role === 'STUDENT') {
    // 不能访问 OWNER 专属路由
    for (const prefix of OWNER_ONLY_PREFIXES) {
      if (routePath.startsWith(prefix)) return false
    }
    // 不能访问编辑页面
    if (EDIT_ROUTE_PATTERN.test(routePath)) return false
    return true
  }

  if (role === 'TEACHER' || role === 'MENTOR') {
    return routePath === '/practicum' ||
      routePath.startsWith('/practicum/profile') ||
      routePath.startsWith('/practicum/cases') ||
      routePath.startsWith('/practicum/classes') ||
      routePath.startsWith('/practicum/teaching') ||
      routePath.startsWith('/practicum/progress') ||
      routePath.startsWith('/practicum/reviews') ||
      routePath.startsWith('/practicum/submissions')
  }

  return false
}

/**
 * 检查角色是否可以查看指定计划。
 * 覆盖：数据可见性。
 */
export function canViewPlan(role: PracticumRole | null, planStatus: string): boolean {
  if (!role) return false
  if (role === 'OWNER') return true
  // STUDENT 只能看到已发布计划
  if (role === 'STUDENT') return planStatus === 'PUBLISHED'
  return false
}

/**
 * 检查角色是否可以编辑计划。
 * 覆盖：操作按钮权限、状态变更权限。
 */
export function canEditPlan(role: PracticumRole | null): boolean {
  return role === 'OWNER'
}

/**
 * 检查角色是否可以管理资源。
 * 覆盖：操作按钮权限。
 */
export function canManageResources(role: PracticumRole | null): boolean {
  return role === 'OWNER'
}

/**
 * 检查角色是否可以管理成员。
 * 覆盖：操作按钮权限。
 */
export function canManageMembers(role: PracticumRole | null): boolean {
  return role === 'OWNER'
}

/**
 * 检查角色是否可以访问审核功能。
 * 覆盖：操作按钮权限。
 */
export function canReview(role: PracticumRole | null): boolean {
  return role === 'OWNER' || role === 'TEACHER' || role === 'MENTOR'
}

/**
 * 检查角色是否可以访问数据中心。
 * 覆盖：导航显示权限。
 */
export function canAccessDataCenter(role: PracticumRole | null): boolean {
  return role === 'OWNER'
}

export function canManageRoomSettings(role: PracticumRole | null): boolean {
  return role === 'OWNER'
}

export function canAccessLearning(role: PracticumRole | null): boolean {
  return role === 'STUDENT'
}

export function canViewProgress(role: PracticumRole | null): boolean {
  return role === 'OWNER' || role === 'TEACHER' || role === 'MENTOR' || role === 'STUDENT'
}

/** 教师可以查看自己负责班级的课堂工作台，具体范围由服务端校验。 */
export function canViewClassroom(role: PracticumRole | null): boolean {
  return role === 'OWNER' || role === 'TEACHER' || role === 'MENTOR'
}

/** 班级作业发布必须进一步校验教师是否被分配到该班级。 */
export function canManageClassAssignment(role: PracticumRole | null): boolean {
  return role === 'OWNER' || role === 'TEACHER'
}

/** 审核入口允许教师进入，提交范围和写操作由服务端按班级校验。 */
export function canReviewScopedSubmission(role: PracticumRole | null): boolean {
  return role === 'OWNER' || role === 'TEACHER' || role === 'MENTOR'
}

/**
 * 检查角色是否可以提交实践活动。
 * 覆盖：状态变更权限。
 */
export function canSubmitWork(role: PracticumRole | null): boolean {
  return role === 'STUDENT'
}

// ── 导航项定义 ────────────────────────────────────────────

export interface NavItemDef {
  key: string
  label: string
  icon: string
  to: string
  roles: PracticumRole[]
  /** 路由匹配函数，用于判断当前路由是否属于此导航项 */
  activeMatch: (path: string) => boolean
}

export const NAV_ITEMS: NavItemDef[] = [
  {
    key: 'workspace',
    label: '总览',
    icon: 'dashboard',
    to: '/practicum',
    roles: ['OWNER', 'TEACHER', 'MENTOR', 'STUDENT'],
    activeMatch: (path) => path === '/practicum',
  },
  {
    key: 'plans',
    label: '课程大厅',
    icon: 'book',
    to: '/practicum/courses',
    roles: ['OWNER'],
    activeMatch: (path) =>
      path.startsWith('/practicum/courses') ||
      path.startsWith('/practicum/plans') ||
      path.startsWith('/practicum/resources') ||
      path.startsWith('/practicum/learn') ||
      path.startsWith('/practicum/activities'),
  },
  {
    key: 'plans',
    label: '课程',
    icon: 'book',
    to: '/practicum/courses',
    roles: ['STUDENT'],
    activeMatch: (path) =>
      path.startsWith('/practicum/courses') ||
      path.startsWith('/practicum/learn') ||
      path.startsWith('/practicum/activities') ||
      path.startsWith('/practicum/cases'),
  },
  {
    key: 'cases',
    label: '案例',
    icon: 'layers',
    to: '/practicum/cases',
    roles: ['OWNER', 'TEACHER', 'MENTOR'],
    activeMatch: (path) => path.startsWith('/practicum/cases'),
  },
  {
    key: 'classes',
    label: '我的班级',
    icon: 'users',
    to: '/practicum/classes',
    roles: ['TEACHER'],
    activeMatch: (path) => path.startsWith('/practicum/classes'),
  },
  {
    key: 'reviews',
    label: '教学管理',
    icon: 'clipboard-check',
    to: '/practicum/reviews',
    roles: ['OWNER', 'TEACHER'],
    activeMatch: (path) =>
      path.startsWith('/practicum/reviews') ||
      path.startsWith('/practicum/submissions') ||
      path.startsWith('/practicum/members') ||
      path.startsWith('/practicum/room-settings'),
  },
  {
    key: 'tasks',
    label: '任务',
    icon: 'check-square',
    to: '/practicum/tasks',
    roles: ['STUDENT'],
    activeMatch: (path) => path === '/practicum/tasks',
  },
  {
    key: 'shop',
    label: '店铺',
    icon: 'layers',
    to: '/practicum/shop/products',
    roles: ['STUDENT'],
    activeMatch: (path) => path.startsWith('/practicum/shop'),
  },
  {
    key: 'data-center',
    label: '数据',
    icon: 'chart',
    to: '/practicum/data-center',
    roles: ['OWNER'],
    activeMatch: (path) => path === '/practicum/data-center',
  },
  {
    key: 'progress',
    label: '成长数据',
    icon: 'trending-up',
    to: '/practicum/progress',
    roles: ['OWNER', 'TEACHER', 'STUDENT'],
    activeMatch: (path) => path === '/practicum/progress',
  },
]

/**
 * 根据角色获取可见导航项。
 * 无角色时返回最小导航集（仅总览和案例，均为禁用状态引导）。
 */
export function visibleNavItems(role: PracticumRole | null): NavItemDef[] {
  if (!role) {
    // 无身份时仅显示总览入口，其他标记为不可用
    return NAV_ITEMS.filter((item) => item.key === 'workspace')
  }
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}
