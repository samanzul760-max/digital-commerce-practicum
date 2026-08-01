# 实训平台功能对比与收尾矩阵

## 证据口径

- **FACT**：本项目代码、数据库迁移或自动化测试已直接验证的能力。
- **INFERENCE**：根据参考平台可观察到的页面结构和典型实训流程推断的能力；不代表获得了其私有实现。
- **RECOMMENDATION**：上线前建议，不视为已实现。
- **PARTIAL**：存在实现，但数据来源、权限、前端入口或回归证据尚不完整。
- **IMPLEMENTED_UNVERIFIED**：代码已存在，尚没有目标场景的自动化或人工验证证据。

## 学生待办入口对标

**FACT（授权本机浏览器观察，2026-08-01）**：参考学生待办中心展示待办总数；每一项带任务类型、标题、课程来源和发布时间；每项提供“去学习”入口；列表支持分页和跳页。

**本项目对应实现**：`/practicum/tasks` 使用待办列表结构，展示类型、标题、来源、发布时间、状态、去学习和分页。新 Prisma `StudentTask` 优先显示，旧活动数据仅作为迁移兼容项。

| 入口 | 可观察目标能力 | 本项目对应能力 | 状态 |
| --- | --- | --- | --- |
| 待办列表 | 总数与分页 | 服务端任务数、页码、上下页 | PARTIAL：当前为前端分页，API 游标分页待补。 |
| 待办条目 | 类型、标题、来源、发布时间 | 任务状态、活动类型、计划来源、分配时间 | PARTIAL：旧兼容条目没有服务端发布时间。 |
| 去学习 | 进入对应学习上下文 | 跳到活动页，匹配时读取 `StudentTask`、心跳和版本提交 | PARTIAL：旧目录与新任务 ID 映射尚未全量迁移。 |
| 锁定任务 | 受学习条件约束 | `LOCKED` 状态和服务端提交冲突保护 | IMPLEMENTED_VERIFIED：依赖 API E2E 已通过。 |

| 业务能力 | 参考平台结论 | 本项目状态 | 前端入口 | 证据与缺口 |
| --- | --- | --- | --- | --- |
| 培训室、班级、计划分配 | INFERENCE：实训以培训室和班级组织 | PARTIAL | 课程/管理页面 | Prisma `Organization`、`TrainingRoom`、`Class`、`PlanAssignment` 已存在；跨组织范围仍需全量审计。 |
| 多级计划树 | INFERENCE：课程按目录和活动组织 | PARTIAL | 课程详情、学习页 | 旧计划树可展示；Prisma 任务与旧目录 ID 映射尚未完全统一。 |
| 前置任务解锁 | INFERENCE：学习顺序受前置条件限制 | FACT/PARTIAL | 任务 API；活动页锁定提示 | `TaskDependency` 解锁和锁定提交拒绝已通过 API E2E；循环依赖检测未实现。 |
| 学生任务状态机 | INFERENCE：可学习、提交、退回、评分等状态 | PARTIAL | 任务页、活动页 | Schema 包含 `LOCKED` 至 `CLOSED`；完整的合法状态转换服务尚未完成。 |
| 提交版本、附件和幂等 | INFERENCE：提交应保留证据与版本 | PARTIAL | 活动页实践提交 | Prisma `SubmissionVersion`、`Idempotency-Key` 已实现并测试；附件持久化和并发幂等测试未完成。 |
| 自动判分与尝试次数 | INFERENCE：训练可有受控尝试和自动结果 | IMPLEMENTED_UNVERIFIED | 活动页训练区 | 已建立 `AutoGradeAttempt` 数据模型；服务端判分规则和前端接入尚未完成。 |
| 教师评分与评分历史 | INFERENCE：教师可批阅、退回并查看证据 | PARTIAL | 审核页 | `GradeRevision` 已保留评分历史；退回 API 与历史 UI 尚未统一到 Prisma。 |
| 学习时长和行为审计 | INFERENCE：平台可记录学习过程 | PARTIAL | 活动页 | `ActivityLog`、Heartbeat、Visibility 已接入；时长聚合、断线容错和管理端查看未完成。 |
| 学习进度聚合 | INFERENCE：学生端展示课程完成情况 | PARTIAL | `/practicum/progress` | 新 Prisma Progress API 和加载/错误/重试已接入；继续学习和待办仍含旧 Store 兼容数据。 |
| 角色和数据范围 | FACT：本项目有学生、教师、管理员角色 | PARTIAL | 路由及页面状态 | Progress API 已从会话取角色且检查训练室；其余旧 JSON API 尚需迁移。 |
| 移动端与异常状态 | RECOMMENDATION | PARTIAL | `/practicum/progress` | 已具备 loading/empty/error/forbidden/retry 组件；390px 实测和横向溢出检查待完成。 |

## 上线前收尾顺序

1. 将活动、计划树、任务页的旧 ID 映射固化到 PostgreSQL，并移除业务状态 localStorage 回退。
2. 实现状态机转换守卫、依赖环检测、附件上传与服务端自动判分。
3. 将教师退回、评分历史和学习时长聚合完整接到对应页面。
4. 补齐跨组织、训练室、班级、计划的 RBAC E2E 与并发幂等测试。
5. 为新增迁移提供经演练的回滚脚本，并完成桌面与 390px Playwright 截图验证。
