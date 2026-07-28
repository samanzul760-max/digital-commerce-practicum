# 服务端计划目录树实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 将计划编辑器的目录和活动读写迁移到受权限、版本和幂等保护的服务端 API。

**Architecture:** 以现有 `practicum-repository` 为唯一持久化边界，目录操作每次返回完整计划快照与递增版本。编辑页通过 `usePracticumServer` 请求快照，成功后替换页面状态，绝不回退到 store/localStorage。

**Tech Stack:** Nuxt 3、Vue 3、TypeScript、Nitro API、Playwright。

## Global Constraints

- 不复制参考产品品牌、文案、视觉资源或接口。
- 仅 OWNER 可写目录；STUDENT 只读已发布计划。
- 写请求必须带计划版本；创建请求必须支持 `Idempotency-Key`。
- 保留现有 `data-*` 测试选择器；不删除现有功能。

---

### Task 1: 目录树 API 与仓库规则

**Files:**
- Modify: `server/utils/practicum-repository.ts`
- Create: `server/api/practicum/plans/[planId]/nodes/index.post.ts`
- Create: `server/api/practicum/plans/[planId]/nodes/[nodeId].patch.ts`
- Create: `server/api/practicum/plans/[planId]/nodes/[nodeId].delete.ts`
- Test: `tests/e2e/practicum/curriculum-api.spec.ts`

- [ ] 写入 API RED 测试：OWNER 创建一级、二级、活动节点；重复 key 只创建一次；STUDENT 为 403；旧版本为 409。
- [ ] 运行 `npx.cmd playwright test tests/e2e/practicum/curriculum-api.spec.ts --reporter=list`，确认 RED。
- [ ] 实现仓库层级校验、OWNER/实训室校验、版本递增和完整快照返回。
- [ ] 实现三条 Nitro 路由及稳定错误码。
- [ ] 重跑 API 测试，确认 GREEN。

### Task 2: 编辑页服务端快照与写入

**Files:**
- Modify: `composables/usePracticumServer.ts`
- Modify: `pages/practicum/plans/[planId]/edit.vue`
- Test: `tests/e2e/practicum/curriculum-server-source.spec.ts`

- [ ] 写入 RED 测试：创建目录后刷新仍存在；服务端空结果显示 empty；请求失败显示 error 而不是 store 残留；STUDENT 直访编辑页显示 forbidden。
- [ ] 运行该测试，确认 RED。
- [ ] 增加快照获取和节点写请求；按钮 pending 时禁用；冲突后刷新快照；失败时保留最后确认快照。
- [ ] 重跑该测试，确认 GREEN。

### Task 3: 目录维护完整验收

**Files:**
- Modify: `docs/bdd/plans-api.feature.md`
- Modify: `docs/api-contract.md`
- Modify: `docs/data-model.md`
- Modify: `docs/permission-matrix.md`
- Modify: `docs/feature-gap-matrix.md`
- Modify: `docs/acceptance-test-report.md`
- Test: `tests/e2e/practicum/curriculum-server-source.spec.ts`

- [ ] 为创建、重命名、排序、删除、重复提交、版本冲突、empty/error/forbidden/refresh 写入 BDD。
- [ ] 补充桌面与 390px Playwright 流程，断言无水平溢出且操作可达。
- [ ] 运行 typecheck、build、相关 Playwright、`git diff --check`；无 lint script 时记录未配置。
- [ ] 审核 staged diff 中的敏感信息，提交本切片，然后执行允许的部署与健康检查。
