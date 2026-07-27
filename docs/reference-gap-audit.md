# 智能体与目标产品功能缺口审计

审计日期：2026-07-27  
项目：智能体 / 数字商贸实训工作台  
目标参考产品：小鹿电商 / 实战宝电商实训平台

## 0. 结论先看

当前项目已经有一套可操作的前端原型，包含工作台、计划、课程目录、学习活动、提交审核、成员、资源、通知和数据中心页面。用户“看不出变化”的根本原因不是页面完全空白，而是这些能力主要由 seed 数据、单一 Pinia 风格 store 和浏览器 localStorage 驱动，刷新只是在本机恢复状态，不能形成真实账号、多用户、组织隔离和服务端业务闭环。

本次审计不修改应用代码，只新增审计文档。后续实施应优先补齐基础设施和真正缺失的业务能力，而不是继续重复做已有页面的展示层小修补。

## 1. 审计范围与证据等级

### 1.1 观察到的事实

- 项目路径为 `C:\Users\29053\Desktop\智能体\数字商贸实训工作台`。
- 项目使用 Nuxt 3、Vue 3、TypeScript、Playwright。
- 当前 Git 基线为 `33d68a2 feat(practicum): complete phase b learning workflow`，工作区审计开始前无未提交修改。
- 当前项目没有发现 `server/` 业务接口目录、数据库访问层、认证服务或 API repository。
- `composables/usePracticumStore.ts` 从 `data/practicum/*-seed.ts` 读取种子数据，并使用浏览器 `localStorage` 保存业务状态。
- 当前页面路由覆盖工作台、计划、计划编辑、学习、活动、资源、成员、实训室设置、审核、提交详情、进度、数据中心、通知、任务和案例。
- 当前项目已有 OWNER/STUDENT 两个主要可用视角；TEACHER/MENTOR 不是完整可用的独立工作台。
- `npm.cmd run typecheck`、`npm.cmd run build` 和已有 practicum E2E 测试此前通过；`package.json` 没有 lint 脚本。
- 目标网站公开入口返回 HTTP 200，页面标题为“公共实训平台 | shizhanbao.cn”。公开 HTML 主要是前端应用壳，包含 Vue、路由、Axios 和业务脚本。
- 目标网站公开业务脚本中可观察到以下抽象能力线索：实训室、计划、课程、项目、任务、成员、审核/批阅、数据统计、学生端、教师端、团队、申请/邀请、发布/上下线、附件/上传、软件项目和竞赛等。
- 公开脚本中出现过的接口字符串包括 `/api/passport/doLogin`、`/api/trainingRoom/detail`、`/api/trainingRoom/fetchTrainingRoomUserList`、`/api/trainingRoom/apply`、`/api/trainingRoom/publishTrainingRoom`、`/api/plan/deletePlan`、`/api/upload/fileUpload`、`/api/upload/getStsToken` 等。

### 1.2 推测，不当作已确认事实

- 目标产品很可能具备完整的登录态、实训室成员关系和角色权限，因为脚本中同时出现登录、加入申请、管理员/学生/教师路由以及“无权限/未加入”提示。
- 目标产品很可能采用服务端分页、统计聚合和对象存储上传，但公开入口没有展示完整请求参数、响应结构或数据库模型。
- 目标产品的教师、导师、管理员可能是不同权限层级；具体权限矩阵仍需要在用户授权的本机浏览器会话中逐页核对。

### 1.3 建议

- 将目标网站只作为功能和业务流程参考，使用智能体自己的品牌、文案、素材和数据。
- 不把公开脚本中出现的接口名直接当作目标 API，也不调用或复制目标产品私有接口、Cookie、Token、验证码或真实内容。
- 在建立真实后端前，先确定角色命名、组织模型和数据隔离规则，否则后续页面会反复返工。

## 2. 当前项目已有能力

| 模块 | 当前已有 | 当前实现性质 |
|---|---|---|
| 工作台 | OWNER/STUDENT 工作台、侧边导航、顶部通知和个人入口 | 前端原型 |
| 计划 | 列表、创建、详情、编辑、发布、撤回、归档 | 本地 store + seed |
| 课程目录 | 模块/单元/活动树，新增、编辑、删除、排序和活动配置 | 本地 store |
| 学习 | 学习计划、下一活动、学习位置、进度摘要 | 本地 store |
| 活动 | 软件操作、训练问答、实践活动 | 本地状态机 |
| 提交审核 | 草稿、版本、提交、退回、评分、反馈 | 本地模拟闭环 |
| 资源 | 资源列表、搜索、类型筛选、状态管理 | 元数据原型，非真实上传 |
| 成员 | 成员列表、分组、角色修改、移除 | 本地成员数组，无邀请审批 |
| 实训室设置 | 介绍文字和媒体 URL 元数据 | 本地字段，无对象存储 |
| 数据中心 | 指标、排行榜、导出入口 | 本地聚合/模拟导出 |
| 通知 | 未读数、列表、单条/全部已读、深链 | localStorage |
| 案例 | 原创案例库和部分可提交案例 | 项目自有 seed 内容 |
| 状态体验 | 部分页面有 loading、empty、forbidden、error、success | 前端状态 |
| 持久化 | 浏览器刷新后恢复本机状态 | 不是多用户持久化 |

