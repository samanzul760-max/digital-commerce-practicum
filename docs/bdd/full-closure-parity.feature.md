# 高标准闭环 BDD

## 学生学习

### BDD-STUDENT-001 服务端任务进入活动

Given 学生已登录且班级已发布任务
When 学生打开任务列表并进入活动
Then 活动详情读取当前学生的服务端任务和提交状态
And 不显示其他学生的任务或提交

### BDD-STUDENT-002 提交生成不可变版本

Given 学生打开可提交活动并填写非空成果
When 学生确认提交
Then 服务端创建递增版本并将任务置为 SUBMITTED
And 重复使用同一幂等键不会创建第二个版本

### BDD-STUDENT-003 刷新恢复提交

Given 学生已提交版本
When 学生刷新或重新登录后再次打开活动
Then 页面显示相同版本、提交时间和状态
And 页面不使用浏览器草稿覆盖服务端提交

### BDD-STUDENT-004 退回后重新提交

Given 教师已退回当前版本并填写反馈
When 学生查看活动、修改成果并提交
Then 页面显示反馈且服务端保留旧版本
And 新提交版本号递增且状态变为 SUBMITTED

### BDD-STUDENT-005 评分结果只读展示

Given 教师已完成评分
When 学生刷新活动详情
Then 页面显示评分、评语和评分时间
And 已评分版本不能被学生覆盖

## 教师审核

### BDD-REVIEW-001 队列按服务端事实显示

Given 审核员属于当前实训室
When 审核员打开审核中心
Then 页面显示服务端提交版本、学生、计划、单元和状态
And 筛选条件只作用于服务端队列结果

### BDD-REVIEW-002 退回必须有反馈

Given 审核员打开待审核提交
When 审核员不填写反馈直接退回
Then 服务端拒绝请求并保持 SUBMITTED
When 审核员填写反馈后退回
Then 服务端将状态变为 RETURNED 并记录审计事件

### BDD-REVIEW-003 量规完整后才能评分

Given 当前活动有必评量规
When 审核员只填写部分分数
Then 服务端拒绝评分且提交仍为 SUBMITTED
When 审核员填写完整分数和评语
Then 服务端将状态变为 GRADED 且评分结果可追溯

### BDD-REVIEW-004 批改下一个遵守筛选

Given 审核员已设置计划、单元和待审核筛选
When 审核员完成当前提交并点击批改下一个
Then 页面打开同一筛选范围内的下一条提交
And 没有下一条时显示空状态而不是错误页

### BDD-REVIEW-005 学生禁止进入审核

Given 当前用户角色为 STUDENT
When 学生访问审核队列或提交详情
Then 页面显示 forbidden 状态
And 服务端不返回其他学生的审核数据

## 稳定性与响应式

### BDD-PLATFORM-001 服务端错误可恢复

Given 任务、审核或通知接口暂时失败
When 用户打开对应页面
Then 页面显示 error 状态和重试入口
And 不使用 localStorage 数据伪装成服务端成功结果

### BDD-PLATFORM-002 移动端入口可用

Given 用户使用 390px 宽度设备
When 用户完成任务或审核路径
Then 页面无横向滚动、遮挡和不可点击按钮
