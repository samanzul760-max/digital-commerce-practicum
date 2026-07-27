# 用户旅程

## J1 学生实践提交

Given STUDENT 已登录且计划已发布。When 学生进入活动、保存草稿并确认提交。Then 服务端创建 `SUBMITTED` 版本，重复点击不产生第二次写入，刷新后版本仍可见。若活动被退回，学生看到反馈并追加新版本，旧版本保留。

## J2 OWNER 审核

Given OWNER 已登录。When 打开审核中心。Then 队列来自服务端；空响应显示空态，服务端失败显示错误，不使用浏览器残留数据。OWNER 可退回或按量规评分，GRADED 后只读。

## J3 权限边界

Given STUDENT 访问管理路由或审核 API。When 直达 URL 或请求 API。Then 页面/API 返回 forbidden，不能看到管理数据或执行写操作。

## J4 认证

Given 用户未登录、密码错误、已登录或已退出。When 访问工作台、登录、刷新或退出。Then 分别得到拦截、通用错误、保持 session、撤销 session。

## J5 管理查询

Given OWNER 查询计划、资源或成员。When 输入关键词、筛选、排序、分页并刷新。Then 服务端查询结果和查询条件保持一致；空结果不等于请求失败。

## 旅程缺口

TEACHER/MENTOR、邀请加入、真实上传、真实导出、多实例持久化仍是 PARTIAL/MOCK，不纳入 PASS。
