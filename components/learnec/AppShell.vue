<template>
  <div class="learnec-shell" :data-shell-role="role">
    <header class="learnec-header">
      <NuxtLink :to="home" class="learnec-brand">LearnEC <span>高校电商教学实训平台</span></NuxtLink>
      <nav class="learnec-nav" :aria-label="role === 'ADMIN' ? '管理端主导航' : '学生端主导航'">
        <NuxtLink v-for="item in menu" :key="item.key" :to="item.to" data-learnec-menu :data-menu-key="item.key" :class="{ active: route.path === item.to }">
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="learnec-user">
        <span>{{ auth.state.value.user?.displayName }}</span>
        <button type="button" :disabled="auth.state.value.loading" @click="logout">退出</button>
      </div>
    </header>
    <main class="learnec-content"><slot /></main>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ role: 'ADMIN' | 'STUDENT' }>()
const route = useRoute()
const auth = useAuthSession()
const home = computed(() => props.role === 'ADMIN' ? '/admin' : '/center')
const menu = computed(() => props.role === 'ADMIN'
  ? [
      { key: 'workspace', label: '工作中心', to: '/admin' },
      { key: 'tasks', label: '实训任务管理', to: '/admin/tasks' },
      { key: 'reviews', label: '批阅中心', to: '/admin/reviews' },
      { key: 'competitions', label: '赛考管理', to: '/admin/competitions' },
      { key: 'data', label: '数据中心', to: '/admin/data' },
    ]
  : [
      { key: 'home', label: '首页', to: '/center' },
      { key: 'assignments', label: '作业中心', to: '/center/assignments' },
      { key: 'practicum', label: '实训中心', to: '/center/practicum' },
      { key: 'data', label: '数据中心', to: '/center/data' },
    ])

async function logout() {
  await auth.logout()
  await navigateTo('/login')
}
</script>

<style scoped>
.learnec-shell{min-height:100vh;background:#f7f9fc;color:#172033}.learnec-header{display:flex;align-items:center;min-height:62px;padding:0 28px;border-bottom:1px solid #e4e8ef;background:#fff;gap:28px}.learnec-brand{flex:none;color:#172033;font-size:18px;font-weight:800;text-decoration:none}.learnec-brand span{margin-left:10px;color:#697386;font-size:12px;font-weight:500}.learnec-nav{display:flex;align-self:stretch;gap:26px;overflow-x:auto}.learnec-nav a{display:flex;align-items:center;border-bottom:2px solid transparent;color:#667085;font-size:14px;text-decoration:none;white-space:nowrap}.learnec-nav a:hover,.learnec-nav a.active{border-color:#1677ff;color:#145bc2}.learnec-user{display:flex;align-items:center;gap:12px;margin-left:auto;color:#475467;font-size:13px;white-space:nowrap}.learnec-user button{border:0;background:transparent;color:#475467;font-size:13px;cursor:pointer}.learnec-user button:hover{color:#145bc2}.learnec-content{width:min(1280px,100%);margin:0 auto;padding:32px 28px 56px}@media(max-width:760px){.learnec-header{flex-wrap:wrap;gap:10px;padding:12px 16px}.learnec-brand span{display:none}.learnec-nav{order:3;width:100%;height:32px;gap:20px}.learnec-user{margin-left:auto}.learnec-content{padding:22px 16px 40px}}
</style>