## 3. 真正缺失的功能

以下项目不是“页面没有”，而是“业务能力没有完成”。

| 优先级 | 缺失能力 | 现状 | 必须补齐的结果 |
|---|---|---|---|
| P0 | 真实登录/退出/会话 | 只有身份选择，未验证账号 | 登录、退出、刷新恢复、过期跳转、密码不落前端日志 |
| P0 | 用户与组织隔离 | seed + localStorage 共用 | 每个用户只能看到所属组织/实训室和授权计划 |
| P0 | 服务端权限 | 主要是前端守卫 | 页面、接口、对象级权限都由服务端再次校验 |
| P0 | 实训室生命周期 | 本地 room 对象 | 创建、加入申请、审核、退出、发布/下线和切换实训室 |
| P0 | 计划真实闭环 | 本地创建编辑发布 | 数据库保存、并发冲突处理、发布版本和学生分配 |
| P0 | 活动/提交真实闭环 | 本机状态机 | 按用户保存尝试、版本、附件、评分和历史 |
| P0 | 教师/导师工作台 | TEACHER/MENTOR 未开放 | 独立导航、班级/计划/审核权限和数据范围 |
| P1 | 成员邀请与申请审批 | 只有本地增删改 | 邀请链接/邀请码、申请列表、审核、过期和审计 |
| P1 | 真实资源上传 | 仅资源元数据或 URL | 文件校验、对象存储、预览、删除、权限和失败重试 |
| P1 | 服务端搜索筛选分页 | 主要前端过滤 | Query DTO、稳定排序、总数、分页边界和空结果 |
| P1 | 统计与导出 | 本地计算/模拟 | 服务端聚合、时间范围、导出任务和下载权限 |
| P1 | 服务端通知 | 本地通知数组 | 事件产生、跨设备同步、已读回执和无权限深链处理 |
| P2 | 审计日志 | 未实现 | 记录成员、权限、发布、删除、评分和上传等敏感操作 |
| P2 | 安全和并发 | 原型级 | CSRF、限流、幂等键、乐观锁、上传安全和敏感数据保护 |
| P2 | 生产部署验收 | 本次部署曾因 SSH 密码等待而未验证完成 | 自动化无交互部署、远程构建、PM2/Nginx/健康检查和回滚 |

## 4. 页面差异审计

| 页面/能力 | 当前智能体 | 目标侧公开证据 | 差异结论 |
|---|---|---|---|
| 登录 | `/practicum/profile` 是身份选择页 | 脚本出现 `/api/passport/doLogin` 和登录态提示 | P0 缺失真实认证 |
| 实训室入口 | 工作台展示单一 seed room | 脚本出现 room detail、lists、create、apply、join invite、leave | P0 缺少实训室选择和成员关系 |
| 管理员计划 | 已有列表/编辑/发布原型 | 出现 manager plan、plan data、update/delete 字符串 | 页面有，服务端闭环缺失 |
| 教师计划 | 未形成独立角色工作台 | 出现 teacher plan detail 路由 | P0 缺独立角色和权限边界 |
| 学生计划 | 已有学习页和活动页 | 出现 student plan、plan detail、todo、work 路由 | 基本流程有，真实用户数据缺失 |
| 成员管理 | 本地列表、角色/分组/移除 | 出现 user list、apply、batch check、team/member 相关接口 | P1 缺申请、邀请、审批、批量操作 |
| 资源/附件 | 元数据和筛选原型 | 出现 attachment list/save/remove/sort、fileUpload、STS token | P1 缺真实文件链路 |
| 审核/批阅 | 有本地提交、退回、评分 | 出现 mark/review/work 相关路由/接口线索 | 页面有，队列和历史需服务端化 |
| 数据统计 | 有本地数据中心 | 出现 stats、member data、plan user data 等线索 | 统计需真实聚合和导出任务 |
| 团队 | 当前只有成员 group 字段 | 出现 team create/list/invite/join/role 相关线索 | P1/P2 缺团队实体和生命周期 |
| 软件/项目 | 有软件活动抽象 | 出现 software project/shop/team rank 等线索 | 需明确是否纳入首版，不应直接复制第三方业务 |

