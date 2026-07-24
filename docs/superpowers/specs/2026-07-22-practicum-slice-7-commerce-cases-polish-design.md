# Slice 7 电商教学案例与工作区打磨设计

## 目标

在保持 `OWNER`（管理员）和 `STUDENT`（学生）两角色模型不变的前提下，补充可用于课堂讲解和学生练习的电商教学案例，并修复工作区导航状态、学生菜单权限与 Slice 6 发布证据不一致问题。

Slice 7 完成后：

- 学生可以阅读 6 个电商案例，并完成其中 3 个可提交练习；
- 管理员可以查看同一案例的教学目标、课堂组织建议、常见错误和评分依据；
- 工作区导航根据当前路由自动高亮，桌面和手机端行为一致；
- 学生不再看到无权访问的管理入口；
- Slice 6 的测试数量、角色措辞和开发服务器日志问题得到统一收尾。

## 范围

### 包含

1. 六个原创、匿名、可本地演示的电商教学案例。
2. 三个案例支持学生草稿、提交、版本与管理员查看。
3. 学生与管理员看到同一案例的不同信息层级。
4. 教学案例列表页和详情页。
5. 基于当前路由的导航高亮。
6. 学生导航入口按权限隐藏。
7. Slice 6 报告和角色残留修正。
8. 复现并处理 Nuxt `#app-manifest` 开发服务器日志。
9. 创建 `practicum-slice-7-commerce-cases-polish` 项目 Skill，并接入总控 Skill。

### 不包含

- 新增 `TEACHER`、`MENTOR` 或其他角色；
- 数据库、真实登录、外部 API、真实文件上传；
- AI 自动评分或外部模型调用；
- 复制案例网站 UI、品牌、文案、个人信息或私有接口；
- 修改 `C:\Users\29053\Desktop\szmy2`。

## 案例目录

| 案例 | 类型 | 学生行为 | 管理员行为 |
|---|---|---|---|
| 商品卖点提炼 | 可提交 | 阅读商品背景，使用 FABE 思路提交三条卖点 | 查看教学目标、示范拆解、常见空泛表达和评分量规 |
| 商品标题与详情页诊断 | 内容与自检 | 找出标题与详情页中的问题，完成自检清单 | 查看诊断要点、课堂提问和参考结论 |
| 优惠券组合活动策划 | 可提交 | 根据客单价和预算提交优惠门槛、金额与理由 | 查看成本边界、常见配置错误和评分量规 |
| 订单异常处理 | 内容与自检 | 学习缺货、延迟发货和退款沟通流程 | 查看课堂讨论点、处理标准和风险提示 |
| 客服差评回复 | 可提交 | 根据差评场景提交公开回复和后续处理方案 | 查看沟通原则、合规风险和评分量规 |
| 店铺数据周报复盘 | 内容与自检 | 阅读匿名指标，识别问题并完成分析清单 | 查看指标解释、教学提示和参考判断 |

案例内容全部使用虚构店铺、匿名商品和确定性数据。不得出现真实手机号、账号、订单号或平台凭据。

## 信息结构

### 路由

- `/practicum/cases`：案例列表。
- `/practicum/cases/:caseId`：案例详情。

案例详情继续使用 `PracticumShell`。页面根据角色显示不同区域：

- `STUDENT`：背景、任务、步骤、示例、自检和适用的提交区；
- `OWNER`：以上公开内容，加教学目标、课堂建议、常见错误、评分量规和提交概览。

学生直接访问仅管理员可见的数据时，页面不渲染这些数据。不存在的案例显示明确的缺失状态。

## 数据模型

新增教学案例类型，建议包含：

- `id`、`title`、`category`、`summary`；
- `scenario`、`learningObjectives`、`studentTask`；
- `steps`、`example`、`selfCheckItems`；
- `ownerGuidance`、`commonMistakes`；
- `submissionMode: 'READ_ONLY' | 'SUBMITTABLE'`；
- 可提交案例的 `rubric`。

案例内容作为 TypeScript seed 保存。提交行为复用现有版本化实践提交契约，不增加第二套草稿或评分状态。若需要案例到活动的映射，使用稳定的本地 ID，并继续写入 `digital-commerce-practicum.v1`。

## 导航设计

### 路由驱动高亮

导航项不再固定给“工作台”添加 active 类。每个入口根据当前 `route.path` 或明确的子路由前缀计算激活状态：

| 当前路由 | 高亮入口 |
|---|---|
| `/practicum` | 工作台 |
| `/practicum/plans/**`、`/practicum/learn/**`、`/practicum/activities/**` | 教学计划 |
| `/practicum/cases/**` | 教学案例 |
| `/practicum/progress` | 学习进度/数据进度入口 |
| `/practicum/notifications` | 通知 |
| `/practicum/resources` | 资源中心 |
| `/practicum/members` | 成员管理 |
| `/practicum/room-settings` | 实训室设置 |
| `/practicum/reviews/**`、`/practicum/submissions/**` | 审核中心 |
| `/practicum/data-center` | 数据中心 |

激活状态必须同时提供视觉变化和 `aria-current="page"`，不能只依靠颜色。手机端沿用同一计算，不建立另一套高亮逻辑。

### 学生菜单权限

