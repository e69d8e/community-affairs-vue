<template>
  <div class="activity-list-view">
    <div class="page-header">
      <div>
        <h1 class="cal-display-sm">社区文体与公益活动</h1>
        <p class="page-sub">邻里温情共融，在线报名即可生成专属核销凭证并现场签到</p>
      </div>
      <div class="header-actions" style="display: flex; gap: 10px; align-items: center">
        <button
          v-if="userStore.isLoggedIn"
          type="button"
          class="tickets-btn"
          @click="openMyTickets"
        >
          📲 快捷出示核销码 ({{ myTickets.length }})
        </button>
        <button type="button" class="tickets-btn" @click="$router.push('/user/profile?tab=tickets')">
          🎫 个人凭证中心 →
        </button>
      </div>
    </div>

    <!-- 分类筛选与活动状态 + 关键词过滤 -->
    <div class="filter-bar" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px">
      <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center">
        <el-radio-group v-model="category" @change="resetAndLoad">
          <el-radio-button value="">全部分类</el-radio-button>
          <el-radio-button value="邻里文体">邻里文体</el-radio-button>
          <el-radio-button value="公益讲座">公益讲座</el-radio-button>
          <el-radio-button value="亲子教育">亲子教育</el-radio-button>
          <el-radio-button value="志愿服务">志愿服务</el-radio-button>
          <el-radio-button value="节日庆典">节日庆典</el-radio-button>
        </el-radio-group>

        <el-radio-group v-model="statusFilter" size="default">
          <el-radio-button value="all">全部状态</el-radio-button>
          <el-radio-button value="open">🔥 报名中</el-radio-button>
          <el-radio-button v-if="userStore.isLoggedIn" value="signed">✅ 我已报名</el-radio-button>
        </el-radio-group>
      </div>

      <el-input
        v-model="searchKw"
        placeholder="搜索活动名称或地点..."
        clearable
        style="width: 220px"
      />
    </div>

    <!-- 活动卡片网格 -->
    <div v-loading="loading" class="activity-grid">
      <div v-if="filteredActivities.length === 0" class="empty-wrap">
        <el-empty description="当前暂无符合筛选条件的社区活动" />
      </div>

      <div
        v-for="act in filteredActivities"
        :key="act.id"
        class="activity-item-card cal-mockup-card"
        @click="$router.push(`/activities/${act.id}`)"
      >
        <div class="cover-wrapper">
          <img :src="act.coverImage || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800'" class="cover-img" />
          <span class="status-overlay cal-badge" :class="getStatusBadgeClass(act.status)">
            {{ getStatusText(act.status) }}
          </span>
          <span class="category-pill">{{ act.category }}</span>
        </div>

        <div class="card-body">
          <h3 class="act-title">{{ act.title }}</h3>
          <p class="act-desc">{{ act.description }}</p>

          <div class="act-meta">
            <p>📍 {{ act.location }}</p>
            <p>⏰ 开始：{{ act.startTime }}</p>
          </div>

          <!-- 名额进度条 -->
          <div class="quota-row">
            <div class="quota-text">
              <span>报名进度</span>
              <span class="quota-num">{{ act.currentParticipants }} / {{ act.maxParticipants }} 人</span>
            </div>
            <el-progress
              :percentage="(act.maxParticipants > 0 ? Math.min(100, Math.round((act.currentParticipants / act.maxParticipants) * 100)) : 0)"
              :color="act.currentParticipants >= act.maxParticipants ? '#ef4444' : '#10b981'"
              :stroke-width="5"
              :show-text="false"
            />
          </div>

          <div class="card-footer">
            <span class="organizer">主办：{{ act.organizer }}</span>
            <button
              v-if="act.hasSignedUp"
              type="button"
              class="act-btn-signed"
              title="查看我的电子核销凭证"
              @click.stop="openMyTickets"
            >
              🎫 已报名 (亮码)
            </button>
            <button
              v-else-if="act.status === 1"
              type="button"
              class="act-btn-primary"
              :disabled="act.currentParticipants >= act.maxParticipants"
              @click.stop="handleQuickSignup(act)"
            >
              {{ act.currentParticipants >= act.maxParticipants ? '名额已满' : '立即报名' }}
            </button>
            <button
              v-else
              type="button"
              disabled
              class="act-btn-disabled"
            >
              {{ act.status === 2 ? '报名截止' : '已结束' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="size"
        :total="total"
        layout="prev, pager, next, total"
        background
        @current-change="loadActivities"
      />
    </div>

    <!-- 快速在线报名确认弹窗 -->
    <el-dialog
      v-model="showQuickSignupDialog"
      title="文体公益活动在线报名确认"
      width="500px"
      destroy-on-close
    >
      <div v-if="targetActivity" class="quick-signup-modal-body">
        <div class="signup-act-header">
          <span class="cal-badge cal-badge-emerald">{{ targetActivity.category }}</span>
          <h3 class="signup-act-title">{{ targetActivity.title }}</h3>
        </div>
        <div class="signup-act-meta">
          <p>⏰ <strong>活动时间：</strong>{{ targetActivity.startTime }} ~ {{ targetActivity.endTime }}</p>
          <p>📍 <strong>开展地点：</strong>{{ targetActivity.location }}</p>
          <p>👥 <strong>名额概况：</strong>已报 {{ targetActivity.currentParticipants }} / 限额 {{ targetActivity.maxParticipants }} 人</p>
        </div>
        <div class="user-confirm-box">
          <span class="uc-label">报名居民：</span>
          <span class="uc-name">{{ userStore.user?.realName || userStore.user?.username }} ({{ userStore.user?.phone || '业主居民' }})</span>
        </div>
        <div class="signup-notice">
          💡 提交报名后将即刻为您生成 6 位防伪电子核销凭证，活动当天向现场工作人员出示扫码即可快速核销签到入场。
        </div>
      </div>
      <template #footer>
        <el-button @click="showQuickSignupDialog = false">取消</el-button>
        <el-button
          type="primary"
          :loading="signingUp"
          class="cal-primary-btn"
          @click="confirmSignup"
        >
          确认立即报名
        </el-button>
      </template>
    </el-dialog>

    <!-- 我的报名凭证抽屉/弹窗 -->
    <el-dialog v-model="showMyTickets" title="我的活动核销电子凭证" width="560px">
      <div v-loading="loadingTickets" class="tickets-container">
        <div v-if="myTickets.length === 0" class="empty-block">
          <el-empty description="您当前暂未报名任何社区活动" />
        </div>

        <div v-for="ticket in myTickets" :key="ticket.id" class="ticket-card cal-mockup-card">
          <div class="ticket-header">
            <h4>{{ ticket.title || ticket.activityTitle || '社区文体公益活动' }}</h4>
            <span class="cal-badge" :class="(ticket.mySignupStatus === 2 || ticket.verifyStatus === 1) ? 'cal-badge-emerald' : 'cal-badge-orange'">
              {{ (ticket.mySignupStatus === 2 || ticket.verifyStatus === 1) ? '已现场核销签到' : '待核销入场' }}
            </span>
          </div>
          <p class="ticket-time">⏰ 活动时间：{{ ticket.startTime || ticket.activityTime || '活动时间待公布' }}</p>
          <p class="ticket-loc">📍 集合地点：{{ ticket.location || '社区邻里活动中心' }}</p>

          <div class="qr-code-box">
            <img :src="ticket.myQrCodeBase64 || ticket.qrCodeUrl || ''" class="qr-img" />
            <div class="code-val">动态验证码：<strong>{{ ticket.myVerifyCode || ticket.verifyCode || '------' }}</strong></div>
            <p class="qr-hint">活动现场请主动出示此动态核销码供网格工作人员扫码核验</p>
            <div style="margin-top: 10px; display: flex; justify-content: center; gap: 10px">
              <el-button size="small" plain @click="copyTicketCode(ticket.myVerifyCode || ticket.verifyCode)">
                📋 复制核销码
              </el-button>
              <el-button
                v-if="ticket.mySignupStatus !== 2 && ticket.verifyStatus !== 1"
                size="small"
                type="danger"
                plain
                @click="handleCancelFromModal(ticket)"
              >
                取消报名
              </el-button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer-row">
          <el-button link type="primary" @click="$router.push('/user/profile?tab=tickets'); showMyTickets = false">
            前往个人中心凭证页管理 →
          </el-button>
          <el-button @click="showMyTickets = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { usePublicCommunityParam } from '@/composables/usePublicCommunityParam'
import request from '@/utils/request'
import { localQrDataUrl } from '@/utils/qrcode'
import type { Activity } from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { communityParam: publicCommunityParam, initGuestCommunity } = usePublicCommunityParam()

const category = ref('')
const statusFilter = ref<'all' | 'open' | 'signed'>('all')
const searchKw = ref('')
const activities = ref<Activity[]>([])
const loading = ref(false)
const page = ref(1)
const size = ref(9)
const total = ref(0)

const showMyTickets = ref(false)
const loadingTickets = ref(false)
const myTickets = ref<any[]>([])

const showQuickSignupDialog = ref(false)
const targetActivity = ref<Activity | null>(null)
const signingUp = ref(false)

const filteredActivities = computed(() => {
  return activities.value.filter((act) => {
    if (statusFilter.value === 'open' && act.status !== 1) return false
    if (statusFilter.value === 'signed' && !act.hasSignedUp) return false
    if (searchKw.value.trim()) {
      const kw = searchKw.value.trim().toLowerCase()
      const matchTitle = String(act.title || '').toLowerCase().includes(kw)
      const matchLoc = String(act.location || '').toLowerCase().includes(kw)
      if (!matchTitle && !matchLoc) return false
    }
    return true
  })
})

function copyTicketCode(code?: string) {
  if (!code) return
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => {
      ElMessage.success(`已复制6位核销码：${code}`)
    })
  } else {
    ElMessage.info(`核销码：${code}`)
  }
}

