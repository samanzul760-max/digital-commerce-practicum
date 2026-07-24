# Slice 5 PRD & BDD Catalogue — 进度、数据中心与通知

## PRD 摘要

基于 `product-requirements.md` §4.8–§4.9，覆盖 12 个有序行为。

### 角色

- **STUDENT (学生)**: 查看个人进度、量规结果、退回作业、证据时间线
- **OWNER (管理员)**: 班级完成率、待审核、状态分布、弱量规、活动动态、排名、导出、通知管理

### 数据规则

- 进度分母仅含已发布计划的必做活动；可选活动和草稿内容不计入
- 聚合视图由活动、提交和评分状态推导；不保存重复的可变统计总数
- 通知幂等生成（同 domain event → 同 key → 不重复）
- 排名和动态使用匿名化种子学员

---

## BDD Catalogue — 12 Behaviors

### S5-01: 计划完成百分比仅统计已发布必做活动
```
Given 一个计划包含必做和可选活动
When 计算进度百分比
Then 仅已发布的必做活动贡献百分比
```
**现有状态**: `getPlanProgress()` 已实现，测试通过。✅ COMPLETE

### S5-02: 学生进度展示完整维度
```
Given 学生有已提交、已退回和已评分的作业
When 学生打开进度页面
Then 显示总体进度、模块进度、单元进度、退回作业、量规结果和证据时间线
```
**现有状态**: 缺少量规结果 (rubric results) 区域。⚠️ GAP

### S5-03: 教师视图展示班级指标
```
Given 教师班上有多种提交状态的学生
When 教师打开进度页面
Then 显示班级完成率、待审核数、状态分布和薄弱量规维度
```
**现有状态**: 缺少薄弱量规维度。⚠️ GAP

### S5-04: 图表均含等价数据表
```
Given 任何视觉摘要（进度条、指标卡片）
When 用户查看页面
Then 每个图表都有等价的无障碍数据表
```
**现有状态**: 状态分布、计划对比、排名已有 `<table>`。需验证进度条区域。

### S5-05: 领域事件生成通知
```
Given 计划发布、学生提交、教师退回、教师评分或截止日期临近
When 事件发生
Then 为对应角色创建幂等通知
```
**现有状态**: publish/submit/return/grade 已实现。缺少 deadline。⚠️ GAP

### S5-06: 通知支持已读/未读状态
```
Given 用户有未读和已读通知
When 用户查看通知列表
Then 未读通知有视觉区分，支持逐条标记已读和全部标记已读
```
**现有状态**: 已实现。✅ COMPLETE

### S5-07: 通知深链验证权限
```
Given 一条通知指向特定页面
When 用户点击深链
Then 目标路由必须先验证当前角色可见性再导航
```
**现有状态**: 深链直接渲染 `<NuxtLink>`，无权限校验。⚠️ GAP

### S5-08: 进度和通知状态持久化
```
Given 用户已查看进度和通知
When 用户刷新页面
Then 进度计算和通知读/未读状态保持不变
```
**现有状态**: 通过 `digital-commerce-practicum.v1` 持久化。✅ COMPLETE

### S5-09: 数据中心总体指标
```
Given 管理员查看数据中心
When 页面加载
Then 显示总体完成率、已完成学员数、总学员数、未活跃学员数，含成员和计划下钻入口
```
**现有状态**: 指标已实现。缺少 drill-down 入口链接。⚠️ GAP

### S5-10: 教师数据视图
```
Given 管理员查看数据中心
When 页面加载
Then 显示计划完成对比表、匿名化活动动态和可排序成绩排名表
```
**现有状态**: 排名不可排序；活动动态使用确定性索引需改进匿名化。⚠️ GAP

### S5-11: CSV 导出二次确认
```
Given 管理员要导出数据
When 点击导出按钮
Then 必须先展示字段摘要并二次确认，再生成仅含匿名数据的 CSV
```
**现有状态**: 一键导出无二次确认。⚠️ GAP

### S5-12: 完整状态覆盖
```
Given 进度、通知和数据中心页面
When 处于各种边界状态
Then 覆盖 loading、empty、no-result、forbidden、unread/read、export-pending、destination-error
```
**现有状态**: 缺少 no-result、destination-error 状态。⚠️ GAP

---

## 实现顺序

按 SKILL.md ordered behavior backlog:

1. S5-02b — 学生量规结果
2. S5-03b — 教师弱量规维度
3. S5-05b — 截止日期通知
4. S5-07b — 深链权限校验
5. S5-09b — 数据中心 drill-down
6. S5-10b — 可排序排名 + 匿名化
7. S5-11b — 导出二次确认
8. S5-12b — 缺失状态填充（含 CASE-S5-002 通知下拉）

---

## 完成矩阵（更新后）

| Behavior | BDD ID | Status | Evidence |
|----------|--------|--------|----------|
| 计划百分比 | S5-01 | green | `getPlanProgress()` 仅统计 required + published |
| 学生进度（含量规） | S5-02 | **partial → 待实施** | 缺少 rubric results |
| 教师视图（含弱量规） | S5-03 | **partial → 待实施** | 缺少 weak rubric dimensions |
| 图表等价数据表 | S5-04 | green | 所有数据区域含 `<table>` |
| 事件通知（含deadline） | S5-05 | **partial → 待实施** | 缺少 deadline 通知 |
| 已读/未读 | S5-06 | green | mark-one/mark-all 已实现 |
| 深链权限 | S5-07 | **partial → 待实施** | 缺少 role visibility check |
| 持久化 | S5-08 | green | localStorage 持久化已验证 |
| 数据中心指标 | S5-09 | **partial → 待实施** | 缺少 drill-down 链接 |
| 教师数据视图 | S5-10 | **partial → 待实施** | 排名不可排序 |
| CSV 导出 | S5-11 | **partial → 待实施** | 缺少二次确认 |
| 状态覆盖 | S5-12 | **partial → 待实施** | 缺少 no-result/destination-error |
