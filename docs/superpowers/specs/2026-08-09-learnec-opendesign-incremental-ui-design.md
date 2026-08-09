# LearnEC Open Design 增量 UI 迁移设计

## 目标

以 Open Design 的 `learnec-local` 工程为视觉基准，重构 LearnEC 实训平台的展示层，同时保留现有 Nuxt 路由、鉴权、角色权限、`usePracticumServer` API 桥接和业务数据加载。

本次工作覆盖学生首页、课程大厅、学员中心、实操学习和管理控制台的共享外壳及核心展示模块。所有可点击元素必须有真实路由、状态切换、弹窗或 Toast 反馈；缺少后端接口的 Open Design 入口使用可复现的本地 Mock 状态兜底。

## 视觉系统

- 全局字体：`Plus Jakarta Sans`、`Inter`、系统无衬线字体和 `PingFang SC` 回退。
- 页面底色：`#F8FAFC`；表面：白色。
- 圆角：主卡片 `16px`，次级控件 `12px`，状态胶囊 `999px`。
- 阴影：基础双层柔和阴影 `0 10px 30px -5px rgba(0,0,0,.05), 0 4px 10px -2px rgba(0,0,0,.02)`；悬停态使用加深版本。
- 动效：可交互卡片与按钮使用 `0.2s cubic-bezier(0.4,0,0.2,1)`；卡片悬停上移 `4px`，并增强阴影。保留键盘 focus-visible 状态，且遵从减少动画偏好。

## 组件边界

| 模块 | 负责内容 | 保留依赖 |
| --- | --- | --- |
| `main.css` / `learnec-nuxt.css` | Token、基础元素、共享卡片、响应式与动画 | 既有语义类名和 focus 样式 |
| `PracticumShell` / `PracticumTopbar` / `PracticumSidebar` | 64px 顶栏、导航指示线、角色导航、通知与个人菜单 | 现有导航配置、角色权限、路由 |
| 首页 | 双栏 Hero、玻璃胶囊、继续学习、待办与骨架态 | 课程、进度和学生任务 API |
| `CourseCard` 与课程大厅 | 6 张多色课程卡、筛选、搜索、创建和批量发布 | `listPlans` 与现有计划权限 |
| 学员中心 | 欢迎 Banner、勋章、指标、进度和空状态 | 学员中心数据 composable 与现有路由 |
| 管理工作台 | 欢迎 Banner、指标、趋势胶囊、审核入口 | 提交、成员和计划 API |

## 数据与交互

- 既有请求只通过 `usePracticumServer` 或项目内已有 composable 发起；不以演示数据替换服务端数据。
- 课程视觉卡片在真实计划不足六条时，用独立的展示元数据补足颜色、类别、难度、评分和状态标签；点击仍进入真实课程或清晰的 Mock 详情反馈。
- Open Design 独有入口统一调用局部交互状态：打开可关闭的 Modal、更新列表/按钮状态或显示 Toast。提交型动作包含 loading、成功和失败状态。
- 所有空数据路径保留 `PracticumStatePanel` 或新增结构化空状态；加载路径显示骨架，不显示空白区域。

## 验收与测试

1. 增加或更新 Open Design UI 契约测试，断言核心 Token、Hero 胶囊、课程卡、勋章/指标、可点击入口与空状态。
2. 用 Playwright 覆盖学生和管理角色的首页、课程大厅筛选、继续学习、待办、管理入口和 Mock Modal/Toast。
3. 完成 `npm run typecheck`、`npm run build` 和相关 Playwright 测试。
4. 启动 Nuxt 开发服务并在桌面和移动宽度检查无横向溢出、图片可加载、按钮可操作。

## 边界与风险控制

- 不重写后端 API、数据库模型或权限规则。
- 不删除或回退工作区已有改动；只在 UI 重构相关文件中叠加变更。
- 不把 Open Design 的静态图片保留为外链；复用并同步其本地 `public` 资源，避免 CDN 丢失。
- Open Design 与现有组件的样式冲突通过命名空间和 Token 覆盖处理，避免创建第二套并行页面。
