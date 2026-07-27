# Phase A BDD Behavior Checklist

生成日期：2026-07-27
阶段：A - 项目基础、布局、导航和权限
状态：设计中

---

## A-01：未选择身份时进入工作台

**Given** 用户首次访问工作台，未选择任何身份
**When** 用户导航到 `/practicum`
**Then**:
- 页面显示身份选择引导（"选择身份后开始工作"）
- 不展示管理员或学生的业务数据（计划列表、指标卡片）
- 可以进入 `/practicum/profile` 选择身份
- 选择身份后自动返回 `/practicum`
- 侧边栏不显示管理类导航项（如教学管理、数据中心）
- 侧边栏显示最少导航项（总览和案例），标记为未选择状态

**用户角色**: 未选择
**目标路由**: `/practicum`
**状态变化**: activeRole = null → OWNER 或 STUDENT
**权限规则**: 无身份时只能看到公开引导内容
**验收方式**: Playwright E2E - 检查 data-role-entry 可见、无 data-owner-home、无 data-student-home

---

## A-02：OWNER 工作台权限

**Given** 用户已选择 OWNER 身份
**When** 用户访问工作台
**Then**:
- OWNER 可以访问：总览、教学（计划/资源/学习）、案例、教学管理（审核/成员/实训室设置）、数据中心
- 侧边栏显示对应入口（5 个导航项）
- 直接访问 `/practicum/plans/plan-wdds/edit` 正常加载编辑器
- 直接访问 `/practicum/resources` 正常加载资源管理
- 直接访问 `/practicum/members` 正常加载成员管理
- 直接访问 `/practicum/reviews` 正常加载审核中心
- 直接访问 `/practicum/data-center` 正常加载数据中心
- 直接访问 `/practicum/room-settings` 正常加载实训室设置
- 工作台首页显示管理员指标和计划列表
- 可以创建新计划

**用户角色**: OWNER
**目标路由**: `/practicum` 及所有管理路由
**权限规则**: OWNER 可访问所有页面和操作

---

## A-03：STUDENT 工作台权限

**Given** 用户已选择 STUDENT 身份
**When** 用户访问工作台
**Then**:
- STUDENT 只能看到：总览、案例、任务、成长数据（4 个导航项）
- 不能看到：教学管理、数据中心导航项
- 直接访问 `/practicum/resources` 显示 forbidden 状态
- 直接访问 `/practicum/members` 显示 forbidden 状态
- 直接访问 `/practicum/reviews` 显示 forbidden 状态
- 直接访问 `/practicum/data-center` 显示 forbidden 状态
- 直接访问 `/practicum/room-settings` 显示 forbidden 状态
- 直接访问 `/practicum/plans/plan-wdds/edit` 显示 forbidden 状态
- 不泄露管理页面数据和操作按钮
- 工作台首页显示学生指标和学习入口

**用户角色**: STUDENT
**目标路由**: `/practicum` 及学生可访问路由
**权限规则**: STUDENT 仅可访问已发布计划和学习相关内容

---

## A-04：TEACHER 和 MENTOR 权限边界

**Given** 当前类型系统仅实现 OWNER 和 STUDENT
**When** 检查角色类型和权限逻辑
**Then**:
- `PracticumRole` 类型仅为 `'OWNER' | 'STUDENT'`
- TEACHER 和 MENTOR 不出现在身份选择页面
- 权限守卫仅检查 OWNER 和 STUDENT
- 侧边栏导航项定义仅包含 OWNER 和 STUDENT 角色
- 任何试图使用 TEACHER 或 MENTOR 的代码路径都被类型系统阻止
- 文档明确标注 TEACHER 和 MENTOR 为"待开放"

**用户角色**: 不适用（仅 OWNER 和 STUDENT 可用）
**权限规则**: TEACHER 和 MENTOR 不存在于运行时，不会因缺少实现而意外获得 OWNER 权限

---

## A-05：统一导航

**Given** 用户以任何身份访问任何实训页面
**When** 页面渲染
**Then**:
- 所有页面使用 `PracticumShell.vue`（通过 `<PracticumShell>` 包裹）
- 不在页面内部重复创建 Sidebar 或 Topbar
- 当前路由对应导航项具有 `aria-current="page"` 属性
- 当前路由对应导航项具有 `nav-item-active` CSS 类
- 学生不显示管理员入口
- 直接访问管理员 URL 仍然显示 forbidden（不是 404 或空白页）
- 无角色时侧边栏不显示管理入口

**用户角色**: 所有角色
**目标路由**: 所有 `/practicum/*` 路由
**状态变化**: 导航高亮随路由变化

---

## A-06：学生计划入口

**Given** 学生已登录并访问工作台首页
**When** 页面渲染
**Then**:
- 学生可以看到已发布计划的入口
- 计划入口是可点击的链接，导航到对应的学习页面
- 学生看不到草稿计划
- 入口使用现有 UI 设计，不添加无业务意义的控件

**决策**: 当前学生首页设计使用"继续学习"面板和"进入任务"按钮作为主要学习入口。需要在该面板下方或旁边添加已发布计划的链接列表，使学生可以直接点击计划名称进入学习页面。

**Given** 已发布计划 `网店运营` (plan-wdds) 存在
**When** 学生访问 `/practicum`
**Then**:
- 可以看到 "网店运营" 的可点击链接
- 点击链接导航到 `/practicum/learn/plan-wdds`
- 草稿计划 "网店视觉设计" 不出现在学生首页

---

## A-07：统一页面状态

**Given** 用户访问任何 Phase A 相关页面
**When** 页面处于不同状态
**Then** 至少覆盖以下状态：

| 状态 | 触发条件 | 预期表现 |
|---|---|---|
| loading | 页面初始加载 | 显示加载文案，不显示空白内容 |
| empty | 数据列表为空 | 显示"暂无数据"类文案 |
| forbidden | 无权限访问 | 显示明确的无权限提示，含角色和页面说明 |
| error | 操作失败 | 显示错误提示和重试入口 |
| success | 操作成功 | 显示成功提示（如"已保存"） |
| disabled | 按钮不可操作 | 按钮 disabled 属性，样式变灰 |
| double-click protection | 快速双击提交按钮 | 不会产生重复状态变更 |

**用户角色**: 所有角色
**状态变化**: 页面状态在 loading → content/empty/forbidden 之间切换
**权限规则**: forbidden 状态文案不能泄露受保护数据

---

## 实现说明

所有权限逻辑标记为 "prototype" 级别 - 使用前端权限守卫，不是服务端安全。
后续阶段需要添加真实认证和服务端权限层。
