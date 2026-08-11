# LearnEC 阶段 D：批阅、评分与学情

功能: 管理员基于学生已提交版本完成证据回溯、评分和数据回收

  场景: BDD-REVIEW-001 管理员在授权班级的提交队列中完成加权评分
    假如 STUDENT 已提交一个属于当前 ADMIN 可管理班级的实训工单
    当 ADMIN 打开批阅队列并查看该学生的当前提交版本、沙盘快照和操作证据
    并且 ADMIN 录入 80 分人工分和有效评语
    那么 系统以工单 70% 自动分和 30% 人工分生成 94 分总分
    并且 Grade 和第一条 GradeRevision 均保存自动分、人工分、权重、总分和评语
    并且 StudentTask 变为 GRADED

  场景: BDD-REVIEW-002 退回必须有反馈且重做后形成新版本
    假如 ADMIN 正在批阅一个 SUBMITTED 的 StudentTask
    当 ADMIN 未填写反馈尝试退回
    那么 系统拒绝该操作
    当 ADMIN 填写反馈后退回
    那么 StudentTask 变为 RETURNED 且任务事件记录反馈
    并且 STUDENT 再次提交时 SubmissionVersion 增加而历史版本保留

  场景: BDD-DATA-001 管理员导出授权班级真实成绩单
    假如 ADMIN 已对班级内的学生工单评分
    当 ADMIN 下载该班级成绩单
    那么 文件为 .xlsx
    并且 列仅包括学号、姓名、工单名、自动分、人工分、总分、提交时间
    并且 导出操作记录为 AuditEvent

  场景: BDD-REVIEW-003 未发布成绩在所有学生接口中不可见
    假如 ADMIN 已为 STUDENT 的提交保存评分但尚未发布
    当 STUDENT 刷新首页、作业列表、任务详情、提交详情或重放原提交请求
    那么 所有响应中的 grade 均为空
    并且 响应不得包含该 Grade 的分数、评语、修订、评分人或评分时间
    当 ADMIN 发布该成绩
    那么 STUDENT 才能读取发布后的分数、评语和发布时间

  场景: BDD-REVIEW-004 成绩撤回和修订遵守发布状态机
    假如 ADMIN 已发布一个 Grade
    当 ADMIN 撤回成绩
    那么 系统在同一事务中清空 releasedAt 和 releasedById 并记录任务事件与审计事件
    并且 STUDENT 再次读取时 grade 为空
    当 ADMIN 对已发布成绩进行修订
    那么 系统自动撤回原发布状态且新成绩保持未发布
    当 ADMIN 撤回一个未发布成绩
    那么 系统返回 409 和 GRADE_NOT_RELEASED
