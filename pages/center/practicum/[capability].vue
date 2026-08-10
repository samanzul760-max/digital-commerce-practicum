<template><LearnecAppShell role="STUDENT"><PlatformCapabilityPlaceholder :title="content.title" :description="content.description" :planned-capabilities="content.capabilities" available-href="/center/assignments" available-label="返回作业中心" home-href="/center" /></LearnecAppShell></template>

<script setup lang="ts">
const capability = String(useRoute().params.capability)
const content = ({
  'customer-service': { title: '客服沟通训练', description: '客服沟通训练尚未开放，不会创建模拟会话、订单或评分记录。', capabilities: ['沟通场景训练', '服务话术反馈', '过程性评价'] },
  'cross-border': { title: '跨境平台操作', description: '跨境平台操作尚未开放，不会创建店铺、商品、订单或经营成绩。', capabilities: ['跨境商品发布训练', '物流与合规练习', '跨境经营分析'] },
} as Record<string, { title:string; description:string; capabilities:string[] }>)[capability] ?? { title: '实训能力规划中', description: '该实训能力尚未开放，当前不会产生业务数据。', capabilities: ['能力说明', '返回可用工单'] }
</script>
