# 服务端计划目录 BDD

## BDD-CURRICULUM-001 创建目录

Given OWNER 正在编辑自己实训室中的草稿计划，且持有当前计划版本

When OWNER 创建一级目录并携带幂等键

Then 服务端返回新的完整计划快照和递增版本

And 相同幂等键的重复请求不会创建第二个目录

And 刷新页面后目录仍来自服务端快照

## BDD-CURRICULUM-002 修改与删除目录

Given OWNER 正在编辑草稿计划中没有提交记录的目录

When OWNER 使用当前版本重命名或删除该目录

Then 服务端返回更新后的完整快照和递增版本

And 使用旧版本的写请求被 `PLAN_VERSION_CONFLICT` 拒绝

And STUDENT 的目录写请求被 `PLAN_FORBIDDEN` 拒绝

## BDD-CURRICULUM-003 创建自定义活动

Given OWNER 正在编辑有二级目录的草稿计划且持有当前版本
When OWNER 在该二级目录下创建一个自定义活动并携带幂等键
Then 服务端创建一个三级活动节点和与类型匹配的默认活动配置

And 计划版本递增且重复相同幂等键不会创建第二个活动
