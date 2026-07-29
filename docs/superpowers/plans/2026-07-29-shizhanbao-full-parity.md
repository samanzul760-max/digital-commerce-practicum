# 实战宝全量功能对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `shizhanbao-full-parity` and execute each task with BDD, RED/GREEN TDD, Playwright acceptance, and a focused Git commit.

**Goal:** 将实战宝可观察的 138 项能力逐项落地到数字商贸实训工作台，并为每项留下可追踪的服务端、浏览器和权限证据。

**Architecture:** 以服务端 repository 为唯一事实源，页面只负责加载和呈现；将现有本地 store 限制为临时 UI 状态。新增组织、实训室、角色、作业、公告、邀请、申请、资源目录、应用、审计和数据钻取领域模型，所有读取与写入都经过会话、角色、组织和实训室校验。

**Tech Stack:** Nuxt 3、Vue 3、TypeScript、Nitro/H3、现有 JSON repository 迁移适配层、Playwright。

## Global Constraints

- 不复制目标站品牌、内容、私有接口、账号或登录信息。
- 每个 `SB-*` 能力必须在 `docs/feature-gap-matrix.md` 有一行。
- 先写 `docs/bdd/` 场景和失败测试，再实现服务端与页面。
- 所有敏感写操作必须有服务器端授权、校验、幂等或版本控制。
- 每个角色路径必须验证刷新、直接 URL、空数据、失败和移动端。
- 每个逻辑切片在绿灯后单独 Git 提交；最终不得用构建成功替代验收。

---

### Task 1: 对标矩阵和测试索引

**Files:**
- Modify: `docs/feature-gap-matrix.md`
- Create: `docs/bdd/full-parity-foundation.feature.md`
- Create: `docs/bdd/full-parity-teaching.feature.md`
- Create: `docs/bdd/full-parity-student.feature.md`
- Create: `docs/bdd/full-parity-quality.feature.md`
- Test: `tests/e2e/practicum/full-parity-inventory.spec.ts`

- [ ] 将 138 个 `SB-*` ID 写入矩阵，声明当前状态、目标角色、API、BDD、TDD、Playwright 和验收标准。
- [ ] 为每个模块写 BDD 标题，先覆盖成功、空、失败、无权、刷新和直链。
- [ ] 写失败测试，验证矩阵编号、BDD 编号与 Playwright 测试名可追踪。
- [ ] 运行失败测试记录 RED；完成最小索引实现后运行 GREEN。
- [ ] 提交：`docs(practicum): add full parity inventory and BDD contracts`。

### Task 2: 组织、实训室与角色基础

**Files:**
- Modify: `domain/practicum/types.ts`, `domain/practicum/permissions.ts`
- Modify: `server/utils/auth-store.ts`, `server/utils/practicum-repository.ts`
- Create: `server/api/practicum/context.get.ts`
- Create: `server/api/practicum/organizations/index.get.ts`
- Create: `server/api/practicum/organizations/[organizationId]/select.post.ts`
- Modify: `components/practicum/PracticumTopbar.vue`, `components/practicum/PracticumSidebar.vue`
- Test: `tests/e2e/practicum/context-api.spec.ts`, `tests/e2e/practicum/context-ui.spec.ts`

- [ ] RED：TEACHER 不能读取教师边界、组织/实训室上下文不能持久化。
- [ ] 新增组织、实训室、教师/导师角色和上下文会话字段。
- [ ] 所有现有查询按组织和实训室过滤；补直接地址与跨房间 API 测试。
- [ ] 新增组织和实训室切换 UI，验证刷新后仍保持，未授权对象不泄露。
- [ ] 提交：`feat(practicum): add organization room context and teacher role`。

### Task 3: 课堂作业、公告与授课模式

**Files:**
- Modify: `domain/practicum/types.ts`, `server/utils/practicum-repository.ts`
- Create: `server/api/practicum/assignments/*`, `server/api/practicum/announcements/*`
- Create: `pages/practicum/assignments.vue`, `pages/practicum/announcements.vue`, `pages/practicum/teach/[planId].vue`
- Modify: `pages/practicum/plans/[planId]/index.vue`, `pages/practicum/learn/[planId].vue`
- Test: `tests/e2e/practicum/assignments-api.spec.ts`, `tests/e2e/practicum/teacher-teaching.spec.ts`

- [ ] RED：教师无法创建、发布、筛选、按虚拟组可见的作业或公告。
- [ ] 实现作业/公告状态机、附件元数据、可见范围、历史和通知。
- [ ] 实现教师播放/授课模式及活动参与数据。
- [ ] Playwright 验证教师发布、学生看见、学生不可见非授权作业、移动端操作。
- [ ] 提交：`feat(practicum): add teacher assignments announcements and teaching mode`。

### Task 4: 资源目录、活动来源、应用与上传

**Files:**
- Modify: `domain/practicum/types.ts`, `server/utils/practicum-repository.ts`
- Create: `server/api/practicum/catalog/*`, `server/api/practicum/apps/*`
- Modify: `server/api/practicum/assets/index.post.ts`, `pages/practicum/resources.vue`
- Create: `pages/practicum/apps.vue`, `pages/practicum/catalog.vue`
- Modify: `pages/practicum/plans/[planId]/edit.vue`, `pages/practicum/activities/[activityId].vue`
- Test: `tests/e2e/practicum/catalog-api.spec.ts`, `tests/e2e/practicum/resources-user-flow.spec.ts`

