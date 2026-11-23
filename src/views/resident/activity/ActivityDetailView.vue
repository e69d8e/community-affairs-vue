<template>
  <div v-loading="loading" class="activity-detail-view">
    <div class="breadcrumb-bar">
      <el-button link :icon="ArrowLeft" class="cal-back-btn main-back-btn" @click="handleBack">
        {{ backButtonText }}
      </el-button>
      <el-button
        v-if="route.query.from"
        link
        class="cal-back-btn sub-back-btn"
        @click="$router.push('/activities')"
      >
        浏览活动大厅
      </el-button>
    </div>

    <div v-if="activity" class="detail-layout">
      <!-- 左侧主要详情 (Cal Mockup Card) -->
      <div class="main-info cal-mockup-card">
        <div class="cover-box">
          <img
            :src="activity.coverImage || DEFAULT_COVER"
            :alt="activity.title"
            class="cover-img"
          />
          <div class="status-badge-wrap">
            <span class="cal-badge" :class="getStatusBadgeClass(activity.status)">
              {{ getStatusText(activity.status) }}
            </span>
          </div>
        </div>

        <div class="info-content">
          <div class="category-row">
            <span class="category-tag">{{ activity.category }}</span>
            <span class="organizer-text">主办方：{{ activity.organizer }}</span>
          </div>

          <h1 class="activity-title">{{ activity.title }}</h1>

          <div class="meta-grid">
            <div class="meta-item">
              <el-icon class="meta-icon"><Calendar /></el-icon>
              <div>
                <div class="meta-label">活动开展时间</div>
                <div class="meta-value">{{ activity.startTime }} ~ {{ activity.endTime }}</div>
              </div>
            </div>

            <div class="meta-item">
              <el-icon class="meta-icon"><Timer /></el-icon>
              <div>
                <div class="meta-label">在线报名窗口</div>
                <div class="meta-value">{{ activity.signupStartTime }} ~ {{ activity.signupEndTime }}</div>
              </div>
            </div>

            <div class="meta-item">
              <el-icon class="meta-icon"><LocationInformation /></el-icon>
              <div>
                <div class="meta-label">活动具体地点</div>
                <div class="meta-value">{{ activity.location }}</div>
              </div>
            </div>

            <div class="meta-item">
              <el-icon class="meta-icon"><Phone /></el-icon>
              <div>
                <div class="meta-label">活动咨询热线</div>
                <div class="meta-value">{{ activity.contactPhone || '社区居委会综合热线' }}</div>
              </div>
            </div>
          </div>

          <el-divider />

          <!-- 活动介绍富文本/正文 -->
          <div class="detail-section">
            <h2 class="section-title">活动详情介绍与参与须知</h2>
            <div class="description-body">
              {{ activity.description }}
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧报名与凭证操作面板 -->
      <div class="action-sidebar">
        <!-- 名额进度卡片 -->
        <div class="sidebar-card">
          <h2 class="card-heading">报名名额进度</h2>
          <div class="quota-stat">
            <span class="quota-big">{{ activity.currentParticipants }}</span>
            <span class="quota-max">/ {{ activity.maxParticipants }} 人</span>
          </div>
          <el-progress
            :percentage="(activity.maxParticipants > 0 ? Math.min(100, Math.round((activity.currentParticipants / activity.maxParticipants) * 100)) : 0)"
            :color="activity.currentParticipants >= activity.maxParticipants ? '#ef4444' : '#10b981'"
            :stroke-width="10"
            class="mt-2"
          />
          <div class="quota-tip">
            {{ activity.currentParticipants >= activity.maxParticipants ? '名额已报满，敬请关注下一期活动' : `剩余可用名额 ${activity.maxParticipants - activity.currentParticipants} 人` }}
          </div>

          <!-- 报名按钮区域 -->
          <div class="action-btn-area">
            <template v-if="!userStore.isLoggedIn">
              <el-button
                v-if="activity.status === 1 && (activity.currentParticipants || 0) < (activity.maxParticipants || 0)"
                type="primary"
                size="large"
                class="w-full signup-btn"
                @click="$router.push(`/login?redirect=${encodeURIComponent($route.fullPath)}`)"
              >
                登录后在线报名
              </el-button>
              <el-button v-else type="info" size="large" class="w-full signup-btn" disabled>
                {{ activity.status === 1 ? '本场活动名额已满' : getStatusText(activity.status) }}
              </el-button>
            </template>
            <template v-else-if="activity.hasSignedUp && activity.mySignupStatus !== 3">
              <div class="ticket-status-box">
                <el-result
                  icon="success"
                  title="您已成功报名该活动"
                  :sub-title="activity.mySignupStatus === 2 ? '已在现场核销签到' : '活动当天请出示下方电子凭证扫码入场'"
                />
                <div v-if="activity.myQrCodeBase64 || activity.myVerifyCode" class="qr-ticket-display">
                  <img
                    :src="activity.myQrCodeBase64 || activity.qrCodeUrl || ''"
                    alt="活动入场核销二维码"
                    class="ticket-qr-img"
                  />
                  <div class="verify-code-num">
                    核销码：<span>{{ activity.myVerifyCode }}</span>
                  </div>
                  <div style="margin-top: 8px; display: flex; justify-content: center; gap: 8px">
                    <el-button size="small" plain @click="copyVerifyCode(activity.myVerifyCode)">
                      📋 复制核销码
                    </el-button>
                    <el-button size="small" type="primary" plain @click="showSuccessModal = true">
                      🔍 放大出示
                    </el-button>
                  </div>
                </div>
                <div v-if="activity.mySignupStatus === 1" class="cancel-btn-wrap">
                  <el-button
                    type="danger"
                    plain
                    size="default"
                    :loading="canceling"
                    @click="handleCancelSignup"
                  >
                    取消报名
                  </el-button>
                </div>
              </div>
            </template>
            <template v-else-if="activity.status === 1">
              <el-button
                type="primary"
                size="large"
                class="w-full signup-btn"
                :disabled="activity.currentParticipants >= activity.maxParticipants"
                :loading="signingUp"
                @click="handleSignup"
              >
                {{ activity.currentParticipants >= activity.maxParticipants ? '名额已报满' : '立即在线报名' }}
              </el-button>
            </template>
            <template v-else>
              <el-button disabled size="large" class="w-full">
                {{ activity.status === 2 ? '报名截止待开展' : (activity.status === 3 ? '活动进行中' : '活动已圆满完结') }}
              </el-button>
            </template>
          </div>
        </div>

        <!-- 社区温馨提示卡片 -->
        <div class="sidebar-card notice-card">
          <h2 class="notice-title">💡 参与活动须知</h2>
          <ul class="notice-list">
            <li>活动采取实名预约制，名额有限，请报名的居民准时到场。</li>
            <li>若行程有变无法出席，请在报名截止前取消报名，以便把名额留给邻里。</li>
            <li>入场时请向现场工作人员出示专属二维码或 6 位核销码。</li>
            <li>活动现场听从工作人员指引，关爱同行老人与儿童。</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 报名成功 / 放大出示弹窗 -->
    <el-dialog v-model="showSuccessModal" title="🎫 活动电子签到核销凭证" width="460px" center>
      <div class="success-modal-content">
        <el-alert
          title="请向现场工作人员出示下方二维码或6位数字码"
          type="success"
          description="实名预约有效，扫码即刻完成核销入场"
          show-icon
          :closable="false"
        />
        <div class="modal-qr-box">
          <img
            :src="activity?.myQrCodeBase64 || activity?.qrCodeUrl || ''"
            alt="活动入场核销二维码"
            class="modal-qr-img"
          />
          <div class="modal-code">6位签到核销码：<strong>{{ activity?.myVerifyCode }}</strong></div>
          <p class="modal-hint">核销码已同步保存至您的“个人中心 - 活动入场凭证”</p>
        </div>
      </div>
      <template #footer>
        <el-button plain @click="copyVerifyCode(activity?.myVerifyCode)">复制核销码</el-button>
        <el-button type="primary" @click="showSuccessModal = false">完成出示</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Calendar,
  Timer,
  LocationInformation,
  Phone
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { localQrDataUrl } from '@/utils/qrcode'
import { DEFAULT_COVER } from '@/constants/defaults'
import { useUserStore } from '@/stores/user'
import type { Activity } from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const backButtonText = computed(() => {
  if (route.query.from === 'records' || route.query.from === 'profile') {
    return '返回个人中心凭证'
  }
  return '返回活动列表'
})

