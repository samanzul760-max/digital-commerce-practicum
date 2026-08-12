# Codex 接手文档

> 把这个文件内容贴给 Codex 即可。它已经包含了项目全貌和当前进度。

---

## 我是谁，你要干嘛

我之前（Claude Code）在这个项目上完成了 7 个 Slice 的功能开发 + 一个一站式工作台的搭建。现在你来接手，继续完善。

你的任务优先级：
1. **读懂项目** — 先看 CLAUDE.md（3 分钟）
2. **启动项目** — 看下面的"启动命令"
3. **继续开发** — 看"当前进度和待办"

---

## 项目一句话

**LearnEC 数字商贸实训平台** — Nuxt 3 + Vue 3 + Prisma + PostgreSQL。管理员创建课程，学生提交作业，教师批阅评分。

---

## 启动命令（只需 3 步）

```bash
# 1. 进入项目
cd "C:\Users\29053\Desktop\智能体\数字商贸实训工作台"

# 2. 确保 PostgreSQL 在跑
docker start digital-commerce-practicum-postgres

# 3. ⚠️ 重要：清除 Shell 里的旧 DATABASE_URL，然后启动
export DATABASE_URL=""
node .output/server/index.mjs
# → http://127.0.0.1:4310/practicum/login
```

如果 `.output` 不存在，先构建：`npx nuxi build`

登录账号：`owner@example.test` / `OwnerPass123!`

---

## 必须先读的 3 个文件

| 顺序 | 文件 | 内容 |
|---|---|---|
| 1 | `CLAUDE.md` | 项目全貌：目录结构、技术栈、composable 速查、设计约束 |
| 2 | `pages/practicum/learnec-workbench.client.vue` | 核心工作台页面（~1700行，当前所有功能在此） |
| 3 | `docs/L1-feature-expansion-plan.html` | 功能规划可视化（浏览器打开） |

---

## 项目架构速查

```
composables/
├── useAuthSession.ts    → auth.load() / login() / switchRole() / logout()
├── usePracticumServer.ts → 96 个 API 方法（listPlans, listSubmissions, gradeSubmission...）
├── usePracticumStore.ts  → 前端状态 + localStorage 兜底
└── useWorkspaceContext.ts→ 当前组织/培训室

server/api/practicum/    → 96 个 REST API 端点
domain/practicum/types.ts→ 所有 TS 类型
prisma/schema.prisma     → 数据库模型
```

---

## 当前进度

### ✅ 已完成

| 模块 | 位置 |
|---|---|
| 登录/鉴权/角色切换 | `pages/practicum/login.vue` + `useAuthSession` |
| 课程列表 + 筛选搜索 | 工作台 → 课程大厅 |
| 学员首页（进度卡片、热门课程） | 工作台 → 首页 |
| 学员中心：概览/任务/模拟店铺/成就 | 工作台 → 学员中心 |
| 实操学习：课程模式 + 案例模式 | 工作台 → 实操学习 |
| 管理端：概览/计划/模板/竞赛 | 工作台 → 管理端 |
| 作业批改：审核队列 + 评分 | 工作台 → 作业批改 |
| 成绩分析：KPI + 排行榜 | 工作台 → 成绩与分析 |
| 通知铃铛 + 下拉列表 | 顶栏 |
| 数据库迁移（9 张表） | Prisma + Docker PostgreSQL |
| 页面全宽布局 | CSS `--max: none` + 缩小侧边栏 |

### ⚠️ 已知问题

1. **Shell 环境变量污染**：Git Bash 里残留了旧的 `DATABASE_URL`（端口 5432），每次启动前要 `export DATABASE_URL=""`，否则数据库连接超时
2. **构建后 `.output` 偶发丢失**：`npx nuxi build` 有时 Nitro 步骤未完成，重跑一次即可
3. **浏览器缓存**：改 CSS 后需要 `Ctrl+Shift+R` 硬刷新才能看到变化

### ⬜ 待做（按优先级）

| 优先级 | 任务 | 说明 |
|---|---|---|
| **P0** | 模拟店铺 CRUD 交互 | 当前只读展示，需要加新增/编辑/删除的表单弹窗 |
| **P0** | 任务提交对接真实 API | 当前 `submitCase()` 用 setTimeout 模拟，要改调 `server.submitPractice()` |
| **P1** | 数据中心 → 活动流 + 导出 | 当前只有排行榜，缺活动流和 CSV 导出按钮 |
| **P1** | 通知详情页 | 当前只有铃铛下拉，缺独立通知列表页 |
| **P2** | 教程库面板 | 数据已加载（seed data），缺 UI 展示 |
| **P2** | Slice 6 质量发布 | 无障碍审查、4 断点回归、存储恢复 |

---

## 关键约束（别踩坑）

1. **CSS 不能动设计稿的风格** — 所有新 UI 沿用现有的 CSS 变量和类名（`paper`, `btn`, `pill`, `track` 等）
2. **导航用 `router.push()`** — 别用 `window.location.href`，会导致整页刷新
3. **角色切换后要刷新数据** — `switchRole()` 后调 `loadAllData()`
4. **API 调用用 `usePracticumServer`** — 别直接 `$fetch`
5. **新方法要加到 composable 的 return 对象里** — 不然模板里用不了
6. **`.client.vue` 后缀** — 工作台页面必须纯客户端渲染

---

## 我建了哪些文件

| 文件 | 用途 |
|---|---|
| `CLAUDE.md` | 项目 AI 入口文档（重写的） |
| `CODEX_HANDOFF.md` | 这个文件 |
| `pages/practicum/learnec-workbench.client.vue` | 一站式工作台（~1700 行，核心产出） |
| `docs/L1-feature-expansion-plan.html` | L1 功能规划可视化 |
| `docs/opendesign-integration-prompt.md` | 给 Open Design 的对接提示词 |
| `start-server.bat` | Windows 一键启动脚本 |
| `.gitignore` | 更新了泛匹配规则 |

## 我清理了什么

- 18 个散落日志文件
- 6 个临时 `.data-e2e-*` 目录
- 3 个重复的 `.output-*` 目录
- 5 个项目快照副本（`数字商贸实训工作台-aug2-final` 等）

---

## 跟用户沟通的风格

用户是项目 owner，懂技术但不熟悉这个代码库。说话简洁直接，用表格展示结果，避免大段叙述。每次改完代码要重启服务器让用户看到效果。

---

你可以开始了。先读 `CLAUDE.md`，然后 `npx nuxi build && node .output/server/index.mjs` 把项目跑起来。
