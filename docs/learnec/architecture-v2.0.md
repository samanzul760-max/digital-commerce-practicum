# LearnEC 全局细节处理与架构升级方案说明书 v2.0

> 文档状态：审查稿，禁止在最终批准前编写项目代码
> 版本：v2.0
> 日期：2026-08-10
> 项目根目录：`C:\Users\29053\Desktop\智能体\数字商贸实训工作台`
> 运行基线：Nuxt 3 + Vue 3 + TypeScript + Prisma/PostgreSQL，开发端口 `4310`

> 补充修订：本版已纳入 2026-08-10 用户补充的两角色账号、工单资源库、多子沙盘、证据批阅、成绩导出和分类实训室要求。补充内容与原 v2.0 冲突时，以本修订后的两角色和 A-E 阶段约束为准。

## 0. 本版结论与边界

### 0.1 产品定位

LearnEC 的第一目标是“高校/职业院校电商教学实训闭环”，不是商业 SaaS，也不是学生自由开店工具。

唯一主线是：

```text
ADMIN 准备教学内容
  -> ADMIN 创建综合实训工单
  -> 选择班级并发布作业
  -> 学生在作业中心查看任务
  -> 学生打开左图右练沙盘，按指导书完成步骤
  -> 系统保存媒体学习进度、答题结果、沙盘操作证据
  -> 学生提交 Submission
  -> ADMIN 在批阅中心查看证据、评分、评语或退回
  -> 学生查看反馈并改交
  -> ADMIN 在数据中心查看完成率、平均分、步骤得分和学情趋势
```

### 0.2 明确废弃的旧方向

- 学生自由经营店铺、自由发布商品、以 GMV/曝光/转化率为核心指标。
- “AI 商业诊断”“词频分析”“一键商业优化建议”。
- 用 `localStorage` 或页面 Mock 伪造任务完成、作业分数、教师批阅结果。
- 把“模拟店铺”当作一个独立商业入口，而不是教师任务中的受控操作模块。

### 0.3 两角色与账号初始化边界 `[VIDEO][DESIGN]`

- 系统只保留 `ADMIN` 和 `STUDENT` 两个核心使用视角。
- `ADMIN` 合并管理员、教师、教务人员的后台能力，拥有组课、发布、批阅、账号生成、数据导出和实训室配置权限。
- `STUDENT` 只能访问本人作业、本人沙盘、本人提交和本人学习数据。
- `OWNER`、`TEACHER`、`MENTOR` 仅作为旧数据迁移兼容值，进入新会话后统一映射为 `ADMIN`，不再出现在新菜单和新 API 的角色枚举中。
- Prisma Seed 只生成两个验收账号：`admin`（`ADMIN`）和 `student1`（`STUDENT`）。密码从本地未提交环境变量读取，不写入源码、迁移、日志或前端。
- `/admin/accounts` 作为管理员后台的学生账号生成/管理入口，通过工作中心快捷卡进入，不新增第六个一级菜单。

### 0.4 本轮补充的四个核心子系统 `[VIDEO][DESIGN]`

1. **工单组课与实训资源库**：从“软件中心”“技能训练营”“企业任务库”选择活动，组合为一个有序工单，支持必做、截止时间、倒计时、自动/人工评分权重、预置模板和一键复制组课。
2. **电商多模块子业务沙盘**：`SandboxType` 至少包含店铺基础、商品管理、店铺装修、营销和经营分析；每个沙盘对象必须绑定 `studentTaskId`，禁止跨学生任务读取或写入。
3. **批阅中心与证据回溯**：采用左侧提交队列、中间作品/沙盘快照/事件时间线、右侧自动分和人工评分的分屏审查布局。
4. **公共实训中心与分类实训室**：支持教学、比赛、考证三类实训室入口；复杂比赛引擎暂以 `Placeholder UI` 呈现，但菜单、卡片、时间和团队/个人配置入口必须真实存在。

### 0.5 本版采用的事实级别

| 标记 | 含义 | 本文处理方式 |
|---|---|---|
| `[VIDEO]` | 来自用户描述的视频观察点 | 视为硬约束，直接进入路由、菜单和验收标准 |
| `[FACT]` | 当前代码或 Prisma 已存在的事实 | 优先复用，不无理由重构 |
| `[DESIGN]` | 本方案的架构建议 | 获批后再写设计 spec 和 implementation plan |
| `[VERIFY]` | 需要重新对视频或产品方确认的细节 | 不在未确认前固化成像素级实现 |

用户已提供本机视频：`D:\xwechat_files\wxid_70jibk24gun422_5b46\msg\video\2026-08\010a6402cd919472d2cf99db04c33cc5.mp4`。视频约 7 分 04 秒、30fps、1080p；已用于核对工单组课、学生活动卡片、分步指导、虚拟电商后台、数据中心和公共实训中心的功能事实。具体像素尺寸、图标形状、动画速度和文案断行仍属于 `[VERIFY]`，不在未确认前固化。

## 1. 全局信息架构与 UI 壳层

### 1.1 统一壳层原则

`[DESIGN]` 新壳层采用“角色路由前缀 + 共享视觉壳层 + 角色专属侧边栏”的结构：

- 学生根入口：`/center`
- 教师根入口：`/admin`
- 兼容旧入口：`/practicum/**` 保留过渡期重定向，不再作为新功能主路由。
- 顶栏固定包含：LearnEC 品牌、当前培训室/班级上下文、通知、帮助、头像菜单、角色切换。
- 侧边栏只展示当前角色可访问的菜单；隐藏菜单不等于安全边界，所有服务端 API 仍需再次校验。
- `作业中心` 和 `批阅中心`使用高对比的“核心业务”标记；占位模块必须显示“规划中/后端待接入”，不得伪造有数据的成功态。

### 1.2 学生端侧边栏菜单树 `[VIDEO]`

```text
学生端 /center
├── 首页                         /center
│   ├── 今日待办摘要
│   ├── 最近发布作业
│   ├── 进行中的实训
│   └── 最近成绩与教师反馈
├── 作业中心（核心业务）         /center/assignments
│   ├── 全部作业                  /center/assignments
│   ├── 待开始                    /center/assignments?status=AVAILABLE
│   ├── 进行中                    /center/assignments?status=IN_PROGRESS
│   ├── 待批阅                    /center/assignments?status=SUBMITTED
│   ├── 需修改                    /center/assignments?status=RETURNED
│   └── 已完成                    /center/assignments?status=GRADED
├── 实训中心                     /center/practicum
│   ├── 店铺基础沙盘              /center/practicum/store-basics
│   ├── 商品管理沙盘              /center/practicum/product-management
│   ├── 店铺装修沙盘              /center/practicum/store-decoration
│   ├── 营销沙盘                  /center/practicum/marketing
│   ├── 经营分析沙盘              /center/practicum/business-analytics
│   ├── 客服沟通训练（占位）      /center/practicum/customer-service
│   └── 跨境平台操作（占位）      /center/practicum/cross-border
└── 数据中心                     /center/data
    ├── 我的学习进度              /center/data/progress
    ├── 作业成绩                  /center/data/scores
    ├── 能力维度                  /center/data/skills（后续）
    └── 学习轨迹                  /center/data/activity-log（后续）
```