function handleBack() {
  if (route.query.from === 'records' || route.query.from === 'profile') {
    router.push('/user/profile?tab=tickets')
  } else if (window.history.length > 1 && window.history.state?.back) {
    router.back()
  } else {
    router.push('/activities')
  }
}

function copyVerifyCode(code?: string) {
  if (!code) return
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => {
      ElMessage.success(`已复制核销码：${code}`)
    })
  } else {
    ElMessage.info(`核销码：${code}`)
  }
}

const loading = ref(false)
const signingUp = ref(false)
const canceling = ref(false)
const showSuccessModal = ref(false)
const activity = ref<Activity | null>(null)

onMounted(() => {
  loadDetail()
})

async function loadDetail() {
  const id = route.params.id
  if (!id) return
  loading.value = true
  try {
    const res: any = await request.get(`/activity/detail/${id}`)
    activity.value = res
    if (!res?.myQrCodeBase64 && res?.myVerifyCode) {
      res.qrCodeUrl = await localQrDataUrl(String(res.myVerifyCode), 200)
    }
  } catch (err) {
    ElMessage.error('获取活动详情失败')
  } finally {
    loading.value = false
  }
}

async function handleSignup() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再报名参与活动')
    router.push('/login')
    return
  }
  signingUp.value = true
  try {
    const res: any = await request.post(`/activity/signup?activityId=${activity.value?.id}`)
    activity.value = res
    if (!res?.myQrCodeBase64 && res?.myVerifyCode) {
      res.qrCodeUrl = await localQrDataUrl(String(res.myVerifyCode), 200)
    }
    showSuccessModal.value = true
    ElMessage.success('报名成功！已生成签到核销码')
  } catch (err: any) {
    // 错误在 request 拦截器中已有统一提示
  } finally {
    signingUp.value = false
  }
}

