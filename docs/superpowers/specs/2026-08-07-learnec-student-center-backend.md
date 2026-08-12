# LearnEC 学员中心真实后端适配

## 目标

保留 LearnEC 方案 A 的学员中心视觉层级，同时复用实训工作台现有的 Nuxt 页面、认证会话、权限守卫与服务端数据，不新增模拟 API 或浏览器业务缓存。

## 页面映射

| 方案 A 入口 | 真实页面 | 数据来源 |
| --- | --- | --- |
| 概况 | `/practicum/progress` | `usePracticumServer.getProgress`、`getStats` |
| 我的课程 | `/practicum/courses` | 现有课程查询与计划详情接口 |
| 模拟店铺 | `/practicum/shop/products` | 现有店铺商品与运费模板接口 |
| 作业 | `/practicum/tasks` | `usePracticumServer.listStudentTasks`、任务提交接口 |
| 成就 | `/practicum/achievements` | 现有成就目录与管理员分析接口 |

“作品集”不作为入口展示，因为当前真实项目没有学生作品集路由或服务端合同；待后端能力存在后再开放。

## 视觉适配

`progress.vue` 保留服务端 loading/error/forbidden 状态，恢复方案 A 的侧栏、欢迎区三枚勋章、三项统计、学习进度、待办与学习日历结构。所有按钮使用现有真实 NuxtLink 或现有服务端写入流程。

