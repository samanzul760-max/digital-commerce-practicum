# 教师课堂 BDD 契约

状态：IMPLEMENTED_UNVERIFIED。此文件及关联 Playwright 契约先于生产代码创建；数据基础提交 `3256d3f` 已提供 `ClassAnnouncement`、`TeachingSession` 和 `ActivityExecution`。按本轮约束，命令仅登记，不执行。

## API 契约

- `GET /api/practicum/teacher/classes/:classId/announcements` 返回当前教师可管理班级的公告列表。
- `POST /api/practicum/teacher/classes/:classId/announcements`：
  - `{ title, content }` 以 `DRAFT` 创建公告，须带 `Idempotency-Key`。
  - `{ announcementId, action: "PUBLISH" }` 仅允许 `DRAFT -> PUBLISHED`。
  - `{ announcementId, action: "CLOSE" }` 仅允许 `PUBLISHED -> CLOSED`。
- `GET /api/practicum/teacher/classes/:classId/sessions` 返回班级课堂列表和当前 `ACTIVE` 课堂。
- `POST /api/practicum/teacher/classes/:classId/sessions`：
  - `{ action: "START", activityId }` 创建或重放一节 `ACTIVE` 课堂，须带 `Idempotency-Key`。
  - `{ action: "END", sessionId }` 仅允许 `ACTIVE -> ENDED`，须带 `Idempotency-Key`。
- `GET /api/practicum/teacher/sessions/:sessionId/execution` 返回该课堂当前活动的 `ActivityExecution` 聚合。评分、提交版本和成绩只返回既有事实的链接/计数，不复制其记录。

所有写接口均由既有 CSRF 中间件验证；无会话为 `401 AUTH_REQUIRED`，CSRF 无效为 `403 CSRF_INVALID`，无权或跨班级访问统一为 `404 CLASS_NOT_FOUND`，非法状态转移为 `409 TEACHING_STATE_INVALID`，输入不完整为 `422 TEACHING_INPUT_INVALID`。

```gherkin
功能: 教师课堂的服务端公告、课堂与执行数据

  背景:
    假如 教师已经通过有效的服务端会话登录
    并且 教师只在实训室 room-001 的已分配班级中有教学身份

  场景: BDD-TEACHER-CLASSROOM-001 教师创建草稿并幂等发布班级公告
    当 教师使用幂等键创建一条标题和正文都有效的班级公告
    那么 服务端创建状态为 DRAFT 的 ClassAnnouncement
    并且 使用相同幂等键重放请求时返回同一公告而不创建第二条
    当 教师发布该草稿
    那么 公告状态变为 PUBLISHED 且发布者和班级范围被持久化
    并且 公告列表只返回当前班级范围内的数据

  场景: BDD-TEACHER-CLASSROOM-002 公告只能沿合法状态流转
    假如 班级公告已经发布
    当 教师关闭该公告
    那么 公告状态变为 CLOSED
    当 教师再次使用新的幂等键发布或关闭已关闭公告
    那么 服务端返回 409 TEACHING_STATE_INVALID 且不改变已关闭记录

  场景: BDD-TEACHER-CLASSROOM-003 教师开始和结束课堂时保持幂等
    当 教师使用幂等键为班级活动开始课堂
    那么 服务端创建 ACTIVE 的 TeachingSession 和当前活动关联
    并且 使用相同幂等键重放开始请求时返回同一课堂
    当 教师使用新的幂等键结束该课堂
    那么 课堂状态变为 ENDED 且记录结束时间
    并且 重放该结束请求不会重复结束或产生第二节课堂

  场景: BDD-TEACHER-CLASSROOM-004 教师只能查看自己班级的课堂和执行统计
    假如 另一班级没有该教师的 ClassEnrollment
    当 该教师直接请求另一班级的公告、课堂或页面地址
    那么 API 返回 404 CLASS_NOT_FOUND 且页面显示受限状态
    并且 响应不包含另一班级的公告、课堂、学生、执行或评分事实

  场景: BDD-TEACHER-CLASSROOM-005 当前活动的执行统计来自服务端事实
    假如 教师已开始一节课堂
    当 教师查询该课堂的执行统计
    那么 返回 ActivityExecution 的总数、未开始、进行中和已完成计数
    并且 仅返回提交/评分事实的计数或链接，不复制 Submission 或 Grade 数据

  场景: BDD-TEACHER-CLASSROOM-006 教师课堂页面处理所有数据状态
    当 有权教师进入课堂页面
    那么 页面依次支持 loading、空公告/空课堂、服务端错误和受限状态
    并且 在 390px 宽度下没有水平溢出
    并且 页面不使用 localStorage 作为公告、课堂或执行统计的业务数据回退
```

关联测试：`tests/e2e/practicum/teacher-classroom-closure.spec.ts`

登记但未执行：

```powershell
npx.cmd playwright test tests/e2e/practicum/teacher-classroom-closure.spec.ts --reporter=list
npm.cmd run typecheck
npm.cmd run build
```
