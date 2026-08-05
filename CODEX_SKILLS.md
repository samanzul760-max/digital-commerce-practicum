# CODEX_SKILLS

## Docker 数据库约定

本项目本地开发和 E2E 测试默认使用 Docker PostgreSQL：

```text
postgresql://practicum:practicum_dev_password@127.0.0.1:55432/digital_commerce_practicum
```

AI 修改代码后的推荐验证顺序：

```powershell
npm run typecheck
npm run test:e2e:ai
```

不要默认使用 `127.0.0.1:5432` 的 Windows PostgreSQL 服务。只有用户明确要求排查 Windows PostgreSQL 时才使用它。

## AI 自动化纠错与测试门禁规范

1. **严禁依赖生产构建**：自愈循环中禁跑 `npm run build`，E2E 门禁统一改用 `npm run test:e2e:ai`。
2. **渐进式门禁 (Progressive Gates)**：
   - 第一级门禁：`npm run typecheck`，用于快速抓类型错误。
   - 第二级门禁：`npm run test:e2e:ai`，用于验证全链路业务。
   - 只有在第一级门禁通过后，才允许运行第二级门禁。
3. **超时防御**：遇到 `TimeoutError` 时，优先定位接口响应与 DOM 元素状态，禁止盲目重启全局开发服务。
4. **防死锁测试入口**：AI 自主修复时必须通过 `npm run test:e2e:ai` 运行 E2E。该脚本负责清理 3000/4175 端口、启动 Docker PostgreSQL、后台启动 Nuxt dev、预热 Nuxt/Vite 路由、运行 Playwright，并在结束后清理 Nuxt 子进程。
