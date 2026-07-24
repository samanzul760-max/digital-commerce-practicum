# 小鹿电商与数字商贸实训工作台功能对比 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生成一份可在桌面直接打开的中文 HTML，对照小鹿电商网店运营实训室与当前数字商贸实训工作台的功能、页面位置、覆盖状态和差距。

**Architecture:** 采用单文件静态 HTML，数据以页面内数组维护，CSS 负责桌面优先布局与打印样式，原生 JavaScript 实现搜索、分组筛选和状态统计。证据来自工作区已有的已登录只读观察报告与当前 Nuxt 路由/类型文件，不改动现有应用。

**Tech Stack:** HTML5、CSS3、原生 JavaScript；不新增依赖。

## Global Constraints

- 默认使用中文、通俗表达。
- 不复制目标网站的品牌、视觉、文案或布局。
- 明确区分已覆盖、部分覆盖、未覆盖和待验证。
- 在报告中披露本机 `agent-reach` 命令不可用，避免把猜测写成事实。

### Task 1: 建立对照数据与证据映射

**Files:**
- Create: `桌面/小鹿电商与数字商贸实训工作台功能对比.html`
- Reference: `网站功能学习报告_小鹿电商.md`
- Reference: `数字商贸实训工作台/pages/practicum/**/*.vue`

- [ ] **Step 1: 录入功能条目**
  将身份组织、实训室计划、内容编排、活动类型、提交评价、数据运营六组功能写入 `features` 数组，每条包含目标页面、当前路由、状态、证据和建议。

- [ ] **Step 2: 生成统计口径**
  用 JavaScript 根据数组计算总数、已覆盖、部分覆盖、未覆盖和待验证数量，避免手工统计不一致。

### Task 2: 生成并验证静态报告

**Files:**
- Create: `C:\Users\29053\Desktop\智能体\小鹿电商与数字商贸实训工作台功能对比.html`

- [ ] **Step 1: 写入页面结构**
  包含摘要头部、统计卡片、筛选工具条、功能对照表、重点差距、来源与限制说明。

- [ ] **Step 2: 添加交互与打印样式**
  支持关键词搜索、类别筛选、状态筛选、清空筛选和打印/导出提示；打印时隐藏工具栏。

- [ ] **Step 3: 运行静态检查**
  检查文件存在、HTML 标签闭合、条目数量与统计数字由脚本生成，确保双击打开无需服务器。