- [ ] RED：资源没有来源、发布范围、详情或学生端可见控制。
- [ ] 实现软件、训练营、任务、课程四类目录及计划批量引入。
- [ ] 实现可配置应用入口、上传预览/下载授权和资源范围。
- [ ] Playwright 验证管理员添加、学生查看、移除影响、失败上传与刷新。
- [ ] 提交：`feat(practicum): add resource catalogs apps and scoped assets`。

### Task 5: 成员、虚拟组、邀请和申请

**Files:**
- Modify: `domain/practicum/types.ts`, `server/utils/practicum-repository.ts`
- Create: `server/api/practicum/groups/*`, `server/api/practicum/invites/*`, `server/api/practicum/applications/*`
- Modify: `pages/practicum/members.vue`
- Test: `tests/e2e/practicum/members-api.spec.ts`, `tests/e2e/practicum/member-journey.spec.ts`

- [ ] RED：成员、分组、邀请和申请在刷新后不能服务端持久化。
- [ ] 实现虚拟组实体、成员查询、邀请令牌生命周期和申请审批幂等。
- [ ] 角色变更、移除、批量审批均写入审计。
- [ ] Playwright 验证邀请加入、审核、角色变化、越权与移动端。
- [ ] 提交：`feat(practicum): add groups invites and membership applications`。

### Task 6: 实训室设置、落地页、分享与模板

**Files:**
- Modify: `domain/practicum/types.ts`, `server/utils/practicum-repository.ts`
- Create: `server/api/practicum/rooms/*`, `server/api/practicum/landing-page/*`, `server/api/practicum/shares/*`
- Modify: `pages/practicum/room-settings.vue`
- Create: `pages/practicum/landing-page.vue`
- Test: `tests/e2e/practicum/room-settings-api.spec.ts`, `tests/e2e/practicum/room-landing.spec.ts`

- [ ] RED：实训室元数据、公开范围、媒体和落地页不能持久化或授权。
- [ ] 实现名称、头像、封面、简介、地区、模式、范围、复制、软删除与模板开关。
- [ ] 实现受控分享链接；条件模板模块按配置显示。
- [ ] Playwright 验证保存、刷新、范围限制、分享撤销和移动端。
- [ ] 提交：`feat(practicum): add room settings landing pages shares and templates`。

### Task 7: 学生端资源、待办、应用和服务端学习状态

**Files:**
- Modify: `server/utils/practicum-repository.ts`, `composables/usePracticumServer.ts`, `composables/usePracticumStore.ts`
- Create: `server/api/practicum/progress/*`, `server/api/practicum/todos/*`
- Modify: `pages/practicum/index.vue`, `pages/practicum/tasks.vue`, `pages/practicum/progress.vue`, `pages/practicum/learn/[planId].vue`, `pages/practicum/activities/[activityId].vue`
- Test: `tests/e2e/practicum/student-progress-api.spec.ts`, `tests/e2e/practicum/student-complete-journey.spec.ts`

- [ ] RED：学习进度、待办、应用和个人数据只能依赖本地 store。
- [ ] 将学习位置、活动进度、草稿、待办和学生应用迁移到服务端。
- [ ] 实现学生资源中心四类标签、我的应用、活动教程和成果证据。
- [ ] Playwright 验证提交、刷新、退回、修订、评分、进度和无权直链。
- [ ] 提交：`feat(practicum): persist student learning todos resources and apps`。

### Task 8: 审核、数据钻取、技能图谱、导出和审计

**Files:**
- Modify: `server/utils/practicum-repository.ts`, `pages/practicum/reviews/index.vue`, `pages/practicum/submissions/[submissionId].vue`, `pages/practicum/data-center.vue`
- Create: `server/api/practicum/audit/*`, `server/api/practicum/analytics/*`, `server/api/practicum/exports/*`
- Create: `pages/practicum/member-data/[memberId].vue`, `pages/practicum/plan-data/[planId].vue`
- Test: `tests/e2e/practicum/analytics-api.spec.ts`, `tests/e2e/practicum/review-data-journey.spec.ts`

- [ ] RED：筛选批阅、成员钻取、图谱和导出不使用服务端事实数据。
- [ ] 实现成果证据、连续批改、量规权重、审计、成员/计划钻取、技能计算和异步导出合同。
- [ ] Playwright 验证队列筛选、评分、下一条、钻取、导出与权限。
- [ ] 提交：`feat(practicum): add audit analytics skill map and exports`。

### Task 9: 安全、异常、全量验收和发布门槛

**Files:**
- Modify: `server/middleware/request-context.ts`, `server/utils/auth-session.ts`, all mutable API handlers
- Modify: `docs/acceptance-test-report.md`, `docs/feature-gap-matrix.md`, `docs/api-contract.md`, `docs/permission-matrix.md`
- Test: `tests/e2e/practicum/security-contract.spec.ts`, `tests/e2e/practicum/full-parity-user-flows.spec.ts`

- [ ] RED：跨站请求、防重复写入、审计和错误状态没有统一合同。
- [ ] 实现并测试防跨站请求、请求幂等、审计、统一错误与加载/空/失败状态。
- [ ] 全量运行类型检查、构建、全部 Playwright、桌面/移动端验收、diff 与敏感信息扫描。
- [ ] 将所有 `SB-*` 状态更新为 PASS 或带理由的 NOT_APPLICABLE，并写最终报告。
- [ ] 提交：`chore(practicum): verify full parity acceptance evidence`。