**学生端入口约束：**

1. `作业中心`是首页主 CTA，待批阅/需修改数量使用 badge，数量来源于 `StudentTask.status`。
2. `实训中心`是业务模块目录，不代表学生可以无任务地进入任意沙盘；店铺基础、商品管理、店铺装修、营销、经营分析的实际操作必须从一个已发布的 `StudentTask` 进入，并在任务内按 `sandboxType` 切换。
3. `数据中心`只显示个人学习数据，不能看到其他同学的明细；班级排行是否开放需由培训室设置控制。
4. 占位模块可以进入说明页，但不能创建虚假商品、虚假成绩或虚假提交。

### 1.3 教师端侧边栏菜单树 `[VIDEO]`

```text
教师端 /admin
├── 工作中心                     /admin
│   ├── 今日教学概览
│   ├── 待批阅数量
│   ├── 近期班级活动
│   ├── 快捷动作：新建任务/发布作业/进入批阅
│   ├── 公共实训中心入口          /admin/training-centers
│   └── 学生账号管理入口          /admin/accounts
├── 实训任务管理                 /admin/tasks
│   ├── 任务列表                  /admin/tasks
│   ├── 新建综合任务              /admin/tasks/new
│   ├── 编辑任务                  /admin/tasks/:taskId/edit
│   ├── 任务预览                  /admin/tasks/:taskId/preview
│   ├── 发布记录                  /admin/tasks/:taskId/publications
│   └── 任务模板（占位）          /admin/tasks/templates
├── 批阅中心（核心业务）         /admin/reviews
│   ├── 待批阅                    /admin/reviews?status=SUBMITTED
│   ├── 已批阅                    /admin/reviews?status=GRADED
│   ├── 已退回                    /admin/reviews?status=RETURNED
│   ├── 未提交                    /admin/reviews?status=MISSING
│   └── 提交详情                  /admin/reviews/submissions/:submissionId
├── 赛考管理（占位）             /admin/competitions
│   ├── 比赛/考试列表（占位）     /admin/competitions
│   ├── 赛题与试卷（占位）        /admin/competitions/question-banks
│   ├── 报名与分组（占位）        /admin/competitions/groups
│   └── 成绩发布（占位）          /admin/competitions/results
└── 数据中心                     /admin/data
    ├── 班级完成率                /admin/data/completion
    ├── 任务平均分                /admin/data/task-scores
    ├── 步骤得分                  /admin/data/step-scores
    ├── 学生详情                  /admin/data/students/:studentId
    └── 导出教学成绩              /admin/data/exports
```

**教师端入口约束：**

1. `批阅中心`为教师侧边栏第二个核心权重，仅次于工作中心，不藏在个人菜单或课程详情里。
2. `数据中心`严禁展示 GMV、曝光量、商业转化率等经营指标；默认只展示作业完成率、待批阅量、平均分、退回率和步骤得分。
3. `ADMIN` 查询必须绑定其授权培训室/组织范围；班级查询继续通过 `ClassEnrollment` 约束，不能通过修改 URL 读取未授权班级。

### 1.4 前后端路由与守卫矩阵

| 前端路由 | 页面责任 | 允许角色 | 主要服务端接口 | 直链越权结果 |
|---|---|---|---|---|
| `/center` | 学生首页与待办摘要 | `STUDENT` | `GET /api/center/overview` | 403 或重定向 `/admin` |
| `/center/assignments` | 学生作业中心 | `STUDENT` | `GET /api/center/assignments` | 403 |
| `/center/assignments/:studentTaskId` | 作业详情/指导书 | `STUDENT` | `GET /api/center/student-tasks/:id` | 不属于本人时 404/403 |
| `/center/tasks/:studentTaskId/sandbox` | 左图右练沙盘 | `STUDENT` | start/save/event/submit API | 不属于本人时 404/403 |
| `/center/data` | 学生个人数据 | `STUDENT` | `GET /api/center/analytics` | 403 |
| `/admin` | 管理员/教师工作中心 | `ADMIN` | `GET /api/admin/overview` | 403 或重定向 `/center` |
| `/admin/accounts` | 学生账号生成与管理 | `ADMIN` | `/api/admin/accounts*` | 403 |
| `/admin/training-centers` | 公共实训中心与分类实训室入口 | `ADMIN` | `/api/admin/training-centers*` | 403 |
| `/admin/tasks` | 工单管理 | `ADMIN` | `/api/admin/tasks*` | 403 |
| `/admin/reviews` | 批阅队列 | `ADMIN` | `/api/admin/reviews*` | 403 |
| `/admin/competitions` | 赛考占位/配置入口 | `ADMIN` | `/api/admin/competitions*` | 403 |
| `/admin/data` | 班级学情 | `ADMIN` | `/api/admin/analytics/classes/:classId` | 403 |

**守卫实现顺序 `[DESIGN]`：**

1. Nuxt route middleware 读取会话摘要，负责快速重定向和 loading 态。
2. Nitro server middleware 解析 HttpOnly session，确认 `activeRole`、`roomId`、`organizationId`。
3. 每个 handler 使用 `requireRole()` 和 `requireClassScope()`，再拼 Prisma where 条件。
4. 头像菜单切换角色调用 `POST /api/auth/switch-role`，只允许用户拥有的 `UserRoleGrant`，不能传任意 `role` 强行升级。

### 1.5 占位子系统的 Placeholder UI 设计

后端暂时无法支撑的赛考、题库、客服、跨境等模块仍需呈现为完整平台的一部分，但必须诚实表达能力状态。

**占位页统一组件：** `components/platform/CapabilityPlaceholder.vue`

```text
页面标题：赛考管理
状态标签：规划中 / 需要管理员开通 / 后端服务建设中
已规划能力：比赛创建、赛题配置、分组、成绩发布
当前可用动作：查看能力说明、返回工作中心、提交开通申请（若有真实接口）
禁止动作：伪造创建成功、伪造参赛名单、伪造成绩
```

占位页必须包含 loading、empty、forbidden 和 `COMING_SOON` 状态；页面卡片可以展示模块结构，但所有按钮只能导航到说明页、打开需求说明或显示“尚未开放”，不得写入业务表。这样既能保持完整系统的导航认知，又不会制造错误业务事实。

## 2. “左图右练”沙盘组件级设计

### 2.1 典型页面布局

```text
┌────────────────────────────────────────────────────────────────────┐
│ 顶栏：任务名称 / 班级 / 返回作业中心 / 保存状态 / 提交按钮          │
├───────────────────────┬────────────────────────────────────────────┤
│ 左：任务指导书         │ 右：虚拟操作后台                           │
│                       │                                            │
│ [任务目标]             │ [模块标题：商品发布]                        │
│ [知识准备]             │ [受控表单：标题/分类/价格/库存/详情]          │
│ [步骤 1] ✓             │ [字段帮助与错误提示]                         │
│ [步骤 2] 进行中        │ [保存本步] [下一步]                          │
│ [步骤 3] 未开始        │                                            │
│                       │ [本步评分点：20 分]                         │
│ [评分点与扣分说明]     │                                            │
│ [截止时间/倒计时]      │                                            │
│ [提交前检查清单]       │                                            │
└───────────────────────┴────────────────────────────────────────────┘
```

