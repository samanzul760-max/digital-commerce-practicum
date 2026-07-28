# 管理员开通与独立登录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 提供一次性管理员开通、独立登录入口和跨部署保留的服务器端账号数据。

**Architecture:** `auth-store` 将自定义用户读写到被忽略的 `.data/auth-users.json`，开通 API 在用户不存在时创建摘要并立即建立会话。登录页只调用公开认证契约；路由守卫继续以服务端会话作为唯一访问依据。

**Tech Stack:** Nuxt 3、Vue 3、TypeScript、Nitro、Node crypto、Playwright。

## Global Constraints

- 不把真实账号、密码、Cookie、Token 写进源码、测试、日志、文档或 Git。
- 不删除已有登录、退出或受保护路由功能。
- 账号数据必须在 `.data/` 中持久化，部署不得删除该目录。
- 每项生产行为先有 BDD 和经过 RED 验证的测试。

---

### Task 1: 开通契约与浏览器 RED 测试

**Files:** `docs/bdd/auth-bootstrap.feature.md`、`tests/e2e/practicum/auth-bootstrap.spec.ts`

- [ ] 写入首次开通、重复开通、未登录跳转和刷新场景。
- [ ] 编写 Playwright 测试，使用每次运行生成的测试凭据。
- [ ] 运行测试，确认因登录页与 API 不存在而 RED。

### Task 2: 服务端开通与账号持久化

**Files:** `server/utils/auth-store.ts`、`server/api/auth/bootstrap.get.ts`、`server/api/auth/bootstrap-owner.post.ts`

- [ ] 实现自定义用户存储、账号验证、scrypt 摘要和一次性创建。
- [ ] 为成功开通建立现有 HttpOnly 会话。
- [ ] 运行 API 和浏览器测试，确认 GREEN。

### Task 3: 独立登录页面与路由

**Files:** `pages/practicum/login.vue`、认证守卫

- [ ] 将未认证访问统一导向 `/practicum/login`。
- [ ] 提供 loading、error、重复提交禁用与开通完成后的登录状态。
- [ ] 验证桌面端和 390px 移动端流程。

### Task 4: 发布保护与证据

**Files:** `scripts/deploy-new-ecs.py` 与 `docs/` 验收文档

- [ ] 保留远程 `.data/` 并执行 typecheck、build、相关 E2E、diff 和敏感信息检查。
- [ ] 提交本轮代码并部署至允许的 ECS；验证 PM2 与健康检查。
