# 班级任务闭环实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让教师和学生从前端完成建班、成员管理、任务发布、提交、退回、重提、评分和成绩查看，并把全过程统一保存到 PostgreSQL。

**Architecture:** `Class`、`ClassEnrollment`、`PlanAssignment`、`StudentTask`、`Submission` 和 `Grade` 是唯一事实来源。服务端按组织、实训室、班级和登录会话授权；前端只调用班级任务 API，不再把 JSON 仓库用于该闭环。`localStorage` 只保留未提交草稿。

**Tech Stack:** Nuxt 3、Vue 3、TypeScript、Prisma/PostgreSQL、Playwright。

## Global Constraints

- 本阶段不实现 `SUPERVISOR`、平台管理入口、监控和备份。
- 不改动或提交工作区已有的无关修改。
- `OWNER` 与已获实训室授权的 `TEACHER` 可创建班级；教师只管理自己拥有教师成员关系的班级。
- 所有写操作携带 CSRF token；提交与发布携带幂等键；越权资源返回 `404`。
- 每项行为必须先写 Playwright API/UI 测试并观察 RED，再写最小实现直到 GREEN。

---

### Task 1: 建立班级和成员的统一服务端契约

**Files:**
- Modify: `server/services/class-scope.ts`
- Modify: `server/api/practicum/classes/index.post.ts`
- Create: `server/api/practicum/classes/index.get.ts`
- Modify: `server/api/practicum/classes/[classId]/enrollments/index.post.ts`
- Create: `server/api/practicum/classes/[classId]/enrollments/index.get.ts`
- Create: `server/api/practicum/roster/students.get.ts`
- Test: `tests/e2e/practicum/classes-api.spec.ts`

**Interfaces:**
- Produces `GET /api/practicum/classes -> { items: ClassSummary[] }`。
- Produces `GET/POST /api/practicum/classes/:classId/enrollments`。
- Produces `GET /api/practicum/roster/students -> { items: StudentRosterItem[] }`，只返回脱敏展示名和可加入学生 ID。

- [ ] **Step 1: 写失败测试。** 使用真实 `teacher@example.test` 登录，创建一个教师已获授权实训室中的班级，断言返回 `201`；创建后列出班级只包含该教师班级；加入 `student@example.test` 对应 ID 后刷新列表仍存在。再以另一教师请求同一班级，断言 `404`。
- [ ] **Step 2: 运行 RED。**
  ```powershell
  npx.cmd playwright test tests/e2e/practicum/classes-api.spec.ts --reporter=list
  ```
  预期：教师建班被现有 `OWNER` 限制或班级列表/成员读取路由缺失。
- [ ] **Step 3: 最小实现。** `requireClassStaff` 改为返回班级和员工关系；新增 `canCreateClass(user, roomId)`，要求 OWNER 拥有该实训室或 TEACHER 在该实训室已有有效教学关系。班级创建时在事务中创建 `Class` 与创建者的 `ClassEnrollment(TEACHER)`；成员新增仅接受存在的 `STUDENT` 用户，重复成员返回 `409 ENROLLMENT_EXISTS`。
- [ ] **Step 4: 运行 GREEN。** 重跑该文件，验证教师创建、成员持久化、重复拒绝、跨班 `404` 全部通过。
- [ ] **Step 5: 提交。**
  ```powershell
  git add server/services/class-scope.ts server/api/practicum/classes server/api/practicum/roster tests/e2e/practicum/classes-api.spec.ts
  git commit -m "feat(classes): allow scoped teacher class management"
  ```

### Task 2: 让已发布任务只走 Prisma 班级分发链

**Files:**
- Modify: `server/api/practicum/plan-assignments/index.post.ts`
- Create: `server/api/practicum/classes/[classId]/assignments/index.get.ts`
- Create: `server/api/practicum/classes/[classId]/assignments/index.post.ts`
- Modify: `server/api/practicum/student/tasks.get.ts`
- Test: `tests/e2e/practicum/class-assignments-api.spec.ts`

**Interfaces:**
- `POST /api/practicum/classes/:classId/assignments` accepts `{ planId, title, activityIds, availableAt, dueAt, lateAllowed }` and returns `{ assignment, taskCount }`。
- `GET /api/practicum/classes/:classId/assignments` returns教师可见任务及提交统计。
- `GET /api/practicum/student/tasks` 返回学生自己的 `classId`、`assignmentId`、`activityId`、状态和截止信息。

- [ ] **Step 1: 写失败测试。** 先准备一个班级及两名学生；教师发布包含两个活动的任务后，断言四条不同的 `StudentTask` 已创建，学生 A 只读取自己的两条任务；第二次使用同一幂等键不新增任务。
- [ ] **Step 2: 运行 RED。**
  ```powershell
  npx.cmd playwright test tests/e2e/practicum/class-assignments-api.spec.ts --reporter=list
  ```
  预期：班级任务路由缺失，或旧 `/assignments` JSON 路径没有创建 `StudentTask`。
