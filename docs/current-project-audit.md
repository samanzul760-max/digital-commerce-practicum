# 智能体项目现状审计

审计日期：2026-07-27
项目根目录：`C:\Users\29053\Desktop\智能体\数字商贸实训工作台`
参考产品：小鹿电商 / 实战宝电商实训平台
本报告只记录当前代码和本次命令验证结果，不把旧报告中的结论当作当前事实。

## 1. 技术栈和启动方式

| 项目 | 当前情况 |
|---|---|
| 框架 | Nuxt 3.21.8 |
| 前端 | Vue 3.5.39 |
| 语言 | TypeScript 5.9.3，strict 开启 |
| 测试 | Playwright 1.61.1，Microsoft Edge，单 worker |
| 状态 | `composables/usePracticumStore.ts` 中的单一 store |
| 持久化 | 浏览器 `localStorage`，键为 `digital-commerce-practicum.v1` |
| 后端 | 未发现业务后端、数据库、服务端 API 层或真实认证 |
| 启动 | `npm.cmd run dev -- --host 127.0.0.1 --port 4174` |
| 构建 | `npm.cmd run build` |
| 类型检查 | `npm.cmd run typecheck` |
| E2E | `npx.cmd playwright test tests/e2e/practicum --reporter=list` |
| Lint | `package.json` 未提供 lint 脚本 |

## 2. 页面和组件盘点

### 已有页面

| 路由 | 文件 | 当前实现 |
|---|---|---|
| `/practicum` | `pages/practicum/index.vue` | OWNER/STUDENT 工作台、计划列表、创建计划入口 |
| `/practicum/profile` | `pages/practicum/profile.vue` | 身份选择和本地账号页 |
| `/practicum/plans/:planId` | `pages/practicum/plans/[planId]/index.vue` | 计划详情 |
| `/practicum/plans/:planId/edit` | `pages/practicum/plans/[planId]/edit.vue` | 课程目录编辑器 |
| `/practicum/learn/:planId` | `pages/practicum/learn/[planId].vue` | 学生学习计划 |
| `/practicum/activities/:activityId` | `pages/practicum/activities/[activityId].vue` | 活动执行 |
| `/practicum/resources` | `pages/practicum/resources.vue` | 管理员资源列表 |
| `/practicum/members` | `pages/practicum/members.vue` | 管理员成员管理 |
| `/practicum/room-settings` | `pages/practicum/room-settings.vue` | 实训室介绍和媒体元数据 |
| `/practicum/reviews` | `pages/practicum/reviews/index.vue` | 审核队列 |
| `/practicum/submissions/:submissionId` | `pages/practicum/submissions/[submissionId].vue` | 提交详情、退回、评分 |
| `/practicum/progress` | `pages/practicum/progress.vue` | 学生进度和能力数据 |
| `/practicum/data-center` | `pages/practicum/data-center.vue` | 管理员统计、排行榜、导出模拟 |
| `/practicum/notifications` | `pages/practicum/notifications.vue` | 通知列表和已读状态 |
| `/practicum/tasks` | `pages/practicum/tasks.vue` | 学生任务列表 |
| `/practicum/cases` | `pages/practicum/cases/index.vue` | 原创电商案例列表 |
| `/practicum/cases/:caseId` | `pages/practicum/cases/[caseId].vue` | 案例详情和部分提交流程 |

### 共享组件

- `PracticumShell.vue`：跳过链接、主区域、live region、持久化错误提示。
- `PracticumSidebar.vue`：按角色过滤菜单，依据路由高亮。
- `PracticumTopbar.vue`：上下文、通知、个人入口和管理员快捷入口。
- `PracticumIcon.vue`：项目内图标占位/语义图标组件。

## 3. 数据和业务逻辑

### Seed 数据

- `data/practicum/seed.ts`：实训室、两个计划、目录节点。
- `data/practicum/curriculum-seed.ts`：模块、单元和基础活动。
- `data/practicum/activity-seed.ts`：活动内容。
- `data/practicum/activity-type-seed.ts`：软件操作、训练、实践活动类型。
- `data/practicum/commerce-case-seed.ts`：原创电商案例及可提交案例节点。

### Store 已有能力

