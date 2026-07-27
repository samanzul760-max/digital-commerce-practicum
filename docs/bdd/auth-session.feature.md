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
