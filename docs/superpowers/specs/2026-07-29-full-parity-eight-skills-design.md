# 全量功能对齐八阶段 Skill 设计

## 目标

把全量对照矩阵中所有 `PARTIAL`、`MOCK`、`IMPLEMENTED_UNVERIFIED`、`MISSING` 能力，拆分为八个可独立执行和验收的项目专用 Skill。每个 Skill 都必须将所属 `SB-*` 项从审计状态推进到有服务端事实源、权限边界、BDD、TDD/API、Playwright 证据的 `PASS` 或有业务理由的 `NOT_APPLICABLE`。

## 基本原则

- 保留 Nuxt 3、Vue 3、TypeScript、Playwright 和现有 `practicum-repository` 的技术路线。
- 参考目标站的功能、流程、字段和权限，不复制品牌、文案、视觉资产、私有接口或登录凭据。
- 每个写操作必须由服务端校验、授权、幂等键或版本号保护，并记录审计事件。
- 业务页面不得把 `localStorage` 作为跨用户事实源；仅可用于非业务 UI 偏好。
- 每项功能按 BDD -> RED TDD/API -> 最小实现 -> GREEN -> Playwright 业务路径推进。
- 阶段完成前必须执行 `npm.cmd run typecheck`、`NUXT_IGNORE_LOCK=1 npm.cmd run build` 与相关 Playwright；阶段变更单独本地提交。

## 交付位置

