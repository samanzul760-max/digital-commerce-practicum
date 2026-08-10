<template>
  <main class="login-page" data-learnec-login>
    <section class="login-intro"><p>LearnEC</p><h1>高校电商教学实训平台</h1><span>围绕教师发任务、学生做沙盘、系统留证据、教师来打分。</span></section>
    <form class="login-form" @submit.prevent="submit"><p>账号登录</p><label>账号<input v-model.trim="identifier" data-login-identifier autocomplete="username" required /></label><label>密码<input v-model="password" data-login-password autocomplete="current-password" required type="password" /></label><p v-if="auth.state.value.error" class="error" role="alert">{{ auth.state.value.error }}</p><button data-login-submit :disabled="auth.state.value.loading" type="submit">{{ auth.state.value.loading ? '正在登录' : '登录' }}</button></form>
  </main>
</template>

<script setup lang="ts">
const auth = useAuthSession()
const identifier = ref('')
const password = ref('')
onMounted(async () => { const user = await auth.load(); if (user) await navigateTo(user.role === 'ADMIN' ? '/admin' : '/center') })
async function submit() { const user = await auth.login(identifier.value, password.value); if (user) await navigateTo(user.role === 'ADMIN' ? '/admin' : '/center') }
</script>

<style scoped>
.login-page{display:grid;grid-template-columns:1.15fr .85fr;min-height:100vh;background:#fff}.login-intro{display:grid;align-content:center;padding:clamp(36px,8vw,104px);background:#eaf4ff}.login-intro p{margin:0;color:#145bc2;font-size:14px;font-weight:800}.login-intro h1{max-width:560px;margin:14px 0;font-size:clamp(34px,4vw,56px);letter-spacing:0;line-height:1.18}.login-intro span{max-width:460px;color:#52647a;line-height:1.8}.login-form{display:grid;align-content:center;gap:16px;width:min(360px,calc(100% - 40px));margin:auto}.login-form>p:first-child{margin:0;color:#172033;font-size:26px;font-weight:750}.login-form label{display:grid;gap:8px;color:#475467;font-size:14px}.login-form input{height:42px;padding:0 12px;border:1px solid #d0d5dd;border-radius:5px}.login-form button{height:42px;border:0;border-radius:5px;background:#1677ff;color:#fff;font-weight:700}.error{margin:0;color:#b42318;font-size:13px}@media(max-width:780px){.login-page{grid-template-columns:1fr}.login-intro{min-height:280px;padding:38px 24px}.login-form{padding:42px 0}}
</style>