async function handleCancelFromModal(ticket: any) {
  try {
    await ElMessageBox.confirm(
      `确定取消【${ticket.title || ticket.activityTitle || '该活动'}】的报名吗？名额将自动释放给其他邻里。`,
      '取消报名确认',
      { type: 'warning', confirmButtonText: '确定取消', cancelButtonText: '暂不取消' }
    )
    const actId = ticket.activityId || ticket.id
    await request.post(`/activity/cancel?activityId=${actId}`)
    ElMessage.success('已取消报名，名额已释放')
    await loadMyTickets()
    await loadActivities()
  } catch (e) {}
}

function handleQuickSignup(act: Activity) {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再报名参加活动')
    router.push('/login')
    return
  }
  if (act.currentParticipants >= act.maxParticipants) {
    ElMessage.warning('该活动名额已报满')
    return
  }
  targetActivity.value = act
  showQuickSignupDialog.value = true
}

async function confirmSignup() {
  if (!targetActivity.value) return
  signingUp.value = true
  try {
    await request.post(`/activity/signup?activityId=${targetActivity.value.id}`)
    ElMessage.success('报名成功！已为您生成专属电子核销凭证。')
    targetActivity.value.hasSignedUp = true
    targetActivity.value.currentParticipants = (targetActivity.value.currentParticipants || 0) + 1
    showQuickSignupDialog.value = false
    await loadMyTickets()
    showMyTickets.value = true
  } catch (err) {
    // handled by request interceptor
  } finally {
    signingUp.value = false
  }
}

