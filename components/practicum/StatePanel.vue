<template>
  <section :class="['state-panel', `state-panel-${state}`]" :data-state-panel="state" :role="state === 'error' ? 'alert' : undefined">
    <PracticumIcon :name="icon" />
    <div>
      <h2>{{ title }}</h2>
      <p v-if="description">{{ description }}</p>
      <button v-if="state === 'error'" type="button" class="secondary-button compact-action" @click="$emit('retry')">重新加载</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  state: 'loading' | 'empty' | 'error' | 'forbidden'
  title: string
  description?: string
}>(), { description: '' })

defineEmits<{ retry: [] }>()

const icon = computed(() => ({ loading: 'layers', empty: 'folder', error: 'file-check', forbidden: 'user-shield' }[props.state]))
</script>
