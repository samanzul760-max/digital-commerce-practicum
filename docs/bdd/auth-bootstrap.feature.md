# 管理员开通与独立登录 BDD

## Feature: 首次管理员开通和受保护工作台

### Scenario: 首次管理员开通

```gherkin
Given 服务端还没有自定义管理员账号
When 用户在 /practicum/login 提交有效的管理员开通表单
Then 服务端只保存不可逆的密码摘要
And 用户立即获得 HttpOnly 会话并进入 /practicum
And 刷新后仍保持认证状态
```

### Scenario: 重复管理员开通

```gherkin
Given 服务端已经完成管理员开通
When 用户再次请求管理员开通接口
Then 服务端返回 BOOTSTRAP_ALREADY_COMPLETED
And 已有管理员账号和会话不被改变
```

### Scenario: 独立登录入口保护

```gherkin
Given 浏览器没有有效 session
When 用户打开任意工作台地址
Then 用户被带到 /practicum/login
And 页面不展示计划、成员或统计数据
```
