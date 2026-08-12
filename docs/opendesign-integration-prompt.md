# Open Design 对接提示词

> 复制以下内容给 Open Design，让它把设计稿对接到项目功能。

---

## 任务

把设计稿 `learnec-scheme-a-workbench.html` 变成 Nuxt 页面，接入项目的全部后端 API 和状态管理，实现功能闭环。**CSS 和 HTML 结构不能变**，只加 Vue 响应式数据绑定和交互逻辑。

## 设计稿位置

```
C:\Users\29053\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\296216df-c73f-4f9c-b875-168518e36e0d\learnec-scheme-a-workbench.html
```

## 项目位置

```
C:\Users\29053\Desktop\智能体\数字商贸实训工作台
```

## 输出位置

在项目中创建 `pages/practicum/learnec-workbench.client.vue`（纯客户端渲染页面）。

## 技术栈

- Nuxt 3.21.8 + Vue 3.5.39 + TypeScript 5.9.3
- 服务端 API 基于 Nitro，共 96 个 REST 端点
- 认证用 HttpOnly session cookie (`practicum_session`)
- 参考实现：已有一个完整的 `learnec-workbench.client.vue`，可以阅读它来理解模式

## 项目架构速览

```
composables/
├── useAuthSession.ts    ← 登录/登出/角色切换。关键方法：load(), login(), switchRole(), logout()
├── usePracticumServer.ts ← 所有 API 调用。关键方法见下文
├── usePracticumStore.ts  ← 前端状态管理（localStorage 兜底）
└── useWorkspaceContext.ts← 当前组织/培训室上下文

server/api/practicum/    ← 96 个 API 端点（REST）
domain/practicum/types.ts← 所有 TypeScript 类型定义
```

## 角色体系

| 角色 | 标识 | 权限 |
|---|---|---|
| OWNER | 管理员 | 全部：课程、成员、批阅、分析 |
| TEACHER | 教师 | 班级教学、审核 |
| STUDENT | 学生 | 学习已发布课程、提交作业 |

预置账号：`owner@example.test` / `OwnerPass123!`
（OWNER 可切换到 STUDENT 视角）

## 设计稿的页面结构

设计稿是一个单页应用，用 `v-show` 切换面板：

**学员端（4 页）：**
1. 首页 — Hero、继续学习卡片、热门课程、学习路径
2. 课程大厅 — 筛选器 + 搜索 + 课程卡片网格
3. 学员中心 — 侧边栏导航 + 概况/任务/模拟店铺/成就 四个面板
4. 实操学习 — 课程/案例 Tab 切换 + 大纲 + 视频 + 任务提交

**管理端（5 页）：**
1. 管理控制台 — KPI 卡片 + 课程运营 + 优先队列
2. 课程/计划 — 计划表格 + 模板/竞赛 Tab
3. 班级与学员 — 学员表格 + 搜索
4. 作业批改 — 审核队列列表 + 评分面板
5. 成绩与分析 — 分数 KPI + 柱状图 + 排行榜

**顶栏组件：**
- 学员/管理 Tab 切换
- 角色切换按钮
- 通知铃铛 + 下拉列表
- 头像 + 个人菜单下拉（角色切换、成员管理、培训室设置、退出）
- CTA 按钮

## 核心 API 清单

### 学员端需要调用的 API

```
# 课程
GET  /api/practicum/plans?status=PUBLISHED        → 课程列表
GET  /api/practicum/plans/:id                      → 课程详情+大纲

# 学习进度
GET  /api/practicum/progress?roomId=&role=STUDENT  → 学习进度
GET  /api/practicum/student/tasks                  → 学生任务列表

# 提交
POST /api/practicum/submissions                    → 提交作业
POST /api/practicum/student-tasks/:id/submissions  → 提交任务

# 店铺
GET  /api/practicum/shop/products                  → 商品列表
GET  /api/practicum/shop/freight-templates         → 运费模板

# 通知
GET  /api/practicum/notifications                  → 通知列表
POST /api/practicum/notifications/:id/read         → 标记已读
```

