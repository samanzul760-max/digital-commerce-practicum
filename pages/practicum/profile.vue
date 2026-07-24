<template>
  <ClientOnly>
    <PracticumShell context-title="账号与权限" context-meta="头像、通知偏好和身份选择">
      <div data-profile-page class="profile-page">
        <NuxtLink to="/practicum" data-back-link class="ghost-button">返回工作台</NuxtLink>

        <div class="page-heading" style="margin-top: 22px">
          <div>
            <p class="eyebrow">账号设置</p>
            <h1>账号与身份</h1>
            <p>选择后会回到对应工作台，导航位置不会改变。</p>
          </div>
        </div>

        <section data-current-identity class="account-panel" aria-label="当前账号">
          <div class="account-avatar" aria-hidden="true">琦</div>
          <div>
            <h2>琦琦</h2>
            <p v-if="store.state.activeRole" data-active-identity>数字商贸实训室 · 当前身份：{{ activeRoleLabel }}</p>
            <p v-else data-no-role>数字商贸实训室 · 尚未选择身份</p>
          </div>
        </section>

        <section data-identity-choices class="identity-section">
          <h2>切换身份</h2>
          <p>学生查看已发布课程；管理员维护教学计划和课程目录。</p>
          <div data-role-options class="identity-list">
            <button
              v-for="role in standardRoles"
              :key="role.value"
              :data-role-option="role.value"
              :data-role-current="role.value === store.state.activeRole ? 'true' : undefined"
              class="identity-card"
              :class="{ 'identity-card-active': role.value === store.state.activeRole }"
              type="button"
              @click="selectRole(role.value)"
            >
              <span class="identity-icon" aria-hidden="true">{{ role.symbol }}</span>
              <span class="identity-copy"><strong>{{ role.label }}</strong><span>{{ role.description }}</span></span>
              <span class="identity-state">{{ role.value === store.state.activeRole ? '当前身份' : '进入' }}</span>
            </button>
          </div>
        </section>

        <section data-management-group class="identity-section">
          <h2>管理身份</h2>
          <p>管理员负责教学计划、课程目录和发布前配置。</p>
          <div class="identity-list">
            <button
              data-role-option="OWNER"
              :data-role-current="store.state.activeRole === 'OWNER' ? 'true' : undefined"
              class="identity-card"
              :class="{ 'identity-card-active': store.state.activeRole === 'OWNER' }"
              type="button"
              @click="selectRole('OWNER')"
            >
              <span class="identity-icon" aria-hidden="true">管</span>
              <span class="identity-copy"><strong>管理员</strong><span>创建教学计划、维护一级目录和二级目录</span></span>
              <span class="identity-state">{{ store.state.activeRole === 'OWNER' ? '当前身份' : '进入' }}</span>
            </button>
          </div>
        </section>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PracticumRole } from '../../domain/practicum/types'
import { usePracticumStore } from '../../composables/usePracticumStore'

const store = usePracticumStore()
const router = useRouter()

const standardRoles: { value: PracticumRole; label: string; symbol: string; description: string }[] = [
  { value: 'STUDENT', label: '学生', symbol: '学', description: '查看已发布课程和学习目录' },
]

const roleLabels: Record<PracticumRole, string> = {
  OWNER: '管理员',
  STUDENT: '学生',
}
const activeRoleLabel = computed(() => store.state.activeRole ? roleLabels[store.state.activeRole] : '')

function selectRole(role: PracticumRole) {
  store.switchRole(role)
  router.push('/practicum')
}
</script>
