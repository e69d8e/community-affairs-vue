<template>
  <div class="register-page">
    <div class="register-card">
      <div class="card-header">
        <div class="brand-logo">🏡</div>
        <h2 class="register-title">新居民实名注册</h2>
        <p class="register-sub">选择您所在的社区，体验一站式高效治理服务</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="register-form">
        <el-form-item label="所属社区" prop="communityId">
          <el-select
            v-model="form.communityId"
            placeholder="请选择要加入的社区"
            size="large"
            style="width: 100%"
          >
            <el-option
              v-for="c in communities"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="登录账号" prop="username">
          <el-input
            v-model="form.username"
            placeholder="3~20位字母、数字或下划线"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item label="登录密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入至少6位密码"
            :prefix-icon="Lock"
            show-password
            size="large"
          />
        </el-form-item>

        <el-form-item label="真实姓名" prop="realName">
          <el-input
            v-model="form.realName"
            placeholder="真实姓名（用于物业核对与房产认证）"
            :prefix-icon="Postcard"
            size="large"
          />
        </el-form-item>

        <el-form-item label="手机号码" prop="phone">
          <el-input
            v-model="form.phone"
            placeholder="11位手机号码（接收重要工单及活动提醒）"
            :prefix-icon="Iphone"
            size="large"
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="submit-btn"
          :loading="loading"
          @click="handleRegister"
        >
          立即注册并登录
        </el-button>
      </el-form>

      <div class="card-footer">
        <span>已有社区账号？</span>
        <router-link :to="route.query.redirect ? { path: '/login', query: { redirect: route.query.redirect } } : '/login'" class="link-login">返回登录 →</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock, Postcard, Iphone } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { useCommunityStore } from '@/stores/community'
import type { CommunityOption } from '@/types'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const communityStore = useCommunityStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const communities = ref<CommunityOption[]>([])

const form = reactive({
  username: '',
  password: '',
  realName: '',
  phone: '',
  communityId: ''
})

const rules: FormRules = {
  communityId: [
    { required: true, message: '请选择要加入的社区', trigger: 'change' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '用户名需为3-20位字母、数字或下划线', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
  ],
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的11位手机号', trigger: 'blur' }
  ]
}

onMounted(async () => {
  communities.value = await communityStore.fetchCommunities()
})

async function handleRegister() {
  if (!formRef.value) return
  await formRef.value.validate()

  loading.value = true
  try {
    const res: any = await request.post('/auth/register', form)
    userStore.setAuth(res.token, res)
    ElMessage.success('注册成功，已自动登录！')
    const redirect = (route.query.redirect as string) || ''
    router.push(redirect || '/')
  } catch (err) {
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0d0d0d;
  padding: 24px;
}

.register-card {
  width: 100%;
  max-width: 460px;
  background: var(--cal-canvas);
  border-radius: var(--radius-xl);
  padding: 44px;
  border: 1px solid #242424;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
}

@media (max-width: 500px) {
  .register-page {
    padding: 16px;
  }
  .register-card {
    padding: 28px 18px;
    border-radius: var(--radius-lg);
  }
}

.card-header {
  text-align: center;
  margin-bottom: 28px;
}

.brand-logo {
  font-size: 36px;
  margin-bottom: 12px;
}

.register-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: var(--cal-ink);
  margin-bottom: 6px;
}

.register-sub {
  font-size: 13px;
  color: var(--cal-muted);
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  border-radius: var(--radius-md);
  margin-top: 12px;
  background-color: var(--cal-primary) !important;
  border-color: var(--cal-primary) !important;
  color: var(--cal-on-primary) !important;
}

.card-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 13px;
  color: var(--cal-muted);
}

.link-login {
  color: var(--cal-ink);
  font-weight: 600;
  margin-left: 6px;
  text-decoration: none;
}
.link-login:hover {
  text-decoration: underline;
}
</style>