## 5. 用户角色与权限缺口

| 角色 | 当前项目 | 需要的真实能力 | 优先级 |
|---|---|---|---|
| 平台管理员/所有者 | OWNER 原型 | 组织、实训室、成员、计划、资源、审计和全局统计 | P0 |
| 教师 | 未独立实现 | 管理自己负责的班级/计划、布置任务、审核和反馈 | P0 |
| 导师 | 未独立实现 | 只访问被分配的团队/项目/学生范围 | P1 |
| 学生 | STUDENT 原型 | 只看已分配计划，完成活动、提交、查看反馈和通知 | P0 |
| 访客/未登录 | 没有真实会话边界 | 只能访问公开入口，受保护资源跳登录 | P0 |

必须实现三层权限：

1. 导航层：菜单是否显示。
2. 页面层：直接输入 URL 是否允许进入。
3. 服务端资源层：接口和对象是否允许读取/修改。

当前只完成了第 1、2 层的前端原型，缺第 3 层。

## 6. 数据模型缺口

当前类型已有 `TrainingRoom`、`Plan`、`CurriculumNode`、`Activity`、`Submission`、`Notification` 等概念，但缺少真实系统所需的主键关系、租户字段、审计字段和并发字段。

建议增加以下后端实体：

| 实体 | 关键字段 |
|---|---|
| User | id、手机号/邮箱、密码摘要、状态、最后登录时间 |
| Organization | id、名称、状态、创建者、创建时间 |
| TrainingRoom | id、organizationId、ownerId、状态、发布状态、版本 |
| Membership | id、roomId、userId、role、groupId、status、joinedAt |
| Invite/Application | id、roomId、申请人/邀请人、token 摘要、状态、过期时间 |
| Plan | id、roomId、ownerId、状态、版本、发布时间 |
| CurriculumNode | id、planId、parentId、sort、状态、版本 |
| ActivityAttempt | id、activityId、studentId、状态、内容、updatedAt |
| Submission | id、activityId、studentId、latestVersion、status |
| SubmissionVersion | id、submissionId、version、content、submittedAt |
| Attachment | id、ownerId、roomId、objectKey、mime、size、checksum、status |
| Review | id、submissionVersionId、reviewerId、scores、feedback、createdAt |
| Notification | id、recipientId、eventType、targetId、readAt、createdAt |
| AuditLog | id、actorId、action、resourceType、resourceId、result、createdAt |

所有业务表都应带组织/实训室归属或能通过关系稳定推导归属，不能依赖前端传入的 ownerId。

## 7. 建议的 API 契约

以下是智能体自己的建议接口，不是目标网站接口复制。

| 领域 | 建议接口 |
|---|---|
| Auth | `POST /api/auth/login`、`POST /api/auth/logout`、`GET /api/auth/session`、`POST /api/auth/refresh` |
| Rooms | `GET/POST /api/rooms`、`GET/PATCH /api/rooms/:id`、`POST /api/rooms/:id/publish` |
| Membership | `GET /api/rooms/:id/members`、`POST /api/rooms/:id/invites`、`POST /api/rooms/:id/applications/:applicationId/decision` |
| Plans | `GET/POST /api/rooms/:id/plans`、`GET/PATCH/DELETE /api/plans/:id`、`POST /api/plans/:id/publish` |
| Curriculum | `GET/POST /api/plans/:id/nodes`、`PATCH/DELETE /api/nodes/:id`、`POST /api/plans/:id/reorder` |
| Activities | `GET /api/activities/:id`、`PUT /api/activities/:id/attempt`、`POST /api/activities/:id/complete` |
| Submissions | `POST /api/activities/:id/drafts`、`POST /api/submissions/:id/submit`、`GET /api/submissions/:id` |
| Reviews | `GET /api/reviews/queue`、`POST /api/submissions/:id/return`、`POST /api/submissions/:id/grade` |
| Attachments | `POST /api/uploads/presign`、`POST /api/uploads/complete`、`DELETE /api/attachments/:id` |
| Stats | `GET /api/rooms/:id/stats`、`GET /api/rooms/:id/stats/export` |
| Notifications | `GET /api/notifications`、`POST /api/notifications/:id/read`、`POST /api/notifications/read-all` |

统一响应至少需要 `data`、`error.code`、`error.message`、`requestId`；列表需要 `items`、`page`、`pageSize`、`total`。

## 8. 分阶段实施清单

### 阶段 A：认证、租户和权限基础

