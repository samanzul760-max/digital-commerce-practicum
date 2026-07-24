import type { CurriculumNode } from '../../domain/practicum/types'

export const seedModules: CurriculumNode[] = [
  {
    id: 'mod-01', planId: 'plan-wdds', parentId: null, level: 1,
    title: '网店开通', description: '掌握网店开设的基础流程与店铺设置', sort: 1,
  },
  {
    id: 'mod-02', planId: 'plan-wdds', parentId: null, level: 1,
    title: '网店商品发布与设置', description: '学习商品信息整理、发布与营销设置', sort: 2,
  },
  {
    id: 'mod-03', planId: 'plan-wdds', parentId: null, level: 1,
    title: '店铺交易管理', description: '掌握订单处理与会员管理技能', sort: 3,
  },
  {
    id: 'mod-04', planId: 'plan-wdds', parentId: null, level: 1,
    title: '网店推广', description: '学习营销活动策划与付费推广方法', sort: 4,
  },
  {
    id: 'mod-05', planId: 'plan-wdds', parentId: null, level: 1,
    title: '网店客户服务', description: '提升客户咨询与沟通能力', sort: 5,
  },
  {
    id: 'mod-06', planId: 'plan-wdds', parentId: null, level: 1,
    title: '网店数据分析与复盘', description: '学习数据采集、分析与决策方法', sort: 6,
  },
]

export const seedUnits: CurriculumNode[] = [
  // Module 1: 网店开通
  { id: 'unit-01-01', planId: 'plan-wdds', parentId: 'mod-01', level: 2, title: '网店开设', description: '学习网店开设的完整流程与要求', sort: 1 },
  // Module 2: 网店商品发布与设置
  { id: 'unit-02-01', planId: 'plan-wdds', parentId: 'mod-02', level: 2, title: '商品卖点提取', description: '学习商品信息分类与FABE卖点提炼方法', sort: 1 },
  { id: 'unit-02-02', planId: 'plan-wdds', parentId: 'mod-02', level: 2, title: '发布商品', description: '掌握商品标题优化、分类与上架操作', sort: 2 },
  { id: 'unit-02-03', planId: 'plan-wdds', parentId: 'mod-02', level: 2, title: '店铺营销设置', description: '学习优惠券、秒杀、拼团等营销工具配置', sort: 3 },
  // Module 3: 店铺交易管理
  { id: 'unit-03-01', planId: 'plan-wdds', parentId: 'mod-03', level: 2, title: '店铺订单管理', description: '掌握订单处理、发货与售后管理', sort: 1 },
  { id: 'unit-03-02', planId: 'plan-wdds', parentId: 'mod-03', level: 2, title: '店铺会员管理', description: '学习会员优惠券配置与管理', sort: 2 },
  // Module 4: 网店推广
  { id: 'unit-04-01', planId: 'plan-wdds', parentId: 'mod-04', level: 2, title: '营销活动推广', description: '学习平台活动策划与推广执行', sort: 1 },
  { id: 'unit-04-02', planId: 'plan-wdds', parentId: 'mod-04', level: 2, title: '网店付费推广', description: '掌握关键词推广与广告投放方法', sort: 2 },
  // Module 5: 网店客户服务
  { id: 'unit-05-01', planId: 'plan-wdds', parentId: 'mod-05', level: 2, title: '客户咨询答疑', description: '提升客户需求识别与FAQ应答能力', sort: 1 },
  // Module 6: 网店数据分析与复盘
  { id: 'unit-06-01', planId: 'plan-wdds', parentId: 'mod-06', level: 2, title: '网店数据采集', description: '学习运营数据的采集与处理方法', sort: 1 },
  { id: 'unit-06-02', planId: 'plan-wdds', parentId: 'mod-06', level: 2, title: '网店数据分析', description: '掌握流量、用户画像与销售分析方法', sort: 2 },
]

