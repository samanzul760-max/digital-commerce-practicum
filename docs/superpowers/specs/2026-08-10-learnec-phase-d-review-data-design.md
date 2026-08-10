# LearnEC Phase D Review and Data Design

## Goal

在不跨越阶段 E 的前提下，完成管理员对学生已提交工单的证据审查、70/30 综合评分、退回重做、成绩审计、班级学情与 `.xlsx` 导出。

## Decision

采用新的 `/api/admin/reviews` 和 `/api/admin/data` 领域 API，并复用阶段 B 的 `PlanAssignment` 权重、阶段 C 的 `SubmissionVersion`、`SubmissionPart`、`SandboxSnapshot` 与 `TaskEvent`。不读取浏览器缓存，不以页面状态作为评分依据。

`Grade` 保存当前有效的自动分、人工分、权重、总分和评语；每次写入评分在 `GradeRevision` 追加不可变快照。自动原始分取当前提交版本所有区块的平均：已有 `autoScore` 使用该值，已完成但没有单项自动分的区块按 100 计，未完成按 0 计。总分为 `autoRaw * autoWeight / 100 + manualRaw * manualWeight / 100`，保留两位小数。

退回只允许 `SUBMITTED` 状态，反馈必填；重新提交沿用阶段 C 的新增 `SubmissionVersion` 行为。评分允许针对当前版本首次评分或修订评分，客户端须携带 `expectedVersion` 防止将旧证据误评分。

## UI and Data Flow

`/admin/reviews` 使用三列固定职责布局：左列为状态筛选后的提交队列；中列展示当前版本的区块产物、沙盘快照和事件时间线；右列展示权重计算、人工分输入、评语、评分修订和退回操作。窄屏改为纵向区域，不横向溢出。

`/admin/data` 读取真实聚合数据，展示班级完成率、已批阅平均分、区块自动得分率和成绩排行；管理员可选择授权班级下载 `.xlsx`。导出字节流由服务端 `exceljs` 生成，并写入 `AuditEvent`，前端仅触发下载。

## Authorization and Failure Rules

所有新 API 均要求 `ADMIN`，并通过 `requireClassStaff` 验证工单班级属于当前实训室范围。无权资源统一按不存在返回。评分范围为 0-100，评语与退回反馈不可为空；版本失配或状态不允许时返回 409；无数据时返回结构化空数组或空指标。

## Test Contract

端到端测试覆盖：队列隔离、证据回溯、自动/人工加权结果、两次评分的修订审计、无反馈退回拒绝、退回后重提新版本、真实 `.xlsx` 下载及导出审计；同时覆盖学生与管理员路由权限和 390px 无水平溢出。
