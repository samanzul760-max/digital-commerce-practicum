export type BadgeState = 'unlocked' | 'in_progress' | 'locked'
export interface AchievementBadge { id: string; icon: string; name: string; category: string; condition: string; state: BadgeState; unlockedAt?: string; progress: number; target: number; reward: number }
export const achievementOverview = { unlocked: 4, total: 8, points: 1850, title: '初级店铺运营师' }
export const skillMatrix = [
  { name: '店铺开设', level: 3, percent: 100, note: '完成开店流程与基础配置' },
  { name: '商品上架', level: 3, percent: 76, note: '商品标题与详情页实操' },
  { name: '营销推广', level: 2, percent: 52, note: '推广计划与活动配置' },
  { name: '数据分析', level: 2, percent: 48, note: '流量和转化数据解读' },
  { name: '客户服务', level: 1, percent: 28, note: '售前咨询与售后处理' },
]
export const achievementBadges: AchievementBadge[] = [
  { id: 'store-pioneer', icon: '🏪', name: '开店先锋', category: '店铺开设', condition: '完成店铺创建与基础设置', state: 'unlocked', unlockedAt: '2026-07-12', progress: 1, target: 1, reward: 200 },
  { id: 'listing-master', icon: '📦', name: '商品上架能手', category: '商品上架', condition: '完成 5 次商品上架实操', state: 'unlocked', unlockedAt: '2026-07-18', progress: 5, target: 5, reward: 260 },
  { id: 'visual-crafter', icon: '🎨', name: '视觉巧手', category: '店铺视觉', condition: '完成 3 个详情页视觉优化任务', state: 'unlocked', unlockedAt: '2026-07-23', progress: 3, target: 3, reward: 240 },
  { id: 'conversion-spotter', icon: '📈', name: '转化观察员', category: '数据分析', condition: '提交 2 份店铺经营分析报告', state: 'unlocked', unlockedAt: '2026-07-29', progress: 2, target: 2, reward: 320 },
  { id: 'marketing-helper', icon: '📣', name: '营销小能手', category: '营销推广', condition: '完成 4 次推广计划配置', state: 'in_progress', progress: 3, target: 4, reward: 300 },
  { id: 'data-analyst', icon: '🔎', name: '数据分析师', category: '数据分析', condition: '连续 3 次数据诊断达到优秀', state: 'in_progress', progress: 1, target: 3, reward: 360 },
  { id: 'service-star', icon: '💬', name: '服务之星', category: '客户服务', condition: '完成 5 次客户服务情景训练', state: 'locked', progress: 0, target: 5, reward: 280 },
  { id: 'hot-product', icon: '🔥', name: '爆款打造者', category: '商品运营', condition: '完成一次完整爆款商品策划', state: 'locked', progress: 0, target: 1, reward: 420 },
]
export const achievementTimeline = [
  { id: 'reward-4', date: '2026-07-29 16:20', title: '解锁“转化观察员”', detail: '提交店铺经营分析报告，获得 320 PTS', type: 'badge' },
  { id: 'reward-3', date: '2026-07-26 10:45', title: '完成商品标题优化', detail: '实操任务评分优秀，获得 80 PTS', type: 'points' },
  { id: 'reward-2', date: '2026-07-23 14:30', title: '解锁“视觉巧手”', detail: '完成 3 个详情页视觉优化任务，获得 240 PTS', type: 'badge' },
  { id: 'reward-1', date: '2026-07-18 09:15', title: '解锁“商品上架能手”', detail: '完成第 5 次商品上架实操，获得 260 PTS', type: 'badge' },
]