- [ ] **Step 3: 最小实现。** 抽取当前 `plan-assignments` 的 Prisma 事务为服务函数；服务函数先调用 `requireClassStaff`，再按有效学生成员生成唯一 `(planAssignmentId, studentId, activityId)` 任务。旧 JSON `/assignments` 不再被新页面调用。
- [ ] **Step 4: 运行 GREEN。** 重跑并额外运行现有 `task-dependency-api.spec.ts`，确认前置任务逻辑未回归。
- [ ] **Step 5: 提交。**
  ```powershell
  git add server/api/practicum/classes server/api/practicum/plan-assignments server/api/practicum/student tests/e2e/practicum/class-assignments-api.spec.ts
  git commit -m "feat(tasks): publish class assignments from Prisma"
  ```

### Task 3: 统一退回、重提、评分和成绩历史

**Files:**
- Create: `server/services/student-task-review.ts`
- Create: `server/api/practicum/teacher/student-tasks/[taskId]/return.post.ts`
- Modify: `server/api/practicum/teacher/student-tasks/[taskId]/grade.post.ts`
- Create: `server/api/practicum/teacher/student-tasks/[taskId].get.ts`
- Create: `server/api/practicum/teacher/reviews/index.get.ts`
- Modify: `server/api/practicum/student-tasks/[taskId]/submissions/index.post.ts`
- Test: `tests/e2e/practicum/student-task-review-api.spec.ts`

**Interfaces:**
- `POST .../return { feedback }` 将 `SUBMITTED` 任务转为 `RETURNED` 并写入 `TaskEvent`。
- `POST .../grade { score, feedback }` 将 `SUBMITTED` 任务转为 `GRADED`，写入 `Grade`、`GradeRevision` 与 `TaskEvent`。
- `GET /api/practicum/teacher/reviews?classId=` 返回本教师班级的待批任务和提交版本。

- [ ] **Step 1: 写失败测试。** 学生提交版本 1；教师退回后学生重提版本 2；教师评分 86 分；学生读取任务详情，断言能看到两版文本、退回反馈、最终分数和评分时间。断言第二位教师不能退回或评分该任务。
- [ ] **Step 2: 运行 RED。**
  ```powershell
  npx.cmd playwright test tests/e2e/practicum/student-task-review-api.spec.ts --reporter=list
  ```
  预期：缺少 Prisma 退回接口或评分结果未由学生任务详情返回。
- [ ] **Step 3: 最小实现。** 在同一事务内读取任务、验证班级教师范围及当前状态；退回要求非空反馈；重提仅在 `AVAILABLE` 或 `RETURNED` 创建递增版本；评分范围为 0 至 100，写入不可删除的 `GradeRevision`。所有状态变更写 `TaskEvent`，不调用 `practicum-repository.ts`。
- [ ] **Step 4: 运行 GREEN。** 重跑该文件、`task-dependency-api.spec.ts`，确认评分仍能解锁依赖任务。
- [ ] **Step 5: 提交。**
  ```powershell
  git add server/services/student-task-review.ts server/api/practicum/teacher server/api/practicum/student-tasks tests/e2e/practicum/student-task-review-api.spec.ts
  git commit -m "feat(review): persist returns grades and version history"
  ```

### Task 4: 增加教师可见的班级和任务发布页面

**Files:**
- Create: `pages/practicum/classes/index.vue`
- Create: `pages/practicum/classes/[classId].vue`
- Modify: `components/practicum/PracticumSidebar.vue`
- Modify: `composables/usePracticumServer.ts`
- Test: `tests/e2e/practicum/classroom-management-ui.spec.ts`

**Interfaces:**
- `usePracticumServer` 新增 `listClasses`、`createClass`、`listEnrollments`、`enrollStudent`、`listClassAssignments`、`publishClassAssignment`。
- 班级页固定展示：班级名称、成员数、已发布任务、待批数、完成率；创建、加学生和发布任务均有 loading、error、success 状态。

- [ ] **Step 1: 写失败 UI 测试。** 教师登录后从侧边栏进入“我的班级”，创建班级，选择一名学生，选择计划与活动并发布；刷新页面后断言班级、成员和任务仍可见。学生登录后从“我的任务”看到发布任务。
- [ ] **Step 2: 运行 RED。**
  ```powershell
  npx.cmd playwright test tests/e2e/practicum/classroom-management-ui.spec.ts --reporter=list
  ```
  预期：导航和页面不存在。
- [ ] **Step 3: 最小实现。** 复用现有 `PracticumShell`、`StatePanel`、表单和 CSRF helpers；不做嵌套卡片。班级详情页面仅加载已授权数据，发布表单使用 ISO 日期输入和计划活动多选；成功后重取服务端数据。
- [ ] **Step 4: 运行 GREEN。** 在 1366px 和 390px 下重跑测试，检查没有横向溢出。
- [ ] **Step 5: 提交。**
  ```powershell
  git add pages/practicum/classes components/practicum/PracticumSidebar.vue composables/usePracticumServer.ts tests/e2e/practicum/classroom-management-ui.spec.ts
  git commit -m "feat(classroom): add teacher class and publishing screens"
  ```

