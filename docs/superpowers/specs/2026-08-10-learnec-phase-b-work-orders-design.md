# LearnEC 阶段 B 工单组课与发布设计

## 目标与边界

阶段 B 让 `ADMIN` 能把资源库活动、媒体、理论题和沙盘规格组合成一个综合工单，保存为草稿或模板，并发布给班级。发布事务为每名有效学生生成一条 `StudentTask`。本阶段不实现学生作答、沙盘运行、提交、批阅或学情统计。

## 数据设计

`PlanAssignment` 继续作为工单根，新增说明、模板来源、自动/人工评分权重、限时、发布版本、发布时间和冻结快照。`TaskSection` 使用父子关系表达大工单与子活动；`WORK_ORDER` 只负责分组，`MEDIA`、`QUIZ`、`SANDBOX` 才参与区块权重合计。

资源库使用 `ResourceCatalogItem`，来源固定为 `SOFTWARE_CENTER`、`SKILL_CAMP`、`ENTERPRISE_TASK_LIBRARY`。资源加入工单后复制成草稿区块，后续资源更新不得改变已发布工单。模板使用 `WorkOrderTemplate.sectionsSnapshot` 保存完整教师侧配置，一键复制时创建全新的 `PlanAssignment` 和区块记录。

媒体、题目和沙盘分别落入 `MediaResource`、`TaskQuestion`、`SandboxSpec`、`SandboxStep`、`SandboxRubricItem`。客观题答案键只允许 ADMIN 接口和服务端评分逻辑读取；学生视角预览必须删除 `answerKey` 和教师内部配置。

## 发布事务

发布前必须满足：

- 工单状态为 `DRAFT`，至少包含一个计分区块。
- 自动分与人工分均在 0-100，且合计为 100。
- 所有 `MEDIA`、`QUIZ`、`SANDBOX` 区块权重合计为 100；`WORK_ORDER` 权重固定为 0。
- 截止时间晚于开放时间，限时分钟数为正整数或空值。
- 每个 QUIZ 至少有一道题，每个 SANDBOX 有类型、步骤和量规。

事务内更新班级和发布时间、写入完整冻结快照、把状态改为 `PUBLISHED`，并针对班级中每个有效 `STUDENT` 学员按 `planAssignmentId + studentId + activityId` 幂等创建一条 `StudentTask`。综合工单的 `activityId` 固定使用工单 ID，因此一个学生对应一个工单实例。重复发布请求返回原发布结果，不重复插入学生任务。

## API 与授权

所有 `/api/admin/**` 接口先执行 `requireAdmin()`，再校验班级属于当前会话的培训室范围。写请求继续使用现有 CSRF 中间件；创建、复制和发布使用 `Idempotency-Key`。

- `GET /api/admin/classes`
- `GET /api/admin/resources`
- `GET|POST /api/admin/tasks`
- `GET|PATCH /api/admin/tasks/:taskId`
- `GET /api/admin/tasks/:taskId/preview`
- `POST /api/admin/tasks/:taskId/publish`
- `GET /api/admin/tasks/:taskId/publications`
- `GET|POST /api/admin/task-templates`
- `POST /api/admin/task-templates/:templateId/copy`
- `GET /api/admin/training-centers`

错误统一返回稳定 code：`WORK_ORDER_INVALID`、`WORK_ORDER_NOT_FOUND`、`WORK_ORDER_NOT_EDITABLE`、`WORK_ORDER_WEIGHT_INVALID`、`WORK_ORDER_SECTION_INVALID`、`WORK_ORDER_ALREADY_PUBLISHED`、`CLASS_NOT_FOUND`。

## 页面与交互

阶段 B 新增 `/admin/tasks`、`/admin/tasks/new`、`/admin/tasks/:taskId/edit`、`/admin/tasks/:taskId/preview`、`/admin/tasks/:taskId/publications`、`/admin/tasks/templates`、`/admin/assignments`、`/admin/training-centers`。

页面继续使用现有 `LearnecAppShell`、色彩、间距和控件样式，只在新页面内增加 scoped CSS。编辑器支持资源来源筛选、资源加入工单、媒体/题目/沙盘区块添加、顺序调整、必做开关、区块权重、自动/人工权重和限时配置。预览页使用学生可见数据，不显示答案键。发布页选择班级和时间，成功后显示生成的学生任务数量。

## 验证

Playwright 覆盖 ADMIN 创建/编辑/预览/模板复制/发布闭环、权重错误拒绝、重复发布幂等、学生越权拒绝和 StudentTask 数量。阶段门禁还包括 `npm.cmd run typecheck`、`npm.cmd run build`、4310 路由探测、验收报告和 `phase-B:` 本地 Git 提交。
