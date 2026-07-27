# 智能体实施计划

本计划基于当前项目审计和参考产品的功能抽象制定。只复刻业务能力、页面结构和交互逻辑，不复制第三方品牌、文案、图片、视频或私有接口。

## 阶段 A：项目基础、布局、导航和权限

- 要修改的文件：`components/practicum/PracticumSidebar.vue`、`pages/practicum/index.vue`、受保护页面、`composables/usePracticumStore.ts`
- 要新增的文件：`domain/practicum/permissions.ts`、阶段 A Playwright 测试、BDD 文档
- 数据结构：`PracticumRole`、导航项、计划可见性、编辑/审核/提交/资源/成员/设置权限函数
- 页面行为：未选身份显示引导；管理员显示管理导航；学生只看到学习相关入口；直接访问受保护路由显示无权限状态；重复创建计划不可产生重复记录
- API 契约：当前为本地 store adapter；后续统一替换为 `GET /api/session`、`GET /api/navigation` 和服务端授权检查
- 验收标准：typecheck、build、Shell/access/navigation/phase-A 测试通过；页面具备 loading、empty、forbidden、success 等可观察状态
- 测试方法：Playwright 角色切换、菜单访问、直接 URL 访问、重复点击、刷新持久化
- 当前风险：权限仍是前端 prototype 守卫，没有真实会话和服务端二次校验

## 阶段 B：核心页面和核心用户流程

- 文件：工作台、计划详情、学习计划、活动执行、任务和审核页面
- 数据结构：`Plan`、`CurriculumNode`、`Activity`、`LearningPosition`、`Submission`
- 行为：管理员进入计划管理，学生从已发布计划进入学习并恢复上次位置，提交进入审核队列
- API：`GET /api/plans`、`GET /api/plans/:id`、`GET /api/activities/:id`、`GET /api/learning-position`
- 验收：管理员创建/查看计划；学生只能进入已发布计划；刷新后学习位置保留
- 测试：核心用户旅程 E2E、空计划、无效 ID、未发布计划
- 风险：当前数据为 seed/localStorage，跨账号隔离尚未成立

## 阶段 C：列表、详情、搜索、筛选和分页

- 文件：计划、成员、资源、审核和通知列表页
- 数据结构：统一 `ListQuery`、`Pagination`、列表项 DTO
- 行为：搜索、状态筛选、排序、分页、详情返回列表时保留查询条件
- API：各资源 `GET /api/{resource}?page=&pageSize=&keyword=&status=&sort=`
- 验收：条件组合正确，空数据和无结果可区分，分页边界稳定
- 测试：查询组合、分页边界、刷新和返回路径
- 风险：服务端排序和权限过滤必须在 API 层完成

## 阶段 D：新增、编辑、删除、提交和状态流转

- 文件：计划编辑器、资源、成员、活动和提交页面；表单校验模块
- 数据结构：`Create/Update` DTO、状态机、操作审计字段
- 行为：表单校验、防重复提交、草稿/发布/撤回、提交/退回/审核
- API：`POST/PATCH/DELETE /api/...`、状态动作接口 `/actions/...`
- 验收：非法输入不能提交；重复点击只产生一次写入；非法状态跃迁被拒绝
- 测试：前后端校验、并发重复操作、刷新后状态一致
- 风险：需要明确 TEACHER、MENTOR 与 OWNER 的最终权限边界

## 阶段 E：真实数据、数据库和接口

- 文件：Nuxt server routes 或独立 API 层、repository、数据库迁移和环境配置
- 数据结构：用户、组织、实训室、成员、计划、目录、活动、资源、提交、审核、通知
- 行为：以用户和组织为边界读写数据，服务端统一鉴权
- API：按 `docs/api-contract.md` 的资源契约实现，并统一错误码
- 验收：刷新、跨浏览器和多用户数据一致；越权请求服务端拒绝
- 测试：API contract、权限矩阵、数据库迁移和隔离测试
- 风险：部署环境、数据库选型和真实账号体系尚未确认

## 阶段 F：文件上传、通知、统计和辅助功能

- 文件：资源上传、实训室介绍、通知、数据中心和导出模块
- 数据结构：`Asset`、`Notification`、`RoomStats`、导出任务
- 行为：上传校验和失败重试，通知已读，统计筛选和导出
- API：`POST /api/assets`、`GET/PATCH /api/notifications`、`GET /api/stats`、`POST /api/exports`
- 验收：文件类型/大小受限；无权限不能读取资源；统计与业务状态一致
- 测试：上传成功/失败、通知深链权限、导出失败和移动端
- 风险：对象存储、病毒扫描和导出异步任务尚未接入

## 阶段 G：异常处理、权限、安全和性能

- 文件：统一错误处理、服务端授权、中间件、审计日志、限流和缓存
- 数据结构：`ApiError`、`AuditLog`、`PermissionDecision`
- 行为：未登录、无权限、过期会话、网络失败、冲突写入都有稳定反馈
- API：统一错误响应 `{ code, message, requestId, details }`
- 验收：不能泄露敏感字段；越权和过期会话被阻断；关键页面无明显控制台错误
- 测试：安全测试、异常注入、性能基准和并发写入
- 风险：当前 prototype 不能作为生产安全边界

## 阶段 H：浏览器验收、修复和部署

- 文件：验收报告、部署说明、回滚说明和 CI 检查
- 数据结构：测试账号、环境变量清单、发布版本信息
- 行为：按核心旅程执行桌面端和移动端验收，记录截图/错误和对应代码
- API：生产环境健康检查和版本信息接口
- 验收：核心页面可访问、核心流程可完成、构建成功、回滚路径可执行
- 测试：Playwright 全量分组、移动端 viewport、生产 smoke test
- 风险：未得到明确部署指令前不执行生产发布

## 当前执行位置

当前已完成阶段 A 的 prototype 范围：集中权限函数、Store 写操作门禁、主要页面权限显示和阶段 A 行为测试。阶段 B 以后仍需按上述验收标准逐步实现，真实认证、数据库和服务端权限不应在文档上宣称已完成。

## C-G 当前交付记录

C-G 已完成第一批服务端切片，详见 `docs/c-g-delivery-status.md` 和 `docs/api-contract.md`。已验证计划 CRUD/状态流转、对象级权限、资源/成员/通知/统计/上传 API、request id 和登录限流；学习活动、提交审核和成员/通知页面的完整服务端迁移仍在后续切片中，不标记为全部完成。
