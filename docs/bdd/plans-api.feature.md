# 计划 API 与状态流转 BDD

## 场景：管理员查询计划列表

Given 管理员已经登录
When 请求计划列表并传入关键词、状态、排序和分页参数
Then 服务端只返回该管理员所属实训室的数据
And 返回 `items`、`page`、`pageSize`、`total` 和 `totalPages`

## 场景：管理员创建计划并防止重复写入

Given 管理员提交合法的计划标题和描述
When 使用同一个幂等键重复提交两次
Then 两次响应指向同一个计划
And 计划只创建一次

## 场景：学生不能读取草稿计划

Given 学生已经登录
When 学生查询计划列表或直接请求草稿计划详情
Then 列表不包含草稿
And 详情返回 `PLAN_FORBIDDEN`

## 场景：管理员更新并发布计划

Given 管理员拥有一个草稿计划
When 管理员更新计划并请求发布
Then 服务端校验版本和必要字段
And 发布成功后状态变为 `PUBLISHED`

## 场景：非法状态流转被拒绝

Given 计划已经归档
When 任意用户尝试再次编辑或发布
Then 服务端返回 `PLAN_STATE_INVALID`

## BDD-PLAN-018 撤回发布后学生不能读取计划

Given OWNER 已发布一个计划且 STUDENT 可以读取该计划
When OWNER 撤回发布该计划
Then 计划返回 `DRAFT`
And STUDENT 的计划列表不再包含该计划
And STUDENT 直达该计划详情返回 `PLAN_FORBIDDEN`
