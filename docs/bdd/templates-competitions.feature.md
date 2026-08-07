# 模板、案例与比赛 BDD 契约

Feature: 实训模板与比赛在服务端受控

  Background:
    Given 用户已通过有效的 practicum_session 登录
    And 用户当前已选择一个获授权的实训室

  Scenario: BDD-TEMPLATE-COMPETITION-001 OWNER 可以切换本实训室的案例模板
    Given OWNER 正在查看模板列表
    When OWNER 使用有效 CSRF token 关闭 "commerce-cases" 模板
    Then 数据库中的 PracticumTemplate 状态为禁用
    And STUDENT 的模板列表不包含该模板

  Scenario: BDD-TEMPLATE-COMPETITION-002 禁用模板会拒绝 API 与直链读取
    Given OWNER 已关闭 "commerce-cases" 模板
    When STUDENT 请求该模板详情或直接打开带 templateId 的模板页面
    Then 服务端返回 403 "TEMPLATE_DISABLED"
    And 页面显示无权状态且不渲染案例数据

  Scenario: BDD-TEMPLATE-COMPETITION-003 非 OWNER 不能改变模板开关
    Given STUDENT 正在查看已启用模板
    When STUDENT 使用有效 CSRF token 请求改变模板状态
    Then 服务端返回 403 "TEMPLATE_FORBIDDEN"
    And 模板状态保持不变

  Scenario: BDD-TEMPLATE-COMPETITION-004 OWNER 创建、发布并关闭比赛
    Given OWNER 在获授权实训室创建一场草稿比赛
    When OWNER 依次发布并关闭该比赛
    Then 比赛状态按 "DRAFT -> PUBLISHED -> CLOSED" 转换
    And 非法的重复发布或关闭返回 409 "COMPETITION_STATE_INVALID"

  Scenario: BDD-TEMPLATE-COMPETITION-005 STUDENT 只能在授权实训室参加已发布比赛一次
    Given OWNER 已发布当前实训室的比赛
    When STUDENT 使用有效 CSRF token 第一次确认参赛
    Then 服务端在数据库中创建一条 CompetitionEntry，状态为 "SUBMITTED"
    When STUDENT 再次确认同一比赛
    Then 服务端返回 409 "COMPETITION_ENTRY_EXISTS"
    And 关闭后的比赛拒绝新的参赛请求

  Scenario: BDD-TEMPLATE-COMPETITION-006 写操作必须通过会话和 CSRF 验证
    Given 请求没有有效 CSRF token 或没有有效会话
    When 请求模板开关、比赛创建、发布、关闭或参赛接口
    Then 服务端在改变数据前拒绝请求
    And 不返回其他实训室的模板、比赛或参赛记录

  Scenario: BDD-TEMPLATE-COMPETITION-007 页面具有完整的异步状态
    Given 用户访问模板页或比赛页
    When 服务端分别返回加载中、空列表、网络错误或拒绝访问
    Then 页面显示对应 loading、empty、error 或 forbidden 状态
    And 页面不使用 localStorage 或浏览器 store 回退业务数据

## 测试契约

- 文件：`tests/e2e/practicum/templates-competitions.spec.ts`
- 命令：`npm.cmd run test:e2e:direct -- tests/e2e/practicum/templates-competitions.spec.ts`
- 状态：`UNVERIFIED`（用户明确禁止执行测试）
- 持久化：只使用 Prisma 的 `PracticumTemplate`、`Competition`、`CompetitionEntry`；不读取或写入 JSON 回退文件。
