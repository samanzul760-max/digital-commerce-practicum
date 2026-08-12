# 认证与会话 BDD

## Feature: 以登录用户进入实训室工作台

目标产品公开脚本可观察到登录接口、管理员/学生入口和未登录提示。本项目只抽象这些业务能力，不复制目标产品品牌、文案或接口。

### Scenario: 未登录用户访问受保护工作台

```gherkin
Given 浏览器没有有效 session
When 用户打开 /practicum
Then 用户被带到登录入口
And 页面显示登录表单
And 工作台计划、成员和统计数据不可见
```

### Scenario: 有效用户登录

```gherkin
Given 用户在登录入口输入测试账号和正确密码
When 用户提交登录表单
Then 页面显示当前账号身份
And 用户进入工作台
And 服务端通过 HttpOnly session cookie 识别用户
```

### Scenario: 错误密码

```gherkin
Given 用户输入不存在的账号或错误密码
When 用户提交登录表单
Then 页面显示通用认证失败信息
And 不泄露账号是否存在
And 用户仍停留在登录入口
```

### Scenario: 重复提交

```gherkin
Given 登录请求正在进行
When 用户连续点击登录按钮
Then 只有一个请求被提交
And 登录按钮处于不可重复提交状态
```

### Scenario: 刷新后保持登录

```gherkin
Given 用户已经成功登录
When 用户刷新工作台
Then 页面通过 session 恢复当前用户
And 不回到身份选择页
```

### Scenario: 用户退出

```gherkin
Given 用户已经登录
When 用户点击退出
Then session 被服务端撤销
And 页面回到登录入口
And 再次打开 /practicum 不能看到受保护数据
```

### Scenario: BDD-AUTH-006 授权角色切换并在刷新后保持

```gherkin
Given OWNER 账号已登录且账号同时授权 OWNER 和 STUDENT
When 用户携带有效 CSRF 令牌把当前身份切换为 STUDENT
Then 服务端返回当前角色为 STUDENT 的用户
And 再次读取 session 时仍返回 STUDENT
```

### Scenario: BDD-AUTH-007 未授权角色切换被拒绝

```gherkin
Given STUDENT 账号已登录且只授权 STUDENT
When 用户请求把当前身份切换为 OWNER
Then 服务端返回 403 ROLE_NOT_AUTHORIZED
And 当前 session 角色仍为 STUDENT
```

### Scenario: BDD-AUTH-008 角色切换需要 CSRF 令牌

```gherkin
Given OWNER 账号已登录
When 用户不携带 CSRF 令牌请求切换角色
Then 服务端返回 403 CSRF_INVALID
And 当前 session 角色保持不变
```
场景: BDD-AUTH-009 已登录用户可以修改自己的显示名称
  假如 用户已建立有效会话
  当 用户提交合法的显示名称和有效 CSRF 凭据
  那么 服务端保存资料并返回当前会话用户
  并且 刷新会话后仍返回新的显示名称

场景: BDD-AUTH-010 资料修改必须具有 CSRF 凭据
  假如 用户已建立有效会话
  当 用户缺少 CSRF 凭据而提交资料修改
  那么 服务端返回统一的 403 错误