async function handleCancelSignup() {
  try {
    await ElMessageBox.confirm('取消报名后，您的名额将自动释放给其他居民，确定取消吗？', '取消报名确认', {
      confirmButtonText: '确定取消',
      cancelButtonText: '暂不取消',
      type: 'warning'
    })
  } catch {
    return
  }

  canceling.value = true
  try {
    await request.post(`/activity/cancel?activityId=${activity.value?.id}`)
    ElMessage.success('取消报名成功，名额已释放')
    await loadDetail()
  } catch (err) {
  } finally {
    canceling.value = false
  }
}

function getStatusText(status: number) {
  switch (status) {
    case 1: return '火热报名中'
    case 2: return '报名截止待开展'
    case 3: return '活动进行中'
    case 4: return '活动已完结'
    case 5: return '已取消'
    default: return '待发布'
  }
}

function getStatusBadgeClass(status: number) {
  switch (status) {
    case 1: return 'cal-badge-emerald'
    case 2: return 'cal-badge-orange'
    case 3: return 'cal-badge-violet'
    case 4: return 'cal-badge-gray'
    default: return 'cal-badge-gray'
  }
}
</script>

<style scoped>
.activity-detail-view {
  max-width: 1200px;
  margin: 0 auto;
}

.breadcrumb-bar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.sub-back-btn {
  color: var(--cal-muted);
  font-size: 13px;
}

.sub-back-btn:hover {
  color: var(--cal-ink);
}

.detail-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 28px;
}

.main-info {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.cover-box {
  position: relative;
  width: 100%;
  height: 360px;
  background: #f1f5f9;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-badge-wrap {
  position: absolute;
  top: 20px;
  right: 20px;
}

.info-content {
  padding: 32px;
}

.category-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.category-tag {
  background: #eff6ff;
  color: #3b82f6;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 9999px;
}

.organizer-text {
  font-size: 13px;
  color: #64748b;
}

.activity-title {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.4;
  margin-bottom: 24px;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  background: #f8fafc;
  padding: 20px;
  border-radius: 12px;
}

.meta-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.meta-icon {
  font-size: 22px;
  color: #3b82f6;
  margin-top: 2px;
}

.meta-label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.meta-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.detail-section {
  margin-top: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
}

.description-body {
  font-size: 15px;
  line-height: 1.8;
  color: #334155;
  white-space: pre-wrap;
}

.action-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebar-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 24px;
}

.card-heading {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
}

.quota-stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 10px;
}

.quota-big {
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
}

.quota-max {
  font-size: 16px;
  color: #64748b;
}

.quota-tip {
  font-size: 12px;
  color: #64748b;
  margin-top: 8px;
  margin-bottom: 24px;
}

.action-btn-area {
  margin-top: 16px;
}

.signup-btn {
  font-size: 16px;
  font-weight: 700;
  height: 48px;
}

.ticket-status-box {
  text-align: center;
}

.qr-ticket-display {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
}

.ticket-qr-img {
  width: 160px;
  height: 160px;
  margin: 0 auto;
}

.verify-code-num {
  font-size: 15px;
  margin-top: 10px;
  color: #334155;
}

.verify-code-num span {
  font-size: 20px;
  font-weight: 800;
  color: #10b981;
  letter-spacing: 2px;
}

.cancel-btn-wrap {
  margin-top: 16px;
}

.notice-card {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.notice-title {
  font-size: 14px;
  font-weight: 700;
  color: #166534;
  margin-bottom: 12px;
}

.notice-list {
  padding-left: 18px;
  font-size: 13px;
  color: #15803d;
  line-height: 1.7;
}

.success-modal-content {
  text-align: center;
}

.modal-qr-box {
  margin-top: 20px;
  background: #f8fafc;
  padding: 20px;
  border-radius: 12px;
}

.modal-qr-img {
  width: 180px;
  height: 180px;
  margin: 0 auto;
}

.modal-code {
  font-size: 16px;
  margin-top: 12px;
  color: #1e293b;
}

.modal-code strong {
  font-size: 22px;
  color: #10b981;
  letter-spacing: 3px;
}

.modal-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 6px;
}

@media (max-width: 900px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .cover-box {
    height: 200px;
  }
  .cover-img {
    height: 200px;
  }
  .info-content {
    padding: 18px 16px;
  }
  .activity-title {
    font-size: 20px;
    margin-bottom: 16px;
  }
  .meta-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 14px;
  }
  .sidebar-card {
    padding: 16px;
  }
}
</style>