- 角色切换、计划可见性和计划创建。
- 目录节点新增、编辑、删除和活动配置。
- 计划发布、撤销发布、归档和发布前校验。
- 资源状态、成员分组、成员角色和移除成员。
- 软件活动步骤保存、完成和重置。
- 训练活动尝试记录和确定性反馈。
- 实践活动草稿、版本提交、退回和评分。
- 学习位置、计划进度、模块进度和下一活动计算。
- 通知创建、去重、单条已读、全部已读和目标路由权限判断。

### 当前模拟方式

- 没有 `fetch`、`axios`、server routes 或 API repository。
- 所有业务写入都直接修改响应式 store，再保存到 `localStorage`。
- `onMounted(() => { isLoading.value = false })` 只模拟页面加载状态。
- 文件上传只保留元数据/本地模拟，没有对象存储或服务端上传。
- 数据导出由前端模拟，不对应真实下载接口。
- 登录和认证不存在，身份选择是本地演示角色切换。
- 账号、组织、成员和统计都是 seed 或本地状态。

## 4. 权限现状

当前实现以 `OWNER` 和 `STUDENT` 为主要可见身份，类型中还保留 `TEACHER`、`MENTOR`。主要边界如下：

- 学生只看到已发布计划。
- 学生不能访问计划编辑、资源、成员、实训室设置和审核页面。
- 管理员可访问计划、资源、成员、审核和数据页面。
- 通知目标路由会再次检查角色。
- 权限判断集中在前端 store/page 条件中，服务端没有第二道校验。

## 5. 当前验证结果

| 命令/检查 | 结果 | 说明 |
|---|---|---|
| `npm.cmd run typecheck` | PASS | 无类型错误输出 |
| `npm.cmd run build` | PASS | Nuxt 生产构建完成 |
| 构建 warning | WARNING | Node 报 `@vue/shared` trailing slash exports deprecation，不阻断构建 |
| 开发服务器 | PASS | `http://127.0.0.1:4174` 可监听 |
| 阶段 A 行为测试 | 19 PASS | `phase-a-foundation.spec.ts` |
| shell/access/navigation smoke | 16 PASS | 三组回归套件全部通过 |
| 完整 practicum E2E | 123 PASS / 0 FAIL | 学习首页、存储恢复、权限和全量业务流程通过 |
| lint | NOT AVAILABLE | `package.json` 没有 lint 脚本 |

### 已确认的失败

阶段 A 相关的学生计划入口、角色导航和直接 URL 权限测试已经通过；阶段 B 补齐了学生学习首页的进度/下一任务/学习路线/反馈状态和本地存储恢复保护，完整套件已全部通过。真实登录、服务端授权、数据库和 API 仍未实现。

这更像是“测试契约与当前 UI 结构不一致”，而不是类型或构建错误。进入实现阶段前应先确认产品要求：学生首页是否需要计划列表链接；如果需要，应以 BDD/TDD 方式修复页面和测试；如果不需要，应更新过时的 CASE 断言并记录依据。

## 6. 与参考产品的初步差距

参考产品当前已观察到独立的教学计划、资源管理、成员管理、落地页管理、批阅中心、数据中心和学生端入口；智能体已有对应能力的原型，但实现边界不同：

- 智能体没有真实登录、组织切换和服务端权限。
- 智能体没有真实资源库、上传存储和邀请链路。
- 智能体有原创案例和实践提交，但不是参考产品的内容复制。
- 智能体有本地数据中心，尚未接入真实统计聚合和导出。
- 智能体的教师/导师模型尚未形成完整独立工作台。
- 智能体的异常、权限和状态覆盖较完整，但主要在前端原型层。

## 7. 风险和下一步

1. 不能把 localStorage 原型当成多用户系统；真实数据、隔离和服务端权限仍未实现。
2. 需要先统一 `OWNER/TEACHER/STUDENT/MENTOR` 的产品角色契约，再扩展页面。
3. 需要为学生计划链接失败建立明确的产品决策和回归用例。
4. 完整 E2E 超时，需要拆分套件、查找慢测或增加诊断，而不是直接提高超时后宣称通过。
5. 目前源码在部分 PowerShell 读取场景出现中文编码显示异常，需在后续验证链路中统一 UTF-8 输出，避免测试文案误判。