`STUDENT` 只显示：

- 工作台；
- 教学计划；
- 教学案例；
- 学习进度；
- 通知；
- 个人入口继续保留在顶栏。

`STUDENT` 隐藏：

- 资源中心；
- 成员管理；
- 实训室设置；
- 审核中心；
- 数据中心；
- 其他没有学生页面的规划中管理功能。

隐藏菜单只改善可发现性，不替代路由权限。学生通过直接 URL 访问管理页时，现有 forbidden 守卫必须继续生效。

`OWNER` 显示全部已经实现的管理入口；未实现功能仍按现有合同显示为禁用的 `待开放`，不得跳向空白页面。

## Slice 6 收尾

Slice 7 首先处理已确认的发布证据问题：

1. 将 `progress.vue` 中 `Owner/Teacher` 注释统一为 `OWNER`。
2. 将 Slice 6 parity 报告修正为当前真实证据：完整 E2E `90/90`，Slice 6 聚焦测试 `11/11`。
3. 复现 Playwright 开发服务器中的 Nuxt `#app-manifest` 预转换错误。
4. 只在确认根因后修复，不通过过滤日志或忽略错误伪造零错误状态。
5. 重新运行完整 E2E、typecheck、build 和生产 HTTP 200 检查。

## 行为清单

1. S7-01：修正 Slice 6 证据与两角色残留。
2. S7-02：定位并消除 `#app-manifest` 开发服务器错误，或记录可复现的上游阻塞证据。
3. S7-03：管理员和学生可看到六个案例，角色内容边界正确。
4. S7-04：学生可打开案例详情并完成自检；缺失案例有明确状态。
5. S7-05：商品卖点提炼支持草稿、提交、版本恢复与管理员查看。
6. S7-06：优惠券组合活动策划支持草稿、提交、版本恢复与管理员查看。
7. S7-07：客服差评回复支持草稿、提交、版本恢复与管理员查看。
8. S7-08：管理员能查看三个可提交案例的教学量规和提交概览，学生不能读取管理员指导。
9. S7-09：桌面和手机端导航根据当前路由准确高亮并提供 `aria-current`。
10. S7-10：学生菜单隐藏无权入口，直接 URL 权限守卫仍有效。
11. S7-11：案例页覆盖 loading、empty、missing、draft、submitted、returned、graded 和 forbidden 状态中适用的部分。
12. S7-12：创建并验证 Slice 7 Skill、完成矩阵、BDD Catalogue 和 parity 报告。

全部行为使用 `ORIGINAL-S7-001`。这些案例和界面是本产品原创内容，不声称来自或匹配案例网站。

## 测试策略

每个行为遵守项目 BDD/TDD 门禁：先创建单一 Given/When/Then 空 `test.skip` 骨架并自检，再转换为正式测试证明 RED，完成最小实现后验证 GREEN。

聚焦测试建议：

- `tests/e2e/practicum/commerce-cases.spec.ts`：案例、角色内容和三个提交场景；
- `tests/e2e/practicum/navigation-permissions.spec.ts`：路由高亮、`aria-current`、手机端和学生菜单；
- `tests/e2e/practicum/slice-7-release-polish.spec.ts`：角色残留、证据一致性和开发服务器日志回归。

最终门禁：

```powershell
npm.cmd run typecheck
npx.cmd playwright test tests/e2e/practicum
npm.cmd run build
```

同时验证：

- Edge 375、768、1024、1440 四种宽度；
- 案例列表和详情无水平溢出、重叠或空白；
- 学生与管理员的导航高亮准确；
- 控制台和开发服务器无 error；
- `http://127.0.0.1:4174/practicum` 返回 HTTP 200；
- `C:\Users\29053\Desktop\szmy2` 未被修改。

## Skill 设计

创建项目 Skill：

`C:\Users\29053\Desktop\智能体\.claude\skills\practicum-slice-7-commerce-cases-polish`

Skill 必须：

- 继承 `building-digital-commerce-practicum` 总控上下文；
- 可见页面变更时要求 `practicum-ui-baseline`；
- 明确只允许 `OWNER` 和 `STUDENT`；
- 按 S7-01 至 S7-12 顺序执行；
- 把原创案例标记为 `ORIGINAL-S7-001`；
- 禁止复制外部案例内容、真实个人信息和平台私有数据；
- 完成后运行聚焦测试、全量 E2E、typecheck、build、四视口和 parity 门禁。

总控 Skill 增加 Slice 7 路由，但不改变 Slice 1-6 的所有权。教学案例、导航权限打磨和发布证据收尾归 Slice 7。

## 完成定义

只有以下条件全部满足时，Slice 7 才能标记为绿色：

- 六个案例在两个角色下按合同展示；
- 三个可提交案例完整覆盖草稿、提交、版本和管理员查看；
- 学生菜单不显示管理入口，直接 URL 仍受保护；
- 所有工作区入口在桌面和手机端按当前路由正确高亮；
- Slice 6 报告与真实测试数量一致；
- `#app-manifest` 错误已消除，或被明确标记为未解决的发布阻塞，不能伪报 READY；
- Slice 7 Skill 通过验证；
- 全量回归、构建、四视口、HTTP 200 和安全隔离全部通过。
