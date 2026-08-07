# 数据基础 Migration 审查

日期：2026-08-07
范围：本地 `practicum completion` 数据基础；未连接或修改任何服务器/生产数据库。
状态：`IMPLEMENTED_UNVERIFIED`

## 模型合同

- 新增 `TrainingRoomSetting`、`ClassAnnouncement`、`TeachingSession`、`ActivityExecution`、`JoinApplication`、`MemberInvite`、`AuditEvent`、`PracticumTemplate`、`Competition`、`CompetitionEntry`。
- `TrainingRoomSetting`、申请、邀请、审计、模板和比赛均通过 `trainingRoomId` 受实训室范围限制；公告和课堂会话均通过 `classId` 受班级范围限制。
- 公告/申请/邀请可选指向已有 `VirtualGroup`；活动执行和比赛报名指向已有 `RoomMember`。
- 幂等/重复事实约束：`ClassAnnouncement(classId, authorId, idempotencyKey)`、`TeachingSession(classId, idempotencyKey)`、`JoinApplication(trainingRoomId, applicantId, idempotencyKey)`、`MemberInvite(trainingRoomId, invitedById, idempotencyKey)`、`ActivityExecution(teachingSessionId, memberId, activityId)`、`CompetitionEntry(competitionId, memberId)`；邀请代码另行全局唯一。
- 状态使用字符串默认值，避免 migration 出现 `CREATE TYPE`；状态机和服务端权限检查属于后续 API 切片。

## SQL 人工检查

检查文件：`prisma/migrations/20260807090000_add_practicum_completion_entities/migration.sql`

| 项目 | 结论 |
| --- | --- |
| 新表 | 10 个 `CREATE TABLE`，与模型清单一一对应。 |
| 索引 | 24 个 `CREATE INDEX` / `CREATE UNIQUE INDEX`，覆盖范围查询、公告/会话/成员写入幂等与重复报名。 |
| 外键 | 16 条 `ALTER TABLE ... ADD CONSTRAINT`；所有关系都有显式删除行为。 |
| 禁止操作 | 未发现 `DROP`、`DELETE`、`TRUNCATE`、`RENAME`、`ALTER COLUMN`、`INSERT` 或数据回填。 |
| 误报说明 | 文本搜索的 `UPDATE` 均为外键定义中的 `ON UPDATE CASCADE`；`updatedAt` 是字段名，不是 `UPDATE` 语句。 |
| 格式 | `git diff --check` 无空白错误；Git 仅提示 `schema.prisma` 将按工作树规则从 LF 转为 CRLF。 |

## 未执行验证与风险

- 未运行 schema 契约：`npx playwright test tests/e2e/practicum/practicum-completion-schema.spec.ts`。
- 未运行 `prisma validate`、`prisma generate`、迁移、typecheck、build 或任何 E2E；这是用户要求的限制。
- 未启动、停止或重启服务，未触碰 `.env`、部署、Docker、PM2、Nginx 或共享导航/composable。
- 由于未运行 Prisma 校验，schema 语法与迁移可执行性仍为 `UNVERIFIED`；后续受控验证窗口应先运行 schema 契约，再在仅限本地开发数据库的环境验证 migration。
