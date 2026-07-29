# 智能体服务端 API 契约（C-G 已实现切片）

## Submission review API

| Method | Path | Purpose | Permission |
|---|---|---|---|
| GET | `/api/practicum/submissions?page&pageSize&status` | Paginated review queue | OWNER |
| POST | `/api/practicum/submissions` | Create a student submission version | STUDENT |
| GET | `/api/practicum/submissions/:activityId` | Read current submission and version history | OWNER; owning STUDENT |
| POST | `/api/practicum/submissions/:activityId/return` | Return a submitted version with required feedback | OWNER |
| POST | `/api/practicum/submissions/:activityId/grade` | Validate rubric scores and finalize grading | OWNER |

Submission states are `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `RETURNED`, and `GRADED`. A graded submission is immutable; a returned submission may create a new version. Student writes accept `Idempotency-Key` to prevent duplicate requests.

## CSRF write protection

Every `POST`, `PUT`, `PATCH`, and `DELETE` request below `/api/practicum/` requires an authenticated `practicum_session` and the current session's `x-csrf-token` header. Login and first-owner bootstrap issue a same-site, non-HttpOnly `practicum_csrf` cookie only so the first-party client can copy it into that header; the session cookie remains HttpOnly.

Missing, expired, or mismatched tokens return `403 CSRF_INVALID` with `{ data: { code: 'CSRF_INVALID' } }` before any business data is changed. Requests without a session continue to endpoint authentication and retain the existing `401 AUTH_REQUIRED` contract.

### 本轮 UI 数据来源约束

- `GET /api/practicum/submissions` 返回 `{ items, total }`；`items: []` 是成功的空结果，不得回退到浏览器 `localStorage` 或 store 队列。
- 服务端 5xx/网络错误必须进入页面 error 状态，不得渲染本地残留审核数据。
- 本轮证据：`BDD-SUBMISSION-005`、`BDD-SUBMISSION-006`；`tests/e2e/practicum/submission-server-source.spec.ts`。

所有 `/api/practicum/*` 接口都要求 HttpOnly session。服务端按用户角色和 `roomIds` 做对象级过滤；前端守卫不等于安全边界。

## 认证与管理员开通

| 方法 | 路径 | 请求/响应 | 权限与错误 |
|---|---|---|---|
| GET | `/api/auth/bootstrap` | 返回 `{ available }` | 匿名可读；只暴露是否允许首次开通 |
| POST | `/api/auth/bootstrap-owner` | 请求 `identifier`、`displayName`、`password`；返回 `{ user }` 和 HttpOnly session cookie | 仅允许首次自定义 OWNER；`422 BOOTSTRAP_INVALID_INPUT`、`409 BOOTSTRAP_ALREADY_COMPLETED` |
| POST | `/api/auth/login` | 请求 `identifier`、`password`；返回 `{ user }` 和 HttpOnly session cookie | 失败为 `401 AUTH_INVALID_CREDENTIALS`，按来源地址限流 |
| GET | `/api/auth/session` | 返回当前 `{ user }` | 无有效会话为 `401 AUTH_REQUIRED` |
| POST | `/api/auth/logout` | 返回成功并清理 cookie | 撤销服务端会话 |

`user` 只包含 `id`、`identifier`、`displayName`、`role` 和 `roomIds`。密码、salt、摘要和 session token 永不出现在响应中。首次开通账号持久化于被 Git 忽略的 `.data/auth-users.json`。

## 计划

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/api/practicum/plans?page&pageSize&keyword&status&sort&direction` | 查询、筛选、排序、分页 | 登录用户；学生只看已发布 |
| POST | `/api/practicum/plans` | 创建草稿；支持 `Idempotency-Key` | OWNER |
| GET | `/api/practicum/plans/:planId` | 计划详情及目录 | 所属实训室；学生只读已发布 |
| PATCH | `/api/practicum/plans/:planId` | 带 `version` 的乐观锁更新 | OWNER、仅草稿 |
| POST | `/api/practicum/plans/:planId/publish` | 草稿发布 | OWNER |
| POST | `/api/practicum/plans/:planId/withdraw` | 撤回已发布计划，恢复为草稿 | OWNER |
| POST | `/api/practicum/plans/:planId/archive` | 已发布计划归档 | OWNER |

## 资源、成员和辅助能力

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/POST | `/api/practicum/resources` | 资源查询分页、创建 |
| DELETE | `/api/practicum/resources/:resourceId` | 删除资源 |
| GET | `/api/practicum/members` | 成员查询分页 |
| PATCH/DELETE | `/api/practicum/members/:memberId` | 修改成员分组/角色、移除成员 |
| GET | `/api/practicum/notifications` | 当前角色通知和未读数 |
| POST | `/api/practicum/notifications/:notificationId/read` | 标记通知已读 |
| GET | `/api/practicum/stats?roomId` | 实训室聚合统计 |
| POST | `/api/practicum/assets` | 上传受限类型文件并保存元数据 |

## 错误与安全

错误响应包含稳定 `data.code`；每个请求返回 `x-request-id`。常用错误码包括 `AUTH_REQUIRED`、`PLAN_FORBIDDEN`、`PLAN_VERSION_CONFLICT`、`PLAN_STATE_INVALID`、`UPLOAD_TYPE_NOT_ALLOWED` 和 `UPLOAD_TOO_LARGE`。

上传允许 PDF、PNG、JPEG、纯文本，单文件上限 5 MiB；服务端使用随机存储键和安全文件名，不向客户端返回本地路径。登录失败按来源地址做基础窗口限流。

当前数据层是项目 `.data/practicum-data.json`，适合单机部署验证；多实例生产环境仍需迁移到数据库和对象存储。
