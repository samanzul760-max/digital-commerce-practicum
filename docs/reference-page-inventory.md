# 页面与功能清单

审计日期：2026-07-27。FACT 仅记录当前项目已存在的路由和动作；参考产品行为中尚未验证的部分不写成事实。

| 路由 | 角色 | 页面职责 | 关键动作/状态 | 当前数据来源 |
|---|---|---|---|---|
| `/practicum` | OWNER/STUDENT | 工作台、计划入口、提醒 | loading、空、权限、创建/进入计划 | API 与 store 混用 |
| `/practicum/profile` | 登录用户 | 登录、身份/个人入口 | 错误、成功、退出 | auth API + session |
| `/practicum/plans/:planId` | OWNER/STUDENT | 计划详情 | 已发布可读、草稿禁读 | API/store 混用 |
| `/practicum/plans/:planId/edit` | OWNER | 目录编辑 | 新增、修改、发布、归档、冲突 | API/store 混用 |
| `/practicum/learn/:planId` | STUDENT | 学习计划和进度 | 空、恢复位置、下一项 | localStorage 原型 |
| `/practicum/activities/:activityId` | STUDENT | 软件/训练/实践活动 | 草稿、提交、退回、错误、重复点击 | API + store 混用 |
| `/practicum/reviews` | OWNER | 审核队列 | 筛选、排序、空、失败、权限 | 服务端队列 |
| `/practicum/submissions/:submissionId` | OWNER | 提交详情、退回、评分 | 历史、量规、不可变评分 | API + store 兼容 |
| `/practicum/resources` | OWNER | 资源列表 | 查询、分页、删除、上传元数据 | API |
| `/practicum/members` | OWNER | 成员列表 | 修改、移除 | store/API 混用 |
| `/practicum/room-settings` | OWNER | 实训室介绍 | 文本和媒体元数据 | store 原型 |
| `/practicum/progress` | STUDENT | 学习进度 | 指标、空态 | store 原型 |
| `/practicum/data-center` | OWNER | 统计、排行、导出 | 指标、导出模拟 | API/store 混用 |
| `/practicum/notifications` | OWNER/STUDENT | 通知和已读 | 未读、单条/全部已读、深链 | API/store 混用 |
| `/practicum/tasks` | STUDENT | 任务入口 | 任务列表、空态 | store 原型 |
| `/practicum/cases`、`/practicum/cases/:caseId` | OWNER/STUDENT | 原创案例 | 草稿、提交、退回、评分、缺失 | store 原型 |
