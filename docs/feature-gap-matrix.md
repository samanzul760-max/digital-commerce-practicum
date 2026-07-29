# 功能差距矩阵

审计日期：2026-07-27。状态以当前源码、测试文件和本轮新鲜命令为准。`PASS` 只用于已具备实现和对应证据的单一能力；未完成项保持原状态，不因局部 API 存在而升级。

| 模块 | 功能 | 证据 | 角色/路由 | 当前状态 | 缺失行为 | 数据/API | BDD | TDD/API | Playwright | 优先级 | 验收标准 | 验证结果 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 认证 | 独立登录、首次管理员开通、退出、会话刷新 | FACT：认证 API、HttpOnly cookie、`auth-session.spec.ts`、`auth-bootstrap.spec.ts` | OWNER/STUDENT；`/practicum/login`、受保护页 | IMPLEMENTED_UNVERIFIED | 仍待全量回归、生产部署与远程健康验证；多实例 session/账号存储未实现 | `User`、`Session`；`/api/auth/*` | AUTH-001~008 | 认证 Playwright | auth-session、auth-bootstrap（含 390px） | P0 | 未登录拦截、一次开通、错误不泄露、刷新保持、退出失效 | 本轮 focused 8/8 GREEN；typecheck/build GREEN |
| 权限 | OWNER/TEACHER/MENTOR/STUDENT 菜单与服务端对象授权 | FACT：服务端角色、room 授权与教师受限工作台存在 | OWNER/TEACHER/MENTOR/STUDENT；管理路由/API | PARTIAL | 教师作业、公告、批阅授权和审计日志、CSRF 尚未实现 | `Role`、`roomIds` | `SB-Q-02`、`SB-Q-03` | `context-api.spec.ts` | `context-ui.spec.ts` | P0 | 菜单、直达 URL、API 三层一致 | 教师授权 API 与登录 UI GREEN；全矩阵待续 |
| 工作台 | 组织、实训室上下文与计划入口 | FACT：组织/实训室上下文通过服务端会话持久化，顶部栏可切换 | OWNER/TEACHER/STUDENT；`/practicum`、`/api/practicum/context` | PARTIAL | 现有计划、资源等查询尚未全部按“当前选择的实训室”收窄 | `Organization`、`TrainingRoom`；`/api/practicum/context`、`/organizations/:id/select` | `SB-G-02`~`SB-G-04` | `context-api.spec.ts` | `context-ui.spec.ts`（桌面/390px/刷新） | P0 | 显示、切换、刷新保持且仅返回已授权实训室 | 本轮 7/7 GREEN；数据查询隔离待后续切片 |
| 教师教学 | 课堂作业草稿、发布与幂等保护 | FACT：教师作业服务端状态机已落地 | TEACHER；`/api/practicum/assignments` | PARTIAL | 作业列表、学生可见范围、公告、授课模式和页面尚未接入 | `ClassroomAssignment`；`/assignments`、`/assignments/:id/publish` | `SB-T-04`、`SB-T-06`、`SB-W-07` | `assignments-api.spec.ts` | 待补 | P0 | 教师创建草稿、发布且重复请求不重复创建 | API 1/1 GREEN |
| 计划 | 列表、创建、编辑、发布、归档 | FACT：服务端计划 API 已存在，页面仍有 store 路径 | OWNER/STUDENT；`/practicum/plans` | PARTIAL | 页面完整迁移、共享数据和刷新证据不足 | `Plan`、`CurriculumNode`；`/api/practicum/plans*` | PLANS-001 | `plans-api.spec.ts` | curriculum-editor | P0 | 服务端状态、版本冲突、刷新保持 | 部分验证 |
| 学习 | 学习位置、进度、活动完成 | FACT：主要逻辑在 store/localStorage | STUDENT；`/practicum/learn/*` | MOCK | 多用户服务端进度和跨端恢复缺失 | `LearningPosition`、`ActivityProgress` | S3-01~S3-10 | 现有 E2E | student-activities | P0 | 进度服务端持久化并隔离 | MOCK |
| 提交 | 保存草稿、提交、退回、再提交、评分 | FACT：提交 API 和审核 API 已有；页面仍保留本地兼容路径 | STUDENT/OWNER；activities/reviews/submissions | PARTIAL | 草稿服务端化、页面彻底移除本地回退 | `SubmissionVersion`；`/api/practicum/submissions*` | BDD-SUBMISSION-001~006 | `submissions-api.spec.ts` | teacher-review、submission-server-source | P0 | 版本不可变、幂等、刷新、越权、错误状态 | 本轮队列来源 GREEN；整体 PARTIAL |
| 资源 | 列表、筛选、删除、上传元数据 | FACT：查询/删除/API 校验存在 | OWNER；`/practicum/resources` | PARTIAL | 详情、发布、对象存储、病毒扫描、断点续传 | `Resource`、`Asset`；`/api/practicum/resources`、`/assets` | ASSUME-S2-001 | platform API | administration | P1 | 权限、确认、分页、上传校验 | 部分验证 |
| 成员 | 列表、角色修改、移除 | FACT：API 存在，页面保留 store 渲染 | OWNER；`/practicum/members` | MOCK | 邀请、申请、批量管理、审计 | `Membership`、`Invite`；`/api/practicum/members` | MEMBER-001 | platform API | administration | P0 | 变更服务端持久化且有权限 | MOCK |
| 实训室介绍 | 文本、媒体元数据 | FACT：页面保存原型数据 | OWNER；`/practicum/room-settings` | MOCK | 文件上传、预览、发布 | `LandingPage`、`Asset`；assets API | ROOM-001 | upload contract | administration | P1 | 格式/大小校验、失败重试、刷新保持 | MOCK |
| 审核中心 | 队列、退回、评分、历史 | FACT：服务端队列和提交动作已存在 | OWNER；`/practicum/reviews`、`submissions/*` | PARTIAL | 旧 store 兼容路径仍在详情页，教师工作台缺失 | `ReviewQueue`、`Grade` | BDD-SUBMISSION-001~006 | submissions-api | teacher-review、submission-server-source | P0 | 空/失败不泄漏本地数据，历史不可变 | 本轮 3/3 GREEN |
| 数据中心 | 统计、排行、导出 | FACT：stats API 存在，页面有模拟导出 | OWNER/STUDENT；`/practicum/data-center`、progress | PARTIAL | 时间范围、下钻、真实文件导出 | `RoomStats`、`MemberStats`；`/api/practicum/stats` | S5-09~S5-11 | platform API | slice-6-quality | P1 | 统计与服务端提交状态一致 | 部分验证 |
| 通知 | 列表、未读、已读、深链 | FACT：API 存在，页面仍有 store 路径 | OWNER/STUDENT；notifications | MOCK | 页面服务端迁移、跨端同步、完整深链授权 | `Notification`；`/api/practicum/notifications` | S5-05、S5-07 | platform API | existing E2E | P1 | 已读刷新保持且无权深链不泄露 | MOCK |
| 查询 | 搜索、筛选、排序、分页 | FACT：部分 API 支持 query，页面混用前端过滤 | OWNER/STUDENT；resources/members/reviews | PARTIAL | 全部列表统一服务端查询和边界证据 | `ListQuery`、`Pagination` | QUERY-001 | plans/platform API | focused list tests | P1 | 条件刷新保持，边界稳定 | 部分验证 |
| 异常 | loading、empty、error、forbidden、重复提交 | FACT：多页面已有状态，本轮新增空/错和重复来源覆盖 | 全角色；全路由 | IMPLEMENTED_UNVERIFIED | 网络断开、统一错误映射、会话失效需全量复核 | `ApiError`、request id | BDD-SUBMISSION-005/006 | API error assertions | submission-server-source | P0 | 每类状态可见且不泄露数据 | 本轮 3/3 GREEN |
| 移动端 | 关键页面响应式 | FACT：已有多尺寸测试，本轮新增 390px 登录表单 | 全角色；关键路由 | IMPLEMENTED_UNVERIFIED | 关键页面逐页复核 768/1024 | 无新增模型 | S6-Responsive、AUTH-007 | existing E2E | submission-server-source、auth-bootstrap | P1 | 无水平溢出、操作可达 | 本轮登录 390px GREEN |
| 安全审计 | 认证、隔离、上传安全 | FACT：HttpOnly、限流、request id、上传约束存在 | API 层 | PARTIAL | 审计日志、CSRF、多实例 session/DB/Redis | AuthZ、AuditLog、UploadPolicy | G-001 | platform API | access/navigation | P0 | 越权服务端拒绝，敏感信息不入代码日志 | 部分验证 |

## 缺失交付文档

本轮审计前 `reference-page-inventory.md`、`user-journeys.md`、`data-model.md`、`permission-matrix.md` 不存在，已按当前项目事实补齐，作为矩阵的引用依据。
