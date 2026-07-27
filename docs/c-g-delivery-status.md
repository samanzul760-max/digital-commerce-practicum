# C-G 实施状态

## Verified C-G additions in this delivery

- C: Submission review queue has server-side status filtering and pagination; the manager review page reads the queue from `/api/practicum/submissions`.
- D: Student submission, manager return, and manager grading are persisted server-side with version history and rubric validation. The activity page and review detail page call these APIs.
- E: Repository persistence remains `.data/practicum-data.json`; E2E runs use an isolated `.data-e2e` directory so test runs are repeatable without modifying development data.
- F: Submission events create role-scoped notifications; stats include submitted, graded, and returned counts; existing resource and notification APIs remain available.
- G: HttpOnly session checks, role checks, room isolation, idempotency, status transition checks, rubric range checks, and stable error codes are covered by API tests.

## Still not complete

- Plan, progress, data-center, member, and notification views still contain local prototype data in some paths. They are not yet a full server-backed migration.
- The repository is suitable for a single-process prototype, not multi-instance production deployment.
- File upload stores metadata and local files only; object storage, virus scanning, and resumable upload are outside this delivery.

## 已完成

- C：计划、资源、成员查询接口支持关键词、状态/类型筛选、排序或分页；计划 API 已覆盖详情。
- D：计划创建、编辑、发布、归档、资源删除、成员修改/移除具备服务端校验和状态约束；创建支持幂等键，计划编辑支持版本冲突检测。
- E：用户与实训室 ID 做服务端对象过滤，学生不能读取草稿和管理资源；数据持久化到 `.data/practicum-data.json`。
- F：资源元数据、通知读取/已读、统计聚合、文件上传策略已提供 API；资源管理页面已接入服务端资源 API。
- G：统一 request id、认证失败、无权限、状态冲突、上传类型/大小错误码；HttpOnly session、基础登录限流、安全文件名和上传大小限制已实现。

## 尚未完成

- 计划目录、学习进度、实践提交、审核评分仍主要使用 `usePracticumStore` 和浏览器 localStorage，尚未全部迁移到服务端 API。
- 成员和通知页面仍保留原型 store 渲染路径，服务端 API 已存在但页面迁移未完成。
- 文件当前保存到本机 `.data/uploads`，尚未接入对象存储、病毒扫描和断点续传。
- 数据层尚未迁移数据库/Redis，多实例部署和跨进程 session 仍不适合生产。
- 尚未新增独立 Vitest 单元测试；本次用 BDD + Playwright API/浏览器契约完成 RED/GREEN 验证。
