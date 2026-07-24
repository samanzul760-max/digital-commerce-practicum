# practicum-slice-4-teacher-review parity audit - 2026-07-21

Skill: practicum-slice-4-teacher-review
Local checks: green
Case session: user-waived
Waiver approved at: 2026-07-21T22:05:00+08:00
Waiver evidence: current task requires two-role OWNER review and ASSUME-S4-001 is not a case-site claim
OpenCLI doctor: not-applicable
Browser: Microsoft Edge

| Feature ID | Role | Case path summary | Project path | Result | Difference/evidence |
|---|---|---|---|---|---|
| ASSUME-S4-001 | OWNER/STUDENT | N/A：批准的本地原型审核行为 | `/practicum/reviews`、`/practicum/submissions/:submissionId` | not-applicable | S4-01 至 S4-10 green；本地门禁进行中 |

| 行为 | PRD/BDD | 首次正式结果 | RED/GREEN | 修改文件 | 持久化与状态 | 聚焦回归 |
|---|---|---|---|---|---|---|
| S4-01 | `practicum-slice-4-prd.md` S4-01；`teacher-review.spec.ts` | RED：审核行期望 1，实际 0 | RED 后 1/1 GREEN | `types.ts`, `usePracticumStore.ts`, `PracticumSidebar.vue`, `reviews/index.vue`, `teacher-review.spec.ts` | 队列由持久化提交版本和课程树动态派生；无页面副本 | 1/1 passed |
| S4-02 | PRD S4-02；`teacher-review.spec.ts` | RED：`data-plan-filter` 不存在并超时 | RED 后 1/1 GREEN | `types.ts`, `usePracticumStore.ts`, `reviews/index.vue`, `teacher-review.spec.ts` | 学生标识随提交持久化；筛选/排序从 Store 队列计算 | 2/2 passed |
| S4-03 | PRD S4-03；BDD catalogue S4-03；`teacher-review.spec.ts` | RED：`/practicum/submissions/act-01-003` 无详情页，`data-submission-detail` 找不到 | RED 后 1/1 GREEN；REFACTOR 审查无需改动；行为 1-3 回归 3/3 | `types.ts`, `usePracticumStore.ts`, `submissions/[submissionId].vue`, `teacher-review.spec.ts` | 反馈必填；确认摘要绑定学生、活动、版本；状态、反馈条目和版本号刷新后仍存在 | 3/3 passed |
| S4-04 | PRD S4-04；BDD catalogue S4-04；`teacher-review.spec.ts` | 首次 1/1 PASS：Slice 3 已有修订基础，按已有行为回归记录，不伪造 RED | 骨架自检 10/10；正式测试 1/1；REFACTOR 合并到固定聚焦文件后行为 1-4 为 4/4 | `teacher-review.spec.ts`, BDD catalogue, completion matrix, parity report | 真实 OWNER 退回后学生新增版本 2；版本 1、版本 1 反馈与 `SUBMITTED` 状态刷新后保持 | 4/4 passed |
| S4-05 | PRD S4-05；BDD catalogue S4-05；`teacher-review.spec.ts` | RED：量规输入“设置完整性（满分 40）”不存在并超时 | RED 后 1/1 GREEN；REFACTOR 合并后行为 1-5 为 5/5 | `submissions/[submissionId].vue`, `teacher-review.spec.ts`, BDD catalogue, completion matrix, parity report | 必评项缺失时只显示缺失名称；状态保持 `SUBMITTED`，grade 不存在 | 5/5 passed |
| S4-06 | PRD S4-06；BDD catalogue S4-06；`teacher-review.spec.ts` | RED：完整量规填写后 `data-grade-confirmation` 不存在 | RED 后 1/1 GREEN；REFACTOR 合并后行为 1-6 为 6/6 | `types.ts`, `usePracticumStore.ts`, `submissions/[submissionId].vue`, `teacher-review.spec.ts`, BDD catalogue, completion matrix, parity report | 最终确认后保存 OWNER、ISO 时间、全部量规值、反馈和 `GRADED`；刷新后只读且不能重复评分 | 6/6 passed |
| S4-07 | PRD S4-07；BDD catalogue S4-07；`teacher-review.spec.ts` | 首跑因不存在的测试定位器超时，不算 RED；修正后的行为有效首次结果 1/1 PASS | 骨架自检 10/10；已有权限行为回归；REFACTOR 合并后行为 1-7 为 7/7 | `teacher-review.spec.ts`, BDD catalogue, completion matrix, parity report | STUDENT 直达队列/详情均禁止且无数据、退回、评分控件；状态保持 `SUBMITTED`；只有两个身份 | 7/7 passed |
| S4-08 | PRD S4-08；BDD catalogue S4-08；`teacher-review.spec.ts` | RED：`data-review-scope="PLAN"` 控件不存在并超时 | GREEN 后 1/1；处理状态默认“全部”兼容旧状态筛选；行为 1-8 回归 8/8 | `types.ts`, `usePracticumStore.ts`, `reviews/index.vue`, `teacher-review.spec.ts`, BDD catalogue, completion matrix, parity report | `reviewScope` 随提交记录持久化/默认 PLAN；切换计划/课堂与待处理/已处理不改计划、单元、学生、排序筛选 | 8/8 passed |
| S4-09 | PRD S4-09；BDD catalogue S4-09；`teacher-review.spec.ts` | RED：首页 `[data-review-quick-link]` 不存在 | RED 后 1/1 GREEN；REFACTOR 合并后行为 1-9 为 9/9 | `pages/practicum/index.vue`, `pages/practicum/plans/[planId]/index.vue`, `teacher-review.spec.ts` | 首页和计划页均由 `getReviewQueue()` 生成同一提交详情 URL，权限由详情页统一判断 | 9/9 passed |
| S4-10 | PRD S4-10；BDD catalogue S4-10；`teacher-review.spec.ts` | RED：审核中心 `data-review-loading` 不存在 | RED 后 1/1 GREEN；REFACTOR 合并后行为 1-10 为 10/10 | `reviews/index.vue`, `teacher-review.spec.ts` | OWNER loading 自动结束；empty-filter、forbidden、RETURNED、GRADED 和版本历史/无评分按钮均可见 | 10/10 passed |

## Slice 4 门禁汇总

- BDD 骨架自动自检：S4-03 至 S4-10 每项 10/10；S4-01、S4-02 的既有记录保持不变。
- 固定聚焦测试：`tests/e2e/practicum/teacher-review.spec.ts` 10/10。
- `ASSUME-S4-001` 为本地批准原型行为，parity `not-applicable`；没有引入第三种身份。
- 最终门禁：聚焦 `teacher-review.spec.ts` 10/10；全 practicum E2E 65/65；全项目 E2E 65/65；typecheck green；build green。
- Edge 真实浏览器：1440x900 与 375x812 均无横向溢出；移动端刷新后页面结构和身份入口保持；控制台 error 0，只有 Nuxt/Vue 信息日志。
- 刷新持久化：审核退回、修订版本、量规评分、`RETURNED`/`GRADED` 和不可变历史均由聚焦 E2E 在 reload 后断言。
- Student 直接 URL：审核队列与提交详情均 forbidden，审核数据和操作控件不泄露。
- 角色残留扫描：源码、配置和运行 UI 未发现 `TEACHER`/`MENTOR` 身份；命中仅为技能名、审计文档和权限回归断言。
