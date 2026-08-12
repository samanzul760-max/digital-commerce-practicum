export interface OpenDesignCourse {
  id: string
  title: string
  category: '店铺增长' | '直播运营' | '数据分析'
  color: 'orange' | 'blue' | 'green' | 'purple'
  meta: string
  level: '入门' | '进阶'
  type: '免费' | '实训计划'
}

// Keep the Open Design presentation catalog independent from optional room data.
export const openDesignCourses: OpenDesignCourse[] = [
  { id: 'taobao-basics', title: '淘宝从零到精通', category: '店铺增长', color: 'orange', meta: '12 节 · 实操项目', level: '入门', type: '实训计划' },
  { id: 'cross-border', title: '跨境电商实战', category: '店铺增长', color: 'blue', meta: '10 节 · 沙盘演练', level: '进阶', type: '实训计划' },
  { id: 'marketing-growth', title: '营销引流全攻略', category: '直播运营', color: 'green', meta: '8 节 · 案例拆解', level: '入门', type: '免费' },
  { id: 'data-growth', title: '数据分析增幅技巧', category: '数据分析', color: 'purple', meta: '9 节 · 数据看板', level: '进阶', type: '实训计划' },
  { id: 'live-selling', title: '直播带货技巧', category: '直播运营', color: 'orange', meta: '11 节 · 直播实操', level: '进阶', type: '实训计划' },
  { id: 'detail-page', title: '详情页优化方法', category: '店铺增长', color: 'blue', meta: '6 节 · 改稿训练', level: '入门', type: '免费' },
]
