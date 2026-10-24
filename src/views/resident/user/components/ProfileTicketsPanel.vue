<template>
  <div class="profile-tickets-panel">
    <div class="panel-header-bar">
      <div>
        <h3 class="panel-title">我的活动入场凭证</h3>
        <p class="panel-sub">活动现场请向工作人员出示动态二维码或 6 位核销码完成实名签到；行程变更可随时在线退订</p>
      </div>
      <div class="header-actions">
        <el-button :icon="Calendar" class="cal-primary-btn" type="primary" @click="$router.push('/activities')">
          浏览社区活动大厅
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-radio-group v-model="ticketFilter" size="default">
        <el-radio-button value="all">全部凭证 ({{ tickets.length }})</el-radio-button>
        <el-radio-button value="pending">待核销入场 ({{ pendingTicketsCount }})</el-radio-button>
        <el-radio-button value="verified">已签到核销 ({{ verifiedTicketsCount }})</el-radio-button>
      </el-radio-group>
      <el-button :icon="Refresh" plain size="small" :loading="loading" @click="loadTickets">
        刷新凭证
      </el-button>
    </div>

    <div v-loading="loading" class="tickets-grid">
      <div v-if="filteredTickets.length === 0 && !loading" class="empty-block">
        <el-empty description="当前暂无相关活动入场凭证" :image-size="72">
          <el-button type="primary" class="cal-primary-btn" @click="$router.push('/activities')">
            前往社区活动中心报名
          </el-button>
        </el-empty>
      </div>

      <div
        v-for="ticket in filteredTickets"
        :key="ticket.id"
        class="ticket-pass-card"
      >
        <!-- 左侧：活动信息与就地操作 -->
        <div class="pass-info-section">
          <div>
            <div class="pass-meta-top">
              <span class="cal-badge cal-badge-gray">{{ ticket.category || '邻里文体' }}</span>
              <span
                class="cal-badge"
                :class="isTicketVerified(ticket) ? 'cal-badge-emerald' : 'cal-badge-orange'"
              >
                {{ isTicketVerified(ticket) ? '✓ 已现场核销签到' : '● 待出示核销' }}
              </span>
            </div>

            <h3 class="pass-title" @click="$router.push(`/activities/${ticket.id}?from=profile`)">
              {{ getTicketTitle(ticket) }}
            </h3>

            <div class="pass-detail-list">
              <div class="detail-row">
                <span class="row-label">⏰ 活动时间：</span>
                <span class="row-val time-val">{{ getTicketTime(ticket) }}</span>
              </div>
              <div class="detail-row">
                <span class="row-label">📍 集合地点：</span>
                <span class="row-val">{{ ticket.location || '社区邻里活动中心' }}</span>
              </div>
              <div v-if="ticket.organizer" class="detail-row">
                <span class="row-label">🏛️ 主办单位：</span>
                <span class="row-val">{{ ticket.organizer }}</span>
              </div>
            </div>
          </div>

          <div class="pass-footer-actions">
            <el-button
              type="primary"
              size="small"
              round
              class="cal-primary-btn"
              @click="openQrZoom(ticket)"
            >
              🔍 出示大码签到
            </el-button>
            <el-button
              size="small"
              round
              @click="$router.push(`/activities/${ticket.id}?from=profile`)"
            >
              活动详情
            </el-button>
            <el-button
              v-if="!isTicketVerified(ticket)"
              type="danger"
              plain
              size="small"
              round
              :loading="cancelingId === ticket.id"
              @click="handleCancelSignup(ticket)"
            >
              取消报名
            </el-button>
          </div>
        </div>

        <!-- 虚线打孔分割线 -->
        <div class="ticket-notch-divider">
          <span class="notch-circle notch-top" />
          <span class="notch-circle notch-bottom" />
        </div>

        <!-- 右侧：二维码与动态核销码 -->
        <div class="pass-qr-section" @click="openQrZoom(ticket)" title="点击放大二维码">
          <div class="qr-card-box">
            <img :src="getQrCodeUrl(ticket)" class="qr-image" alt="活动核销二维码" />
          </div>
          <div class="verify-code-box">
            <span class="code-title">动态核销码</span>
            <span class="code-number">{{ getVerifyCode(ticket) }}</span>
          </div>
          <span class="qr-zoom-pill">点击放大出示</span>
        </div>
      </div>
    </div>

    <!-- 二维码高清放大弹窗 -->
    <el-dialog v-model="showZoomModal" title="活动入场核销电子凭证" width="400px" center append-to-body>
      <div v-if="selectedTicket" class="zoom-modal-content">
        <span
          class="cal-badge"
          :class="isTicketVerified(selectedTicket) ? 'cal-badge-emerald' : 'cal-badge-orange'"
        >
          {{ isTicketVerified(selectedTicket) ? '✓ 已完成核销' : '● 待现场扫码核销' }}
        </span>
        <h3 class="zoom-title">{{ getTicketTitle(selectedTicket) }}</h3>
        <p class="zoom-meta">⏰ {{ getTicketTime(selectedTicket) }}</p>
        <p class="zoom-meta">📍 {{ selectedTicket.location || '社区邻里中心' }}</p>

        <div class="zoom-qr-box">
          <img :src="getQrCodeUrl(selectedTicket)" class="zoom-qr-img" />
          <div class="zoom-code-number">
            <span>6位核销码：</span>
            <strong>{{ getVerifyCode(selectedTicket) }}</strong>
          </div>
        </div>

        <p class="zoom-hint">现场请向网格员或物业工作人员出示此二维码完成签到</p>
      </div>
      <template #footer>
        <el-button type="primary" class="cal-primary-btn w-full" @click="showZoomModal = false">
          完成出示
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Calendar, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { localQrDataUrl } from '@/utils/qrcode'

