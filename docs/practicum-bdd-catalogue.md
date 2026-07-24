# 数字商贸实训 BDD Catalogue

## Slice 3：学生学习与提交

全部场景使用 `ASSUME-S3-001`，来源分类为 `ASSUME`，parity 结果只能是 `not-applicable`。

| 编号 | Given | When | Then | 正式测试 |
|---|---|---|---|---|
| S3-01 | 学生已选择学生身份 | 打开已发布学习页、草稿/归档/缺失活动直接 URL，并刷新最近位置 | 只显示已发布内容，受限内容不泄露，最近位置恢复 | `tests/e2e/practicum/student-activities-s3-001.spec.ts` |
| S3-02 | 软件活动包含必做步骤 | 学生遗漏步骤后尝试完成，再补齐步骤 | 缺失步骤被指出；补齐后完成和进度持久化 | `tests/e2e/practicum/student-activities-s3-002.spec.ts` |
| S3-03 | 两个软件活动各有尝试状态 | 学生查看影响并确认重置当前活动 | 当前活动被清除，另一活动保持，刷新后结果不变 | `tests/e2e/practicum/student-activities-s3-003.spec.ts` |
| S3-04 | 训练活动配置尝试上限 | 学生输入并提交多次有效答案后刷新 | 每次答案和确定性反馈保存；达到上限后禁止继续 | `tests/e2e/practicum/student-activities-s3-004.spec.ts` |
| S3-05 | 学生正在填写实践成果 | 学生保存草稿并刷新 | 草稿恢复，版本数为零，状态不是已提交 | `tests/e2e/practicum/student-activities-s3-005.spec.ts` |
| S3-06 | 学生已有有效草稿 | 学生点击提交并确认，再刷新 | 创建编号不可变版本，状态为已提交 | `tests/e2e/practicum/student-activities-s3-006.spec.ts` |
| S3-07 | 本地确定性状态把作业标为已退回 | 学生修改后再次提交 | 旧版本和退回反馈保留，新版本递增 | `tests/e2e/practicum/student-activities-s3-007.spec.ts` |
| S3-08 | 学生已产生位置、软件、训练和实践状态 | 学生刷新并依次返回相关页面 | 单一 `schemaVersion: 1` 记录恢复全部业务状态和计算进度 | `tests/e2e/practicum/student-activities-s3-008.spec.ts` |
| S3-09 | Store 中存在完成、截止和退回状态 | 学生返回首页 | 下一任务、进度、截止、退回工作和反馈动态更新 | `tests/e2e/practicum/student-activities-s3-009.spec.ts` |
| S3-10 | 学生和无权角色访问不同页面状态 | 执行导航、编辑、离开、提交、退回和直接 URL | 每种适用状态都有可见结果且受限数据不泄露 | `tests/e2e/practicum/student-activities-s3-010.spec.ts` |

## 骨架自检记录

S3-01 至 S3-10 均先创建只含 import、Given/When/Then 注释和空 `test.skip` 的单行为骨架。自动检查逐项确认：单一角色、单一 When、可观察 Then、合法 ID、正确分类、无 locator/assertion/fixture/mock、未夹带下一行为、无敏感信息。10 次自检均通过后才替换为正式测试；当前正式文件中 `test.skip` 数量为 0。

## Slice 4：OWNER 审核

