<template>
  <div class="login-page">
    <div class="login-container">
      <!-- 左侧品牌展示区 (Cal surface-dark: #101010) -->
      <div class="login-brand">
        <div class="brand-top">
          <div class="brand-badge">智慧治理示范平台</div>
          <div class="brand-logo">🏡</div>
          <h1 class="brand-title">智慧社区综合治理平台</h1>
          <p class="brand-subtitle">
            一套系统服务多个社区：网格治理、敏捷报修、邻里互助与应急通告，多社区数据安全隔离。
          </p>
        </div>

        <div class="brand-bottom">
          <div class="brand-badges">
            <span class="cal-tech-pill">社区网格治理</span>
            <span class="cal-tech-pill">敏捷报修工单</span>
            <span class="cal-tech-pill">邻里互助市集</span>
            <span class="cal-tech-pill">文体活动预约</span>
            <span class="cal-tech-pill">应急通告广播</span>
          </div>
          <div class="brand-quote">
            “以极简现代工程之美，重塑敏捷、温情、自主的数字化社区治理新体验。”
          </div>
        </div>
      </div>

      <!-- 右侧登录表单区 (纯白画布 + 纯黑主按钮) -->
      <div class="login-card">
        <div class="card-header">
          <h2>用户安全登录</h2>
          <p>{{ isDev ? '请选择下方预设账号或输入凭证直接登录' : '请输入账号与密码登录' }}</p>
        </div>

        <!-- 答辩与测试快捷切换器 (Cal Pill 风格): 仅演示环境(开发模式/本机访问)整块显示 -->
        <div v-if="isDev && presetAccounts.length" class="quick-roles-section">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px">
            <div class="quick-title" style="margin-bottom: 0">⚡ 快速身份体验通道：</div>
            <el-switch
              v-model="instantLogin"
              size="small"
              active-text="点击直接登录"
              inactive-text="仅填入账号"
            />
          </div>
          <div class="roles-grid">
            <button
              v-for="r in presetAccounts"
              :key="r.username"
              type="button"
              class="role-pill-btn"
              :style="form.username === r.username ? 'border-color: #111827; background: #f1f5f9; font-weight: 700' : ''"
              @click="applyPreset(r)"
            >
              <span class="role-icon">{{ r.icon }}</span>
              <span class="role-name">{{ r.label }}</span>
            </button>
          </div>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" class="login-form">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入登录用户名"
              :prefix-icon="User"
              size="large"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              show-password
              size="large"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <div class="form-extra">
            <el-checkbox v-model="rememberMe">记住账号</el-checkbox>
            <router-link :to="route.query.redirect ? { path: '/register', query: { redirect: route.query.redirect } } : '/register'" class="link-register">新居民在线注册 →</router-link>
          </div>

          <el-button type="primary" size="large" class="submit-btn" @click="handleLogin">
            登 录
          </el-button>
        </el-form>

        <!-- 滑块人机验证弹窗：滑动成功后自动提交登录 -->
        <el-dialog
          v-model="captchaVisible"
          title="安全验证"
          width="390"
          align-center
          :close-on-click-modal="false"
          destroy-on-close
        >
          <SliderCaptcha ref="captchaRef" @verify="onCaptchaVerify" />
        </el-dialog>

        <div class="card-footer">
          <router-link to="/" class="guest-link">以访客身份浏览居民门户 →</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import request from '@/utils/request'
import SliderCaptcha from '@/components/common/SliderCaptcha.vue'
import { isDev as isDevEnv } from '@/utils/env'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const rememberMe = ref(true)
const captchaVisible = ref(false)
const captchaRef = ref<InstanceType<typeof SliderCaptcha>>()
const isDev = isDevEnv
const instantLogin = ref(isDev)

const form = reactive({
  username: isDev ? 'admin' : '',
  password: isDev ? '123456' : ''
})

const presetAccounts = isDev ? [
  { label: '系统管理员', username: 'admin', icon: '👑', desc: '全功能权限' },
  { label: '社区管理员', username: 'community_admin', icon: '🏛️', desc: '公告与审核' },
  { label: '社区管理员(枫林府)', username: 'community_admin2', icon: '🏛️', desc: '第二社区' },
  { label: '物业管理员', username: 'property_admin', icon: '🛠️', desc: '工单与派工' },
  { label: '楼栋网格员', username: 'grid_officer', icon: '📋', desc: '认证与巡查' },
  { label: '普通居民', username: 'resident', icon: '🏡', desc: '报修与报名' }
] : []

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }]
}

