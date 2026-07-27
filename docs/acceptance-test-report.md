# 智能体阶段 A 验收报告

## 验收范围

本报告只覆盖当前阶段 A：布局、导航、角色切换、原型权限和学生计划入口。测试针对本地 prototype，不代表真实登录、服务端授权或生产环境安全性。

## 已执行用例

| 用户动作 | 预期结果 | 实际结果 | 状态 | 对应代码 |
|---|---|---|---|---|
| 未选择身份进入工作台 | 显示身份引导，不展示受保护数据 | 阶段 A 测试通过 | PASS | `pages/practicum/index.vue` |
| 选择 OWNER 身份 | 显示管理导航和管理页面入口 | 阶段 A 测试通过 | PASS | `domain/practicum/permissions.ts` |
| 选择 STUDENT 身份 | 显示学习导航，管理页呈现无权限状态 | 阶段 A 测试通过 | PASS | `components/practicum/PracticumSidebar.vue` |
| 学生点击已发布计划 | 进入计划学习入口 | access 测试通过 | PASS | `pages/practicum/index.vue` |
| 学生直接访问管理 URL | 页面显示 forbidden，不执行管理写操作 | navigation/access 测试通过 | PASS | 受保护页面 |
| 连续点击创建计划 | 只产生一次创建动作 | 阶段 A 测试通过 | PASS | `pages/practicum/index.vue` |
| 刷新页面 | localStorage 原型状态保持 | 阶段 A 持久化测试通过 | PASS | `composables/usePracticumStore.ts` |

## 验证命令

本次交付必须以当前工作区新鲜输出为准：

```powershell
npm.cmd run typecheck
npm.cmd run build
npx.cmd playwright test tests/e2e/practicum/phase-a-foundation.spec.ts --reporter=list
npx.cmd playwright test tests/e2e/practicum/shell.spec.ts tests/e2e/practicum/access.spec.ts tests/e2e/practicum/navigation-permissions.spec.ts --reporter=list
```

## 未覆盖或仍为风险

- 尚未实现真实账号登录、退出、会话过期和服务端权限校验。
- 尚未实现真实数据库/API、对象存储上传和跨用户数据隔离。
- TEACHER/MENTOR 工作台仍属于待开放角色，不应视为已验收。
- 完整 `tests/e2e/practicum` 已执行：123 个用例全部通过。
- 项目当前没有 `lint` script，因此不能报告 lint 通过。

## 全量 E2E 结果

`tests/e2e/practicum` 共 123 个用例，全部通过。此前发现的学习首页进度摘要、损坏 localStorage 恢复提示和 loading 状态问题已修复。

## 结论规则

只有命令退出码为 0 且输出明确显示无失败用例，才能将对应行标记为 PASS。任何命令因端口占用、超时、启动失败或浏览器错误结束，都标记为 FAIL/未完成并记录原因。
