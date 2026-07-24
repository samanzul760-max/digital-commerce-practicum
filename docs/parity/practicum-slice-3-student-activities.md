# practicum-slice-3-student-activities parity audit - 2026-07-21

Skill: practicum-slice-3-student-activities
Local checks: green
Case session: user-waived
Waiver approved at: 2026-07-21T21:45:00+08:00
Waiver evidence: current task requires `ASSUME-S3-001` to be reported as not-applicable and automatic continuation without a case-site claim
OpenCLI doctor: not-applicable
Browser: Microsoft Edge

`ASSUME-S3-001` 是本产品批准的原型行为，未声称来自案例站点，分类结果统一为 `not-applicable`。

| Feature ID | Role | Case path summary | Project path | Result | Difference/evidence |
|---|---|---|---|---|---|
| ASSUME-S3-001 | STUDENT | N/A：批准的本地原型行为 | `/practicum`、learning route、activity route | not-applicable | 十项真实用户流程、单一版本化持久化、刷新、直接 URL 与 Edge 双尺寸检查均为绿色 |

| 行为 | Feature ID | Role | Project path | First formal result | GREEN evidence | Changed files | Result |
|---|---|---|---|---|---|---|---|
| S3-01 | `ASSUME-S3-001` | STUDENT | learning/activity direct URLs | RED：草稿活动 URL 未显示禁止状态 | 已发布节点可见；草稿、归档、缺失内容不泄露；位置刷新恢复 | `usePracticumStore.ts`, `learn/[planId].vue`, `activities/[activityId].vue`, `student-activities-s3-001.spec.ts` | not-applicable |
| S3-02 | `ASSUME-S3-001` | STUDENT | software activity | RED：步骤完成状态刷新后丢失 | 缺失步骤名称、完成时间、进度与刷新持久化通过 | `types.ts`, `usePracticumStore.ts`, `activities/[activityId].vue`, `student-activities-s3-002.spec.ts` | not-applicable |
| S3-03 | `ASSUME-S3-001` | STUDENT | software reset | RED：重置刷新后当前步骤仍存在 | 确认影响、当前活动清除、第二活动不变 | `usePracticumStore.ts`, `activities/[activityId].vue`, `student-activities-s3-003.spec.ts` | not-applicable |
| S3-04 | `ASSUME-S3-001` | STUDENT | training activity | RED：尝试历史数量为 0 | 每次有效尝试、确定性反馈、上限和刷新通过 | `types.ts`, `usePracticumStore.ts`, `activities/[activityId].vue`, `student-activities-s3-004.spec.ts` | not-applicable |
| S3-05 | `ASSUME-S3-001` | STUDENT | practice draft | RED：刷新后草稿为空 | 草稿真实值恢复，0 个版本，状态未提交 | `usePracticumStore.ts`, `activities/[activityId].vue`, `student-activities-s3-005.spec.ts` | not-applicable |
| S3-06 | `ASSUME-S3-001` | STUDENT | practice submit | RED：刷新后提交版本数量为 0 | 确认后创建版本 1、状态 `SUBMITTED`、刷新保留 | `types.ts`, `usePracticumStore.ts`, `activities/[activityId].vue`, `student-activities-s3-006.spec.ts` | not-applicable |
| S3-07 | `ASSUME-S3-001` | STUDENT | returned revision | RED：`RETURNED` 没有可见结果 | 仅退回状态可修订；版本 1、反馈和版本 2 同时保留 | `usePracticumStore.ts`, `activities/[activityId].vue`, `index.vue`, `student-activities-s3-007.spec.ts` | not-applicable |
| S3-08 | `ASSUME-S3-001` | STUDENT | versioned storage | RED：业务字段可恢复但 `schemaVersion` 为 undefined | `schemaVersion: 1` 与位置、尝试、草稿、版本、状态、进度统一恢复 | `usePracticumStore.ts`, `student-activities-s3-008.spec.ts` | not-applicable |
| S3-09 | `ASSUME-S3-001` | STUDENT | `/practicum` | RED：首页固定显示第一项“商家入驻” | 下一项、总体/模块进度、截止、退回工作、反馈动态计算 | `usePracticumStore.ts`, `index.vue`, `student-activities-s3-009.spec.ts` | not-applicable |
| S3-10 | `ASSUME-S3-001` | STUDENT/OWNER | learning/activity states | 初始导航错误不计 RED；修正测试后的有效 RED 为缺少 loading，随后发现 OWNER 顶部标题泄露 | 所有要求状态有可见结果，OWNER 直接 URL 不显示活动标题 | `learn/[planId].vue`, `activities/[activityId].vue`, `student-activities-s3-010.spec.ts` | not-applicable |

## BDD/TDD 证据

- 每个行为均先建立一个空 `test.skip` Given/When/Then 骨架并通过 10 项自动自检，再替换为正式测试。
- 没有把跳过测试当作 RED；S3-10 的无效导航失败也未记为 RED。
- 当前十个强化文件均为正式测试，`test.skip` 为 0。
- 强化回归：10/10；`student-activities.spec.ts`：10/10；完整 practicum 和全项目：55/55。

## 持久化与权限

- 单一键：`digital-commerce-practicum.v1`；记录版本：1。
- 刷新恢复：学习位置、软件步骤、训练历史、草稿、提交版本、状态和计算进度。
- 学生直接 URL：草稿、归档、缺失活动不泄露；OWNER 打开学生活动 URL 只显示禁止结果。
- 产品代码、测试、UI 与项目文档只使用 `OWNER`/`STUDENT` 两角色。

## Edge 证据

| 视口 | 页面 | 溢出 | 重叠 | Console | 截图 |
|---|---|---|---|---|---|
| 1440x900 | Student home + practice activity | 无 | 无 | 0 warning / 0 error | `test-results/slice-3-edge/*desktop-1440.png` |
| 375x812 | Student home + practice activity | 无 | 无 | 0 warning / 0 error | `test-results/slice-3-edge/*mobile-375.png` |
