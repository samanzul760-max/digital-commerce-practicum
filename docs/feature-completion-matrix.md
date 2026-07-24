# Feature Completion Matrix

完成定义：`domain rule -> permission guard -> persistence -> route/entry -> UI states -> role visibility -> focused E2E -> regression -> Edge visual check` 全部为绿色。

### Slice 3:

| 行为 | PRD | Feature ID | 状态 | 证据 |
|---|---|---|---|---|
| S3-01 已发布访问与学习位置 | `practicum-slice-3-prd.md` S3-01 | `ASSUME-S3-001` | green | `student-activities-s3-001.spec.ts`; 直接 URL、刷新 |
| S3-02 软件步骤与进度 | PRD S3-02 | `ASSUME-S3-001` | green | `student-activities-s3-002.spec.ts`; 缺失名称、完成、刷新 |
| S3-03 隔离重置 | PRD S3-03 | `ASSUME-S3-001` | green | `student-activities-s3-003.spec.ts`; 确认、第二活动隔离、刷新 |
| S3-04 训练尝试 | PRD S3-04 | `ASSUME-S3-001` | green | `student-activities-s3-004.spec.ts`; 历史、反馈、上限、刷新 |
| S3-05 草稿无版本 | PRD S3-05 | `ASSUME-S3-001` | green | `student-activities-s3-005.spec.ts`; 草稿值、0 版本、非提交状态 |
| S3-06 提交不可变版本 | PRD S3-06 | `ASSUME-S3-001` | green | `student-activities-s3-006.spec.ts`; 确认、版本 1、刷新 |
| S3-07 退回修订 | PRD S3-07 | `ASSUME-S3-001` | green | `student-activities-s3-007.spec.ts`; 版本 1/2、反馈保留 |
| S3-08 单一记录恢复 | PRD S3-08 | `ASSUME-S3-001` | green | `student-activities-s3-008.spec.ts`; `schemaVersion: 1` 与全部字段 |
| S3-09 动态学生首页 | PRD S3-09 | `ASSUME-S3-001` | green | `student-activities-s3-009.spec.ts`; 动态下一项、进度、截止与反馈 |
| S3-10 完整页面状态 | PRD S3-10 | `ASSUME-S3-001` | green | `student-activities-s3-010.spec.ts`; 状态集与无数据泄露 |

Slice 3 聚焦主套件：`student-activities.spec.ts` 10/10；强化套件 10/10；全 practicum 55/55；全项目 55/55。Edge 1440/375 首页与活动页无溢出、无主要区域重叠、控制台无 warning/error，截图位于 `test-results/slice-3-edge/`。

### Slice 4:

| 行为 | Feature ID | 状态 | 证据 |
|---|---|---|---|
| S4-01 OWNER 审核队列字段 | `ASSUME-S4-001` | green | `teacher-review.spec.ts`; 真实提交后显示学生、计划、单元、活动、版本、时间和状态 |
| S4-02 筛选与排序 | `ASSUME-S4-001` | green | `teacher-review.spec.ts`; 计划、单元、状态、学生筛选与最早/最新排序 |
| S4-03 退回与反馈校验 | `ASSUME-S4-001` | green | `teacher-review.spec.ts`; 空反馈校验、学生/活动/版本确认、`RETURNED` 与版本反馈刷新持久化 |
| S4-04 学生修订历史 | `ASSUME-S4-001` | green | `teacher-review.spec.ts`; 真实 OWNER 退回后学生新增版本 2，旧版本与绑定反馈刷新后不变 |
| S4-05 量规完整性 | `ASSUME-S4-001` | green | `teacher-review.spec.ts`; 缺少“操作规范性”时阻止评分，保持 `SUBMITTED` 且不生成 grade |
| S4-06 最终评分证据 | `ASSUME-S4-001` | green | `teacher-review.spec.ts`; 确认摘要、总分、OWNER、ISO 时间、量规值、反馈和 `GRADED` 刷新持久化 |
| S4-07 两角色越权边界 | `ASSUME-S4-001` | green | `teacher-review.spec.ts`; STUDENT 直接 URL 禁止、无数据/控件泄露，个人页只有 OWNER/STUDENT |
| S4-08 队列视图与筛选保持 | `ASSUME-S4-001` | green | `teacher-review.spec.ts`; 计划/课堂、待处理/已处理切换与筛选保持，旧状态筛选排序回归 8/8 |
| S4-09 统一详情入口 | `ASSUME-S4-001` | green | `teacher-review.spec.ts`; 首页快捷审核与计划页入口均打开同一提交 ID/详情根节点/版本状态 |
| S4-10 首页、队列、详情完整状态 | `ASSUME-S4-001` | green | `teacher-review.spec.ts`; loading、empty-filter、forbidden、returned、graded、immutable-history 全部可见 |

### Slice 状态

| Slice | 状态 | 说明 |
|---|---|---|
| Slice 1 | green | 现有回归通过 |
| Slice 2 | green | 现有回归通过 |
| Slice 3 | green | 十项行为、持久化、权限、双尺寸 Edge 与文档证据齐全 |
| Slice 4 | green | S4-01 至 S4-10 green；聚焦 10/10、全 practicum 65/65、全项目 E2E 65/65、typecheck/build green；Edge 1440/375、刷新持久化、Student 直达 URL 与角色扫描已完成 |
| Slice 5 | green | S5-01 至 S5-12 green；聚焦 progress-notifications.spec.ts 14/14；全 practicum 79/79；全项目 E2E 79/79；typecheck/build green；通知铃铛+badge+deep-link 验证 |
| Slice 6 | green | `ORIGINAL-S6-001`；存储恢复+badge CSS+表单焦点/播报+loading 状态+GRADED 最终态+撤销发布确认+防重复提交+CSS 令牌+触控目标 44px+响应式溢出；slice-6-quality.spec.ts 5/5 green；全项目 84/84；typecheck/build green；安全扫描 clean |

## Slice 7 completion addendum

| Slice | Status | Evidence |
|---|---|---|
| Slice 7 commerce cases and polish | green | `ORIGINAL-S7-001`; `commerce-cases.spec.ts` 5/5 green; `navigation-permissions.spec.ts` 4/4 green; `slice-7-release-polish.spec.ts` 1/1 green; focused Slice 7 10/10 green; full practicum E2E 100/100 green; typecheck/build green; six original anonymous cases; three submittable case exercises; route-driven sidebar highlight with `aria-current`; STUDENT menu hides admin entries; direct URL guards remain green; list/detail pages now show summary band, grouped cases and a two-column case detail layout; Slice 6 evidence updated to 90/90 and 11/11 |