| 编号 | Given | When | Then | 正式测试 |
|---|---|---|---|---|
| S4-01 | 学生已提交实践活动 | OWNER 打开分配给自己的审核队列 | 队列显示学生、计划、单元、活动、版本、时间和状态 | `tests/e2e/practicum/teacher-review.spec.ts` |
| S4-02 | OWNER 有不同计划、单元、状态和学生的提交 | OWNER 配置筛选与提交时间顺序 | 只显示匹配提交并按最早/最新排列 | `tests/e2e/practicum/teacher-review.spec.ts` |
| S4-03 | OWNER 正在审核已提交的实践版本 | OWNER 输入反馈并确认退回修改 | 空反馈被阻止；有效反馈与版本绑定，状态持久化为 `RETURNED` | `tests/e2e/practicum/teacher-review.spec.ts` |
| S4-04 | 学生提交已带版本反馈的退回作业 | 学生修改成果并确认再次提交 | 新增版本 2，版本 1 与对应反馈在刷新后仍保持不变 | `tests/e2e/practicum/teacher-review.spec.ts` |
| S4-05 | OWNER 审核包含必评量规的提交 | OWNER 漏填一个必评维度后尝试最终评分 | 评分被阻止，缺失维度名称可见，提交状态和评分记录不变 | `tests/e2e/practicum/teacher-review.spec.ts` |
| S4-06 | OWNER 已完成所有必评量规 | OWNER 核对摘要并确认最终评分 | 审核者、时间、量规分值、反馈和 `GRADED` 状态持久化为不可变证据 | `tests/e2e/practicum/teacher-review.spec.ts` |
| S4-07 | STUDENT 知道 OWNER 审核页直接 URL | STUDENT 打开受保护的审核队列和提交详情 | 页面禁止访问且不渲染审核数据、操作控件或额外身份 | `tests/e2e/practicum/teacher-review.spec.ts` |
| S4-08 | OWNER 已配置审核队列筛选 | OWNER 切换审核范围和处理状态 | 队列按视图变化，计划、单元、学生和排序筛选保持 | `tests/e2e/practicum/teacher-review.spec.ts` |
| S4-09 | OWNER 有已提交实践版本 | OWNER 从首页快捷审核和计划审核入口进入 | 两个入口打开同一授权提交详情契约 | `tests/e2e/practicum/teacher-review.spec.ts` |
| S4-10 | 授权用户到达适用审核状态 | 用户加载队列或提交详情 | loading、筛选为空、禁止、退回、评分和不可变历史均有可见结果 | `tests/e2e/practicum/teacher-review.spec.ts` |

## Slice 7：原创电商教学案例与导航打磨

全部场景使用 `ORIGINAL-S7-001`，来源分类为 `ORIGINAL`，parity 结果为 `not-applicable`。案例内容为本产品原创、匿名、确定性内容。

| 编号 | Given | When | Then | 正式测试 |
|---|---|---|---|---|
| S7-01 | 学生或管理员已选择身份 | 打开教学案例列表 | 六个原创电商案例可见，并按可提交/课堂阅读分组展示，其中三个标记为可提交 | `tests/e2e/practicum/commerce-cases.spec.ts` |
| S7-02 | 学生打开商品卖点提炼案例 | 填写、保存、提交并查看退回状态 | 学生端显示任务、自检、草稿、版本、提交和退回反馈 | `tests/e2e/practicum/commerce-cases.spec.ts` |
| S7-03 | 管理员打开客服差评回复案例 | 查看同一案例详情 | 管理员看到教学指导、量规和提交概览，学生不泄露管理员内容 | `tests/e2e/practicum/commerce-cases.spec.ts` |
| S7-04 | 用户打开不存在的案例 ID | 访问案例详情路由 | 页面显示明确缺失状态且不渲染案例详情 | `tests/e2e/practicum/commerce-cases.spec.ts` |
| S7-05 | 用户在工作区切换路由 | 查看侧边栏当前目录 | 对应入口根据当前路由高亮并设置 `aria-current="page"` | `tests/e2e/practicum/navigation-permissions.spec.ts` |
| S7-06 | 学生在手机端打开案例路由 | 查看工作区域目录 | 只显示学生可进入入口，案例入口高亮且页面无水平溢出 | `tests/e2e/practicum/navigation-permissions.spec.ts` |
| S7-07 | 学生直接访问管理 URL | 打开资源、成员、实训室、审核和数据中心 | 原有 forbidden 守卫继续生效，不泄露管理数据 | `tests/e2e/practicum/navigation-permissions.spec.ts` |
| S7-08 | Slice 6 发布证据需要收尾 | 扫描报告和进度页 | 报告写入 90/90、11/11，且无 `Owner/Teacher` 残留 | `tests/e2e/practicum/slice-7-release-polish.spec.ts` |

## Slice 7 骨架自检记录

S7-01 至 S7-08 均先创建只含 import、Given/When/Then 注释和空 `test.skip` 的 BDD 骨架；`ORIGINAL-S7-001` 写入 `source-feature-parity.md` 后转为正式测试，并已完成 RED-GREEN 验证。
