<template>
  <svg class="practicum-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'dashboard'"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></template>
    <template v-else-if="name === 'arrow-left'"><path d="M19 12H5M12 19l-7-7 7-7" /></template>
    <template v-else-if="name === 'book'"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16" /></template>
    <template v-else-if="name === 'layers'"><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></template>
    <template v-else-if="name === 'clipboard-check'"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5V3h6v1.5" /><path d="m9 13 2 2 4-4" /></template>
    <template v-else-if="name === 'check-square'"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m8 12 2.5 2.5L16 9" /></template>
    <template v-else-if="name === 'chart'"><path d="M4 20V4M4 20h16M8 17v-5M12 17V7M16 17v-8" /></template>
    <template v-else-if="name === 'trending-up'"><path d="m4 16 6-6 4 4 6-7M15 7h5v5" /></template>
    <template v-else-if="name === 'bell'"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></template>
    <template v-else-if="name === 'user-shield'"><circle cx="10" cy="8" r="3" /><path d="M4.5 20a5.5 5.5 0 0 1 11 0M18 12l3 1.2v2.6c0 2-1.3 3.8-3 4.6-1.7-.8-3-2.6-3-4.6v-2.6z" /></template>
    <template v-else-if="name === 'users'"><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5M18.5 20a4.5 4.5 0 0 0-2.5-4" /></template>
    <template v-else-if="name === 'settings'"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5.3v-3h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.4 1z" /></template>
    <template v-else-if="name === 'switch'"><path d="M7 7h12l-3-3M19 7l-3 3M17 17H5l3 3M5 17l3-3" /></template>
    <template v-else-if="name === 'upload'"><path d="M12 15V3m-4 4 4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></template>
    <template v-else-if="name === 'folder'"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></template>
    <template v-else-if="name === 'plus-square'"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8v8M8 12h8" /></template>
    <template v-else-if="name === 'file-check'"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6m-11.5 6 2 2 4-4" /></template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ name: string }>()
</script>
