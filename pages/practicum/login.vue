<template>
  <main class="auth-page" data-practicum-login>
    <section class="auth-intro" aria-label="数字电商实战教学平台介绍">
      <div class="intro-copy">
        <div class="auth-brand"><span>DC</span><strong>Digital Commerce Practicum</strong></div>
        <p class="auth-eyebrow">DIGITAL COMMERCE PRACTICUM</p>
        <h1>电商实战，<br>学以致用</h1>
        <p>从课程学习到真实经营分析，让每一次实训都沉淀为可复用的电商能力。</p>
      </div>
      <div class="commerce-illustration" aria-hidden="true">
        <div class="insight-card"><small>实战数据</small><strong>店铺增长</strong><i /><i /><i /></div>
        <div class="store-window"><b>店铺运营</b><span /><span /><span /></div>
        <div class="achievement-token">成就</div>
      </div>
    </section>

    <section class="auth-panel" aria-live="polite">
      <div v-if="demoAccess" data-demo-entry-panel class="auth-card">
        <p class="auth-kicker">DIGITAL COMMERCE PRACTICUM</p>
        <h2>免密进入工作台</h2>
        <p class="auth-description">无需开通账号或输入密码，直接进入本地授权的实训工作台。</p>
        <p v-if="auth.state.value.error" data-auth-error class="auth-error" role="alert">{{ auth.state.value.error }}</p>
        <button data-demo-entry class="auth-submit" type="button" :disabled="auth.state.value.loading" @click="handleDemoEntry">
          {{ auth.state.value.loading ? '正在进入...' : '直接进入实训工作台' }}
        </button>
        <p class="auth-demo-note">仅在本地验收环境启用，线上环境可关闭。</p>
      </div>

      <form data-login-form class="auth-card" @submit.prevent="handleLogin">
        <p class="auth-kicker">DIGITAL COMMERCE PRACTICUM</p>
        <h2>账号登录</h2>
        <p class="auth-description">进入你的数字电商实战学习空间。</p>
        <label class="auth-field">用户名或邮箱<input v-model="identifier" data-login-identifier autocomplete="username" required type="text" placeholder="请输入用户名或邮箱"></label>
        <label class="auth-field">密码<input v-model="password" data-login-password autocomplete="current-password" required type="password" placeholder="请输入密码"></label>
        <p v-if="auth.state.value.error" data-auth-error class="auth-error" role="alert">{{ auth.state.value.error }}</p>
        <button data-login-submit class="auth-submit" type="submit" :disabled="auth.state.value.loading">{{ auth.state.value.loading ? '登录中…' : '登录' }}</button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthSession } from '~/composables/useAuthSession'
import { usePracticumStore } from '~/composables/usePracticumStore'

const auth = useAuthSession()
const store = usePracticumStore()
const router = useRouter()
const config = useRuntimeConfig()
const demoAccess = config.public.practicumDemoAccess === true
const identifier = ref('')
const password = ref('')

onMounted(async () => {
  const user = await auth.load()
  if (user) { store.switchRole(user.role); await router.replace('/practicum'); return }
})

async function complete(user: Awaited<ReturnType<typeof auth.login>>) { if (user) { store.switchRole(user.role); await router.push('/practicum') } }
async function handleLogin() { await complete(await auth.login(identifier.value, password.value)) }
async function handleDemoEntry() { await complete(await auth.enterDemo()) }
</script>

<style scoped>
.auth-page{display:grid;grid-template-columns:minmax(0,1fr) minmax(460px,.82fr);min-height:100vh;background:#fff}.auth-intro{position:relative;overflow:hidden;padding:clamp(42px,8vw,104px);background:#eaf5ff}.auth-intro::before{content:"";position:absolute;top:-155px;right:-115px;width:420px;height:420px;border:1px solid #b9e0ff;border-radius:50%}.intro-copy{position:relative;z-index:2;max-width:470px}.auth-brand{display:flex;gap:10px;align-items:center;color:#1e293b;font-size:16px}.auth-brand span{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#1890ff;color:#fff;font-size:11px;font-weight:900}.auth-eyebrow{margin:80px 0 8px;color:#1890ff;font-size:12px;font-weight:850;letter-spacing:.12em}.auth-intro h1{margin:0;font-size:clamp(40px,5vw,64px);line-height:1.04;letter-spacing:0}.auth-intro p:not(.auth-eyebrow){max-width:390px;margin:18px 0 0;color:#52718d;font-size:16px}.commerce-illustration{position:absolute;right:12%;bottom:9%;width:330px;height:260px}.store-window{position:absolute;right:0;bottom:0;width:206px;height:156px;padding:49px 20px 14px;border:2px solid #aeddff;border-radius:16px;background:#fff;box-shadow:15px 16px 0 #c6e8ff}.store-window::before{content:"";position:absolute;inset:0 0 auto;height:34px;border-radius:14px 14px 0 0;background:repeating-linear-gradient(90deg,#1890ff 0 20px,#fff 20px 40px)}.store-window b{font-size:13px}.store-window span{display:inline-block;width:23px;height:49px;margin:15px 7px 0 0;border-radius:5px 5px 2px 2px;background:#1890ff}.store-window span:nth-of-type(2){height:38px;background:#18a57a}.store-window span:nth-of-type(3){height:61px;background:#fa8c16}.insight-card{position:absolute;top:12px;left:16px;z-index:2;width:144px;padding:14px;border:1px solid #d5e9f9;border-radius:13px;background:#fff;box-shadow:0 10px 22px rgba(30,41,59,.1);transform:rotate(-5deg)}.insight-card small,.insight-card strong{display:block}.insight-card small{color:#64748b;font-size:11px}.insight-card strong{margin:3px 0 10px;font-size:13px}.insight-card i{display:inline-block;width:17px;margin-right:5px;border-radius:4px 4px 0 0;background:#1890ff;height:19px}.insight-card i:nth-of-type(2){height:29px;background:#18a57a}.insight-card i:nth-of-type(3){height:38px;background:#fa8c16}.achievement-token{position:absolute;left:0;bottom:38px;z-index:3;display:grid;place-items:center;width:75px;height:75px;border:3px solid #fff;border-radius:24px;background:#fa8c16;color:#fff;font-weight:850;box-shadow:0 10px 20px rgba(250,140,22,.24);transform:rotate(-9deg)}.auth-panel{display:grid;place-items:center;padding:42px}.auth-card{width:min(360px,100%)}.auth-kicker{margin:0;color:#1890ff;font-size:11px;font-weight:850;letter-spacing:.12em}.auth-card h2{margin:8px 0 4px;font-size:27px;letter-spacing:0}.auth-description{margin:0 0 20px;color:#64748b}.auth-submit{width:100%;height:43px;border:0;border-radius:9px;background:#1890ff;color:#fff;font-weight:850;box-shadow:0 6px 15px rgba(24,144,255,.22)}.auth-error{color:#e55b4e;font-size:12px}.auth-demo-note{margin:14px 0 0;color:#64748b;font-size:12px;text-align:center}.auth-submit:disabled{opacity:.55}@media(max-width:850px){.auth-page{grid-template-columns:1fr}.auth-intro{min-height:310px;padding:36px}.auth-eyebrow{margin-top:38px}.auth-intro h1{font-size:38px}.commerce-illustration{right:10px;bottom:-10px;transform:scale(.72);transform-origin:bottom right}.auth-panel{padding:36px 20px}}@media(max-width:480px){.auth-intro{min-height:280px;padding:28px 22px}.auth-brand{font-size:14px}.commerce-illustration{opacity:.55;right:-40px}.auth-card h2{font-size:24px}}
</style>