**桌面端比例建议 `[VERIFY]`：** 左栏 32%（最小 320px），右栏 68%（最小 560px），内容最大宽度 1440px；视频参考如显示更窄左栏，待重新提供视频后调整。移动端采用“指导书抽屉 + 操作区全宽”，不把两个复杂表单硬挤在一屏。

### 2.2 组件边界

页面入口：`pages/center/tasks/[studentTaskId]/sandbox.vue`

| 组件 | 职责 | 输入 | 输出/事件 |
|---|---|---|---|
| `SandboxPage.vue` | 页面编排、加载任务、权限和提交事务 | `studentTaskId` | 页面状态、路由跳转 |
| `TaskGuidePanel.vue` | 任务目标、指导书、步骤、评分点、倒计时 | `TaskGuideModel`、`SandboxSessionState` | `select-step`、`open-resource` |
| `StepChecklist.vue` | 显示步骤状态和当前步骤 | `steps`、`currentStepId` | `select-step` |
| `RubricPanel.vue` | 显示教师发布的评分项和分值 | `rubricItems` | 只读 |
| `TaskCountdown.vue` | 根据 `dueAt` 和服务器时间显示倒计时 | `startedAt`、`dueAt`、`serverNow` | `expired` |
| `SandboxWorkbench.vue` | 受控虚拟后台容器 | `sandboxSpec`、`draft` | `field-change`、`step-complete`、`save-draft` |
| `SandboxFormRenderer.vue` | 根据字段 schema 渲染输入控件 | `fields`、`draft` | `update:modelValue`、`validation-error` |
| `EvidenceTimeline.vue` | 展示已记录的关键操作 | `TaskEvent[]` | 只读 |
| `SubmitTaskBar.vue` | 提交前检查、确认弹窗、防重复提交 | `canSubmit`、`isSubmitting` | `submit-request` |
| `SubmissionResultBanner.vue` | 显示待批阅/退回/已批阅状态 | `StudentTaskStatus`、`Grade` | 导航到反馈 |

### 2.3 组件通信协议

推荐使用页面级 composable，而不是组件互相调用：

`composables/useSandboxSession.ts` 负责：

```text
loadTask(studentTaskId)
startTask()
updateDraft(sectionId, patch)
recordEvent(eventType, payload)
saveDraft()
validateSubmission()
submit()
reloadAfterServerConflict()
```

通信链路：

```text
TaskGuidePanel  ──读取──> useSandboxSession.state.taskGuide
SandboxWorkbench ──写入──> updateDraft / recordEvent
StepChecklist   ──写入──> currentStepId
SubmitTaskBar   ──请求──> validateSubmission -> submit()
页面父组件       ──订阅──> state.status / state.error / state.submission
```

### 2.4 右侧提交动作如何与左侧要求挂钩

1. 教师发布任务时，左侧指导书和右侧沙盘字段来自同一个 `TaskSection`/`SandboxSpec` 版本。
2. `TaskGuidePanel` 不自行判断“完成”；它只展示服务器返回的步骤与 rubric。
3. `SandboxWorkbench` 每个字段绑定 `FieldDefinition`，字段有 `required`、`min/max`、`evidenceKey` 和 `stepId`。
4. 点击提交时，父页面调用 `validateSubmission()`：
   - 检查所有必做步骤是否完成；
   - 检查必填字段、数值范围、媒体观看阈值和题目是否作答；
   - 检查截止时间与是否允许迟交；
   - 把未完成项映射回左侧步骤和评分点，禁止只弹一个笼统“提交失败”。
5. 检查通过后弹出确认摘要，显示“已完成 X/Y 步、待提交证据数量、迟交提示（如有）”。
6. 确认提交调用 `POST /api/center/student-tasks/:id/submissions`，服务端事务写入 `Submission`、`SubmissionVersion` 和 `TaskEvent.SUBMITTED`，再把 `StudentTask.status` 改为 `SUBMITTED`。
7. 服务端返回的状态覆盖本地状态；刷新或换设备后仍以 Prisma 为准。

### 2.5 倒计时、保存和异常

- 倒计时显示使用服务端 `serverNow` 校准，不能只信客户端系统时间。
- “保存本步”写 `TaskEvent.DRAFT_SAVED` 和可恢复草稿快照；它不改变 `StudentTask` 为已提交。
- 浏览器断网时保留未提交草稿并显示“未同步”，恢复网络后可重试；不把断网状态显示成提交成功。
- 重复点击提交使用 `Idempotency-Key`；同一任务同一版本只产生一个提交结果。
- 任务被教师关闭、学生失去班级资格或版本冲突时显示明确的 forbidden/conflict 状态，并提供重新加载按钮。

## 3. 底层数据结构：媒体、理论题、沙盘的包容性设计

### 3.1 当前数据库可复用事实 `[FACT]`

当前 Prisma 已有：

- `PlanAssignment`：计划下的发布任务、状态、开放时间、截止时间。
- `StudentTask`：每个学生的任务实例和状态。
- `Submission`、`SubmissionVersion`：提交与版本历史。
- `Grade`、`GradeItem`、`GradeRevision`：评分、量规项和评分修订。
- `TaskEvent`、`ActivityLog`：操作事件和学习轨迹。

当前 Prisma 没有真实 `User` model，认证仍由 `server/utils/auth-store.ts` 维护；v2.0 将其替换为数据库用户和会话，并保留旧字段兼容迁移窗口。

### 3.2 设计决策：一个任务根，多个内容区块

不为 A/B/C 三种任务各建一套平行任务系统。`PlanAssignment` 继续作为教师发布任务根（后续代码层可重命名为 `TeachingTask`，数据库表名可延期迁移），通过有序内容区块容纳不同类型：

```text
TeachingTask / PlanAssignment
  └── TaskSection(type=WORK_ORDER)
       ├── 子活动：ResourceCatalogItem（软件中心/技能训练营/企业任务库）
       ├── TaskSection(type=MEDIA) -> MediaResource / MediaProgress
       ├── TaskSection(type=QUIZ) -> TaskQuestion(type=SINGLE/MULTIPLE/TRUE_FALSE/FILL/SHORT)
       └── TaskSection(type=SANDBOX) -> SandboxSpec / SandboxStep / SandboxField / SandboxRubric
```

这样一个综合任务可以是“先看视频 -> 完成 5 道理论题 -> 进入商品发布沙盘”，也可以只包含一种类型。

### 3.3 核心枚举与模型设计（设计稿，不是可直接执行的 migration）

