# 数据模型

| 实体 | 关键字段 | 所属/生命周期 | 当前持久化 |
|---|---|---|---|
| User | id、identifier、displayName、role、roomIds | 账号；固定测试种子 | 服务端 auth store |
| Session | token、userId、expiresAt | 登录创建、退出/过期撤销 | `.data/auth-sessions.json` |
| TrainingRoom | id、名称、状态 | 实训室上下文 | seed/repository |
| Plan | id、roomId、title、status、version | DRAFT/PUBLISHED/ARCHIVED | `.data/practicum-data.json` |
| CurriculumNode | id、planId、parentId、level、sort | 计划目录 | repository + store |
| Activity | id、type、config | 活动配置 | repository + seed |
| PracticeSubmission | activityId、studentId、status、versions、feedbackEntries、grade | NOT_STARTED -> SUBMITTED -> RETURNED/GRADED | repository；页面仍有兼容 store |
| SubmissionVersion | id、submissionId、version、text、submittedAt | 追加、不可覆盖 | repository |
| Resource | id、planId、name、kind、url | 创建/删除 | repository |
| Membership | id、roomId、label、role、group | 修改/移除 | repository |
| Notification | id、targetRole、targetRoute、read、createdAt | 创建/已读 | repository + store |
| Asset | id、filename、mime、size、storageKey | 上传元数据 | 本地 `.data/uploads` |

提交数据完整性约束：版本号递增；GRADED 不可修改；RETURNED 才能追加版本；评分量规必须存在且在范围内；学生只能访问自己的提交，OWNER 只能访问授权实训室。
