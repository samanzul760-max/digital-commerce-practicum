# 最终验证队列（一次执行）

## 2026-08-07 FV-13 最新单次验收：PASS

| ID | 命令 / 范围 | 结果 | 证据 |
| --- | --- | --- | --- |
| FV-13 | `npm.cmd run test:e2e:isolated` | `PASS` | 79.4 秒内完成：专用本机 PostgreSQL 容器、随机回环端口、唯一数据库、9 个迁移、确定性夹具、Nuxt 生产构建与 3/3 Playwright 角色流程均成功。工件位于 `.artifacts/practicum-e2e/run-2026-08-07t06-33-31-852z/`。 |

运行器缺陷根因已记录：Windows 上 `nuxt dev` 在本工作空间可能“已监听但 HTTP 不响应”。运行器已改为构建当前代码并启动本地 Nitro 产物，同时继续使用独立数据库、独立数据目录和零重试策略。

后检查：4186、3001 及探针端口无残留监听；带本轮标签的临时容器已清理；默认 `digital-commerce-practicum-postgres` 容器保持健康。未执行 SSH、部署、生产服务器操作或默认数据库操作。

## 2026-08-07 One-Time Local Verification Evidence

### Isolated three-role retry window

| ID | Command / scope | Result | Evidence |
| --- | --- | --- | --- |
| FV-13 runtime retry | `npm.cmd run test:e2e:isolated` | `UNVERIFIED` | Exit code `1` after 2.4 s. Docker Compose created the isolated project's network and volume, then stopped before database creation because `docker-compose.yml` declares the existing container name `digital-commerce-practicum-postgres`. The existing healthy local container already owns that name. No `practicum_e2e_*` database exists; no migration, Nuxt startup, 4186 listener, or Playwright browser case ran. Per the one-run rule, this command was not retried. |

Post-run checks: the existing `digital-commerce-practicum-postgres` container remained healthy; ports `3001` and `4186` had no listeners. The isolated run artifacts are retained under `.artifacts/practicum-e2e/run-2026-08-07t05-18-45-480z/`. The Compose-created network and volume are intentionally retained for safety. The three-role student/teacher/admin browser journey therefore remains `UNVERIFIED`, not `PASS`.

### Runner repair after the failed retry

| ID | RED | GREEN | Result |
| --- | --- | --- | --- |
| Isolated runner container reuse | `node --test tests/runtime/isolated-e2e-contract.test.mjs` failed because the runner still called Compose and did not verify that the existing PostgreSQL container was running. | The same command passed `3/3` after the runner replaced Compose startup with a read-only Docker inspect check, rejects a stopped container, and keeps `pg_isready` as the availability check. `node --check scripts/run-isolated-e2e.mjs` also passed. | `PASS` for the runner safety contract only. No new browser command was run, so FV-13 remains `UNVERIFIED`. |

### Second isolated FV-13 execution window

| ID | Command / scope | Result | Evidence |
| --- | --- | --- | --- |
| FV-13 second runtime attempt | `npm.cmd run test:e2e:isolated` | `UNVERIFIED` | Exit code `1` after 102.5 s. A new loopback-only database `practicum_e2e_run_2026_08_07t05_24_32_490z` was created and all 9 migrations applied. Nuxt built successfully and announced port `4186`, but the runner's `/practicum` SSR readiness probe timed out after 90 s. Playwright did not start. Port `4186` was released after the controlled process exit; the isolated database and artifacts were retained. |

Follow-up runner TDD: the runtime contract test first failed because the readiness probe was still `/practicum`. It now probes `/api/auth/session` and treats any response below `500` as Nuxt-ready, while Playwright remains responsible for actual page behavior. `node --test tests/runtime/isolated-e2e-contract.test.mjs` passed `3/3` and `node --check scripts/run-isolated-e2e.mjs` passed. This repair has not been followed by a browser rerun, so FV-13 remains `UNVERIFIED`.

### Dedicated-container hardening and latest FV-13 attempt

The isolated runner now uses a run-labelled PostgreSQL container, a random loopback port, a run-matched database name, deterministic role/class/template/competition fixtures, port ownership checks, zero Playwright retries, and retained database evidence. Its runtime and fixture contracts pass `8/8`; `npm.cmd run typecheck` also passes.

The latest single FV-13 command stopped with exit code `1` after 23.5 s before database creation, migrations, Nuxt, or Playwright. The dedicated image name was `postgres:16-alpine`, which is absent from this local Docker image cache. The runner now uses the project's existing `postgres:17` image; the updated contracts again pass `8/8`. Per the single-run rule this fixed runner has not been retried yet. The three-role browser journey remains `UNVERIFIED`.