```prisma
enum UserRole {
  ADMIN
  STUDENT
}

enum ResourceSource {
  SOFTWARE_CENTER
  SKILL_CAMP
  ENTERPRISE_TASK_LIBRARY
}

enum SandboxType {
  STORE_BASICS
  PRODUCT_MANAGEMENT
  STORE_DECORATION
  MARKETING
  BUSINESS_ANALYTICS
}

enum TrainingRoomType {
  TEACHING
  COMPETITION
  CERTIFICATION
}

enum CompetitionFormat {
  INDIVIDUAL
  TEAM
}

enum TaskSectionType {
  WORK_ORDER
  MEDIA
  QUIZ
  SANDBOX
}

enum MediaKind {
  PPT
  VIDEO
  PDF
  IMAGE
  LINK
}

enum QuestionType {
  SINGLE
  MULTIPLE
  TRUE_FALSE
  FILL_BLANK
  SHORT_ANSWER
}

enum SubmissionPartStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  NEEDS_REVIEW
  GRADED
}
```

`User`、`UserRoleGrant`、`AuthSession` 的 RBAC 设计沿用 v1 讨论，但本版增加了班级范围和会话 activeRole 的严格约束：

```prisma
model User {
  id               String           @id @default(cuid())
  identifier       String           @unique
  studentNumber    String?          @unique
  displayName      String
  passwordHash     String
  passwordSalt     String
  role             UserRole         @default(STUDENT)
  isActive         Boolean          @default(true)
  grants           UserRoleGrant[]
  sessions         AuthSession[]
  classEnrollments ClassEnrollment[]
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}

model UserRoleGrant {
  id     String   @id @default(cuid())
  userId String
  role   UserRole
  roomId String?
  user   User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  room   TrainingRoom? @relation(fields: [roomId], references: [id], onDelete: Cascade)
  @@unique([userId, role, roomId])
}

model AuthSession {
  id             String    @id @default(cuid())
  userId         String
  tokenHash      String    @unique
  csrfHash       String
  activeRole     UserRole
  organizationId String?
  roomId         String?
  expiresAt      DateTime
  revokedAt      DateTime?
  lastSeenAt     DateTime  @default(now())
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, expiresAt])
  @@index([roomId, activeRole])
}
```

任务内容区块：

```prisma
model TaskSection {
  id          String           @id @default(cuid())
  assignmentId String
  type        TaskSectionType
  parentId    String?
  resourceId  String?
  title       String
  description String           @default("")
  sort        Int
  required    Boolean          @default(true)
  weightPercent Decimal        @default(0) @db.Decimal(5, 2)
  config      Json             @default("{}")
  assignment  PlanAssignment   @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  parent      TaskSection?     @relation("TaskSectionTree", fields: [parentId], references: [id], onDelete: Cascade)
  children    TaskSection[]    @relation("TaskSectionTree")
  mediaItems  MediaResource[]
  questions   TaskQuestion[]
  sandboxSpec SandboxSpec?
  resource    ResourceCatalogItem? @relation(fields: [resourceId], references: [id], onDelete: SetNull)
  @@unique([assignmentId, sort])
  @@index([assignmentId, type])
  @@index([parentId])
}

model ResourceCatalogItem {
  id             String         @id @default(cuid())
  source         ResourceSource
  title          String
  summary        String         @default("")
  capabilityTags Json           @default("[]")
  version        Int            @default(1)
  enabled        Boolean        @default(true)
  configuration  Json           @default("{}")
  taskSections   TaskSection[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  @@index([source, enabled])
}

model MediaResource {
  id          String       @id @default(cuid())
  sectionId   String
  kind        MediaKind
  title       String
  url         String?
  storageKey  String?
  mimeType    String?
  durationSec Int?
  sort        Int
  metadata    Json         @default("{}")
  section     TaskSection  @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  @@index([sectionId, sort])
}
```

**A 类：媒体学习类存储规则：**

- PPT：保存 `storageKey`、`mimeType`、文件大小、页数等 metadata；不把二进制塞进 JSON。
- 视频：优先保存受控 `storageKey` 或白名单嵌入 URL、时长、观看阈值；禁止把外部 token 写入数据库。
- 教师上传动作走资源 API 和服务端校验；学生接口只返回有权限的签名访问地址或公开嵌入地址。
- 学生观看进度写 `MediaProgress` 或 `TaskEvent.MEDIA_PROGRESS`，完成条件由教师配置（例如观看 80%）。

理论题模型：

```prisma
model TaskQuestion {
  id          String        @id @default(cuid())
  sectionId   String
  type        QuestionType
  prompt      String
  options     Json          @default("[]")
  answerKey   Json          @default("{}")
  explanation String        @default("")
  points      Decimal       @db.Decimal(6, 2)
  sort        Int
  required    Boolean       @default(true)
  section     TaskSection   @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  @@unique([sectionId, sort])
  @@index([sectionId, type])
}
```

**B 类：理论考核类存储规则：**

- 单选、多选、判断：`options` 保存选项文本/稳定 key，`answerKey` 仅服务端读取。
- 填空：`answerKey` 可保存多个标准答案和大小写/空格规则；对学生响应只保存 `answer`，不返回答案键。
- 简答：`answerKey` 保存评分参考和关键词提示，默认进入教师批阅；不能未经确认宣称自动评分。
- 题目分值总和必须与任务量规一致；发布后生成不可变版本，修改需产生任务版本或修订记录。

沙盘模型：

```prisma
model SandboxSpec {
  id          String        @id @default(cuid())
  sectionId   String        @unique
  sandboxType SandboxType
  appKey      String
  version     Int           @default(1)
  config      Json          @default("{}")
  steps       SandboxStep[]
  rubricItems SandboxRubricItem[]
  section     TaskSection   @relation(fields: [sectionId], references: [id], onDelete: Cascade)
}

model SandboxStep {
  id          String      @id @default(cuid())
  sandboxId   String
  title       String
  instruction String
  sort        Int
  required    Boolean     @default(true)
  fields      Json        @default("[]")
  evidenceKey String?
  sandbox     SandboxSpec @relation(fields: [sandboxId], references: [id], onDelete: Cascade)
  @@unique([sandboxId, sort])
}

model SandboxRubricItem {
  id          String      @id @default(cuid())
  sandboxId   String
  title       String
  description String
  points      Decimal     @db.Decimal(6, 2)
  stepId      String?
  sort        Int
  sandbox     SandboxSpec @relation(fields: [sandboxId], references: [id], onDelete: Cascade)
  @@unique([sandboxId, sort])
}
```

**C 类：实操沙盘类存储规则：**

- `SandboxStep.fields` 是受控字段 schema，不允许学生提交任意字段；服务端再次按 schema 校验。
- `SandboxRubricItem` 将步骤和分值绑定，左侧评分点与教师批阅量规来自同一版本。
- 右侧操作快照写入 `SubmissionVersion.artifact Json`，关键动作写 `TaskEvent`；不直接改写教师发布的 SandboxSpec。
- 现有 `Product`/`ProductSKU` 可作为沙盘内部对象，但必须带 `studentTaskId` 或 `sandboxSessionId` 作用域，禁止进入真实店铺数据域。

### 3.4 多类型提交模型

