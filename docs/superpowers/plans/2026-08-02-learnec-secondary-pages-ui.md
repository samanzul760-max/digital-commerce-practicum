# LearnEC Secondary Pages UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一成员管理、班级能力画像、权限提示和学生任务页的 LearnEC UI，并完成类型检查与构建闭环。

**Architecture:** 新建 `learnec-spec.css` 作为全局设计令牌与基础控件层，由 Nuxt 在 `main.css` 之前加载；页面保留业务逻辑，只增加稳定的语义类名和必要的角色切换处理；具体布局继续放在 `main.css`，避免复制业务组件。

**Tech Stack:** Nuxt 3、Vue 3 Composition API、TypeScript、CSS、Playwright。

## Global Constraints

- 主色 `#147bd1`，背景 `#f4f7f8`，边框 `#e9edf0`，主文本 `#17222e`，副文本 `#697786`。
- 卡片使用 `.paper`；主按钮使用 `.blue-btn`；表单高度 32px、圆角 4px。
- 空状态不得使用虚线框。
- 不改变现有权限、数据源和统计口径。

---

### Task 1: UI acceptance tests

**Files:**
- Modify: `tests/e2e/practicum/ui-baseline.spec.ts`
- Modify: `tests/e2e/practicum/admin-achievements.spec.ts`

**Interfaces:**
- Consumes: 页面现有 `data-*` 定位属性和测试登录辅助函数。
- Produces: 对 `.paper`、`.blue-btn`、权限切换按钮、雷达图标签和横向溢出的可观察约束。

- [x] 添加四类页面的最小 UI 断言。
- [x] 运行相关 Playwright 用例，确认因目标类名或按钮缺失而失败。

### Task 2: Global LearnEC specification

**Files:**
- Create: `assets/css/learnec-spec.css`
- Modify: `nuxt.config.ts`
- Modify: `assets/css/main.css`

**Interfaces:**
- Consumes: 现有按钮和表单类名。
- Produces: 全局令牌、`.paper`、`.blue-btn`、次按钮、输入框、下拉框和空状态基础样式。

- [x] 在 `learnec-spec.css` 定义令牌和基础控件。
- [x] 在 Nuxt 配置中加载页面布局样式后加载规范文件，使全局控件规范稳定覆盖遗留规则。
- [x] 移除或覆盖 `main.css` 中冲突的硬边框、虚线框和不一致控件尺寸。

### Task 3: Page structures and interactions

**Files:**
- Modify: `pages/practicum/members.vue`
- Modify: `pages/practicum/achievements.vue`
- Modify: `pages/practicum/tasks.vue`

**Interfaces:**
- Consumes: `usePracticumStore()`、`PracticumIcon`、现有成员和任务数据。
- Produces: 语义化 `.paper` 容器、统一按钮类、可用的学生视角快捷切换和具备安全标签边距的雷达图。

- [x] 为成员行、分组卡片、指标卡片和待办面板添加统一类名。
- [x] 将权限提示改为带图标和快捷按钮的居中卡片。
- [x] 扩大雷达图 viewBox 并根据标签方向设置 `text-anchor`。
- [x] 完成桌面与移动布局规则。

### Task 4: Verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: Tasks 1-3 的完整实现。
- Produces: 测试、类型检查和生产构建证据。

- [x] 运行相关 Playwright 测试并确认通过。
- [x] 运行 `npx nuxi typecheck`。
- [x] 运行 `npm run build`。
- [x] 检查 git diff，确认没有覆盖无关改动。
