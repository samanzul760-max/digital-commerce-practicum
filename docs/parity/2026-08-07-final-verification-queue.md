# 最终验证队列（一次执行）

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