现有 `SubmissionVersion.text/links` 不足以表达媒体进度、题目答案和沙盘快照。建议扩展：

```prisma
model SubmissionVersion {
  id              String       @id @default(cuid())
  submissionId    String
  version         Int
  text            String       @default("")
  links           Json         @default("[]")
  artifact        Json         @default("{}")
  operationSummary Json        @default("{}")
  submittedAt     DateTime     @default(now())
  submission      Submission   @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  parts           SubmissionPart[]
  @@unique([submissionId, version])
}

model SubmissionPart {
  id             String               @id @default(cuid())
  versionId      String
  sectionId      String
  status         SubmissionPartStatus @default(NOT_STARTED)
  answer         Json                 @default("{}")
  evidence       Json                 @default("{}")
  autoScore      Decimal?             @db.Decimal(6, 2)
  teacherScore   Decimal?             @db.Decimal(6, 2)
  teacherComment String               @default("")
  version        SubmissionVersion    @relation(fields: [versionId], references: [id], onDelete: Cascade)
  @@unique([versionId, sectionId])
  @@index([sectionId, status])
}
```

**评分分工：**

- A 类媒体：完成度由观看/阅读事件计算，教师可以复核，不直接等同于学习质量分。
- B 类客观题：服务端可自动计算 `autoScore`；简答题默认 `NEEDS_REVIEW`。
- C 类沙盘：规则断言可计算自动分，无法机械判断的量规进入人工评分；自动/人工评分按发布版本冻结的权重合成。
- 根级 `Grade` 保存最终分数和评语，`GradeItem` 对应 `SandboxRubricItem` 或 `TaskQuestion`，支持历史修订。

### 3.5 任务发布版本和答案安全

1. 教师编辑草稿时可以修改 section、题目、媒体和沙盘 schema。
2. 一旦发布，生成 `assignmentVersion` 快照；学生任务指向发布版本。
3. 已有学生开始后，教师修改草稿不影响正在进行的版本。
4. 学生 API 永远不返回 `TaskQuestion.answerKey`，答案只在提交评分服务端读取。
5. 导出成绩只导出教学必要字段，去除密码、token、原始签名 URL 和不必要个人信息。

### 3.6 工单资源库、多子沙盘与评分权重补充设计 `[VIDEO][DESIGN]`

**工单资源与模板：**

```prisma
model WorkOrderTemplate {
  id                String        @id @default(cuid())
  organizationId    String
  title             String
  description       String        @default("")
  defaultAutoWeight Decimal       @default(70) @db.Decimal(5, 2)
  defaultManualWeight Decimal     @default(30) @db.Decimal(5, 2)
  sectionsSnapshot  Json
  createdById       String
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  @@index([organizationId, title])
}

// PlanAssignment 增加：
// templateId、autoScoreWeight、manualScoreWeight、timeLimitMinutes、assignmentVersion
// 发布校验：autoScoreWeight + manualScoreWeight = 100；所有 section.weightPercent 合计 = 100。
```

- `WORK_ORDER` 类型的 `TaskSection` 是工单分组节点；其子 section 可以引用 `ResourceCatalogItem`，也可以是媒体、题目或沙盘。
- `ResourceCatalogItem.source` 固定为 `SOFTWARE_CENTER`、`SKILL_CAMP`、`ENTERPRISE_TASK_LIBRARY` 之一；选择资源时复制配置到未发布草稿，发布时冻结为版本快照。
- `WorkOrderTemplate` 存预置工单和复制来源；“一键复制组课”创建新的草稿，不共享可变 section 或答案键。

**学生任务隔离与沙盘快照：**

```prisma
model SandboxSession {
  id            String      @id @default(cuid())
  studentTaskId String      @unique
  sandboxType   SandboxType
  state         Json        @default("{}")
  startedAt     DateTime?
  updatedAt     DateTime    @updatedAt
  snapshots     SandboxSnapshot[]
  @@index([studentTaskId, sandboxType])
}

model SandboxSnapshot {
  id             String         @id @default(cuid())
  sandboxSessionId String
  studentTaskId  String
  stepId         String?
  artifact       Json           @default("{}")
  createdAt      DateTime       @default(now())
  @@index([studentTaskId, createdAt])
}
```

- 所有店铺基础、商品、装修、营销、经营分析实体必须拥有 `studentTaskId` 或 `sandboxSessionId` 外键；禁止复用真实 `Store` 业务域记录。
- `STORE_BASICS` 覆盖店铺设置、提现账号和运费模板；`PRODUCT_MANAGEMENT` 覆盖商品、预警、分类和评价；`STORE_DECORATION` 保存移动端/PC 端、海报、秒杀区、商品组及位置/样式快照；`MARKETING` 覆盖优惠券、秒杀、拼团、砍价；`BUSINESS_ANALYTICS` 只保存教学模拟指标和商品排行。
- `SandboxSnapshot`、`TaskEvent`、`SubmissionPart.evidence` 是批阅中心的证据来源。草稿可恢复，最终提交必须在同一数据库事务中写入 `Submission`、`SubmissionVersion`、`SubmissionPart`、快照引用和事件。

**自动分与人工分：**

- `PlanAssignment.autoScoreWeight`、`PlanAssignment.manualScoreWeight` 默认为 `70:30`，但可在发布前调整，二者必须合计 100。
- 客观题和沙盘规则断言生成 `autoScore`；填空、简答和需要教师判断的沙盘量规生成待审项目。
- `Grade` 扩展保存 `autoScore`、`manualScore`、`totalScore`、`feedback`；`GradeItem` 标记评分来源为自动或人工。最终分计算公式必须随发布版本冻结。

**分类实训室与赛考配置：**

- `TrainingRoom` 增加 `type: TrainingRoomType`；公共实训中心按教学、比赛、考证分类展示卡片和入口。
- 现有 `Competition` 扩展 `format: CompetitionFormat`、`preparationStartsAt`、`startsAt`、`endsAt`、`capabilityStatus` 等字段。
- 未开发的比赛引擎、报名分组、成绩发布只呈现能力说明和 `COMING_SOON` 状态，不创建虚假参赛名单或成绩。

## 4. 页面组件与服务端模块清单

### 4.1 共享壳层

| 文件/目录 | 责任 |
|---|---|
| `components/platform/PlatformShell.vue` | 外壳、响应式布局、全局状态区域 |
| `components/platform/PlatformSidebar.vue` | 接收角色导航树，渲染分组、badge、占位入口 |
| `components/platform/PlatformTopbar.vue` | 上下文、通知、帮助、头像和角色切换 |
| `components/platform/RoleSwitcher.vue` | 调用真实会话切换接口，显示可用角色和切换结果 |
| `components/platform/CapabilityPlaceholder.vue` | 统一占位页，不伪造业务成功 |
| `composables/usePlatformNavigation.ts` | 根据 `activeRole` 和 capability flags 计算菜单 |
| `middleware/role-guard.global.ts` | 前端快速守卫；不替代服务端鉴权 |
| `pages/login.vue` | `ADMIN`/`STUDENT` 真实登录、错误态和 session 过期态 |
| `pages/admin/accounts.vue` | 学生账号生成、启停、重置临时密码和状态列表 |
| `pages/admin/training-centers.vue` | 公共实训中心分类卡片和创建实训室入口 |

