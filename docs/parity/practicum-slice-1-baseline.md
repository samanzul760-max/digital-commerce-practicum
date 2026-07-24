# practicum-slice-1-baseline parity audit - 2026-07-20 13:02 CST

Skill: practicum-slice-1-baseline
Local checks: green
Case session: fresh
Observed at: 2026-07-20T13:02:00+08:00
OpenCLI doctor: green
Browser: Microsoft Edge

| Feature ID | Role | Case path summary | Project path | Result | Difference/evidence |
|---|---|---|---|---|---|
| CASE-S1-001 | OWNER | application shell: header with plan name + status badge (教学/已发布), QR code popover, share, settings, platform switcher (7 platforms), notification bell with unread count (9+), notification dropdown (全部标记为已读, 查看全部通知), organization dropdown (账号设置, 切换组织, 组织管理, 退出登录) | `/practicum` shared shell with sidebar + topbar | functionally-close | local shell: sidebar brand + nav, topbar with notification + personal entry; case has QR code, share, settings, platform switcher, org dropdown — these are Slice 2-5 features; shell structure is functionally equivalent |
| CASE-S1-002 | OWNER | plan list: 创建教学计划 entry, two plan cards (网店运营 + 网店视觉设计), each with cover image, title, creation time, 管理计划 + 前往教学 buttons | `/practicum` plan cards with title/description | functionally-close | local: plan cards rendered with title/description/status; missing: cover image, 创建教学计划 dialog, 管理计划 link to editor, 前往教学 link to teaching view — these belong to Slice 2 |
| CASE-S1-003 | OWNER | curriculum hierarchy: plan → 一级目录(module) → 二级目录(unit) → activity; 6 modules confirmed via tree extraction: 网店开通, 网店商品发布与设置, 店铺交易管理, 网店推广, 网店客户服务, 网店数据分析与复盘 | `/practicum/plans/:planId` 6 modules / 11 units / 58 activities | matched | local seed has 6/11/58 matching; activity names differ in wording (case uses 【实训】/【赛卷1】 prefixes; local uses simplified names per PRD — intentional difference for content ownership) |
| CASE-S1-004 | OWNER | activity types: tree shows activities with 移除 action; each activity has type metadata (software/training/practice); node fields include id, title, type, content_id, content_type, pid, sort, level, status | local domain types include SOFTWARE_ACTION/TRAINING/PRACTICE_ACTIVITY | functionally-close | local: 20 SOFTWARE_ACTION, 13 TRAINING, 25 PRACTICE_ACTIVITY verified; case activity types need student-view confirmation for exact type mapping |
| ORIGINAL-S1-001 | all | original shared shell and identity UI | shared shell + profile page with role groups | not-applicable | local: 6 ORIGINAL tests green; sidebar/topbar/content/profile/role-homes/responsive all verified; original design per UI contract |
