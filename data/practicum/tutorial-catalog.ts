export interface TutorialSection {
  title: string
  body: string
  bullets?: string[]
}

export interface TutorialDocument {
  id: string
  title: string
  category: string
  level: '入门' | '进阶'
  duration: string
  summary: string
  objectives: string[]
  sections: TutorialSection[]
  deliverable: string[]
  rubric: Array<{ label: string; score: number; standard: string }>
}

export const tutorialDocuments: TutorialDocument[] = [
  {
    id: 'ecommerce-foundation', title: '电商经营基础与客户旅程', category: '经营基础', level: '入门', duration: '45 分钟',
    summary: '从用户需求、商品价值和成交路径出发，建立一张可执行的电商经营地图。',
    objectives: ['区分 B2C、D2C 与平台店铺的经营特点', '绘制从曝光到复购的客户旅程', '为后续实操选择一个清晰的经营目标'],
    sections: [
      { title: '一、先定义经营问题', body: '不要从“我要卖什么”开始，而要先回答“为谁解决什么问题”。记录目标用户、使用场景、核心痛点和愿意支付的理由。', bullets: ['目标用户：年龄、场景、预算和购买频率', '商品价值：功能价值、情绪价值、信任证据', '经营目标：拉新、转化、客单价或复购'] },
      { title: '二、拆解客户旅程', body: '把一次购买拆成认知、考虑、决策、履约和复购五个阶段。每个阶段只保留一个主要动作，并给它配置可观察指标。', bullets: ['认知：曝光量、点击率', '考虑：停留时长、收藏加购率', '决策：支付转化率、客单价', '履约：发货及时率、退款率', '复购：复购率、会员活跃度'] },
      { title: '三、实训任务', body: '以“校园便携收纳包”为例，完成用户画像、旅程地图和一页经营目标卡。要求每个判断都写出证据或假设。' },
    ],
    deliverable: ['一页用户画像', '一张客户旅程图', '经营目标卡（目标、指标、周期、负责人）'],
    rubric: [{ label: '用户与场景', score: 30, standard: '用户边界清晰，场景能对应真实需求' }, { label: '旅程完整性', score: 30, standard: '五个阶段均有动作和指标' }, { label: '经营目标', score: 40, standard: '目标可量化、可验证，并写明假设' }],
  },
  {
    id: 'store-and-listing', title: '店铺开设与商品上架实操', category: '店铺运营', level: '入门', duration: '60 分钟',
    summary: '完成店铺基础配置、商品信息采集和首个可发布商品卡片。',
    objectives: ['完成店铺基础信息和履约规则配置', '根据商品资料建立规范的商品字段', '检查发布前的合规、库存和价格信息'],
    sections: [
      { title: '一、店铺基础配置', body: '先配置店铺名称、经营类目、客服时间、发货承诺和退换货规则。配置内容要能被客服和仓配人员直接执行。' },
      { title: '二、建立商品信息表', body: '将原始资料拆成标题、卖点、规格、库存、价格、主图、详情图和售后说明。不要把关键信息只放在图片里。', bullets: ['标题先写品类和核心属性，再写差异卖点', '规格名称要与库存单位一致', '价格、库存和发货地必须能追溯到来源'] },
      { title: '三、发布前检查', body: '用发布清单逐项检查禁限售词、夸大承诺、图片版权、价格单位、库存和售后承诺。发现问题先退回资料，不要用备注掩盖。' },
    ],
    deliverable: ['店铺配置清单', '一张完整商品卡片', '发布前检查表'],
    rubric: [{ label: '字段完整', score: 35, standard: '商品核心字段和履约信息齐全' }, { label: '信息准确', score: 35, standard: '价格、库存、规格与原始资料一致' }, { label: '合规检查', score: 30, standard: '能指出风险词、图片和售后风险' }],
  },
  {
    id: 'title-detail-optimization', title: '商品标题与详情页优化', category: '商品运营', level: '入门', duration: '55 分钟',
    summary: '用搜索意图和购买疑虑重写商品标题、卖点和详情页结构。',
    objectives: ['从关键词中区分需求、属性和场景', '写出可读且不堆砌的商品标题', '用详情页结构回答用户购买疑虑'],
    sections: [
      { title: '一、整理搜索意图', body: '把关键词分成品类词、属性词、场景词和问题词。优先选择与商品真实能力匹配、用户能理解的词。' },
      { title: '二、重写标题与卖点', body: '标题建议采用“核心品类 + 关键属性 + 使用场景 + 差异卖点”的顺序。卖点要写证据，不写无法验证的第一、最好和百分百。' },
      { title: '三、设计详情页顺序', body: '详情页先证明适合谁，再解释解决什么问题，随后展示规格、使用方法、保障和常见疑问。每屏只传递一个主要信息。' },
    ],
    deliverable: ['关键词分组表', '新旧标题对照表', '详情页 6 屏内容线框', '两条常见疑问回复'],
    rubric: [{ label: '关键词意图', score: 30, standard: '关键词分类合理且与商品能力匹配' }, { label: '标题质量', score: 30, standard: '信息清楚、可读，不堆砌或夸大' }, { label: '详情页逻辑', score: 40, standard: '结构能逐步消除用户购买疑虑' }],
  },
  {
    id: 'campaign-optimization', title: '搜索广告投放与复盘', category: '营销推广', level: '进阶', duration: '70 分钟',
    summary: '从预算目标、关键词分组到投放复盘，完成一份可执行的广告计划。',
    objectives: ['根据利润和目标转化设置预算边界', '建立关键词分组和出价策略', '用 CTR、CVR、ROAS 定位优化动作'],
    sections: [
      { title: '一、先算可接受成本', body: '先确定客单价、毛利率和可接受获客成本，再倒推每日预算和目标订单，避免只追求曝光量。' },
      { title: '二、搭建投放计划', body: '将关键词分为品牌、品类、场景和竞品四组，分别设置匹配方式、出价上限和否定词。每组只保留一个主要目标。' },
      { title: '三、按漏斗复盘', body: '曝光低看词和预算，点击低看创意和相关性，转化低看详情页、价格和评价，ROAS 低则回到毛利和人群重新判断。' },
    ],
    deliverable: ['预算与目标表', '关键词分组和否定词表', '7 日投放计划', '复盘结论与下一步动作'],
    rubric: [{ label: '预算逻辑', score: 30, standard: '预算与毛利、目标订单可相互推导' }, { label: '投放结构', score: 30, standard: '分组、出价和否定词有明确依据' }, { label: '复盘动作', score: 40, standard: '指标异常能对应具体优化动作' }],
  },
  {
    id: 'customer-service', title: '客服话术与退换货处理', category: '客户服务', level: '入门', duration: '50 分钟',
    summary: '通过售前、售中、售后三类场景，练习清晰、合规且可执行的客户沟通。',
    objectives: ['识别客户问题背后的真实诉求', '用确认、解释、方案、承诺四步完成回复', '根据规则处理退换货和升级投诉'],
    sections: [
      { title: '一、四步回复法', body: '先确认问题，再解释原因，给出可选方案，最后明确时间和责任人。不要只回复“亲，稍等”或把问题推给其他部门。' },
      { title: '二、退换货决策', body: '根据商品状态、签收时间、责任归属和证据判断方案。超出权限的退款、补发和赔付必须升级，不可口头承诺后再修改。' },
      { title: '三、投诉复盘', body: '每条升级投诉都要记录触发原因、首次响应时长、解决时长和客户最终结果，转化为商品、物流或话术改进。' },
    ],
    deliverable: ['三类场景回复话术', '退换货判断表', '一份投诉复盘记录'],
    rubric: [{ label: '回复结构', score: 30, standard: '回复包含确认、解释、方案和承诺' }, { label: '规则执行', score: 35, standard: '方案符合售后规则，越权问题能升级' }, { label: '复盘能力', score: 35, standard: '能从个案提炼可执行的流程改进' }],
  },
  {
    id: 'analytics-dashboard', title: '店铺数据分析与经营看板', category: '数据分析', level: '进阶', duration: '75 分钟',
    summary: '从订单、流量和广告数据中找出问题，形成一页可汇报的经营建议。',
    objectives: ['理解流量、转化、客单和复购指标之间的关系', '区分指标异常和数据口径问题', '把分析结论转化为优先级明确的动作'],
    sections: [
      { title: '一、先统一口径', body: '明确统计周期、订单状态、退款是否扣除、访客和点击的来源。不同口径混在一起，会让趋势图看起来正确但结论错误。' },
      { title: '二、拆解经营漏斗', body: '按曝光、访问、详情页互动、加购、支付和履约拆解。先找变化最大的环节，再结合商品、渠道和人群判断原因。' },
      { title: '三、形成行动建议', body: '每个建议写清问题、证据、动作、负责人、预期指标和复盘日期。建议不超过三项，按影响和成本排序。' },
    ],
    deliverable: ['指标口径说明', '经营漏斗表', '一页数据看板', '三项优化行动卡'],
    rubric: [{ label: '口径准确', score: 25, standard: '周期、状态和指标定义写清楚' }, { label: '分析推理', score: 35, standard: '结论有数据证据，能区分相关和原因' }, { label: '行动计划', score: 40, standard: '动作有负责人、指标和复盘日期' }],
  },
]

export function findTutorial(id: string) {
  return tutorialDocuments.find(document => document.id === id)
}