### 4.2 教师任务和批阅

| 文件/目录 | 责任 |
|---|---|
| `pages/admin/index.vue` | `ADMIN` 工作中心，含账号管理和公共实训中心快捷入口 |
| `pages/admin/tasks/index.vue` | 任务列表、状态筛选、搜索 |
| `pages/admin/tasks/new.vue` | 创建综合任务、拖拽/排序 section |
| `pages/admin/tasks/[taskId]/edit.vue` | 编辑草稿、工单活动组合、步骤、题目、媒体、沙盘和量规 |
| `pages/admin/tasks/[taskId]/preview.vue` | 模拟学生视角预览，但不创建 StudentTask |
| `pages/admin/assignments/index.vue` | 选择班级、发布任务、查看发布记录 |
| `pages/admin/reviews/index.vue` | 未交/待批阅/已批阅/退回筛选队列 |
| `pages/admin/reviews/submissions/[submissionId].vue` | 左队列/中证据/右评分分屏审查 |
| `pages/admin/data/index.vue` | 完成率、平均分、步骤得分、排行榜和 Excel 导出 |
| `components/admin/ResourcePicker.vue` | 软件中心、技能训练营、企业任务库活动选择器 |
| `components/admin/WorkOrderTemplatePicker.vue` | 预置模板和一键复制组课 |
| `components/admin/TaskSectionEditor.vue` | 工单层级、A/B/C section、顺序、必做和权重编辑器 |
| `components/admin/QuestionEditor.vue` | 五类题型编辑器 |
| `components/admin/MediaResourceEditor.vue` | PPT/视频/链接资源编辑 |
| `components/admin/SandboxSpecEditor.vue` | `sandboxType`、步骤、字段 schema、断言规则和评分点 |
| `components/admin/ReviewEvidencePanel.vue` | 沙盘快照、操作时间线、媒体/答题结果 |
| `components/admin/GradeForm.vue` | 自动分、人工分、0-100 分、量规项、评语、退回 |
| `components/admin/ClassLearningAnalytics.vue` | 教学统计图表与文字摘要 |

### 4.3 学生任务和沙盘

| 文件/目录 | 责任 |
|---|---|
| `pages/center/index.vue` | 学生首页，作业中心为主 CTA |
| `pages/center/assignments/index.vue` | 真实 StudentTask 列表 |
| `pages/center/assignments/[studentTaskId].vue` | 作业指导书和提交概览 |
| `pages/center/tasks/[studentTaskId]/sandbox.vue` | 左图右练沙盘 |
| `pages/center/submissions/[submissionId].vue` | 学生成绩和反馈 |
| `pages/center/data/index.vue` | 个人完成率、成绩和学习轨迹 |
| `components/center/AssignmentCard.vue` | 任务状态、截止时间、进入按钮 |
| `components/center/TaskGuidePanel.vue` | 指导书、步骤、评分点、倒计时 |
| `components/center/SandboxWorkbench.vue` | 按 `sandboxType` 切换的受控操作后台 |
| `components/center/SandboxFormRenderer.vue` | schema 驱动表单 |
| `components/center/StoreBasicsSandbox.vue` | 店铺设置、提现账号、运费模板 |
| `components/center/ProductManagementSandbox.vue` | 商品、预警、分类和评价管理 |
| `components/center/StoreDecorationSandbox.vue` | 移动端/PC 端装修、组件拖拽和快照 |
| `components/center/MarketingSandbox.vue` | 优惠券、秒杀、拼团、砍价配置 |
| `components/center/BusinessAnalyticsSandbox.vue` | 教学模拟成交/访客曲线和商品排行 |
| `components/center/QuizRenderer.vue` | 单选/多选/判断/填空/简答 |
| `components/center/MediaViewer.vue` | PPT/视频/链接和进度记录 |
| `components/center/SubmitTaskBar.vue` | 依赖检查、确认、幂等提交 |

## 5. API 设计清单

### 5.1 认证与角色

| 方法 | 路径 | 角色 | 说明 |
|---|---|---|---|
| `POST` | `/api/auth/login` | 公开 | Prisma User 校验密码，创建 HttpOnly AuthSession |
| `GET` | `/api/auth/session` | 已登录 | 返回当前用户、activeRole、room/class 上下文 |
| `POST` | `/api/auth/switch-role` | 已登录 | 校验 UserRoleGrant 后更新 activeRole |
| `POST` | `/api/auth/logout` | 已登录 | 删除/撤销 session，清理 CSRF 关联 |
| `GET/POST` | `/api/admin/accounts` | `ADMIN` | 查询学生账号；生成学生账号和初始临时密码 |
| `PATCH` | `/api/admin/accounts/:id/status` | `ADMIN` | 启用或停用学生账号 |
| `POST` | `/api/admin/accounts/:id/reset-password` | `ADMIN` | 重置学生临时密码并写入审计事件 |

### 5.2 教师任务与内容

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET/POST` | `/api/admin/tasks` | 任务列表、创建草稿 |
| `GET/PATCH` | `/api/admin/tasks/:id` | 读取/更新草稿；服务端限制 `ADMIN` 的培训室/班级范围 |
| `GET` | `/api/admin/resources` | 按软件中心、技能训练营、企业任务库查询资源 |
| `POST` | `/api/admin/tasks/:id/copy-from-template` | 从预置工单模板复制为新草稿 |
| `POST` | `/api/admin/tasks/:id/sections` | 添加媒体、题目或沙盘 section |
| `PATCH/DELETE` | `/api/admin/task-sections/:id` | 编辑/删除未发布区块 |
| `POST` | `/api/admin/tasks/:id/publish` | 校验权重、生成发布版本并为选定班级创建 StudentTask |
| `GET` | `/api/admin/tasks/:id/publications` | 发布班级、发布时间、截止时间和人数 |
| `POST` | `/api/admin/media/upload` | 上传 PPT/视频等资源，服务端检查 MIME/大小 |
| `POST` | `/api/admin/media/link` | 添加白名单嵌入链接，禁止任意 token URL |

### 5.3 学生学习、答题和沙盘

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/center/assignments` | 当前学生的任务列表与状态过滤 |
| `GET` | `/api/center/student-tasks/:id` | 返回指导书、内容区块、沙盘 schema，不返回答案键 |
| `POST` | `/api/center/student-tasks/:id/start` | 记录开始时间、校准倒计时、写 STARTED 事件 |
| `POST` | `/api/center/student-tasks/:id/events` | 记录媒体进度、字段保存、步骤完成等事件 |
| `POST` | `/api/center/student-tasks/:id/draft` | 保存可恢复草稿，不改变提交状态 |
| `POST` | `/api/center/student-tasks/:id/sandbox-snapshots` | 保存受控沙盘快照，强制校验 studentTask scope |
| `POST` | `/api/center/student-tasks/:id/submissions` | 事务写 Submission/Version/Parts/TaskEvent，状态变为 SUBMITTED |
| `GET` | `/api/center/submissions/:id` | 仅本人读取版本、评分、评语和退回原因 |

