# Learning Progress BDD

## SB-PLAN-002 Dependency unlock

```gherkin
场景: 学生不能提交未满足前置条件的任务
  假如 学生的任务 B 依赖尚未完成的任务 A
  当 学生提交任务 B
  那么 服务端返回任务锁定冲突且任务 B 保持 LOCKED

场景: 前置任务完成后解锁后置任务
  假如 学生的任务 B 依赖已经完成的任务 A
  当 学生读取任务 B
  那么 服务端将任务 B 标记为 AVAILABLE

场景: 教师评分前置任务后解锁后置任务
  假如 学生的任务 B 依赖已经提交的任务 A
  当 教师为任务 A 完成评分
  那么 服务端将任务 B 标记为 AVAILABLE
```

## SB-SUB-002 Idempotency

```gherkin
场景: 重复的提交请求不会创建新的版本
  假如 学生有一项可提交的任务
  当 学生使用相同的 Idempotency-Key 重复提交
  那么 服务端返回首次提交结果且只保留一个提交版本
```
