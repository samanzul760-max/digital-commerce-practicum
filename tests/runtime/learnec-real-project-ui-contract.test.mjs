import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('LearnEC 原稿样式完整进入真实 Nuxt 项目', () => {
  const css = read('assets/css/learnec-spec.css')

  assert.ok(css.length > 20_000, 'learnec-spec.css 仍是删减版')
  for (const selector of ['.hero-scene', '.course-banner:after', '.dash-main', '.learn{', '.admin-side', '.review-grid']) {
    assert.ok(css.includes(selector), `缺少原稿选择器 ${selector}`)
  }
})

test('共享外壳使用 LearnEC 顶栏和按角色显示的真实导航', () => {
  const shell = read('components/practicum/PracticumShell.vue')
  const topbar = read('components/practicum/PracticumTopbar.vue')
  const sidebar = read('components/practicum/PracticumSidebar.vue')

  assert.ok(shell.includes('learnec-role-shell'))
  assert.ok(topbar.includes('LearnEC'))
  assert.ok(topbar.includes('课程大厅'))
  assert.ok(topbar.includes('学员中心'))
  assert.ok(sidebar.includes('admin-side'))
  assert.doesNotMatch(`${shell}\n${topbar}\n${sidebar}`, /[绠鍛瀛绔鐠閹]/)
})

test('管理员外壳复用完整 LearnEC Header 与五项 Sidebar', () => {
  const topbar = read('components/practicum/PracticumTopbar.vue')
  const sidebar = read('components/practicum/PracticumSidebar.vue')

  for (const label of ['首页', '课程大厅', '学员中心', '实操学习', '管理控制台']) {
    assert.ok(topbar.includes(label), `Header 缺少主导航：${label}`)
  }
  assert.ok(topbar.includes('data-role-segment'), 'Header 缺少服务端授权身份分段控件')
  assert.ok(topbar.includes('auth.switchRole'), '身份分段控件没有调用真实会话切换接口')

  for (const label of ['概览', '课程 / 计划', '成员与培训室', '作业批改', '成绩与分析']) {
    assert.ok(sidebar.includes(label), `管理员 Sidebar 缺少入口：${label}`)
  }
  assert.ok(!sidebar.includes('sidebar-foot'), 'Sidebar 仍保留底部孤立卡片')
  assert.ok(!sidebar.includes('教学管理'), 'Sidebar 仍保留孤立“教学管理”文案')
})

test('管理员首页加载态使用数据看板骨架而不是居中同步文字', () => {
  const home = read('pages/practicum/index.vue')

  assert.ok(home.includes('data-dashboard-skeleton'), '管理员首页缺少数据看板骨架屏')
  assert.ok(!home.includes('正在同步工作台'), '管理员首页仍显示居中同步文字')
})

test('学生、管理员和教师首页采用 LearnEC 结构并保留真实入口', () => {
  const home = read('pages/practicum/index.vue')

  for (const marker of ['data-student-home', 'learnec-hero', 'hero-scene', 'data-home-resume', 'data-home-learning-paths']) {
    assert.ok(home.includes(marker), `学生首页缺少 ${marker}`)
  }
  for (const route of ['/practicum/courses', '/practicum/progress', '/practicum/tasks', '/practicum/reviews', '/practicum/members', '/practicum/room-settings']) {
    assert.ok(home.includes(route), `首页缺少真实入口 ${route}`)
  }
  assert.ok(home.includes('data-owner-home'))
  assert.ok(home.includes('data-teacher-home'))
  assert.ok(home.includes('usePracticumServer'))
  assert.ok(home.includes('useAuthSession'))
  assert.ok(!home.includes('data-admin-metric'), '旧管理员四统计卡片仍在使用')
  assert.ok(!home.includes('legacy-home-hero'), '旧学生首页视觉壳仍在使用')
})

test('学生进度路由使用 LearnEC 学员中心并接入真实业务数据', () => {
  const progressPage = read('pages/practicum/progress.vue')
  const studentCenter = read('components/practicum/LearnecStudentCenter.vue')

  assert.ok(progressPage.includes("store.state.activeRole === 'STUDENT'"))
  assert.ok(progressPage.includes('<LearnecStudentCenter'))

  for (const label of ['概况', '我的课程', '模拟店铺', '作业', '作品集', '成就']) {
    assert.ok(studentCenter.includes(label), `学员中心缺少入口：${label}`)
  }
  for (const route of [
    '/practicum/progress',
    '/practicum/courses',
    '/practicum/shop/products',
    '/practicum/tasks',
    '/practicum/achievements',
  ]) {
    assert.ok(studentCenter.includes(route), `学员中心缺少真实路由：${route}`)
  }

  assert.ok(studentCenter.includes('server.getProgress'))
  assert.ok(studentCenter.includes('server.listStudentTasks'))
  assert.ok(studentCenter.includes('server.listPlans'))
  assert.ok(studentCenter.includes('server.listNotifications'))
  assert.ok(studentCenter.includes('auth.load'))
  assert.ok(studentCenter.includes('data-center-welcome'))
  assert.ok(studentCenter.includes('data-center-stat-row'))
  assert.ok(studentCenter.includes('data-center-progress'))
  assert.ok(!studentCenter.includes('useLearnecCenterDemo'), '真实学员中心仍依赖演示数据')
})
