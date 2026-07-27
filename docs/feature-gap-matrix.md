# 智能体与参考产品功能差距表

状态分类：已实现 = 当前代码有可用原型；部分实现 = 有页面或本地状态但缺少完整业务闭环；缺失 = 未发现对应实现。参考产品一栏只写功能抽象，不复制品牌、文案、素材或私有接口。

| 功能模块 | 参考产品中的功能 | 智能体当前状态 | 缺失内容 | 优先级 | 预计涉及的页面 | 预计涉及的数据和接口 | 验收标准 |
|---|---|---|---|---|---|---|---|
| 登录认证 | 账号登录、退出、会话失效 | 缺失；本地身份选择 | 登录、退出、会话续期、失效跳转 | P0 | `/practicum/profile`、所有受保护页 | `User`、`Session`；登录/退出/当前用户 | 未登录访问受保护页被拦截；退出后数据不泄露 |
| 角色权限 | 管理员、教师、学生分工 | 部分实现；OWNER/STUDENT 主流程 | TEACHER、MENTOR 独立权限和服务端校验 | P0 | Shell、profile、members、reviews、data | `Role`、`Permission`、`Membership` | 菜单、直达 URL、接口三层权限一致 |
| 实训室工作台 | 实训室上下文、状态、快捷入口 | 已实现本地工作台 | 真实实训室切换、状态同步 | P0 | `/practicum`、room-settings | `TrainingRoom`；room detail | 不同组织/实训室数据隔离 |
| 教学计划列表 | 计划列表、创建、发布状态 | 部分实现；创建和展示已有 | 搜索、筛选、排序、分页、真实共享 | P0 | `/practicum`、plans | `Plan`；list/create/update/publish | 管理员可创建并看到状态；学生只见已发布 |
| 计划编辑器 | 多级目录、活动、辅助资料维护 | 已实现本地编辑器 | 服务端保存、并发冲突、批量操作 | P0 | `plans/:planId/edit` | `CurriculumNode`、`Activity`；tree CRUD | 新增/编辑/删除/刷新后状态保留 |
| 学生学习 | 进入教学、按活动学习和完成 | 已实现主要活动类型 | 学生端实际导航、计划卡片链接契约需统一 | P0 | learn、activities、tasks | `LearningPosition`、`ActivityProgress` | 学生能从首页进入下一项并恢复位置 |
| 实训活动 | 软件操作、训练、实践提交 | 已实现本地状态机 | 多用户提交、附件、服务端状态 | P0 | activities、submissions | `ActivityAttempt`、`SubmissionVersion` | 草稿、提交、退回、再提交可持久化 |
| 资源管理 | 资源添加、查看、发布、移除、筛选 | 部分实现；列表和分页本地化 | 资源详情、真实资源库、上传和发布接口 | P1 | resources、activities | `Resource`；resource CRUD/upload | 筛选/分页正确；移除需确认；资源权限正确 |
| 成员管理 | 添加成员、邀请、分组、角色管理 | 部分实现；本地成员和角色修改 | 邀请链接、申请列表、教师角色、批量管理 | P0 | members、profile | `Membership`、`Invite`、`Group` | 邀请、加入、角色变更、移除有审计和权限 |
| 落地页/介绍 | 实训室介绍和图片视频营销位 | 部分实现；只保存文本和媒体元数据 | 文件上传、预览、大小/格式校验、发布 | P1 | room-settings | `LandingPage`、`Asset`；upload/save | 上传失败可重试；刷新后内容不丢失 |
| 批阅中心 | 待批阅、已批阅、计划/课堂作业、详情 | 已实现计划审核和评分原型 | 课堂作业视图、教师工作台、真实队列 | P0 | reviews、submissions | `ReviewQueue`、`Grade`；review/grade | 退回、评分、量规校验和历史不可变 |
| 数据中心 | 完成率、成员数据、计划数据、播报、排行、导出 | 部分实现；本地统计和导出模拟 | 真实聚合、时间范围、成员/计划详情、文件导出 | P1 | data-center、progress | `RoomStats`、`MemberStats`；stats/export | 统计与提交状态一致；导出可下载 |
| 通知反馈 | 通知数量、列表、已读、深链 | 已实现本地通知 | 服务端推送、跨端同步、更多异常 | P1 | topbar、notifications | `Notification`；list/read/count | 已读持久化；无权深链不泄露 |
| 搜索筛选分页 | 资源、成员、批阅等列表查询 | 部分实现；主要是前端过滤/分页 | 服务端查询、排序、分页边界 | P1 | resources、members、reviews | Query DTO、分页响应 | 查询条件刷新后可解释且数据正确 |
| 异常状态 | loading、空数据、失败、无权限、重复提交 | 已实现较多页面状态 | 统一错误码、重试、网络断开、会话失效 | P0 | 全部页面、Shell | `ApiError`、error boundary | 每类异常有明确反馈和安全返回路径 |
| 移动端 | 管理端和学生端响应式使用 | 已有 375/1440 回归和 CSS | 关键页面逐页验证 768/1024，表格移动策略 | P1 | 全部页面 | 无新增核心模型 | 无水平溢出；关键操作可达且目标尺寸足够 |
| 安全审计 | 权限、数据隔离、敏感信息保护 | 原型前端守卫 | 后端授权、审计日志、CSRF、上传安全 | P0 | API 层、所有管理页 | AuthZ、AuditLog、UploadPolicy | 越权请求服务端拒绝；无凭据进入前端 |
