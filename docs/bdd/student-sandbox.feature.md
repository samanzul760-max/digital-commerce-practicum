# LearnEC 阶段 C 学生作业与沙盘 BDD

```gherkin
功能: 学生从真实工单进入受控沙盘并提交证据

  场景: BDD-C-001 学生按状态查看本人作业
    假如 班级已发布综合工单并为 student1 生成 StudentTask
    当 student1 打开作业中心并筛选进行中
    那么 只显示本人状态为 IN_PROGRESS 的任务
    并且 ADMIN 调用学生作业接口返回 403

  场景: BDD-C-002 开始任务并恢复服务端草稿
    假如 student1 拥有一个 AVAILABLE 工单
    当 student1 开始任务并保存一个沙盘步骤
    那么 StudentTask 变为 IN_PROGRESS
    并且 SandboxSession、SandboxSnapshot 和 TaskEvent 均绑定该 studentTaskId
    并且 刷新后仍返回已保存字段和步骤状态

  场景: BDD-C-003 五类沙盘彼此受控且同任务隔离
    假如 工单包含店铺基础、商品管理、店铺装修、营销和经营分析区块
    当 student1 分别保存五类沙盘数据
    那么 每类状态按 sectionId 保存在本任务的 SandboxSession
    并且 装修组件顺序与样式、营销配置和经营分析结论出现在证据快照
    并且 不属于 student1 的 StudentTask 读取和写入均返回 404

  场景: BDD-C-004 未完成必做项时禁止提交
    假如 student1 只完成部分必做步骤
    当 student1 提交工单
    那么 接口返回 422 TASK_INCOMPLETE
    并且 missingItems 精确包含未完成的 sectionId 和 stepId
    并且 数据库不创建 SubmissionVersion

  场景: BDD-C-005 完成后幂等提交真实 Submission
    假如 student1 已完成所有必做区块
    当 student1 使用同一 Idempotency-Key 提交两次
    那么 只创建一个 Submission 和一个 SubmissionVersion
    并且 SubmissionVersion.artifact 保存冻结的沙盘状态
    并且 StudentTask 状态持久化为 SUBMITTED
    并且 刷新或重新登录后仍显示待批阅

  场景: BDD-C-006 左图右练在移动端可用
    假如 student1 在 390px 视口打开沙盘
    那么 指导书与工作台纵向排列
    并且 页面没有水平溢出
```