Scope: local static verification only. No server was started, stopped, restarted, or replaced. No SSH, deployment, database migration, database reset, or test-data cleanup was performed. The local Prisma client was regenerated without connecting to the database.

| ID | Command / scope | Result | Evidence |
| --- | --- | --- | --- |
| FV-01 | `npm.cmd run typecheck` | `PASS` | Exit code `0` after 14.6 s, after regenerating the local Prisma client and correcting the compile errors below. |
| FV-07 | `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build` | `PASS` | Exit code `0` after 36.5 s. Nuxt client and Nitro production server output completed. |
| Compile repair | Local source fixes | `PASS` | Regenerated Prisma Client; corrected classroom disabled bindings; fixed two competition route import depths; removed an unreachable competition-entry branch; corrected `Page.locator` use in the three-role spec. Each root-cause group was fixed in one attempt. |
| FV-13 discovery | `npx.cmd playwright test tests/e2e/practicum/three-role-integrated-closure.spec.ts --list` | `PASS` | Exit code `0` after 2.1 s; all 3 role-flow test cases loaded. This was discovery only, not browser interaction evidence. |
| Isolated E2E safety | `node --test tests/runtime/isolated-e2e-contract.test.mjs` | `PASS` | Exit code `0`; 3 contracts verify unique artifact paths, loopback-only database URLs, bounded PostgreSQL readiness, and no shared-directory or shared-port cleanup. |
| FV-13 runtime attempt | `npm.cmd run test:e2e:isolated` | `UNVERIFIED` | Exit code `1` after 1.7 s, before database creation, migration, Nuxt startup, or browser tests. Docker Compose could not infer a project name from the Chinese workspace path. The runner was corrected to pass the explicit ASCII project name, but this user-flow command was not rerun. |
| FV-02 to FV-06, FV-08 to FV-13 remaining runtime | Playwright / schema verification | `UNVERIFIED` | Runtime tests now require `scripts/run-isolated-e2e.mjs`, which uses a unique artifact directory and a newly named local loopback database. No remaining browser-flow or schema test command was started in this validation window. |

Preflight facts: port `3001` and `4175` were not listening; the only `node.exe` process was Codex itself and it had no loaded `.output` Prisma query engine module. Pre-existing user changes were preserved, and only the listed compile-repair files plus this record were changed in this repair pass. `git diff --check` found no whitespace errors (only existing CRLF warnings).

日期：2026-08-07  
状态：`PARTIAL`，不得据此声明整项目完成。

## 执行规则

- 本文件中的每一项在最终验证窗口内**只执行一次**；超时、卡死、死循环或重复执行迹象出现时，立即停止并记录 `UNVERIFIED`，不自动重试。
- 当前 `http://127.0.0.1:3001` 是旧代码服务，不能作为本轮功能 GREEN 证据；本阶段不得停止、重启或替换该服务，也不得启动另一套 Nuxt 服务。
- 不执行 SSH、部署、PM2、Docker、Nginx、数据库迁移、`prisma db push`、`prisma migrate` 或任何数据库重置操作。
- 最终执行前必须先确认：测试环境加载当前工作树代码、没有占用 `.output` 中 Prisma 查询引擎的进程、以及用户同意进入一次性验证窗口。

## 已执行且不得重跑的项目

| ID | 命令或范围 | 最后一次事实结果 | 当前结论 | 最终执行前提 |
| --- | --- | --- | --- | --- |
| VQ-01 | `tests/e2e/practicum/student-closure-server-source.spec.ts`：活动上下文页面场景 | 旧 `3001` 未加载当前活动页代码，未找到 `[data-activity-page]`。 | `UNVERIFIED` | 使用加载当前工作树代码的受控测试服务后执行一次。 |
| VQ-02 | `tests/e2e/practicum/student-closure-server-source.spec.ts`：任务截止日期页面场景 | 旧 `3001` 未加载当前任务页代码，页面未出现预期任务行。 | `UNVERIFIED` | 同 VQ-01；服务端 DTO 与当前前端代码必须同版本。 |
| VQ-03 | `tests/e2e/practicum/student-tasks-api.spec.ts -g C-STUDENT-012` | 旧 `3001` 对新增 `learning-state` 端点返回 `404`。 | `UNVERIFIED` | 使用加载新增 GET 端点的受控测试服务后执行一次。 |
| VQ-04 | `tests/e2e/practicum/student-tasks-api.spec.ts -g C-STUDENT-013` | 旧 `3001` 对新增 `learning-state` 端点返回 `404`。 | `UNVERIFIED` | 使用加载新增 POST 端点的受控测试服务后执行一次。 |
| VQ-05 | `npm.cmd run build` | 客户端与 SSR 构建阶段完成；收尾时 `.output/server/node_modules/.prisma/client/query_engine-windows.dll.node` 被运行中进程占用，`EPERM unlink`。 | `UNVERIFIED` | 确认无进程占用该输出文件后执行一次；不得通过删除 `.output` 或停止现有 `3001` 绕过。 |

