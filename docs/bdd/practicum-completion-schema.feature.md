# 实训闭环数据基础合同

功能: 实训闭环的本地持久化数据基础

  背景:
    假如 本轮只允许新增本地 Prisma 数据模型和可回滚 migration
    并且 不执行迁移、不连接生产数据库，也不使用浏览器存储保存业务事实

  场景: BDD-COMPLETION-SCHEMA-001 实训室和班级数据有明确归属边界
    假如 系统保存实训室设置、加入申请、成员邀请、审计事件、模板或比赛
    当 服务端查询这些记录
    那么 每条记录都由 trainingRoomId 关联到一个 TrainingRoom
    并且 公告和教学会话由 classId 关联到一个 Class
    并且 服务端后续必须先按当前授权实训室或班级收窄查询

  场景: BDD-COMPLETION-SCHEMA-002 课堂公告和活动执行保留最小关系事实
    假如 教师在班级范围内创建公告或开启课堂会话
    当 公告指定目标虚拟组，或成员执行一个当前活动
    那么 ClassAnnouncement 可选关联 VirtualGroup 并保存发布人和状态
    并且 ActivityExecution 关联 TeachingSession 与 RoomMember
    并且 同一会话、成员和活动最多只有一条执行记录

  场景: BDD-COMPLETION-SCHEMA-002A 公告写入可按操作者和幂等键重放
    假如 教师在同一班级创建、发布或关闭一条公告时发生请求重试
    当 重试使用同一 authorId 和 idempotencyKey
    那么 ClassAnnouncement 保存 idempotencyKey
    并且 classId、authorId 和 idempotencyKey 的组合唯一
    并且 服务端后续可查询原公告并重放结果，不创建重复公告

  场景: BDD-COMPLETION-SCHEMA-003 邀请和申请可以安全地重复提交
    假如 服务端收到同一实训室范围内的加入申请、成员邀请或课堂开启重试
    当 重试使用原始的幂等键
    那么 JoinApplication、MemberInvite 和 TeachingSession 的范围内唯一约束阻止重复事实
    并且 邀请保留 ACTIVE、USED、EXPIRED 或 REVOKED 状态及失效、撤销时间
    并且 申请保留 PENDING、APPROVED、REJECTED 或 CANCELLED 状态及决定时间

  场景: BDD-COMPLETION-SCHEMA-004 审计、模板和比赛不复制提交或评分事实
    假如 服务端完成受保护的写操作、模板开关、比赛生命周期或学生报名
    当 对应记录被持久化
    那么 AuditEvent 保存操作者、角色、对象、事件时间和结构化元数据
    并且 PracticumTemplate 和 Competition 均归属同一实训室
    并且 CompetitionEntry 关联 Competition 与 RoomMember，且同一成员在同一比赛只能有一条报名记录
    并且 不创建提交版本或评分的重复副本

  场景: BDD-COMPLETION-SCHEMA-005 migration 只做可回滚的加法
    假如 本地 migration 被人工审查
    当 检查其 SQL 语句
    那么 只出现 CREATE TABLE、CREATE INDEX 和 ALTER TABLE ADD CONSTRAINT
    并且 不出现 DROP、DELETE、TRUNCATE、RENAME、ALTER COLUMN 或数据回填

## 延后验证

- 契约命令（本轮不执行）: `npx playwright test tests/e2e/practicum/practicum-completion-schema.spec.ts`
- migration 命令（本轮禁止执行）: `npx prisma migrate deploy`
- 状态: `IMPLEMENTED_UNVERIFIED`