### Task 5: 用同一任务 ID 改造学生详情和教师批阅页面

**Files:**
- Modify: `pages/practicum/tasks.vue`
- Modify: `pages/practicum/activities/[activityId].vue`
- Modify: `pages/practicum/reviews/index.vue`
- Create: `pages/practicum/reviews/[taskId].vue`
- Modify: `composables/usePracticumServer.ts`
- Test: `tests/e2e/practicum/classroom-review-ui.spec.ts`

**Interfaces:**
- 学生点击任务时带 `taskId` 进入活动；活动页以 `getStudentTask(taskId)` 加载状态、版本、反馈和成绩。
- 教师批阅页以 `taskId` 调用新 Prisma review API；旧 `/practicum/submissions/[submissionId]` 保留为兼容页但不作为新入口。

- [ ] **Step 1: 写失败 UI 测试。** 按第一阶段完整路径操作：教师建班发布，学生提交，教师退回，学生重提，教师评分，学生刷新后看到 `86` 和反馈；教师刷新后班级待批数减少、平均分更新。
- [ ] **Step 2: 运行 RED。**
  ```powershell
  npx.cmd playwright test tests/e2e/practicum/classroom-review-ui.spec.ts --reporter=list
  ```
  预期：当前活动页会退回 activityId/JSON 提交路径，教师页不会读取 Prisma 任务。
- [ ] **Step 3: 最小实现。** 删除新流程中的 activityId 回退分支；草稿继续在本地，但版本、状态、退回、成绩仅以 `taskId` 服务端响应渲染。教师队列提供班级筛选、空态和无权态；评分确认后刷新统计。
- [ ] **Step 4: 运行 GREEN。** 重跑完整 UI 文件并验证学生不能直接打开教师批阅地址。
- [ ] **Step 5: 提交。**
  ```powershell
  git add pages/practicum/tasks.vue pages/practicum/activities pages/practicum/reviews composables/usePracticumServer.ts tests/e2e/practicum/classroom-review-ui.spec.ts
  git commit -m "feat(learning): connect student and teacher task workflow"
  ```

### Task 6: 完成班级成绩、审计和可重复验收

**Files:**
- Modify: `server/api/practicum/teacher/classes/[classId]/analytics.get.ts`
- Modify: `server/api/practicum/teacher/classes/[classId]/export.get.ts`
- Modify: `pages/practicum/data-center.vue`
- Modify: `docs/data-model.md`
- Modify: `docs/permission-matrix.md`
- Modify: `docs/api-contract.md`
- Modify: `docs/acceptance-test-report.md`
- Test: `tests/e2e/practicum/classroom-closure.spec.ts`

**Interfaces:**
- 班级统计返回 `learnerCount`、`submittedCount`、`gradedCount`、`completionPercent`、`averageScore`、`lateStudentIds` 和最近审计事件。
- CSV 与页面从同一 Prisma 查询生成，教师只能导出本班数据。

- [ ] **Step 1: 写失败验收测试。** 创建两个班级和两位教师，完成一条教师-学生闭环；断言成绩页/CSV只含本班学生，审计事件按“发布、提交、退回、重提、评分”顺序可见，另一教师被拒绝。
- [ ] **Step 2: 运行 RED。**
  ```powershell
  npx.cmd playwright test tests/e2e/practicum/classroom-closure.spec.ts --reporter=list
  ```
  预期：统计没有完整提交/退回审计，或页面未显示班级级数据。
- [ ] **Step 3: 最小实现。** 统计和导出均用 `Class` 过滤的 Prisma 查询；从 `TaskEvent` 返回允许展示的审计事件。数据中心增加班级选择器、成绩表和导出按钮，并在切换组织/实训室时清空旧数据后重新请求。
- [ ] **Step 4: 运行 GREEN 和质量门槛。**
  ```powershell
  npx.cmd playwright test tests/e2e/practicum/classes-api.spec.ts tests/e2e/practicum/class-assignments-api.spec.ts tests/e2e/practicum/student-task-review-api.spec.ts tests/e2e/practicum/classroom-management-ui.spec.ts tests/e2e/practicum/classroom-review-ui.spec.ts tests/e2e/practicum/classroom-closure.spec.ts --reporter=list
  npm.cmd run typecheck
  $env:NUXT_IGNORE_LOCK='1'; npm.cmd run build
  ```
  预期：所有命令退出码为 0；任何失败先修复，不把功能标记为完成。
- [ ] **Step 5: 更新文档和提交。**
  ```powershell
  git diff --check
  git add server/api/practicum/teacher pages/practicum/data-center.vue docs tests/e2e/practicum/classroom-closure.spec.ts
  git commit -m "feat(practicum): complete classroom teaching assessment closure"
  ```
