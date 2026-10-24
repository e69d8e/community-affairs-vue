<template>
  <div class="user-records-view">
    <!-- 页面顶部标题区 -->
    <div class="page-header">
      <div>
        <div class="header-breadcrumbs">
          <router-link :to="isFromProfile ? '/user/profile' : '/'" class="crumb-link">
            <el-icon :size="12" class="crumb-icon"><ArrowLeft /></el-icon>
            {{ isFromProfile ? '居民个人中心' : '社区首页' }}
          </router-link>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">我的凭证与发布</span>
        </div>
        <h1 class="cal-display-sm">我的活动凭证与邻里发布</h1>
        <p class="page-sub">集中出示社区文体活动动态核销凭证，实时管理个人发布的二手转让、互助借用与求助信息</p>
      </div>

      <div class="header-actions">
        <el-button
          v-if="isFromProfile"
          :icon="ArrowLeft"
          class="cal-back-btn"
          @click="$router.push('/user/profile')"
        >
          返回个人中心
        </el-button>
        <el-button :icon="Calendar" @click="$router.push('/activities')">
          浏览社区活动
        </el-button>
        <el-button type="primary" :icon="Plus" class="cal-primary-btn" @click="$router.push('/market')">
          去集市发布
        </el-button>
      </div>
    </div>

    <!-- 顶层 Tab 导航 (Cal.com Tabs) -->
    <div class="records-tabs-card cal-mockup-card">
      <el-tabs v-model="activeTab" class="records-tabs" @tab-change="handleTabChange">
        <!-- Tab 1: 我的活动入场凭证 -->
        <el-tab-pane name="tickets">
          <template #label>
            <span class="tab-label-custom">
              <el-icon><Ticket /></el-icon>
              <span>我的活动入场凭证</span>
              <span v-if="tickets.length > 0" class="tab-badge-num">{{ tickets.length }}</span>
            </span>
          </template>

          <!-- 凭证状态筛选工具栏 -->
          <div class="tab-toolbar">
            <div class="toolbar-left">
              <el-radio-group v-model="ticketFilter" size="default">
                <el-radio-button value="all">全部凭证 ({{ tickets.length }})</el-radio-button>
                <el-radio-button value="pending">待核销 ({{ pendingTicketsCount }})</el-radio-button>
                <el-radio-button value="verified">已核销 ({{ verifiedTicketsCount }})</el-radio-button>
              </el-radio-group>
            </div>
            <div class="toolbar-right">
              <el-button :icon="Refresh" plain size="small" :loading="loadingTickets" @click="loadTickets">
                刷新凭证
              </el-button>
            </div>
          </div>

          <!-- 凭证列表区域 -->
          <div v-loading="loadingTickets" class="tickets-grid">
            <div v-if="filteredTickets.length === 0" class="empty-block">
              <el-empty description="当前暂无相关活动入场凭证">
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
              <!-- 凭证左侧/上方：活动详情 -->
              <div class="pass-info-section">
                <div class="pass-meta-top">
                  <span class="cal-badge cal-badge-gray category-tag">
                    {{ ticket.category || '邻里文体' }}
                  </span>
                  <span
                    class="cal-badge"
                    :class="isTicketVerified(ticket) ? 'cal-badge-emerald' : 'cal-badge-orange'"
                  >
                    {{ isTicketVerified(ticket) ? '✓ 已现场核销签到' : '● 待出示核销' }}
                  </span>
                </div>

                <h3 class="pass-title" @click="$router.push(`/activities/${ticket.id}?from=records`)">
                  {{ getTicketTitle(ticket) }}
                </h3>

                <div class="pass-detail-list">
                  <div class="detail-row">
                    <span class="row-icon">⏰</span>
                    <span class="row-label">活动时间：</span>
                    <span class="row-val time-val">{{ getTicketTime(ticket) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="row-icon">📍</span>
                    <span class="row-label">集合地点：</span>
                    <span class="row-val">{{ ticket.location || '社区邻里活动中心' }}</span>
                  </div>
                  <div v-if="ticket.organizer" class="detail-row">
                    <span class="row-icon">🏛️</span>
                    <span class="row-label">主办单位：</span>
                    <span class="row-val">{{ ticket.organizer }}</span>
                  </div>
                </div>

                <div class="pass-footer-actions">
                  <el-button
                    type="primary"
                    round
                    size="small"
                    class="detail-link"
                    @click="$router.push(`/activities/${ticket.id}?from=records`)"
                  >
                    查看活动详情与名册 →
                  </el-button>
                </div>
              </div>

              <!-- 虚线打孔分割装饰线 (Ticket Notch Divider) -->
              <div class="ticket-notch-divider">
                <span class="notch-circle notch-top" />
                <span class="notch-dash" />
                <span class="notch-circle notch-bottom" />
              </div>

              <!-- 凭证右侧：核销动态码与二维码 -->
              <div class="pass-qr-section">
                <div class="qr-click-area" @click="openQrZoom(ticket)" title="点击放大核销二维码">
                  <div class="qr-card-box">
                    <img
                      :src="getQrCodeUrl(ticket)"
                      class="qr-image"
                      alt="活动核销二维码"
                    />
                  </div>
                  <span class="qr-zoom-pill">🔍 点击放大二维码</span>
                </div>

                <div class="verify-code-box">
                  <span class="code-title">动态核销码</span>
                  <span class="code-number">{{ getVerifyCode(ticket) }}</span>
                </div>

                <p class="pass-notice-text">
                  入场请出示此动态二维码或核销码供现场工作人员扫码
                </p>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 2: 我发布的闲置与互助 -->
        <el-tab-pane name="market">
          <template #label>
            <span class="tab-label-custom">
              <el-icon><Goods /></el-icon>
              <span>我发布的闲置与互助</span>
              <span v-if="myPosts.length > 0" class="tab-badge-num">{{ myPosts.length }}</span>
            </span>
          </template>

          <!-- 闲置管理筛选工具栏 -->
          <div class="tab-toolbar">
            <div class="toolbar-left">
              <el-radio-group v-model="marketStatusFilter" size="default">
                <el-radio-button :value="0">全部状态 ({{ myPosts.length }})</el-radio-button>
                <el-radio-button :value="1">展示中</el-radio-button>
                <el-radio-button :value="2">流转沟通中</el-radio-button>
                <el-radio-button :value="3">已达成结题</el-radio-button>
              </el-radio-group>
            </div>
            <div class="toolbar-right">
              <el-button type="primary" :icon="Plus" class="cal-primary-btn" @click="$router.push('/market')">
                发布新物品 / 求助
              </el-button>
            </div>
          </div>

          <!-- 闲置卡片网格 -->
          <div v-loading="loadingMarket" class="market-posts-grid">
            <div v-if="filteredMarketPosts.length === 0" class="empty-block">
              <el-empty description="当前暂无符合条件的闲置或互助发布记录">
                <el-button type="primary" class="cal-primary-btn" @click="$router.push('/market')">
                  去发布第一条闲置
                </el-button>
              </el-empty>
            </div>

            <div
              v-for="post in filteredMarketPosts"
              :key="post.id"
              class="my-post-card card-hover"
              @click="$router.push(`/market/${post.id}?from=records`)"
            >
              <div class="post-card-thumb">
                <img :src="getFirstImage(post.images)" class="thumb-img" />
                <span :class="['type-badge', `type-${post.postType}`]">
                  {{ getPostTypeName(post.postType) }}
                </span>
                <span class="status-overlay" :class="getPostStatusClass(post.status)">
                  {{ getPostStatusName(post.status) }}
                </span>
              </div>

              <div class="post-card-body">
                <div class="price-line">
                  <span class="price-symbol">¥</span>
                  <span class="price-num">{{ post.price > 0 ? post.price : '免费赠送' }}</span>
                  <span class="trade-type-pill">{{ getTradeTypeText(post.tradeType) }}</span>
                </div>

                <h4 class="post-title">{{ post.title }}</h4>
                <p class="post-desc">{{ post.description }}</p>

                <div v-if="post.tradeAddress" class="post-address">
                  <span>📍 约定地点：{{ post.tradeAddress }}</span>
                </div>

                <div class="post-footer">
                  <span class="post-time">发布于 {{ post.createTime }}</span>
                  <div class="post-stats">
                    <span title="浏览数">👀 {{ post.viewCount }}</span>
                    <span title="点赞数">❤️ {{ post.likeCount }}</span>
                    <span title="留言数">💬 {{ post.commentCount }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 二维码高清放大弹窗 (便于手机出示与现场扫码) -->
    <el-dialog v-model="showZoomModal" title="活动入场核销二维码" width="420px" center>
      <div v-if="selectedTicket" class="zoom-modal-content">
        <h3 class="zoom-title">{{ getTicketTitle(selectedTicket) }}</h3>
        <p class="zoom-time">⏰ {{ getTicketTime(selectedTicket) }}</p>
        <p class="zoom-loc">📍 {{ selectedTicket.location }}</p>

        <div class="zoom-qr-box">
          <img :src="getQrCodeUrl(selectedTicket)" class="zoom-qr-img" />
          <div class="zoom-code-number">
            <span>6位核销码：</span>
            <strong>{{ getVerifyCode(selectedTicket) }}</strong>
          </div>
        </div>

        <p class="zoom-hint">现场请主动向工作人员出示此二维码完成实名核销签到</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="showZoomModal = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Plus, Refresh, Calendar, Ticket, Goods, ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { localQrDataUrl } from '@/utils/qrcode'
import type { MarketPost } from '@/types'

const router = useRouter()
const route = useRoute()

const isFromProfile = computed(() => {
  return (
    route.query.from === 'profile' ||
    (typeof window !== 'undefined' && window.history.state?.back?.includes('/user/profile'))
  )
})

// 活动 Tab: 'tickets' (默认) | 'market'
const activeTab = ref((route.query.tab as string) === 'market' ? 'market' : 'tickets')

watch(() => route.query.tab, (t) => {
  if (t === 'market' || t === 'tickets') {
    activeTab.value = t
  }
})

function handleTabChange(tab: any) {
  router.replace({ query: { ...route.query, tab } })
}

// ----------------- 活动凭证模块 -----------------
const loadingTickets = ref(false)
const tickets = ref<any[]>([])
const ticketFilter = ref('all') // 'all' | 'pending' | 'verified'

const showZoomModal = ref(false)
const selectedTicket = ref<any>(null)

const pendingTicketsCount = computed(() => {
  return tickets.value.filter(t => !isTicketVerified(t)).length
})

const verifiedTicketsCount = computed(() => {
  return tickets.value.filter(t => isTicketVerified(t)).length
})

const filteredTickets = computed(() => {
  if (ticketFilter.value === 'pending') {
    return tickets.value.filter(t => !isTicketVerified(t))
  }
  if (ticketFilter.value === 'verified') {
    return tickets.value.filter(t => isTicketVerified(t))
  }
  return tickets.value
})

async function loadTickets() {
  loadingTickets.value = true
  try {
    const res: any = await request.get('/activity/my-signups')
    tickets.value = res || []
  } finally {
    loadingTickets.value = false
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

// ----------------- 我发布的闲置模块 -----------------
const loadingMarket = ref(false)
const myPosts = ref<MarketPost[]>([])
const marketStatusFilter = ref(0) // 0 全部，1 展示中，2 流转中，3 已结题

const filteredMarketPosts = computed(() => {
  if (marketStatusFilter.value > 0) {
    return myPosts.value.filter(p => p.status === marketStatusFilter.value)
  }
  return myPosts.value
})

async function loadMarketPosts() {
  loadingMarket.value = true
  try {
    const res: any = await request.get('/market/my-posts', { params: { size: 50 } })
    myPosts.value = res.records || []
  } finally {
    loadingMarket.value = false
  }
}

function getFirstImage(imagesJson?: string): string {
  if (!imagesJson) return 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600'
  try {
    const arr = JSON.parse(imagesJson)
    if (Array.isArray(arr) && arr.length > 0) {
      return arr[0]
    }
  } catch (e) {}
  return 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600'
}

function getPostTypeName(type: number): string {
  switch (type) {
    case 1: return '二手转让'
    case 2: return '邻里求助'
    case 3: return '物品借用'
    case 4: return '绿色拼车'
    case 5: return '技能互换'
    default: return '邻里互助'
  }
}

function getPostStatusName(status: number): string {
  switch (status) {
    case 1: return '展示中'
    case 2: return '流转沟通中'
    case 3: return '已达成结题'
    default: return '已下架'
  }
}

function getPostStatusClass(status: number): string {
  switch (status) {
    case 1: return 'status-online'
    case 2: return 'status-pending'
    case 3: return 'status-finished'
    default: return 'status-offline'
  }
}

function getTradeTypeText(tradeType: number): string {
  switch (tradeType) {
    case 1: return '一口价'
    case 2: return '可面议'
    case 3: return '免费赠送'
    case 4: return '互换交换'
    default: return '协商约定'
  }
}

// ----------------- 初始化 -----------------
onMounted(() => {
  loadTickets()
  loadMarketPosts()
})
</script>

<style scoped>
.user-records-view {
  max-width: 1140px;
  margin: 0 auto;
}

/* 页面头部 */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 6px;
}

.crumb-link {
  color: var(--cal-muted);
  text-decoration: none;
  transition: color 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.crumb-link:hover {
  color: var(--cal-ink);
}

.crumb-sep {
  color: var(--cal-hairline);
}

.crumb-current {
  color: var(--cal-ink);
  font-weight: 500;
}

.page-sub {
  font-size: 14px;
  color: var(--cal-muted);
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 标签页主体 */
.records-tabs-card {
  background: var(--cal-canvas);
  border-radius: var(--radius-lg, 16px);
  border: 1px solid var(--cal-hairline);
  padding: 24px;
}

.tab-label-custom {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-badge-num {
  font-size: 11px;
  background: var(--cal-surface-soft);
  color: var(--cal-ink);
  border: 1px solid var(--cal-hairline);
  padding: 1px 7px;
  border-radius: var(--radius-pill);
}

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--cal-hairline-soft);
}

/* 凭证网格 */
.tickets-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 现代卡券卡片设计 (Ticket Notch Card) */
.ticket-pass-card {
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-lg, 16px);
  display: flex;
  align-items: stretch;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.ticket-pass-card:hover {
  border-color: var(--cal-ink);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.pass-info-section {
  flex: 1;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.pass-meta-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.pass-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-bottom: 14px;
  cursor: pointer;
  line-height: 1.35;
}
.pass-title:hover {
  color: #2563eb;
}

.pass-detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  align-items: baseline;
  font-size: 13px;
  color: var(--cal-body);
}

.row-icon {
  margin-right: 6px;
  font-size: 14px;
}

.row-label {
  color: var(--cal-muted);
  width: 72px;
  flex-shrink: 0;
}

.row-val {
  color: var(--cal-ink);
  font-weight: 500;
}

.row-val.time-val {
  font-family: var(--font-code);
  font-weight: 600;
  color: #0f172a;
}

.pass-footer-actions {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px dashed #e2e8f0;
}

.detail-link {
  font-size: 13px;
  font-weight: 600;
  padding: 6px 16px !important;
  height: auto;
  line-height: 1.4;
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-pill) !important;
}

/* 虚线打孔切割装饰 */
.ticket-notch-divider {
  width: 1px;
  position: relative;
  border-left: 2px dashed #cbd5e1;
  margin: 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notch-circle {
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: var(--cal-canvas);
  border-radius: 50%;
  border: 1px solid var(--cal-hairline);
  z-index: 2;
}

.notch-top {
  top: -20px;
  left: -11px;
}

.notch-bottom {
  bottom: -20px;
  left: -11px;
}

/* 凭证右侧二维码核销区 */
.pass-qr-section {
  width: 250px;
  padding: 24px;
  background: var(--cal-canvas);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-left: 1px solid var(--cal-hairline-soft);
  gap: 12px;
}

.qr-click-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.qr-click-area:hover {
  transform: scale(1.03);
}

.qr-card-box {
  width: 124px;
  height: 124px;
  padding: 6px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid var(--cal-hairline);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.qr-zoom-pill {
  font-size: 11px;
  color: var(--cal-muted);
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  transition: all 0.15s ease;
}
.qr-click-area:hover .qr-zoom-pill {
  color: var(--cal-ink);
  border-color: var(--cal-ink);
  background: var(--cal-canvas);
}

.verify-code-box {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.code-title {
  font-size: 11px;
  color: var(--cal-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.code-number {
  font-family: var(--font-code);
  font-size: 24px;
  font-weight: 800;
  color: #10b981;
  letter-spacing: 3px;
  line-height: 1.2;
}

.pass-notice-text {
  font-size: 11px;
  color: var(--cal-muted);
  line-height: 1.4;
  margin: 0;
}

/* 我发布的闲置网格 */
.market-posts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.my-post-card {
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.2s ease;
}

.my-post-card:hover {
  border-color: var(--cal-ink);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.post-card-thumb {
  position: relative;
  width: 100%;
  height: 160px;
  background: #f1f5f9;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.type-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  color: #ffffff;
}
.type-1 { background: #3b82f6; }
.type-2 { background: #ef4444; }
.type-3 { background: #f59e0b; }
.type-4 { background: #10b981; }
.type-5 { background: #8b5cf6; }

.status-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  color: #ffffff;
}
.status-online { background: #10b981; }
.status-pending { background: #f59e0b; }
.status-finished { background: #64748b; }
.status-offline { background: #94a3b8; }

.post-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.price-line {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.price-symbol {
  font-size: 13px;
  font-weight: 700;
  color: #ef4444;
}

.price-num {
  font-size: 18px;
  font-weight: 800;
  color: #ef4444;
}

.trade-type-pill {
  font-size: 11px;
  background: var(--cal-surface-soft);
  color: var(--cal-muted);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: auto;
}

.post-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-desc {
  font-size: 12px;
  color: var(--cal-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}

.post-address {
  font-size: 11px;
  color: var(--cal-muted);
  margin-bottom: 10px;
}

.post-footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--cal-hairline-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.post-time {
  font-size: 11px;
  color: var(--cal-muted-soft);
}

.post-stats {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--cal-muted);
}

/* 放大二维码弹窗 */
.zoom-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.zoom-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-bottom: 6px;
}

.zoom-time, .zoom-loc {
  font-size: 13px;
  color: var(--cal-muted);
  margin-bottom: 4px;
}

.zoom-qr-box {
  margin: 16px 0;
  padding: 16px;
  background: #ffffff;
  border: 1px solid var(--cal-hairline);
  border-radius: 12px;
  text-align: center;
}

.zoom-qr-img {
  width: 200px;
  height: 200px;
  object-fit: contain;
}

.zoom-code-number {
  margin-top: 12px;
  font-size: 14px;
  color: var(--cal-muted);
}

.zoom-code-number strong {
  font-family: var(--font-code);
  font-size: 24px;
  color: #10b981;
  letter-spacing: 3px;
  margin-left: 4px;
}

.zoom-hint {
  font-size: 12px;
  color: var(--cal-muted);
}

.empty-block {
  padding: 48px 0;
  width: 100%;
}

@media (max-width: 900px) {
  .ticket-pass-card {
    flex-direction: column;
  }
  .ticket-notch-divider {
    display: none;
  }
  .pass-qr-section {
    width: 100%;
    border-left: none;
    border-top: 1px dashed #cbd5e1;
  }
  .market-posts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