历史说明：此前早期学生 API 合同测试曾出现 `4/4` 通过，但它运行在旧服务上，只能作为历史记录，不能替代 VQ-01 至 VQ-04 的本轮 GREEN 证据。

## 尚未执行的最终验收项目

以下项目尚未到执行窗口，因此不是“失败”也不是“通过”。待功能切片完成并具备受控环境后，各执行一次：

| ID | 最终验证 | 通过标准 |
| --- | --- | --- |
| FV-01 | `npm.cmd run typecheck` | 退出码为 `0`。 |
| FV-02 | 学生闭环 Playwright：待办 -> 活动 -> 提交 -> 退回/评分 -> 刷新 | 学生只看到本人数据，提交版本和反馈刷新后仍存在，桌面及移动端均无布局溢出。 |
| FV-03 | 教师课堂作业与审核 Playwright | 班级范围、作业发布、审核/退回/评分和审计记录均由服务端授权与持久化。 |
| FV-04 | 管理员实训室、成员、虚拟组与审批 Playwright | 所有写操作经服务端验证，组织/实训室/角色边界正确。 |
| FV-05 | 资源、通知、进度、数据中心与审计 API + Playwright | 不使用 localStorage 业务回退；刷新、空态、失败态和越权直链均受验证。 |
| FV-06 | 模板、比赛与全量入口权限回归 | 每个入口落到真实页面，菜单可见性和服务端直接访问权限一致。 |
| FV-07 | 最终 build（VQ-05） | 构建完整完成且退出码为 `0`。 |

## 本轮新增且未执行的契约

下列测试在实现前已写入或由切片先行提交，但根据一次性验证规则尚未运行；它们不构成 GREEN 证据：

| ID | 契约文件 | 覆盖范围 | 执行状态 |
| --- | --- | --- | --- |
| FV-08 | `tests/e2e/practicum/practicum-completion-schema.spec.ts` | 本地新增 Prisma 实体、外键和唯一约束 | `UNVERIFIED`，迁移未执行。 |
| FV-09 | `tests/e2e/practicum/teacher-classroom-closure.spec.ts` | 教师公告、课堂会话、执行统计和班级越权 | `UNVERIFIED`。 |
| FV-10 | `tests/e2e/practicum/member-room-lifecycle.spec.ts` | 邀请、申请审批、虚拟组与培训室设置刷新 | `UNVERIFIED`。 |
| FV-11 | `tests/e2e/practicum/resource-data-audit.spec.ts` | 资源可见性、通知已读、数据中心与审计 | `UNVERIFIED`。 |
| FV-12 | `tests/e2e/practicum/templates-competitions.spec.ts` | 模板启停、比赛状态机和学生单次参赛 | `UNVERIFIED`。 |
| FV-13 | `tests/e2e/practicum/three-role-integrated-closure.spec.ts` | 教师课堂、管理员设置/模板/比赛、学生权限路径 | `UNVERIFIED`。 |

## 剩余交付步骤

按相互依赖关系归并后，剩余 **6 个顶层交付切片**，约 **22 个可验证子步骤**。这不是 6 次简单修改；每个切片都包括服务端数据合同、权限、页面状态、BDD/TDD 或 API 测试、一次 Playwright 用户路径和最终证据。

1. **学生闭环最终 GREEN 与响应式验收（4 项）**：完成本轮学习状态接口的受控环境验证；验证提交/退回/评分刷新；补齐失败与越权边界；完成桌面和移动端检查。
2. **教师班级、作业和审核收口（4 项）**：统一教师审核队列的页面与服务端权限；落实真实审核存储；验证范围过滤、退回、评分、审计；完成教师用户路径。
3. **教师公告和课堂执行（3 项）**：公告 CRUD/可见范围；课堂播放/执行状态；活动成员执行数据与教师页面验收。
4. **管理员实训室、成员、虚拟组与申请审批（4 项）**：移除前端 store 直写；补齐成员/分组邀请、角色变更和加入审批；验证多组织与实训室隔离。
5. **资源、通知、进度、数据中心和审计服务端化（4 项）**：逐项移除 JSON/store/localStorage 业务回退；实现查询、导出和钻取边界；验证刷新与权限。
6. **模板、比赛、全量入口与发布前回归（3 项）**：补齐模板/比赛入口及权限；全站路由和移动端回归；执行本文件的最终验证队列和一次 build。

## 当前不做的事

- 不重跑 VQ-01 至 VQ-05。
- 不启动、停止、重启或替换 `3001` 服务。
- 不修改服务器、数据库结构、迁移文件、部署配置，亦不清理现有未提交改动。