- 新增数据库连接、迁移、服务端 session 和用户表。
- 把身份选择改成真实登录和退出。
- 为所有受保护页面增加 session 获取和失效跳转。
- 将 OWNER/STUDENT 之外的教师、导师权限先定义清楚，再实现对应守卫。
- 验收：两个用户登录后看不到彼此实训室数据；退出后不能访问受保护接口；直接访问 URL 和接口均返回正确权限结果。

### 阶段 B：实训室、成员、邀请和申请

- 新增实训室列表/切换/创建状态。
- 新增成员邀请、邀请码或链接、申请列表、同意/拒绝、退出实训室。
- 保留现有成员页面外观，但改为 API 驱动。
- 验收：申请状态可从待审核到通过/拒绝；邀请过期、重复处理和无权限操作有明确结果。

### 阶段 C：计划和课程目录真实 CRUD

- 将计划、目录节点、活动配置迁移到数据库。
- 增加服务端搜索、筛选、排序和分页。
- 增加版本号/乐观锁，处理并发编辑。
- 验收：新增、编辑、删除、排序、发布后刷新和多浏览器查看都保持一致。

### 阶段 D：学习、提交、审核状态机

- 按学生保存活动尝试、草稿、提交版本、附件和反馈。
- 服务端校验状态转换：草稿 -> 已提交 -> 退回/已评分。
- 审核队列只显示有权限范围内的提交，重复提交使用幂等控制。
- 验收：学生和教师在不同会话中能完成完整闭环，刷新和重新登录后状态仍在。

### 阶段 E：资源上传和媒体管理

- 接对象存储预签名上传或现有服务器存储。
- 校验大小、MIME、扩展名、文件名和病毒扫描策略。
- 处理上传中、成功、失败、取消、重试、删除和无权限下载。
- 验收：真实文件可上传、预览、删除，刷新后可访问，跨组织不可访问。

### 阶段 F：通知、统计和导出

- 从发布、提交、退回、评分、邀请等事件生成服务端通知。
- 统计改为服务端聚合，支持时间范围、计划和成员维度。
- 导出改为受权限保护的任务或流式下载。
- 验收：两端通知同步；统计与明细一致；无权限用户不能导出他人数据。

### 阶段 G：安全、异常和性能

- 统一错误码、requestId、错误边界、登录过期、网络失败和重试策略。
- 增加审计日志、限流、CSRF、幂等键和 SQL/对象级权限测试。
- 对列表和统计增加索引、缓存或分页边界保护。
- 验收：未登录、越权、重复提交、过期邀请、超大文件、接口失败均可恢复且不泄露数据。

### 阶段 H：浏览器验收、部署和回滚

- 扩充 Playwright 覆盖真实登录、成员申请、计划 CRUD、学习提交、审核、上传、通知、统计和移动端。
- 完成远程构建、PM2 健康检查、Nginx/端口检查和回滚说明。
- 当前已知部署风险：`npm.cmd run deploy:new-ecs` 曾停在等待 SSH 密码，不能据此宣称已部署。
- 验收：本地和服务器构建通过，健康检查通过，失败可回滚到最近 Git 提交。

## 9. MVP 建议

### MVP 必须做

1. 真实登录、退出和 session 过期。
2. 一个组织下的实训室创建/加入/成员审批。
3. OWNER、TEACHER、STUDENT 三种可验证角色；导师可暂缓，但要明确禁止误用。
4. 计划与课程目录真实 CRUD、发布和学生可见性。
5. 学生活动完成、实践提交、教师退回/评分。
6. 基本通知、错误处理、服务端权限和刷新持久化。

### MVP 可以暂缓

- 复杂竞赛、团队排名、证书、AIGC、外部电商软件联动。
- 高级统计、复杂导出、消息推送和多级运营后台。
- 大规模对象存储优化和细粒度审计报表。

MVP 的判断标准是“两个真实账号能在一个真实实训室里完成从加入、学习、提交到审核的闭环”，不是“页面数量足够多”。

## 10. 风险、依赖与需要确认的产品决策

- 需要确定登录方式：手机号验证码、账号密码或统一身份认证。
- 需要确定数据库和部署环境，以及是否允许新增后端服务。
- 需要确定 OWNER、TEACHER、MENTOR、STUDENT 的最终权限矩阵。
- 需要确定一个学生是否可加入多个实训室、一个计划是否可分配多个班级。
- 需要确定上传文件类型、大小、保留周期和对象存储供应商。
- 需要确认服务器 SSH 是否配置密钥；否则部署只能停在本地等待密码，不能自动验收。

## 11. 本次交付边界

- 本次只完成审计文档，没有修改应用代码、数据、Git 提交或部署状态。
- 报告中目标产品接口名只作为公开脚本中的观察线索，不代表已获得接口契约，也没有调用其私有业务接口。
- 未记录或写入任何账号、密码、Cookie、Token、验证码或登录态。