function openMyTickets() {
  loadMyTickets()
  showMyTickets.value = true
}

onMounted(() => {
  loadActivities()
  loadMyTickets()
  if (route.query.tickets === '1' || route.query.tab === 'tickets') {
    showMyTickets.value = true
  }
})

watch(() => route.query, (q) => {
  if (q.tickets === '1' || q.tab === 'tickets') {
    showMyTickets.value = true
    loadMyTickets()
  }
})

function resetAndLoad() {
  page.value = 1
  loadActivities()
}

async function loadActivities() {
  await initGuestCommunity()
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      size: size.value
    }
    if (category.value) {
      params.category = category.value
    }
    const res: any = await request.get('/activity/list', { params: { ...params, communityId: publicCommunityParam.value } })
    activities.value = res.records || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}


// 后端未返回二维码时本地生成，避免把核销码提交到第三方服务
async function fillLocalQrCodes(list: any[], size = 180) {
  for (const t of list || []) {
    if (!t.myQrCodeBase64 && !t.qrCodeUrl) {
      const code = t.myVerifyCode || t.verifyCode
      if (code) {
        t.qrCodeUrl = await localQrDataUrl(String(code), size)
      }
    }
  }
}

async function loadMyTickets() {
  if (!userStore.isLoggedIn) return
  try {
    const res: any = await request.get('/activity/my-signups')
    myTickets.value = res || []
    fillLocalQrCodes(myTickets.value, 150)
  } catch (ignored) {}
}