function applyPreset(item: typeof presetAccounts[0]) {
  form.username = item.username
  form.password = '123456'
  if (instantLogin.value) {
    handleLogin()
  } else {
    ElMessage.info(`已切换至【${item.label}】(${item.username})`)
  }
}

async function handleLogin() {
  if (!formRef.value) return
  const ok = await formRef.value.validate().then(() => true).catch(() => false)
  if (!ok) return
  captchaVisible.value = true
}

/** 滑块验证通过后提交登录 (密码错误或验证未通过时滑块均已消费，自动换新图重滑) */
async function onCaptchaVerify(payload: { captchaId: string; captchaX: number }) {
  try {
    const res: any = await request.post('/auth/login', { ...form, ...payload })
    captchaRef.value?.markSuccess()
    userStore.setAuth(res.token, res)
    ElMessage.success(`欢迎回来，${res.realName || res.username}！`)

    const redirect = (route.query.redirect as string) || ''
    setTimeout(() => {
      captchaVisible.value = false
      if (redirect) {
        router.push(redirect)
      } else if (userStore.canAccessAdmin) {
        router.push('/admin/dashboard')
      } else {
        router.push('/')
      }
    }, 700)
  } catch (err) {
    captchaRef.value?.markFail()
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0d0d0d;
  padding: 24px;
}

.login-container {
  display: flex;
  max-width: 980px;
  width: 100%;
  min-height: 560px;
  background: var(--cal-canvas);
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid #242424;
  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.4);
}

.login-brand {
  flex: 1.1;
  background: var(--cal-surface-dark);
  padding: 52px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #ffffff;
  border-right: 1px solid #1f1f1f;
}

.brand-badge {
  display: inline-block;
  background: #1a1a1a;
  color: #a1a1aa;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  border: 1px solid #292929;
  margin-bottom: 24px;
}

.brand-logo {
  font-size: 42px;
  margin-bottom: 12px;
}

.brand-title {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.8px;
  color: #ffffff;
  margin-bottom: 12px;
}

.brand-subtitle {
  font-size: 13px;
  line-height: 1.6;
  color: var(--cal-on-dark-soft);
  max-width: 360px;
}

.brand-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.cal-tech-pill {
  background: #1a1a1a;
  border: 1px solid #262626;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  color: #d4d4d8;
}

.brand-quote {
  font-size: 12px;
  color: #71717a;
  line-height: 1.6;
  border-left: 2px solid #333333;
  padding-left: 12px;
}

.login-card {
  flex: 1;
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: var(--cal-canvas);
}

.card-header h2 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.4px;
  color: var(--cal-ink);
  margin-bottom: 4px;
}

.card-header p {
  font-size: 13px;
  color: var(--cal-muted);
  margin-bottom: 24px;
}

.quick-roles-section {
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-lg);
  padding: 14px;
  margin-bottom: 24px;
}

.quick-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--cal-muted);
  margin-bottom: 10px;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.role-pill-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-md);
  padding: 7px 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--cal-ink);
  cursor: pointer;
  transition: all 0.15s ease;
}

.role-pill-btn:hover {
  background: var(--cal-surface-card);
  border-color: var(--cal-ink);
}

.form-extra {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  font-size: 13px;
}

.link-register {
  color: var(--cal-ink);
  font-weight: 600;
  text-decoration: none;
}
.link-register:hover {
  text-decoration: underline;
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  border-radius: var(--radius-md);
  background-color: var(--cal-primary) !important;
  border-color: var(--cal-primary) !important;
  color: var(--cal-on-primary) !important;
}

.card-footer {
  text-align: center;
  margin-top: 24px;
}

.guest-link {
  font-size: 13px;
  color: var(--cal-muted);
  text-decoration: none;
  transition: color 0.15s;
}

.guest-link:hover {
  color: var(--cal-ink);
}

@media (max-width: 860px) {
  .login-container {
    flex-direction: column;
  }
  .login-brand {
    padding: 36px;
  }
  .login-card {
    padding: 36px;
  }
}

@media (max-width: 600px) {
  .login-page {
    padding: 12px;
  }
  .login-brand {
    padding: 24px 16px;
  }
  .brand-title {
    font-size: 20px;
  }
  .brand-subtitle {
    font-size: 13px;
  }
  .login-card {
    padding: 24px 16px;
  }
  .roles-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
</style>
