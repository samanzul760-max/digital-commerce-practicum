# 实践提交与审核 API BDD

## 事实

- 学生提交后产生版本记录，状态为 `SUBMITTED`。
- 管理员可以查看版本、退回并写入反馈，也可以按评分量表完成评分。
- 退回后再次提交会追加新版本，而不是覆盖历史版本。
- 学生不能读取管理端审核详情；服务端返回 `403/SUBMISSION_FORBIDDEN`。
- 状态变化和通知保存在服务端仓储中。

## 场景

### 学生提交实践成果

Given 学生已登录且活动属于已发布计划
When 学生提交非空文本
Then 返回 `201`、状态为 `SUBMITTED`，并追加一个版本

### 管理员退回提交

Given 提交状态为 `SUBMITTED`
When 管理员提供退回反馈
Then 状态变为 `RETURNED`，反馈包含版本号，学生收到通知

### 管理员评分

Given 提交状态为 `SUBMITTED`
When 管理员完成必填量表项并提供反馈
Then 状态变为 `GRADED`，保存评分人、分数、反馈和时间

### 审核队列只使用服务端结果

### C-STUDENT-007 任务列表按学生和实训室隔离

```gherkin
场景: 学生任务列表只返回当前学生可见任务
  假如 当前学生属于当前实训室
  当 学生请求 GET /api/practicum/student/tasks
  那么 每项都包含 status、availability、activity、source、availableAt 和 dueAt
  并且 不包含其他学生的任务
```

### C-STUDENT-008 任务详情按归属隔离

```gherkin
场景: 学生读取任务详情
  假如 任务属于当前学生
  当 学生请求 GET /api/practicum/student-tasks/:taskId
  那么 响应只包含当前学生自己的 draft、versions、feedback 和 grade
  但任务不存在或不属于当前学生时返回 404/TASK_NOT_FOUND
```

### C-STUDENT-009 提交校验和幂等

```gherkin
场景: 学生提交任务结果
  假如 任务状态为 AVAILABLE 或 RETURNED
  当 请求携带 Idempotency-Key 和非空 text 提交
  那么 返回 SUBMITTED 并创建一个新版本
  但空内容返回 422/SUBMISSION_INVALID，LOCKED、CLOSED、GRADED 返回 409
  并且 相同幂等键重试不会创建第二个版本
```

### C-STUDENT-010 教师退回和评分使用现有审核合同

```gherkin
场景: 教师审核学生提交
  假如 提交状态为 SUBMITTED 且教师拥有对应班级权限
  当 教师请求 POST /api/practicum/submissions/:activityId/return 或 /grade
  那么 服务端校验反馈、量表分数、班级范围和当前状态
  并且 事务失败时不写入半条状态、版本或评分记录
```

**BDD-SUBMISSION-005**

Given OWNER 已进入审核中心，浏览器本地仍残留一条旧提交记录
When 服务端审核队列返回空结果
Then 页面显示空队列，不显示本地残留的提交内容
And 刷新页面后仍保持空队列

### 审核队列服务端失败

**BDD-SUBMISSION-006**

Given OWNER 已进入审核中心
When 服务端审核队列请求失败
Then 页面显示可重试的错误状态，不显示本地残留的审核数据
## C-STUDENT-007 至 C-STUDENT-010 服务端学习数据合同

- 学生任务列表必须按当前会话学生 ID 和授权实训室过滤，并返回稳定的任务状态、可用性、发布时间、截止时间和来源字段。
- 学生任务详情必须只返回当前学生自己的提交版本、反馈和评分；不存在或越权时返回稳定的 `404/TASK_NOT_FOUND`，不返回其他用户数据。
- 提交 API 必须要求 `Idempotency-Key`，空内容返回 `422/SUBMISSION_INVALID`，锁定或非法状态返回 `409`，且失败请求不得写入版本。
- 退回和评分 API 必须校验教师班级范围、当前任务状态和必填反馈；事务失败时任务状态、提交版本和评分记录不得出现半写入。
