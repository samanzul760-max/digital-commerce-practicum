# LearnEC 统一 UI 与真实功能对接设计

## 目标

在不重写现有计划、课程、审核、成员、培训室、统计和学生学习业务逻辑的前提下，将 `/practicum` 全部角色页面统一到 LearnEC 视觉系统。管理员首页必须从居中“正在同步工作台”升级为可持续使用的数据控制台，学生、教师和管理员共享同一套顶部品牌、导航、状态反馈和响应式规则。

## 已确认方案

采用“共享 LearnEC 外壳 + 现有业务适配层”。不采用仅覆盖 CSS 的表面修补，也不重写服务端业务。图表使用 Vue 兼容的 ECharts 并在数据中心页面懒加载；原稿 CSS 保留在 `assets/css/learnec-spec.css`，Nuxt 专属布局和交互只写入 `assets/css/learnec-nuxt.css`。

## 角色与会话

- `AuthUser` 增加 `authorizedRoles: PracticumRole[]`，`role` 表示当前会话的活动角色。
- `StoredSession` 增加 `activeRole`。登录时默认为账号原始角色；读取会话时用 `activeRole` 覆盖公开用户的当前 `role`。
- 新增 `POST /api/auth/switch-role`，请求 `{ role }`，必须携带有效 session 与 CSRF。服务端只允许切换到 `authorizedRoles` 中的角色，否则返回 `403 ROLE_NOT_AUTHORIZED`。
- OWNER 测试账号授权 `OWNER` 与 `STUDENT`，普通学生仅授权 `STUDENT`，教师仅授权 `TEACHER`。自定义 OWNER 默认授权 `OWNER` 与 `STUDENT`。
- 切换角色后刷新认证、工作区和页面数据；业务 API 继续使用 `requireAuthenticatedUser()` 返回的当前会话角色，前端本地状态不能提升权限。

## 共享 Header

- 左侧固定 LearnEC Logo：蓝色圆角 `L` 标志与粗体品牌文字。
- 主导航保持五项：`首页`、`课程大厅`、`学员中心`、`实操学习`、`管理控制台`。
- `实操学习` 优先进入当前已发布计划；无计划时进入课程大厅。
- `管理控制台` 对未授权账号显示为禁用项，不能触发越权请求；拥有 OWNER 或 TEACHER 授权时可先切换角色再进入。
- 右侧依次为身份分段控件、通知铃铛、头像与姓名、当前角色主操作按钮。
- 390px 下收敛为 Logo、当前页标题、铃铛和菜单按钮，导航与身份切换进入移动抽屉。

## 管理 Sidebar

- 一级入口固定为 `概览`、`课程 / 计划`、`成员与培训室`、`作业批改`、`成绩与分析`。
- 使用现有 `PracticumIcon` 线性图标；当前项使用 `--accent-soft` 背景和 `--accent-deep` 文本。
- 删除底部孤立“教学管理”卡片，不保留第二套入口。
- 侧栏只负责导航，不承担通知、指标或角色切换。

## 管理概览

- 页面加载时直接显示完整仪表盘骨架，包含标题、四个指标、计划表格和快捷操作占位，不显示居中同步提示。
- 四项指标为在读学员数、活跃培训室、待批改作业、课程完成率；分别来自成员、工作区、提交队列和分析接口。
- 每个接口独立结算。部分失败时保留已成功区域，并在失败区域显示可重试状态；不使用模拟统计值。
- 数据库状态由新增 `GET /api/practicum/health` 返回。接口仅执行 Prisma `$queryRaw` 的 `SELECT 1` 探针，输出 `database: 'online' | 'offline'` 与响应时间，不暴露连接串或数据库细节。
- 快捷操作连接现有真实路由：新建计划、计划管理、审核中心、成员管理、培训室设置和数据中心。

## 课程、计划与培训室

- 管理计划列表复用 LearnEC 课程卡的标题、分类色块、状态标签和主次操作层次。
- 课程发布、撤回、归档继续调用现有计划 API；课堂排课和培训室绑定继续使用现有 class assignment 与 workspace context 接口。
- 分类色仅使用原稿 `--c-orange`、`--c-blue`、`--c-green`、`--c-purple`，分类由稳定业务字段映射，不根据数组位置随机变化。

## 审核与成绩分析

- 审核列表继续以服务端 `/api/practicum/submissions` 为事实源；详情使用现有版本、退回、评分接口。
- 成绩分布、课程完成率和学习进度由现有 analytics 数据生成，使用 ECharts canvas 渲染；无数据时显示诚实空状态，不生成虚假分布。
- 图表颜色绑定 LearnEC tokens，交互仅包含 tooltip、筛选和可访问的文字摘要。

## Toast 与状态

- 新增 `usePracticumToast()`，状态保存在 Nuxt `useState`，支持 `success`、`error`、`info` 三种语义。
- `PracticumToastHost` 在 `app.vue` 全局挂载，使用 `role=status` 或 `role=alert`，自动关闭并允许手动关闭。
- 写操作成功、失败、角色切换和数据库不可用必须给出 Toast；页面仍保留就地错误信息，Toast 不替代可恢复状态。

## Docker 与 PostgreSQL

- `scripts/use-docker-postgres.ps1` 先检测 Docker 引擎是否可用，再选择 `docker compose` 或 `docker-compose.exe`。
- 引擎未运行时输出明确的 Docker Desktop 提示并快速失败，不进入两分钟无效等待。
- 不执行 `prisma db push`、`migrate reset`、删除容器或清空卷。数据库恢复后只运行现有 migration/fixture 流程。

## 测试与验收

- 先更新静态 UI 合同和 API 测试并确认 RED，再实现最小改动转为 GREEN。
- API 覆盖：授权角色切换成功、未授权角色拒绝、CSRF、刷新后角色保持、健康检查不泄露连接信息。
- UI 覆盖：五项顶栏、五项侧栏、无底部卡片、四个指标、骨架屏、Toast、管理员和学生角色切换、390px 无横向溢出。
- 浏览器路径覆盖学生与 OWNER 首页、课程、任务、计划、审核、成员、培训室和数据中心真实路由。
- 最终运行合同测试、相关 Playwright、`npm.cmd run typecheck` 和 `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build`，并保存学生端与管理员端截图。

## 非目标

- 不重写现有业务状态机、权限规则、计划或评分数据模型。
- 不连接、迁移或重置生产数据库，不执行远程部署。
- 不以前端本地角色、模拟数据或静态指标替代服务端事实。
