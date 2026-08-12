# Digital Commerce Practicum · 数字商贸实训工作台

LearnEC 品牌的数字电商实训平台。管理员创建课程计划，学生完成软件操作/训练答题/实践提交，教师批阅评分。

## 快速定位（3秒找到一切）

```
数字商贸实训工作台/
├── CLAUDE.md              ← 你在这（唯一入口文档）
├── pages/                  ← 34 个页面（Vue SFC）
│   ├── practicum/*.vue     ← 主工作台页面
│   ├── practicum/learnec-workbench.client.vue  ← 一站式工作台（设计稿驱动）
│   └── center.vue          ← 学员中心入口
├── components/practicum/   ← 7 个共享组件（Shell/Sidebar/Topbar/Icon/CourseCard/StatePanel/LearnecStudentCenter）
├── composables/            ← 6 个 composable（见下方速查表）
├── server/
│   ├── api/practicum/      ← 96 个 API 接口（REST，基于 Nitro）
│   ├── db/client.ts        ← Prisma 客户端（PostgreSQL）
│   ├── services/           ← 8 个业务服务
│   └── utils/              ← auth-store（JSON文件）、repository
├── domain/practicum/       ← 类型定义 + 权限守卫（纯函数，无副作用）
├── data/practicum/         ← 8 个种子数据文件
├── prisma/schema.prisma    ← 数据库模型（10 张迁移）
├── tests/e2e/practicum/    ← Playwright E2E（Edge 浏览器）
├── docs/                   ← 规划文档、PRD、BDD、parity 审计
├── public/assets/          ← 静态图片（hero、lesson、teacher）
├── scripts/                ← 部署/环境脚本
├── docker-compose.yml      ← PostgreSQL 17（端口 55432）
├── .env                    ← DATABASE_URL（gitignored）
└── package.json            ← Nuxt 3.21.8 + Vue 3.5.39 + Prisma 6.19
```

## 一行命令启动

```bash
# 1. 启动数据库
docker compose -p practicum up -d

# 2. 迁移数据库
npx prisma migrate deploy

# 3. 启动开发服务器
npm run dev             # → http://127.0.0.1:4174
```

## 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 框架 | Nuxt (SSR + Nitro) | 3.21.8 |
| UI | Vue 3 (Composition API) | 3.5.39 |
| 语言 | TypeScript strict | 5.9.3 |
| 数据库 | PostgreSQL (Docker) | 17 |
| ORM | Prisma | 6.19 |
| 测试 | Playwright (Edge channel) | 1.61.1 |
| 认证 | HttpOnly session + scrypt 密码哈希 | 自研 |
| 存储 | localStorage + `.data/` JSON 文件 | 原型阶段 |

## 角色体系（3 角色）

| 角色 | 标识 | 权限 |
|---|---|---|
| 管理员 | OWNER | 全部：创建课程、管理成员、批阅、数据分析 |
| 教师 | TEACHER | 班级教学、作业审核、教学案例 |
| 学生 | STUDENT | 学习已发布课程、提交作业、查看进度 |

预置账号：`owner@example.test` / `OwnerPass123!`（全部角色可用）

## Composable 速查表

| Composable | 用途 | 关键方法 |
|---|---|---|
| `useAuthSession` | 登录/登出/角色切换 | `load()`, `login()`, `switchRole()`, `logout()` |
| `usePracticumServer` | 所有 API 调用 | `listPlans()`, `getProgress()`, `listSubmissions()`, `gradeSubmission()`, `listStudentTasks()`, `listProducts()` 等 |
| `usePracticumStore` | 前端状态管理（localStorage 持久化） | `switchRole()`, `getPlanNodes()`, `submitPracticeWork()`, `getReviewQueue()` |
| `useWorkspaceContext` | 当前组织/培训室上下文 | `load()`, `selectRoom()` |
| `useCsrfHeaders` | CSRF token 注入 | `useCsrfHeaders()` |
| `useLearnecCenterDemo` | 学员中心演示数据 | — |

## 数据层架构

```
浏览器 localStorage          ← 仅 localStorage 原型路径
    ↓
Nitro API Server             ← /api/practicum/*（96 个端点）
    ↓
Prisma Client                ← server/db/client.ts
    ↓
PostgreSQL                   ← Docker:55432（10 张迁移表）
```

**重要：** 部分旧页面仍用 localStorage（通过 `usePracticumStore`），新页面都走 server API（通过 `usePracticumServer`）。迁移进行中。

## 设计系统（不变）

- 品牌色：`#147bd1`（LearnEC 蓝）
- Shell：`PracticumShell.vue`（Skip link + Sidebar + Topbar + main landmark）
- 身份切换：**仅** `/practicum/profile`，其他地方不允许直接角色按钮
- 不可用功能：标 `待开放`，禁用态，不写技术标签
- 设计令牌：`assets/css/main.css`
- UI 契约：`.claude/skills/building-digital-commerce-practicum/references/ui-workspace-contract.md`

## 关键约束

1. **永远不修改** `C:\Users\29053\Desktop\szmy2`（独立项目，只读参考）
2. 每个新功能 → BDD 行为 → TDD 红绿 → 聚焦 E2E → typecheck → build
3. commit 消息格式：`feat(practicum): ` / `fix(practicum): ` / `test(practicum): `
4. Playwright 用 Edge 频道，baseURL `http://127.0.0.1:4174`
5. 不引入 TEACHER/MENTOR 到 UI copy（原型阶段仅 OWNER + STUDENT 面向用户）

## 已完成的功能模块（Slice 1-7 + 机构化）

| Slice | 内容 | E2E | 状态 |
|---|---|---|---|
| 1 | 基线外壳：角色权限、计划浏览、种子数据 | 9/9 | ✅ |
| 2 | 课程编辑器：三级目录、活动类型、发布归档 | 32/32 | ✅ |
| 3 | 学员实操：软件操作、训练答题、实践提交 | 55/55 | ✅ |
| 4 | 教师批阅：审核队列、评分维度、退回、评分 | 65/65 | ✅ |
| 5 | 进度通知：进度计算、通知系统、数据中心 | 79/79 | ✅ |
| 6 | 质量发布：无障碍、响应式、存储恢复 | 90/90 | ✅ |
| 7 | 电商案例：6 个教学案例 + 模板竞赛 + 教程 | 100/100 | ✅ |
| P0 | 机构化：班级/期别/分班/作业/Prisma 持久化 | — | ✅ |

## 当前重点工作

1. **LearnEC 统一工作台** (`learnec-workbench.client.vue`) — 把设计稿变成完整功能页
2. **L1 功能增加** — 11 个已实现模块接入工作台（详见 `docs/L1-feature-expansion-plan.html`）
3. **服务端全量迁移** — 逐步把 localStorage 路径替换为 server API