### 5.4 教师批阅与学情

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/admin/reviews` | 按班级、任务、状态、学生筛选提交队列 |
| `GET` | `/api/admin/reviews/submissions/:id` | 返回任务版本、学生证据时间线、沙盘快照、答题和历史评分 |
| `POST` | `/api/admin/reviews/submissions/:id/grade` | 校验自动/人工权重和 0-100，写 Grade/GradeItem/GradeRevision，状态 GRADED |
| `POST` | `/api/admin/reviews/submissions/:id/return` | 写退回评语，状态 RETURNED |
| `GET` | `/api/admin/analytics/classes/:classId` | 完成率、平均分、步骤得分、状态分布 |
| `GET` | `/api/admin/analytics/classes/:classId/export` | 生成 `.xlsx` 成绩单，含学号、姓名、工单、自动分、人工分、总分和提交时间，并写 AuditEvent |

所有写 API 使用 CSRF、`Idempotency-Key` 和服务端角色/班级范围检查；前端 route guard 不能作为唯一授权手段。

## 6. A-E 阶段性施工路线图

### 阶段 A：认证、两角色、账号生成与全局壳层

**目标：** 先把“谁能进入哪里”做成真实基础设施。

**产出页面：**

- `/login`：真实 User 登录和错误态。
- `/center`：学生壳层首页骨架、四项学生导航。
- `/admin`：`ADMIN` 工作中心骨架、五项管理端导航。
- `/admin/accounts`：学生账号生成、状态管理和重置临时密码入口。
- `/center/*`、`/admin/*` 的 forbidden/loading/redirect 页面。

**产出服务：**

- Prisma `User`、`UserRoleGrant`、`AuthSession` migration。
- `auth-store.ts` 的数据库实现替换和 OWNER/TEACHER/MENTOR 到 `ADMIN` 的兼容映射。
- Prisma Seed：`admin`（`ADMIN`）和 `student1`（`STUDENT`），以及最小组织/培训室/班级上下文。
- `/api/auth/login`、`session`、`switch-role`、`logout`。
- `/api/admin/accounts` 的学生账号生成、启停和重置密码 API。
- 前后端双层 route guard 和角色菜单配置。

**闭环验收：**

- 学生无法打开 `/admin/tasks`、`/admin/accounts`；`ADMIN` 无法通过学生 API 读取非其授权范围的数据。
- 授权用户从头像菜单切换视角后，URL、导航、页面内容同时切换。
- 过期 session、错误密码、无培训室上下文都有明确状态。

### 阶段 B：工单组课、模板、内容区块和作业发布

**目标：** `ADMIN` 能从资源库组合媒体、理论题和沙盘活动为综合工单，并发布给班级。

**产出页面：**

- `/admin/tasks` 列表、筛选、草稿/已发布/已关闭状态。
- `/admin/tasks/new` 综合任务编辑器。
- `/admin/tasks/:id/edit` 区块编排、媒体上传、题目编辑、沙盘步骤和量规。
- `/admin/tasks/:id/preview` 学生视角预览。
- `/admin/assignments` 选择班级、设置时间、发布确认和发布记录。
- `/admin/tasks/templates` 预置工单模板和一键复制组课。
- `/admin/training-centers` 教学/比赛/考证实训室分类卡片和创建入口。

**产出服务：**

- `ResourceCatalogItem`、`WorkOrderTemplate`、扩展 `TaskSection`、`MediaResource`、`TaskQuestion`、`SandboxSpec` 等 schema migration。
- 从软件中心、技能训练营、企业任务库选取活动；配置顺序、必做、时间、倒计时、section 权重和自动/人工评分权重。
- 草稿保存、模板复制、发布版本、媒体资源上传和答案键服务端隔离。
- 发布事务创建 `StudentTask`，确保班级人数和任务实例一致。

**闭环验收：**

- `ADMIN` 创建包含多个活动、题型和沙盘的综合工单并预览；未发布任务学生不可见。
- 发布后每个目标学生都有一条 `StudentTask`，重复发布不会重复插入。
- 学生接口不返回客观题答案键和教师量规隐藏字段。
- 发布时拒绝自动/人工权重或 section 权重合计不为 100 的工单。

### 阶段 C：学生作业中心、左图右练与多子沙盘

**目标：** 学生从真实作业进入受控沙盘，完成操作并提交真实 Submission。

**产出页面：**

- `/center` 首页待办摘要和最近反馈。
- `/center/assignments` 真实任务状态列表和筛选。
- `/center/assignments/:id` 指导书、媒体、题目、沙盘要求概览。
- `/center/tasks/:id/sandbox` 左图右练、步骤检查、倒计时、保存、提交和 `sandboxType` 切换。
- `/center/submissions/:id` 提交版本、状态和教师反馈。

**产出服务：**

- start、draft、event、submit API。
- `SandboxSession`、`SandboxSnapshot`、`SubmissionVersion.artifact`、`SubmissionPart` 和 `TaskEvent` 写入。
- 店铺基础、商品管理、店铺装修、营销、经营分析五类受控子沙盘；所有读写强制绑定 `studentTaskId`。
- 断网草稿、冲突、截止、重复提交和任务关闭处理。

**闭环验收：**

- 学生必须完成左侧要求后才能提交；缺项能定位到具体步骤/评分点。
- 提交后刷新/换设备仍显示“待批阅”，不能回退成 Mock 待办。
- 沙盘最终数据只属于该学生任务实例，不能污染其他学生或真实店铺域。
- 装修组件的位置/样式、营销配置和模拟经营数据可在证据快照中回放。

### 阶段 D：批阅中心、分屏证据回溯、综合评分和学情

**目标：** `ADMIN` 能看到学生实际做过什么，按量规评分或退回。

**产出页面：**

- `/admin/reviews` 未交、待批阅、已批阅、已退回队列。
- `/admin/reviews/submissions/:id` 左侧提交队列、中间证据时间线/媒体进度/答题/沙盘快照、右侧自动分/人工评分/评语/退回的分屏审查。
- `/admin/data` 班级完成率环形图、任务平均分柱状图、步骤得分表、作业排行榜和 `.xlsx` 成绩导出。
- `/center/data` 学生个人完成率、成绩和反馈历史。

**产出服务：**

- review queue、submission detail、grade、return API。
- 客观题和沙盘断言自动分；简答和需教师判断的沙盘量规进入人工评分；按冻结的自动/人工权重计算总分。
- `GradeRevision` 审计修订；评分写入通知和学生反馈。

**闭环验收：**

- 教师输入非数字、负数、101 分均被拒绝；0-100 分可保存，自动分与人工分按权重可追溯。
- 评分后学生立刻看到成绩和评语；退回后可重新编辑并生成新版本。
- 完成率分母、平均分排除未评分任务，图表旁有文字摘要可访问。

### 阶段 E：公共实训/赛考占位、兼容迁移和全量质量门禁

**目标：** 让平台看起来完整，但对未实现的庞大子系统保持诚实、可替换、可验收。

**产出页面：**

- 学生：实训中心所有占位模块统一说明页。
- 管理端：公共实训中心、赛考管理、题库、成绩发布占位页和分类实训室能力说明。
- 管理员：组织/培训室配置、能力开关和审计页（仅在已有真实权限范围内开放）。
- `/practicum/**` 到 `/admin/**`/`/center/**` 的兼容重定向和旧链接提示。

**产出服务：**

- capability registry（例如 `COMPETITION_MANAGEMENT: COMING_SOON`），不伪造业务数据。
- 完整 Playwright 路径、移动端无溢出、可访问性、审计和导出回归。
- Prisma migration 复核、隔离数据库种子和上线前数据备份/回滚说明。

**闭环验收：**

- 未实现模块能导航、能说明、能返回，但不会误报创建/发布/成绩成功。
- `/admin`/`/center` 全部关键入口有真实 loading、empty、error、forbidden、success 状态。
- 现有 practicum 回归测试和新教学闭环测试共同通过后，才允许进入部署评审。

## 7. 全局非功能约束

### 7.1 数据和安全

- 任务、学生任务、提交和评分全部以 Prisma 为事实来源；浏览器缓存只能保存未提交草稿。
- 所有查询必须绑定 organization/room/class scope；`ADMIN` 不能通过修改 URL 读取未授权班级，`STUDENT` 不能读取他人任务或沙盘。
- 所有沙盘表、沙盘快照、规则断言结果和模拟经营指标必须带 `studentTaskId` 或 `sandboxSessionId` 作用域；不得写入真实店铺或其他学生的沙盘域。
- Seed 账号密码只允许从未提交环境变量读取；管理员生成的学生临时密码不得明文落库、写日志或写入审计 metadata。
- 文件上传白名单 MIME、大小、扩展名和病毒扫描策略；媒体 URL 不含 token、Cookie 或密码。
- 评分、退回、发布、角色切换、账号生成/停用/重置和占位能力开关写入 `AuditEvent`。
- 提交和发布使用幂等键；数据库事务内同时更新主记录、版本、事件和状态。

### 7.2 UI 和响应式

- 继续使用现有 LearnEC/Open Design token，但新教学页面的视觉优先级服从“扫描任务、执行步骤、查看证据”。
- 左侧指导书和右侧操作后台均有稳定宽度约束；桌面 1440px、平板 1024px、手机 390px 都不横向溢出。
- 核心按钮使用明确动词：`开始任务`、`保存本步`、`提交作业`、`批阅`、`退回修改`。
- 图表必须有文字摘要或表格数据，不只依赖颜色和图形。
- 占位卡片不使用夸大的商业指标，不使用“增长”“GMV”“转化率”等会误导教学目标的文案。
- 前端风格保护：除非用户明确指定页面和调整目标，不修改已有页面的视觉风格、布局、导航结构、全局 CSS 或既有组件外观。阶段实施只可新增或调整本方案对应阶段明确列出的页面；不得以“统一风格”或“顺手优化”为由改造旧页面。
- 前端恢复与后端解耦：需要恢复既有前端风格时，必须作为独立且经用户批准的 UI 任务执行；认证、Prisma 数据、API 与阶段业务闭环保持不变。

### 7.3 AI 实施约束（给后续 AI/开发者）

1. 先读本方案、现有 schema、auth、permissions、assignment、submission 和测试，再改代码。
2. 先写失败测试，再写最小实现；每个阶段完成后运行 typecheck/build/相关 Playwright。
3. 不将旧商业 Demo 组件直接搬入新学生作业中心；必须通过 `StudentTask` 上下文进入沙盘。
4. 不把 Placeholder 当作已实现功能；使用 capability 状态和真实空态。
5. 不删除用户已有未提交修改；改动前记录 `git status --short` 和相关文件基线。
6. 不新增重复的“自由开店任务表”；优先扩展 `PlanAssignment`/`StudentTask`/`Submission` 体系。
7. 任务发布版本一旦被学生开始使用，不允许无审计地改写学生正在完成的 schema 和答案键。
8. 严格按 A-E 单阶段推进。未获得用户明确批准，不得编写、启用或以 Placeholder 伪装下一阶段的业务功能。
9. 每个阶段的验收门禁必须全部完成：运行相关 E2E/Playwright、`npm.cmd run typecheck`、`npm.cmd run build`，启动 `4310` 端口服务并确认对应入口可访问；将命令、结果和未验证风险写入验收报告。
10. 阶段验收完成后必须提交本地 Git。提交前仅暂存本阶段已核验的文件，执行 `git diff --cached --check`，提交信息固定以阶段标识开头，例如 `phase-A: auth roles and application shells`。提交后记录提交哈希与阶段名称；遇到无关未提交改动时，不得重置、覆盖或混入提交，应只选择本阶段文件暂存并如实报告。

### 7.4 项目内 AI Skill 接入

- 项目内的 `skills/learnec-phase-delivery/SKILL.md` 是本方案的执行入口。后续 AI 处理 LearnEC、高校电商教学实训平台、阶段 A-E、工单教学闭环或本项目代码时，先完整读取该 Skill，再完整读取 `docs/learnec/architecture-v2.0.md`。
- `docs/learnec/architecture-v2.0.md` 是项目内可携带的 v2.0 副本；其与桌面原始说明书同步更新。两者出现差异时，暂停实施并请用户指定哪一份为准。

## 8. 审查与批准闸门

请在进入代码实施前确认以下内容：

1. 是否同意新系统仅保留 `ADMIN` 和 `STUDENT` 两个角色，并以 `admin`、`student1` 作为环境变量密码驱动的 Seed 验收账号？
2. 是否同意学生侧边栏固定为“首页、作业中心、实训中心、数据中心”，并将作业中心作为核心业务入口？
3. 是否同意管理端侧边栏固定为“工作中心、实训任务管理、批阅中心、赛考管理、数据中心”，并将学生账号管理、公共实训中心放在工作中心快捷入口？
4. 是否同意以 `PlanAssignment` 作为工单根，通过带父子关系和权重的 `TaskSection` 容纳资源活动、媒体、理论题和多子沙盘，而不是建立平行任务表？
5. 是否同意所有沙盘记录强制绑定 `studentTaskId`/`sandboxSessionId`，最终提交写入真实 Prisma `Submission`/`SubmissionVersion`，浏览器只允许保存未提交草稿？
6. 是否同意发布时冻结自动/人工评分权重，批阅中心采用左队列、中证据、右评分的分屏布局，并在阶段 D 导出 `.xlsx` 成绩单？
7. 是否同意公共实训中心按教学、比赛、考证分类，复杂赛考能力先使用诚实的 Placeholder UI？
8. 是否同意按 A-E 顺序分阶段施工，每阶段经过页面/API/E2E 审查后再进入下一阶段？

**只有在你明确批准 v2.0 后，才进入下一步：**先写正式设计 spec，再写 implementation plan，最后才开始修改代码。当前文档本身不代表任何代码已经实施。