### 管理端需要调用的 API

```
# 审核
GET  /api/practicum/submissions?status=SUBMITTED   → 审核队列
POST /api/practicum/submissions/:id/grade          → 评分
POST /api/practicum/submissions/:id/return         → 退回修改

# 成员
GET  /api/practicum/members?roomId=                → 成员列表

# 分析
GET  /api/practicum/analytics/overview?roomId=     → 概览数据
GET  /api/practicum/analytics/members?roomId=      → 学员排名

# 模板/竞赛
GET  /api/practicum/templates                      → 模板列表
GET  /api/practicum/competitions                   → 竞赛列表
```

### 认证 API

```
GET  /api/auth/session                             → 获取当前会话
POST /api/auth/login      {identifier, password}   → 登录
POST /api/auth/logout                              → 登出
POST /api/auth/switch-role {role}                  → 切换角色
```

## 数据加载模式

所有 API 调用通过 `usePracticumServer` composable，在 `onMounted` 中并行加载：

```ts
const server = usePracticumServer()
const auth = useAuthSession()
const store = usePracticumStore()

onMounted(async () => {
  // 1. 先检查登录
  const user = await auth.load()
  if (!user) { await router.replace('/practicum/login'); return }
  store.switchRole(user.role)

  // 2. 并行加载所有数据
  await Promise.all([
    server.listPlans({ status: 'PUBLISHED' }),
    server.getProgress(roomId, 'STUDENT'),
    server.listStudentTasks(),
    server.listNotifications(),
    server.listProducts(),
    server.listTemplates(),
    server.listCompetitions(),
  ])
})
```

## 角色判断

```ts
const activeRole = computed(() => auth.state.value.user?.role)
const isAdmin = computed(() => ['OWNER','TEACHER','MENTOR'].includes(activeRole.value))
const isOwner = computed(() => activeRole.value === 'OWNER')
```

- `isAdmin = true` → 显示管理端 shell
- `isAdmin = false` → 显示学员端 shell
- 角色切换时重新调用 `loadAllData()`

## 关键约束

1. **CSS 完全不动** — 设计稿的所有 CSS 变量、类名、布局保持不变
2. **HTML 结构不动** — 只加 `v-if`/`v-show`/`v-for`/`@click`/`:class` 等 Vue 指令
3. **加载态** — 首次加载显示 "正在加载工作台数据…"
4. **空态** — API 返回空数组时显示 "暂无数据"
5. **错误态** — API 失败时静默降级，不崩溃页面
6. **导航用 `router.push()`** — 不要用 `window.location.href`，避免整页刷新
7. **`learnec-workbench.client.vue`** — 文件名后缀 `.client.vue` 确保纯客户端渲染

## 种子数据（不需要 API 的静态数据）

以下是前端 seed 数据，可以直接 import 使用：

```ts
// 教学案例（6 个）
import { commerceCases } from '~/data/practicum/commerce-case-seed'

// 成就系统
import { achievementBadges, skillMatrix, achievementTimeline } from '~/data/practicum/achievement-catalog'

// 教程库
import { tutorialDocuments } from '~/data/practicum/tutorial-catalog'
```

## 参考实现

项目中已经有一个带完整注释的工作台实现，所有模式都可以参考：

```
pages/practicum/learnec-workbench.client.vue  ← 当前实现（~1700 行）
composables/usePracticumServer.ts             ← 所有 API 方法
CLAUDE.md                                      ← 项目全景文档
docs/L1-feature-expansion-plan.html            ← 功能规划可视化
```

## 验证标准

对接完成后应该满足：
1. `npx nuxi typecheck` 零错误
2. `npx nuxi build` 构建成功
3. 用 `owner@example.test` / `OwnerPass123!` 登录后：
   - 学员首页显示真实课程数据
   - 学员中心能切换概况/任务/店铺/成就
   - 实操学习能切换课程/案例模式
   - 管理端审核队列有真实数据
   - 角色切换（学员↔管理）后数据刷新
   - 通知铃铛显示未读数量
4. 所有导航不整页刷新（router.push）
