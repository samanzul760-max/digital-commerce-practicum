# LearnEC 阶段 C 学生作业与多子沙盘设计

## 目标与边界

阶段 C 让 `STUDENT` 从真实 `StudentTask` 进入作业中心，在同一工单内完成媒体、题目和五类沙盘区块，保存受控草稿与证据，并提交真实 `Submission`。本阶段不实现 ADMIN 批阅、自动/人工总分合成、成绩导出或赛考引擎。

## 核心方案

`PlanAssignment.publishedSnapshot` 是学生执行的不可变任务定义。每条 `StudentTask` 最多拥有一条 `SandboxSession`；session 的 `state` 按 `sectionId` 保存媒体进度、题目答案、沙盘字段和已完成步骤。所有读取、保存、事件、快照和提交查询同时约束路由 `studentTaskId` 与当前会话 `studentId`。

`SandboxSession` 不直接复用旧 `Store/Product` 商业域。店铺基础、商品管理、店铺装修、营销和经营分析都作为 session JSON 中的受控教学状态，天然绑定 `studentTaskId`。每次保存沙盘步骤写入 `SandboxSnapshot` 与 `TaskEvent.DRAFT_SAVED`，最终提交把完整状态复制到不可变 `SubmissionVersion.artifact`，并为每个计分区块创建 `SubmissionPart`。

## 状态机与时间

- 列表状态固定为 `AVAILABLE`、`IN_PROGRESS`、`SUBMITTED`、`RETURNED`、`GRADED`、`CLOSED`。
- 首次 `start` 将 `AVAILABLE` 改为 `IN_PROGRESS`，创建 session 并记录服务端 `startedAt`。
- `RETURNED` 可继续保存并再次提交，但仍保持 `RETURNED`，直到新版本提交成功。
- 倒计时截止点取 `dueAt` 与 `startedAt + timeLimitMinutes` 中更早者，响应同时返回 `serverNow`，前端只做显示校准。
- 超时、任务关闭、未开放或非本人任务均由服务端拒绝，客户端不能绕过。

## 受控草稿合同

`POST /api/center/student-tasks/:id/draft` 只接受一个已发布区块：

```json
{
  "sectionId": "section-id",
  "values": {},
  "completedStepIds": [],
  "answers": {},
  "mediaProgress": {}
}
```

服务端按区块类型裁剪数据：QUIZ 只接受该 section 的 question id；MEDIA 只接受该 section 的 media id 和 `0-100` 进度；SANDBOX 只接受五类沙盘的允许字段以及教师步骤 schema 中声明的字段。单次 JSON 状态限制大小，拒绝原型污染键、未知 section、未知 question/media/step 和错误数值。

五类沙盘允许字段：

| sandboxType | 受控教学字段 |
|---|---|
| `STORE_BASICS` | 店铺名称、经营类目、提现账号、运费模板、计费方式 |
| `PRODUCT_MANAGEMENT` | 商品标题、分类、价格、库存、预警库存、评价回复 |
| `STORE_DECORATION` | 移动/PC 模式、海报/秒杀区/商品组组件、顺序和样式 |
| `MARKETING` | 优惠券/秒杀/拼团/砍价类型、活动名、优惠值、时间和商品 |
| `BUSINESS_ANALYTICS` | 服务端持久化的教学模拟趋势、商品排行和学生分析结论 |

## 提交校验与事务

提交前服务端遍历冻结 snapshot：必做媒体达到阈值，必做题目已有答案，必做沙盘步骤已完成，步骤必填字段和各沙盘关键业务字段不为空。失败返回 `422 TASK_INCOMPLETE` 和可映射到左侧指导书的 `missingItems[]`。

通过后，一个 Prisma 事务完成：创建或更新 `Submission`、追加 `SubmissionVersion`、写入各 section 的 `SubmissionPart`、保存最终 `SandboxSnapshot`、写 `TaskEvent.SUBMITTED`、把 `StudentTask.status` 改为 `SUBMITTED`、记录 `SubmissionIdempotencyKey`。相同幂等键只返回原提交，不创建第二个版本。

## 页面结构

- `/center/assignments`：真实列表、状态分段控件、空态和截止时间。
- `/center/assignments/:studentTaskId`：指导书和区块概览，进入沙盘。
- `/center/tasks/:studentTaskId/sandbox`：桌面左 32% 指导书、右 68% 工作台；移动端纵向排列。
- `TaskGuidePanel`：目标、服务端倒计时、步骤、量规、缺项定位。
- `SandboxWorkbench`：按 section 和 `sandboxType` 切换五个受控子后台，同时承载媒体确认和题目作答。
- 五个 sandbox 组件只通过 `v-model` 修改页面草稿；“保存本步”才调用服务端，页面不使用 `localStorage`。

## 错误与安全

稳定错误码包括 `STUDENT_REQUIRED`、`STUDENT_TASK_NOT_FOUND`、`TASK_NOT_AVAILABLE`、`TASK_CLOSED`、`TASK_STATE_INVALID`、`TASK_SECTION_INVALID`、`TASK_DRAFT_INVALID`、`TASK_INCOMPLETE`、`IDEMPOTENCY_KEY_REQUIRED`。不存在或不属于本人的任务统一返回 404，避免泄露其他学生任务。

## 验收

隔离 E2E 必须覆盖：状态过滤、ADMIN 越权 403、他人任务 404、开始任务、五类沙盘持久化、未完成拦截、幂等提交、刷新后仍为 `SUBMITTED`、装修顺序/样式和营销配置进入 artifact、390px 无横向溢出。随后运行 Prisma validate/generate、typecheck、build，并启动 4310 验证学生登录、作业中心和沙盘入口。