八个项目专用 Skill 置于 `C:\Users\29053\.codex\skills\`，使后续 Codex 会话可自动发现。每个 Skill 仅保存执行规则；项目中的 API 契约、BDD、数据模型、权限矩阵和验收报告仍放在 `docs/`。

## Skill 一：practicum-foundation-security

**覆盖 ID：** `SB-G-01` 至 `SB-G-12`、`SB-Q-01` 至 `SB-Q-06`、`SB-Q-10`。

**职责：** 会话生命周期、组织和实训室选择、OWNER/TEACHER/MENTOR/STUDENT 授权、管理端/学生端切换、导航隐藏、直达 URL 防护、统一列表查询、加载/空/错误/移动端和 CSRF。

**数据与 API：** `User`、`Session`、`Organization`、`TrainingRoom`、`Membership`、`WorkspaceSelection`、`AuditEvent`；认证、上下文、组织选择和权限检查 API。

**BDD：** 未登录访问受保护页被拦截；不同角色只能看到授权实训室；刷新保持选择；无权直达 URL/API 返回统一错误；会话过期后跳转登录且不泄露数据。

**TDD/API：** 会话创建/刷新/退出；角色矩阵；room 隔离；搜索、排序、分页参数校验；重复写请求幂等；CSRF 缺失拒绝。

**Playwright：** OWNER、TEACHER、STUDENT 三种登录；桌面和 390px；刷新和直接地址；无权菜单与按钮不可见或禁用。

## Skill 二：practicum-plan-curriculum

**覆盖 ID：** `SB-P-01` 至 `SB-P-18`。

**职责：** 计划列表、封面、三级目录、排序、活动来源目录、批量导入、自定义活动、附件、辅助资源、学生预览、发布/撤回/归档。

**数据与 API：** `Plan`、`CurriculumNode`、`Activity`、`CatalogItem`、`PlanResource`、`Asset`；计划 CRUD、节点 CRUD、目录检索、活动导入、发布动作和版本冲突 API。

**BDD：** OWNER 创建草稿计划；目录和活动编辑后刷新保留；学生不能读取草稿；发布后学生可预览；撤回后学生入口消失；旧版本更新被拒绝；批量导入不重复。

**TDD/API：** 三层节点深度校验；排序；删除影响确认；附件类型/大小/数量；发布状态机；版本冲突；活动来源和实训室隔离。

**Playwright：** 创建、编辑、导入、删除、预览、发布、撤回、归档全路径，含空目录、网络失败和重复点击。

## Skill 三：practicum-teacher-classroom

**覆盖 ID：** `SB-T-01` 至 `SB-T-12`、`SB-W-01` 至 `SB-W-07`。

**职责：** 教师计划目录、课堂作业、公告、播放模式、活动执行数据和成员结果。

**数据与 API：** `ClassroomAssignment`、`Announcement`、`TeachingSession`、`ActivityExecution`；作业草稿/发布、公告、课堂会话、执行数据查询 API。

**BDD：** 教师创建作业草稿并发布；仅目标虚拟组可见；公告发布后学生待办可见；课堂播放退出后状态正确；教师可筛选未提交学生。

**TDD/API：** TEACHER 授权；草稿到已发布状态机；可见范围；公告/作业幂等；分页和状态筛选；无权学生不可读取他组作业。

**Playwright：** 教师创建和发布、学生查看和完成、教师查看执行结果；空状态、附件失败和重复发布。

## Skill 四：practicum-student-learning

**覆盖 ID：** `SB-U-01` 至 `SB-U-15`。

**职责：** 学生首页、学习计划、待办、资源中心、我的应用、活动详情、软件进度、训练答题、实践交付和个人数据。

**数据与 API：** `LearningPosition`、`ActivityProgress`、`TodoItem`、`ApplicationAccess`、`TrainingAttempt`、`PracticeSubmission`；学习进度、待办、应用、训练和活动详情 API。

**BDD：** 学生仅看到已发布计划；进入活动后学习位置刷新可恢复；完成软件/训练后进度回传；提交文字、链接、附件后生成新版本；反馈退回后可修改再提交。

**TDD/API：** 进度所有权；活动状态转移；训练次数/时限；提交附件校验；版本不可变；越权读取拒绝。

**Playwright：** 首页到计划到活动到提交到刷新恢复；待办过滤；资源标签；移动端；无资源和训练失败。

## Skill 五：practicum-review-grading

**覆盖 ID：** `SB-K-01` 至 `SB-K-11`。

**职责：** 计划和课堂作业批阅、筛选、提交详情、多版本、量规、退回、评分、下一项和审计。

**数据与 API：** `SubmissionVersion`、`ReviewQueueItem`、`Rubric`、`RubricScore`、`Grade`、`AuditEvent`；批阅队列、详情、退回、评分、下一项 API。

**BDD：** 审核者只看到授权实训室；退回必须有反馈；学生修订生成新版本；评分后结果不可变；量规总分符合权重；批阅下一项遵循当前筛选。

**TDD/API：** 队列筛选；版本不可变；评分范围；状态机；审计事件；并发评分冲突。

**Playwright：** 待批阅筛选、查看证据、退回、学生重提、评分、查看历史、移动端详情。

## Skill 六：practicum-members-resources

**覆盖 ID：** `SB-M-01` 至 `SB-M-11`、`SB-R-01` 至 `SB-R-10`、`SB-Q-07`。

**职责：** 成员、虚拟组、邀请、申请审批、资源目录、批量选择、上传、发布可见性和下载授权。

**数据与 API：** `Membership`、`VirtualGroup`、`Invite`、`JoinApplication`、`Resource`、`Asset`、`ResourceVisibility`；成员/分组/邀请/申请/资源/资产 API。

**BDD：** OWNER 创建虚拟组并分配成员；邀请链接有有效期和撤销；申请可批量同意/拒绝；资源按类型和可见范围筛选；学生只看到已发布且被授权资源。

**TDD/API：** 联系方式脱敏；角色变更影响；移除成员保留历史提交；邀请码次数/期限；上传 MIME/大小/数量；下载地址授权。

**Playwright：** 成员搜索分页、建组、邀请、审批；资源添加、筛选、详情、移除、发布；无权访问和上传失败。

## Skill 七：practicum-room-data-notifications

**覆盖 ID：** `SB-S-01` 至 `SB-S-15`、`SB-D-01` 至 `SB-D-12`、`SB-G-05` 至 `SB-G-08`、`SB-Q-08`、`SB-Q-09`。

**职责：** 实训室设置、落地页富文本与媒体、复制/删除恢复、通知、数据总览、成员/计划下钻、技能图谱和导出。

**数据与 API：** `TrainingRoom`、`LandingPage`、`Notification`、`RoomStats`、`MemberStats`、`SkillMetric`、`ExportJob`、`AuditEvent`；设置、落地页、通知、统计、导出、恢复 API。

**BDD：** 更新设置后刷新保留；媒体预览和失败提示；删除后可恢复；通知未读数与已读跨刷新保持；统计仅汇总授权数据；导出字段正确；成员数据可下钻。

**TDD/API：** 公开范围；媒体校验；复制范围；通知深链授权；统计聚合；导出任务；审计写入。

**Playwright：** 设置与落地页保存、通知读取、数据筛选下钻、导出下载、空状态和移动端。

## Skill 八：practicum-templates-release

**覆盖 ID：** `SB-X-01` 至 `SB-X-05`、剩余跨模块验收和发布门禁。

**职责：** 体例格式、创业计划、工单、比赛/竞赛页面、模板驱动导航与权限开关，全量回归、可访问性和部署验证。

**数据与 API：** `TemplateDefinition`、`TemplateModule`、`Competition`、`CompetitionEntry`、`WorkOrder`、`FeatureFlag`；模板配置、比赛、工单和功能开关 API。

**BDD：** 不同模板只显示已启用模块；比赛创建到学生参与；工单生命周期；模板关闭后直达 URL/API 被拒绝。

**TDD/API：** 模板定义校验；开关授权；比赛状态机；工单状态机；跨模板隔离。

**Playwright：** 模板切换、比赛/工单流程、全角色直达 URL、完整回归、390px/768px/1024px。

## 共同验收门禁

每个 Skill 的所属能力必须逐项更新 `docs/feature-gap-matrix.md`。每项至少有一个 BDD 场景、一个先红后绿的 API/TDD 测试和一个用户路径 Playwright 测试。`PASS` 还要求刷新、直达 URL、权限、空/错/加载、移动端和相关异常状态有实际结果。

全量完成前统一执行：

```powershell
npm.cmd run typecheck
$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build
npx.cmd playwright test tests/e2e/practicum --reporter=list
git diff --check
git status --short
```
