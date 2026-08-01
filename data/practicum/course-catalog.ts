import type { Plan } from '~/domain/practicum/types'

export interface CatalogCourse extends Plan {
  level: '入门' | '进阶'
  taskCount: number
  learners: number
  rating: number
  category: string
}

const createdAt = '2026-07-01T08:00:00Z'

export const catalogCourses: CatalogCourse[] = [
  { id: 'catalog-cross-border', roomId: 'room-001', title: '跨境电商入门', description: '从选品、刊登到订单履约，建立跨境店铺运营的完整基础。', status: 'PUBLISHED', sort: 10, moduleIds: ['catalog-cross-border-module'], createdAt, updatedAt: '2026-07-30T09:00:00Z', level: '入门', taskCount: 12, learners: 328, rating: 4.8, category: '跨境运营' },
  { id: 'catalog-ads', roomId: 'room-001', title: '直通车投放技巧', description: '拆解关键词、人群、出价与复盘，建立可优化的投放方法。', status: 'PUBLISHED', sort: 11, moduleIds: ['catalog-ads-module'], createdAt, updatedAt: '2026-07-28T09:00:00Z', level: '进阶', taskCount: 16, learners: 216, rating: 4.9, category: '营销推广' },
  { id: 'catalog-service', roomId: 'room-001', title: '客服话术与退换货处理', description: '通过真实咨询和售后情景训练提升客户服务能力。', status: 'PUBLISHED', sort: 12, moduleIds: ['catalog-service-module'], createdAt, updatedAt: '2026-07-26T09:00:00Z', level: '入门', taskCount: 10, learners: 405, rating: 4.7, category: '客户服务' },
  { id: 'catalog-visual', roomId: 'room-001', title: '店铺视觉装修', description: '完成首页、详情页和活动页的视觉诊断与优化实操。', status: 'PUBLISHED', sort: 13, moduleIds: ['catalog-visual-module'], createdAt, updatedAt: '2026-07-25T09:00:00Z', level: '进阶', taskCount: 14, learners: 267, rating: 4.8, category: '店铺视觉' },
  { id: 'catalog-data', roomId: 'room-001', title: '店铺数据分析实战', description: '使用经营数据定位问题，并完成流量和转化优化建议。', status: 'PUBLISHED', sort: 14, moduleIds: ['catalog-data-module'], createdAt, updatedAt: '2026-07-22T09:00:00Z', level: '进阶', taskCount: 15, learners: 193, rating: 4.9, category: '数据分析' },
  { id: 'catalog-content', roomId: 'room-001', title: '短视频内容营销', description: '从脚本、拍摄到复盘，完成一套商品短视频传播方案。', status: 'PUBLISHED', sort: 15, moduleIds: ['catalog-content-module'], createdAt, updatedAt: '2026-07-20T09:00:00Z', level: '入门', taskCount: 11, learners: 356, rating: 4.6, category: '内容营销' },
  { id: 'catalog-product', roomId: 'room-001', title: '商品标题优化与选品', description: '结合搜索需求和商品卖点，完成选品与标题优化训练。', status: 'PUBLISHED', sort: 16, moduleIds: ['catalog-product-module'], createdAt, updatedAt: '2026-07-18T09:00:00Z', level: '入门', taskCount: 9, learners: 482, rating: 4.8, category: '商品运营' },
]