const emit = defineEmits<{
  (e: 'changed'): void
}>()

const loading = ref(false)
const tickets = ref<any[]>([])
const ticketFilter = ref('all')
const cancelingId = ref<string | number | null>(null)

const showZoomModal = ref(false)
const selectedTicket = ref<any>(null)

const pendingTicketsCount = computed(() => tickets.value.filter(t => !isTicketVerified(t)).length)
const verifiedTicketsCount = computed(() => tickets.value.filter(t => isTicketVerified(t)).length)

const filteredTickets = computed(() => {
  if (ticketFilter.value === 'pending') return tickets.value.filter(t => !isTicketVerified(t))
  if (ticketFilter.value === 'verified') return tickets.value.filter(t => isTicketVerified(t))
  return tickets.value
})

onMounted(() => {
  loadTickets()
})

async function loadTickets() {
  loading.value = true
  try {
    const res: any = await request.get('/activity/my-signups')
    tickets.value = res || []
  } finally {
    loading.value = false
  }
}

function isTicketVerified(t: any): boolean {
  return t.mySignupStatus === 2 || t.verifyStatus === 1
}

function getTicketTitle(t: any): string {
  return t.title || t.activityTitle || '社区文体公益活动'
}

function getTicketTime(t: any): string {
  if (t.startTime) {
    return t.endTime ? `${t.startTime} ~ ${t.endTime}` : t.startTime
  }
  return t.activityTime || '活动时间待公布'
}

function getVerifyCode(t: any): string {
  return t.myVerifyCode || t.verifyCode || t.code || '------'
}

const localQrCache = ref<Record<string, string>>({})

function getQrCodeUrl(t: any): string {
  if (t.myQrCodeBase64) return t.myQrCodeBase64
  if (t.qrCodeUrl) return t.qrCodeUrl
  const code = getVerifyCode(t)
  if (code && code !== '------' && !localQrCache.value[code]) {
    localQrDataUrl(code, 180).then(url => {
      localQrCache.value[code] = url
    })
  }
  return localQrCache.value[code] || ''
}

