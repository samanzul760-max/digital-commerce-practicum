# Slice 3 学生活动 PRD

Feature ID：`ASSUME-S3-001`

产品角色仅有 `OWNER` 和 `STUDENT`。本 Slice 只实现学生学习、尝试、草稿、提交版本、退回修订、学习位置和进度；审核操作不属于本 Slice。

## 数据合同

- 所有 Slice 3 数据写入 `digital-commerce-practicum.v1`。
- 单一记录包含 `schemaVersion: 1`、学习位置、软件步骤、训练尝试、实践草稿、提交版本、状态、截止时间和锁定活动。
- 页面刷新后必须恢复真实值；组件 `ref` 只负责输入态，不能成为业务事实来源。
- 实践版本一经提交不可变。草稿不创建版本；退回后再提交创建下一编号版本并保留旧反馈。

## 行为清单

| 编号 | 行为 | 入口 | 完成条件 |
|---|---|---|---|
| S3-01 | 仅访问已发布学习内容并恢复位置 | `/practicum/learn/:planId`、活动直接 URL | 草稿、归档、缺失内容不泄露；刷新恢复最近活动 |
| S3-02 | 完成软件必做步骤 | `/practicum/activities/:activityId` | 缺失步骤逐项显示；完成后进度变化并持久化 |
| S3-03 | 确认后重置当前软件活动 | 软件活动页 | 明确影响并确认；只清当前活动，不影响另一活动 |
| S3-04 | 保存训练尝试与确定性反馈 | 训练活动页 | 有效尝试逐次保存；达到上限后阻止；刷新保留历史 |
| S3-05 | 保存实践草稿 | 实践活动页 | 草稿持久化；不创建版本；状态不是 `SUBMITTED` |
| S3-06 | 确认提交不可变版本 | 实践活动页 | 创建下一个编号版本；状态为 `SUBMITTED`；刷新保留 |
| S3-07 | 从 `RETURNED` 修订再提交 | 实践活动页 | 旧版本和反馈保留；新版本编号递增 |
| S3-08 | 从单一版本化记录恢复 | 全部学生入口 | 位置、尝试、草稿、版本、状态和计算进度同时恢复 |
| S3-09 | 动态计算学生首页 | `/practicum` | 下一活动、总体/模块进度、截止、退回工作、最新反馈来自 Store |
| S3-10 | 覆盖学习页与活动页状态 | 学习页、活动页及直接 URL | loading、empty、locked、incomplete、unsaved、submitted、returned、forbidden、missing 均有可见结果 |

## 验收方式

每个行为使用独立 Playwright 用户流程，包含适用的点击、输入、确认、跳转、刷新和直接 URL；不得只断言容器或测试钩子存在。详细场景见 `docs/practicum-bdd-catalogue.md`，完成证据见 `docs/feature-completion-matrix.md` 与 `docs/parity/practicum-slice-3-student-activities.md`。