function getStatusText(status: number) {
  switch (status) {
    case 1: return '报名中'
    case 2: return '报名截止'
    case 3: return '活动进行中'
    case 4: return '已圆满结束'
    default: return '筹备中'
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
.activity-list-view {
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.page-sub {
  font-size: 14px;
  color: var(--cal-muted);
  margin-top: 4px;
}

.tickets-btn {
  height: 38px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--radius-md);
  background-color: var(--cal-surface-soft);
  color: var(--cal-ink);
  border: 1px solid var(--cal-hairline);
  cursor: pointer;
  transition: all 0.15s ease;
}
.tickets-btn:hover {
  background-color: var(--cal-canvas);
  border-color: var(--cal-ink);
}

.filter-bar {
  margin-bottom: 24px;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.empty-wrap {
  grid-column: 1 / -1;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px 0;
}

.activity-item-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}
.activity-item-card:hover {
  border-color: var(--cal-ink);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.cover-wrapper {
  position: relative;
  width: 100%;
  height: 180px;
}
.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
}
.category-pill {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(16, 16, 16, 0.85);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.act-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cal-ink);
  margin-bottom: 6px;
}

.act-desc {
  font-size: 13px;
  color: var(--cal-muted);
  line-height: 1.5;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.act-meta {
  font-size: 12px;
  color: var(--cal-muted);
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}

.quota-row {
  margin-bottom: 16px;
}
.quota-text {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--cal-muted);
  margin-bottom: 4px;
}
.quota-num {
  font-weight: 600;
  color: var(--cal-ink);
}

.card-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid var(--cal-hairline-soft);
}
.organizer {
  font-size: 12px;
  color: var(--cal-muted-soft);
}

.act-btn-primary {
  height: 32px;
  padding: 0 14px;
  border-radius: var(--radius-pill);
  background: var(--cal-primary);
  color: var(--cal-on-primary);
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}
.act-btn-primary:hover {
  background: var(--cal-primary-active);
}

.act-btn-signed {
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #d1fae5;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.act-btn-disabled {
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  background: var(--cal-surface-soft);
  color: var(--cal-muted-soft);
  border: 1px solid var(--cal-hairline);
  font-size: 12px;
  cursor: not-allowed;
}

.pagination-wrap {
  margin-top: 36px;
  display: flex;
  justify-content: center;
}

.tickets-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ticket-card {
  padding: 20px;
}
.ticket-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.ticket-header h4 {
  font-size: 15px;
  font-weight: 600;
  color: var(--cal-ink);
}
.ticket-time, .ticket-loc {
  font-size: 12px;
  color: var(--cal-muted);
  margin-bottom: 4px;
}
.qr-code-box {
  margin-top: 14px;
  background: var(--cal-surface-soft);
  border-radius: var(--radius-md);
  padding: 16px;
  text-align: center;
  border: 1px solid var(--cal-hairline);
}
.qr-img {
  width: 130px;
  height: 130px;
  margin: 0 auto;
}
.code-val {
  font-size: 13px;
  margin-top: 8px;
  color: var(--cal-body);
}
.code-val strong {
  font-size: 16px;
  color: var(--cal-ink);
  letter-spacing: 2px;
}
.qr-hint {
  font-size: 11px;
  color: var(--cal-muted);
  margin-top: 4px;
}

/* 快速报名弹窗样式 */
.quick-signup-modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.signup-act-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.signup-act-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--cal-ink);
  margin: 0;
}
.signup-act-meta {
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  font-size: 13px;
  color: var(--cal-body);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.signup-act-meta p {
  margin: 0;
}
.user-confirm-box {
  display: flex;
  align-items: center;
  font-size: 13px;
  padding: 8px 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-sm);
  color: #166534;
}
.uc-label {
  font-weight: 600;
}
.signup-notice {
  font-size: 12px;
  color: var(--cal-muted);
  line-height: 1.5;
}

@media (max-width: 1024px) {
  .activity-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }
  .header-actions {
    width: 100%;
  }
  .tickets-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .activity-grid {
    grid-template-columns: 1fr;
  }
}
</style>
