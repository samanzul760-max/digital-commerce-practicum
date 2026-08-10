# LearnEC Phase E Placeholder, Compatibility, and Visual Integration

功能: LearnEC 最终前端闭环
  为了让高校电商实训平台具备完整、可信且易用的学习入口
  作为 ADMIN 或 STUDENT
  我需要看到真实数据驱动的工作台、明确标注的未开放能力和可迁移的旧链接

  场景: BDD-E-001 ADMIN 从旧赛考链接进入诚实的占位页
    假如 ADMIN 已登录
    当其访问 /practicum/competitions
    那么页面重定向到 /admin/competitions
    并且显示 COMING_SOON 状态与赛考能力说明
    而且页面没有创建比赛、发布成绩或写入业务数据的操作

  场景: BDD-E-002 STUDENT 看到真实任务驱动的首页
    假如 STUDENT 已登录
    当其访问 /center
    那么页面显示 LearnEC 顶栏、欢迎区、任务进度和学习日历
    并且空任务状态不会显示伪造的任务数量或成绩

  场景: BDD-E-003 未登录用户不能通过旧链接绕过会话
    假如用户没有有效会话
    当其访问任一 /practicum/** 链接
    那么页面重定向到 /login

  场景: BDD-E-004 角色守卫和移动布局保持可用
    假如 ADMIN 或 STUDENT 已登录
    当其在 390px 宽度访问各自允许的工作台、占位页和沙盘页
    那么页面不存在横向滚动溢出
    而且越权直达地址仍被重定向到其允许的角色入口
