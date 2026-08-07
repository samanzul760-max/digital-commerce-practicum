# 并行闭环补齐设计

## 目标

在不修改生产服务器、不连接生产数据库、不破坏既有未提交改动的前提下，将实训工作台剩余的教师、管理员和跨模块能力补齐为服务端或数据库驱动的可串联流程，并保持现有 LearnEC 页面交互与视觉层次。

## 边界与安全

- 数据库变更仅允许在本地开发环境执行：Prisma migration 只能新增表、字段、索引、唯一约束和外键；禁止 `db push`、`db reset`、删除或重命名既有数据库对象。
- 不执行 SSH、部署、PM2、Docker、Nginx、服务器数据库操作，且不重启当前旧代码 `3001` 服务。
- 现有业务数据必须由服务端 API 或数据库提供；`localStorage` 仅可保存不影响业务与权限的界面偏好。
- 所有写接口使用现有会话、CSRF 和当前组织/实训室上下文；前端菜单隐藏不能替代服务端授权。
- 未运行的测试保留在 `docs/parity/2026-08-07-final-verification-queue.md`，最终验证窗口中每项只运行一次；超时或卡死立即记为 `UNVERIFIED`。

## 数据模型

本地 Prisma migration 新增以下独立实体，并全部以 `trainingRoomId` 或 `classId` 限定范围：

- `TrainingRoomSetting`：实训室介绍、封面、教学模式、公开范围及版本时间。
- `ClassAnnouncement`：班级公告草稿、发布、关闭状态，目标虚拟组与发布人。
- `TeachingSession` 与 `ActivityExecution`：课堂开始/结束、当前活动、成员执行状态和完成时间。
- `JoinApplication` 与 `MemberInvite`：申请和邀请的状态机、幂等键、失效与撤销记录。
- `AuditEvent`：服务端写操作的角色、对象、时间和结构化元数据。
- `PracticumTemplate`、`Competition` 与 `CompetitionEntry`：模板开关、赛事生命周期和学生参赛记录。

已有 `Membership`、`VirtualGroup`、`ClassroomAssignment`、`StudentTask`、`SubmissionVersion`、`Grade` 和 `TaskEvent` 继续复用，不复制提交或评分事实。

## 并行写入边界

先由数据基础切片独占 Prisma schema 与 migration。该切片合并并审阅后，后续切片并行，且每个切片拥有完全不重叠的页面、服务、API、BDD 和测试文件。

| 切片 | 独占范围 | 提供给其他切片的合同 |
| --- | --- | --- |
| 数据基础 | `prisma/schema.prisma`、单一 migration、模型关系测试 | 新增模型和外键名称；不修改页面。 |
| 教师工作台 | `server/services/teacher-*`、`server/api/practicum/teacher/**`、`pages/practicum/teaching/**`、教师专属测试 | 班级范围内的公告、课堂和审核 DTO。 |
| 成员与实训室 | `server/services/member-*`、`server/api/practicum/members/**`、`server/api/practicum/room-settings/**`、成员页面和测试 | 邀请、申请、分组、实训室设置 DTO。 |
| 资源与数据 | `server/services/resource-*`、`server/api/practicum/resources/**`、`server/api/practicum/audit/**`、资源/数据页面和测试 | 资源可见性、导出和审计 DTO。 |
| 案例、模板与比赛 | `server/services/template-*`、`server/api/practicum/templates/**`、`server/api/practicum/competitions/**`、对应页面和测试 | 模板启停、比赛和参赛 DTO。 |
| 主线集成 | `composables/usePracticumServer.ts`、权限/路由导航、共享 shell、功能矩阵、最终验收报告 | 消费所有 DTO；只在各切片审阅后开始。 |

没有切片可同时修改共享 composable、认证、CSRF、导航组件、Prisma schema 或最终验收文件。

## 角色流程

学生从已发布计划进入活动，产生服务端学习状态和提交版本；教师只能在授权班级内发布作业/公告、执行课堂、查看提交、退回或评分；管理员配置实训室、成员和虚拟组，处理邀请/申请，维护模板和比赛，并在数据中心查看受授权的统计与审计。

跨模块副作用通过服务端实现：发布公告或作业、退回、评分、审批、模板启停均写入审计事件；学生收到的待办、反馈和通知在刷新后重新由服务端查询。

## UI 与异常处理

沿用现有 LearnEC 的浅色工作台、紧凑表格/列表、8px 节奏和响应式布局。新增入口只接入真实页面；权限不足显示明确受限状态，不返回数据；加载、空数据、网络失败、非法状态转换和重复点击均有稳定的页面状态。

## 测试与验收

每个新行为先写 BDD 与 API/Playwright 测试合同，再实现服务端和页面。因为最终验证遵循一次执行规则，本轮只创建或更新测试，不重跑已登记测试；其 RED/GREEN 证据在最终受控验证窗口统一记录。最终验收至少覆盖学生、教师、管理员、无权用户四条路径以及桌面和 `390x844` 移动端。