function openQrZoom(t: any) {
  selectedTicket.value = t
  showZoomModal.value = true
}

async function handleCancelSignup(ticket: any) {
  try {
    await ElMessageBox.confirm(
      `确定取消「${getTicketTitle(ticket)}」的报名吗？取消后名额将释放给其他邻里。`,
      '取消活动报名',
      {
        confirmButtonText: '确认取消报名',
        cancelButtonText: '保留名额',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  cancelingId.value = ticket.id
  try {
    await request.post(`/activity/cancel?activityId=${ticket.id}`)
    ElMessage.success('已取消活动报名，名额已释放')
    await loadTickets()
    emit('changed')
  } finally {
    cancelingId.value = null
  }
}

defineExpose({
  openQrZoom,
  loadTickets
})
</script>

<style scoped>
.panel-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--cal-hairline-soft);
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-bottom: 4px;
}

.panel-sub {
  font-size: 13px;
  color: var(--cal-muted);
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.tickets-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ticket-pass-card {
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  border-radius: 16px;
  display: flex;
  align-items: stretch;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.ticket-pass-card:hover {
  border-color: var(--cal-ink);
  box-shadow: var(--shadow-sm);
}

.pass-info-section {
  flex: 1;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.pass-meta-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.pass-title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-bottom: 12px;
  cursor: pointer;
}

.pass-title:hover {
  color: #2563eb;
}

.pass-detail-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.detail-row {
  font-size: 13px;
  display: flex;
  align-items: baseline;
}

.row-label {
  color: var(--cal-muted);
  width: 90px;
  flex-shrink: 0;
}

.row-val {
  color: var(--cal-ink);
  font-weight: 500;
}

.time-val {
  font-family: var(--font-code);
  font-weight: 600;
}

.pass-footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px dashed var(--cal-hairline);
  flex-wrap: wrap;
}

.ticket-notch-divider {
  width: 1px;
  position: relative;
  border-left: 2px dashed #cbd5e1;
  margin: 10px 0;
}

.notch-circle {
  position: absolute;
  width: 18px;
  height: 18px;
  background-color: var(--cal-canvas);
  border-radius: 50%;
  border: 1px solid var(--cal-hairline);
  left: -10px;
}

.notch-top { top: -19px; }
.notch-bottom { bottom: -19px; }

.pass-qr-section {
  width: 210px;
  padding: 18px;
  background: var(--cal-canvas);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  flex-shrink: 0;
}

.qr-card-box {
  width: 108px;
  height: 108px;
  padding: 5px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid var(--cal-hairline);
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.verify-code-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.code-title {
  font-size: 10px;
  color: var(--cal-muted);
}

.code-number {
  font-family: var(--font-code);
  font-size: 20px;
  font-weight: 800;
  color: #10b981;
  letter-spacing: 2px;
}

.qr-zoom-pill {
  font-size: 11px;
  color: var(--cal-muted);
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  padding: 2px 8px;
  border-radius: 999px;
}

.zoom-modal-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.zoom-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-top: 4px;
}

.zoom-meta {
  font-size: 13px;
  color: var(--cal-muted);
}

.zoom-qr-box {
  margin: 12px 0;
  padding: 16px;
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.zoom-qr-img {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  background: #fff;
  padding: 8px;
  border: 1px solid var(--cal-hairline);
}

.zoom-code-number {
  font-size: 14px;
  color: var(--cal-body);
}

.zoom-code-number strong {
  font-family: var(--font-code);
  font-size: 22px;
  color: #10b981;
  letter-spacing: 2px;
}

.zoom-hint {
  font-size: 12px;
  color: var(--cal-muted);
}

@media (max-width: 768px) {
  .panel-header-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  .ticket-pass-card {
    flex-direction: column;
  }
  .ticket-notch-divider {
    display: none;
  }
  .pass-qr-section {
    width: 100%;
    border-top: 1px dashed var(--cal-hairline);
  }
}
</style>