export const seedActivities: CurriculumNode[] = [
  // === Module 1: 网店开通 / 网店开设 (12 activities) ===
  { id: 'act-01-001', planId: 'plan-wdds', parentId: 'unit-01-01', level: 3, title: '商家入驻', description: '模拟商家入驻平台的完整流程操作', sort: 1, activityId: 'act-data-01-001' },
  { id: 'act-01-002', planId: 'plan-wdds', parentId: 'unit-01-01', level: 3, title: '店铺信息设置训练', description: '完成店铺基本信息配置的训练任务', sort: 2, activityId: 'act-data-01-002' },
  { id: 'act-01-003', planId: 'plan-wdds', parentId: 'unit-01-01', level: 3, title: '店铺基本设置', description: '在模拟系统中完成店铺基本设置操作', sort: 3, activityId: 'act-data-01-003' },
  { id: 'act-01-004', planId: 'plan-wdds', parentId: 'unit-01-01', level: 3, title: '提现账号配置训练', description: '学习提现账号的配置方法与注意事项', sort: 4, activityId: 'act-data-01-004' },
  { id: 'act-01-005', planId: 'plan-wdds', parentId: 'unit-01-01', level: 3, title: '店铺提现账号配置', description: '在模拟平台上完成提现账号的绑定配置', sort: 5, activityId: 'act-data-01-005' },
  { id: 'act-01-006', planId: 'plan-wdds', parentId: 'unit-01-01', level: 3, title: '运费模板训练', description: '学习不同场景下运费模板的设置策略', sort: 6, activityId: 'act-data-01-006' },
  { id: 'act-01-007', planId: 'plan-wdds', parentId: 'unit-01-01', level: 3, title: '店铺运费模板设置', description: '在系统中完成运费模板的实际配置', sort: 7, activityId: 'act-data-01-007' },
  { id: 'act-01-008', planId: 'plan-wdds', parentId: 'unit-01-01', level: 3, title: 'PC 端店铺首页装修', description: '设计并配置PC端店铺首页的布局与内容', sort: 8, activityId: 'act-data-01-008' },
  { id: 'act-01-009', planId: 'plan-wdds', parentId: 'unit-01-01', level: 3, title: 'AI 图标设计练习', description: '使用AI工具完成店铺图标的创意设计', sort: 9, activityId: 'act-data-01-009' },
  { id: 'act-01-010', planId: 'plan-wdds', parentId: 'unit-01-01', level: 3, title: '橙子店铺详情页练习', description: '为橙子类商品设计并制作详情页', sort: 10, activityId: 'act-data-01-010' },
  { id: 'act-01-011', planId: 'plan-wdds', parentId: 'unit-01-01', level: 3, title: '狗窝店铺详情页练习', description: '为宠物用品类商品设计并制作详情页', sort: 11, activityId: 'act-data-01-011' },
  { id: 'act-01-012', planId: 'plan-wdds', parentId: 'unit-01-01', level: 3, title: '大米店铺详情页练习', description: '为食品类商品设计并制作详情页', sort: 12, activityId: 'act-data-01-012' },

  // === Module 2: 网店商品发布与设置 / 商品卖点提取 (2 activities) ===
  { id: 'act-02-001', planId: 'plan-wdds', parentId: 'unit-02-01', level: 3, title: '商品信息分类整理', description: '对商品信息进行分类与结构化整理训练', sort: 1, activityId: 'act-data-02-001' },
  { id: 'act-02-002', planId: 'plan-wdds', parentId: 'unit-02-01', level: 3, title: 'FABE 法提炼商品卖点', description: '运用FABE法则提炼商品核心卖点', sort: 2, activityId: 'act-data-02-002' },

  // === Module 2: 发布商品 (5 activities) ===
  { id: 'act-02-003', planId: 'plan-wdds', parentId: 'unit-02-02', level: 3, title: 'AI 生成产品标题', description: '使用AI工具生成优化后的产品标题', sort: 1, activityId: 'act-data-02-003' },
  { id: 'act-02-004', planId: 'plan-wdds', parentId: 'unit-02-02', level: 3, title: '商品分类', description: '在平台中完成商品的正确分类设置', sort: 2, activityId: 'act-data-02-004' },
  { id: 'act-02-005', planId: 'plan-wdds', parentId: 'unit-02-02', level: 3, title: '商品详情页', description: '编辑并发布完整的商品详情页内容', sort: 3, activityId: 'act-data-02-005' },
  { id: 'act-02-006', planId: 'plan-wdds', parentId: 'unit-02-02', level: 3, title: '上架商品', description: '完成商品上架的完整操作流程', sort: 4, activityId: 'act-data-02-006' },
  { id: 'act-02-007', planId: 'plan-wdds', parentId: 'unit-02-02', level: 3, title: '商品标题优化', description: '根据数据反馈优化商品标题关键词', sort: 5, activityId: 'act-data-02-007' },

  // === Module 2: 店铺营销设置 (10 activities) ===
  { id: 'act-02-008', planId: 'plan-wdds', parentId: 'unit-02-03', level: 3, title: '营销活动方案', description: '策划一份完整的店铺营销活动方案', sort: 1, activityId: 'act-data-02-008' },
  { id: 'act-02-009', planId: 'plan-wdds', parentId: 'unit-02-03', level: 3, title: '优惠券训练', description: '学习优惠券的设置规则与营销策略', sort: 2, activityId: 'act-data-02-009' },
  { id: 'act-02-010', planId: 'plan-wdds', parentId: 'unit-02-03', level: 3, title: '优惠券操作', description: '在平台中完成优惠券的创建与配置操作', sort: 3, activityId: 'act-data-02-010' },
  { id: 'act-02-011', planId: 'plan-wdds', parentId: 'unit-02-03', level: 3, title: '限时秒杀训练', description: '学习限时秒杀活动的策划与执行要点', sort: 4, activityId: 'act-data-02-011' },
  { id: 'act-02-012', planId: 'plan-wdds', parentId: 'unit-02-03', level: 3, title: '限时秒杀操作', description: '在平台中完成限时秒杀活动的配置操作', sort: 5, activityId: 'act-data-02-012' },
  { id: 'act-02-013', planId: 'plan-wdds', parentId: 'unit-02-03', level: 3, title: '拼团训练', description: '学习拼团营销模式的玩法设计与策略', sort: 6, activityId: 'act-data-02-013' },
  { id: 'act-02-014', planId: 'plan-wdds', parentId: 'unit-02-03', level: 3, title: '拼团操作', description: '在平台中完成拼团活动的创建与配置', sort: 7, activityId: 'act-data-02-014' },
  { id: 'act-02-015', planId: 'plan-wdds', parentId: 'unit-02-03', level: 3, title: '砍价训练', description: '学习砍价营销模式的传播机制与设计', sort: 8, activityId: 'act-data-02-015' },
  { id: 'act-02-016', planId: 'plan-wdds', parentId: 'unit-02-03', level: 3, title: '砍价操作', description: '在平台中完成砍价活动的创建与配置', sort: 9, activityId: 'act-data-02-016' },
  { id: 'act-02-017', planId: 'plan-wdds', parentId: 'unit-02-03', level: 3, title: '商品关联销售策划', description: '设计商品之间的关联销售推荐方案', sort: 10, activityId: 'act-data-02-017' },

  // === Module 3: 店铺交易管理 / 店铺订单管理 (6 activities) ===
  { id: 'act-03-001', planId: 'plan-wdds', parentId: 'unit-03-01', level: 3, title: '订单备注', description: '学习订单备注的添加场景与管理方法', sort: 1, activityId: 'act-data-03-001' },
  { id: 'act-03-002', planId: 'plan-wdds', parentId: 'unit-03-01', level: 3, title: '地址修改', description: '处理订单地址修改的完整操作流程', sort: 2, activityId: 'act-data-03-002' },
  { id: 'act-03-003', planId: 'plan-wdds', parentId: 'unit-03-01', level: 3, title: '发货', description: '完成订单发货的标准操作流程', sort: 3, activityId: 'act-data-03-003' },
  { id: 'act-03-004', planId: 'plan-wdds', parentId: 'unit-03-01', level: 3, title: '退货退款', description: '处理买家退货退款申请的完整流程', sort: 4, activityId: 'act-data-03-004' },
  { id: 'act-03-005', planId: 'plan-wdds', parentId: 'unit-03-01', level: 3, title: '退款', description: '处理买家仅退款申请的流程与注意事项', sort: 5, activityId: 'act-data-03-005' },
  { id: 'act-03-006', planId: 'plan-wdds', parentId: 'unit-03-01', level: 3, title: '客户评价', description: '学习客户评价的管理与回复策略', sort: 6, activityId: 'act-data-03-006' },

  // === Module 3: 店铺会员管理 (1 activity) ===
  { id: 'act-03-007', planId: 'plan-wdds', parentId: 'unit-03-02', level: 3, title: '会员优惠券', description: '配置会员专属优惠券并设置发放规则', sort: 1, activityId: 'act-data-03-007' },

  // === Module 4: 网店推广 / 营销活动推广 (5 activities) ===
  { id: 'act-04-001', planId: 'plan-wdds', parentId: 'unit-04-01', level: 3, title: '平台活动策划', description: '策划电商平台的大型营销活动方案', sort: 1, activityId: 'act-data-04-001' },
  { id: 'act-04-002', planId: 'plan-wdds', parentId: 'unit-04-01', level: 3, title: '618 活动推广', description: '制定618大促活动的推广执行方案', sort: 2, activityId: 'act-data-04-002' },
  { id: 'act-04-003', planId: 'plan-wdds', parentId: 'unit-04-01', level: 3, title: '用户推送信息', description: '编写并配置精准的用户推送消息', sort: 3, activityId: 'act-data-04-003' },
  { id: 'act-04-004', planId: 'plan-wdds', parentId: 'unit-04-01', level: 3, title: '电商预热海报', description: '设计电商活动预热海报的视觉方案', sort: 4, activityId: 'act-data-04-004' },
  { id: 'act-04-005', planId: 'plan-wdds', parentId: 'unit-04-01', level: 3, title: '包邮活动', description: '设计并配置包邮营销活动的规则与展示', sort: 5, activityId: 'act-data-04-005' },

  // === Module 4: 网店付费推广 (4 activities) ===
  { id: 'act-04-006', planId: 'plan-wdds', parentId: 'unit-04-02', level: 3, title: '推广关键词', description: '筛选并优化付费推广的投放关键词', sort: 1, activityId: 'act-data-04-006' },
  { id: 'act-04-007', planId: 'plan-wdds', parentId: 'unit-04-02', level: 3, title: '推广创意', description: '设计付费推广的创意素材与文案', sort: 2, activityId: 'act-data-04-007' },
  { id: 'act-04-008', planId: 'plan-wdds', parentId: 'unit-04-02', level: 3, title: 'CPC 推广', description: '配置CPC推广计划并设置出价策略', sort: 3, activityId: 'act-data-04-008' },
  { id: 'act-04-009', planId: 'plan-wdds', parentId: 'unit-04-02', level: 3, title: '广告投放', description: '完成广告投放的全流程配置与上线', sort: 4, activityId: 'act-data-04-009' },

  // === Module 5: 网店客户服务 / 客户咨询答疑 (3 activities) ===
  { id: 'act-05-001', planId: 'plan-wdds', parentId: 'unit-05-01', level: 3, title: 'AI 生成 FAQ', description: '使用AI工具生成常见问题的标准答案库', sort: 1, activityId: 'act-data-05-001' },
  { id: 'act-05-002', planId: 'plan-wdds', parentId: 'unit-05-01', level: 3, title: '识别客户需求', description: '通过客户咨询内容准确识别真实需求', sort: 2, activityId: 'act-data-05-002' },
  { id: 'act-05-003', planId: 'plan-wdds', parentId: 'unit-05-01', level: 3, title: '客户咨询答疑', description: '模拟真实场景完成客户咨询的解答', sort: 3, activityId: 'act-data-05-003' },

  // === Module 6: 网店数据分析与复盘 / 网店数据采集 (1 activity) ===
  { id: 'act-06-001', planId: 'plan-wdds', parentId: 'unit-06-01', level: 3, title: '店铺运营数据采集与处理', description: '采集店铺核心运营指标并完成数据清洗', sort: 1, activityId: 'act-data-06-001' },

  // === Module 6: 网店数据分析 (9 activities) ===
  { id: 'act-06-002', planId: 'plan-wdds', parentId: 'unit-06-02', level: 3, title: '流量分析', description: '分析店铺流量来源、渠道与转化表现', sort: 1, activityId: 'act-data-06-002' },
  { id: 'act-06-003', planId: 'plan-wdds', parentId: 'unit-06-02', level: 3, title: '用户画像', description: '基于数据构建目标用户的画像模型', sort: 2, activityId: 'act-data-06-003' },
  { id: 'act-06-004', planId: 'plan-wdds', parentId: 'unit-06-02', level: 3, title: '客户价值', description: '运用RFM等方法分析客户价值分层', sort: 3, activityId: 'act-data-06-004' },
  { id: 'act-06-005', planId: 'plan-wdds', parentId: 'unit-06-02', level: 3, title: '电商数据报告', description: '撰写结构化的电商数据分析报告', sort: 4, activityId: 'act-data-06-005' },
  { id: 'act-06-006', planId: 'plan-wdds', parentId: 'unit-06-02', level: 3, title: '销售分析', description: '分析销售趋势、热销品类与增长机会', sort: 5, activityId: 'act-data-06-006' },
  { id: 'act-06-007', planId: 'plan-wdds', parentId: 'unit-06-02', level: 3, title: '库存分析', description: '基于销售数据优化库存管理策略', sort: 6, activityId: 'act-data-06-007' },
  { id: 'act-06-008', planId: 'plan-wdds', parentId: 'unit-06-02', level: 3, title: 'PSM 定价', description: '运用PSM模型确定商品的最优定价区间', sort: 7, activityId: 'act-data-06-008' },
  { id: 'act-06-009', planId: 'plan-wdds', parentId: 'unit-06-02', level: 3, title: '市场潜力', description: '评估目标市场的规模与增长潜力', sort: 8, activityId: 'act-data-06-009' },
  { id: 'act-06-010', planId: 'plan-wdds', parentId: 'unit-06-02', level: 3, title: '行业形势', description: '分析行业竞争格局与发展趋势', sort: 9, activityId: 'act-data-06-010' },
]