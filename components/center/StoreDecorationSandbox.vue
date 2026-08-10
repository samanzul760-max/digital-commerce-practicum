<template><section class="decoration"><div class="toolbar"><span>画布端</span><button v-for="mode in ['MOBILE','PC']" :key="mode" type="button" :class="{selected: form.deviceMode === mode}" @click="form.deviceMode = mode">{{ mode === 'MOBILE' ? '移动端' : 'PC端' }}</button><button type="button" class="add" @click="addComponent">+ 添加组件</button></div><div class="canvas" :class="form.deviceMode === 'PC' ? 'pc' : 'mobile'"><div v-for="(component, index) in components" :key="component.id" class="canvas-component" draggable="true" @dragstart="dragIndex = index" @dragover.prevent @drop="moveComponent(index)"><span class="drag">⋮⋮</span><strong>{{ component.title }}</strong><small>{{ component.type }}组件 · 位置 {{ index + 1 }}</small></div><p v-if="!components.length" class="empty">添加海报、秒杀区或商品组，拖动调整顺序</p></div></section></template>
<script setup lang="ts">
type ComponentItem = { id: string; type: string; title: string; position: number; style: Record<string, unknown> }
const props = defineProps<{ modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [Record<string, unknown>] }>()
const form = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const components = computed<ComponentItem[]>({
  get: () => Array.isArray(form.value.components) ? form.value.components as ComponentItem[] : [],
  set: value => { form.value.components = value },
})
let dragIndex = -1
function addComponent() {
  const presets = [{ type: 'POSTER', title: '活动海报' }, { type: 'SECKILL', title: '限时秒杀区' }, { type: 'PRODUCT_GROUP', title: '精选商品组' }]
  const preset = presets[components.value.length % presets.length]!
  components.value = [...components.value, { id: `component-${Date.now()}`, ...preset, position: components.value.length, style: { theme: 'blue', columns: 1 } }]
}
function moveComponent(target: number) {
  if (dragIndex < 0 || dragIndex === target) return
  const next = [...components.value]
  const [item] = next.splice(dragIndex, 1)
  if (!item) return
  next.splice(target, 0, item)
  components.value = next.map((entry, index) => ({ ...entry, position: index }))
  dragIndex = -1
}
watch(form, value => emit('update:modelValue', { ...value }), { deep: true })
</script>
<style scoped>.decoration{padding:4px}.toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:#344054;font-size:13px;font-weight:700}.toolbar button{min-height:34px;padding:0 11px;border:1px solid #d0d5dd;border-radius:6px;background:#fff;color:#475467;font:inherit;font-weight:500;cursor:pointer}.toolbar button.selected{border-color:#1677ff;background:#eff8ff;color:#145bc2}.toolbar .add{margin-left:auto;border-color:#1677ff;background:#1677ff;color:#fff}.canvas{display:grid;gap:10px;margin:18px auto 0;padding:16px;min-height:250px;border:1px dashed #98a2b3;border-radius:6px;background:#f8fafc}.canvas.mobile{max-width:310px}.canvas.pc{max-width:100%;grid-template-columns:repeat(3,minmax(0,1fr));align-content:start}.canvas-component{display:grid;grid-template-columns:20px 1fr;gap:2px 8px;padding:12px;border:1px solid #bfdbfe;border-radius:6px;background:#fff;cursor:grab}.canvas-component strong{font-size:13px}.canvas-component small{grid-column:2;color:#7b8494;font-size:11px}.drag{grid-row:span 2;color:#94a3b8}.empty{margin:auto;color:#7b8494;font-size:12px}@media(max-width:560px){.canvas.pc{grid-template-columns:1fr 1fr}.toolbar .add{margin-left:0}}</style>
