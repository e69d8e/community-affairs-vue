<template>
  <div class="order-list-view">
    <div class="page-header">
      <div>
        <div class="header-breadcrumbs">
          <router-link :to="isFromProfile ? '/user/profile' : '/'" class="crumb-link">
            <el-icon :size="12" class="crumb-icon"><ArrowLeft /></el-icon>
            {{ isFromProfile ? '居民个人中心' : '社区首页' }}
          </router-link>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">我的报修与诉求工单</span>
        </div>
        <h1 class="cal-display-sm">我的报修与诉求工单</h1>
        <p class="page-sub">实时追溯每一笔工单的初审、派单、施工及完工全流程节点</p>
      </div>
      <div class="header-actions">
        <el-button
          v-if="isFromProfile"
          :icon="ArrowLeft"
          class="cal-back-btn"
          @click="goBackToProfile"
        >
          返回个人中心
        </el-button>
        <el-button type="primary" size="large" :icon="Plus" class="cal-primary-btn" @click="goToSubmit(1)">
          新建报修/投诉
        </el-button>
      </div>
    </div>

    <!-- 双通道快捷发起条 (直观分流：设施报修 vs 投诉建议) -->
    <div class="quick-launch-bar">
      <button type="button" class="launch-card repair-launch" @click="goToSubmit(1)">
        <span class="launch-icon" aria-hidden="true">🛠️</span>
        <span class="launch-info">
          <span class="launch-title-row">
            <span class="launch-heading">申报房屋与公共设施报修</span>
            <span class="cal-badge cal-badge-emerald">极速派工</span>
          </span>
          <span class="launch-desc">水电管网渗漏、电梯异响、门禁失灵、楼道照明损坏等故障一键申报</span>
        </span>
        <span class="launch-cta" aria-hidden="true">立即报修 →</span>
      </button>

      <button type="button" class="launch-card complaint-launch" @click="goToSubmit(2)">
        <span class="launch-icon" aria-hidden="true">📝</span>
        <span class="launch-info">
          <span class="launch-title-row">
            <span class="launch-heading">提报邻里投诉与物业建议</span>
            <span class="cal-badge cal-badge-orange">直达网格</span>
          </span>
          <span class="launch-desc">违规停车占道、飞线充电隐患、深夜噪音扰民及物业服务意见反馈</span>
        </span>
        <span class="launch-cta" aria-hidden="true">提报诉求 →</span>
      </button>
    </div>

    <!-- 状态筛选标签 (Cal Tabs) -->
    <el-tabs v-model="activeTab" class="order-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="全部记录" name="all" />
      <el-tab-pane label="待初审" name="1" />
      <el-tab-pane label="处置施工中" name="processing" />
      <el-tab-pane label="完工待评价" name="5" />
      <el-tab-pane label="已评价结单" name="6" />
    </el-tabs>

    <div v-loading="loading" class="order-cards-container">
      <div v-if="orders.length === 0" class="empty-wrap">
        <el-empty description="暂无相关工单记录">
          <el-button type="primary" @click="goToSubmit(1)">去提报工单</el-button>
        </el-empty>
      </div>

      <div
        v-for="order in orders"
        :key="order.id"
        class="order-card cal-mockup-card"
        @click="goToDetail(order.id)"
      >
        <div class="card-header-line">
          <div class="order-no-tag">
            <button
              type="button"
              class="no-text clickable-order-no"
              :aria-label="`复制工单号 ${order.orderNo}`"
              @click.stop="copyOrderNo(order.orderNo)"
            >
              #{{ order.orderNo }}
              <el-icon :size="12" class="copy-icon" aria-hidden="true"><CopyDocument /></el-icon>
            </button>
            <span v-if="order.isUrgent === 1" class="cal-badge cal-badge-pink">加急</span>
            <span class="cal-badge cal-badge-gray">
              {{ order.orderType === 1 ? '设施报修' : '投诉建议' }}
            </span>
          </div>
          <span class="cal-badge" :class="getStatusBadgeClass(order.status)">
            {{ getStatusText(order.status) }}
          </span>
        </div>

        <h2 class="order-card-title">
          <router-link :to="`/orders/${order.id}`" class="order-title-link" @click.stop>
            {{ order.title }}
          </router-link>
        </h2>
        <p class="order-card-desc">{{ order.content }}</p>

        <div class="card-footer-line">
          <div class="order-info-meta">
            <span>分类：{{ order.category }}</span>
            <span v-if="order.houseAddress">房屋：{{ order.houseAddress }}</span>
            <span>提报时间：{{ order.createTime }}</span>
          </div>

          <div class="action-btn">
            <el-button
              v-if="order.status === 5"
              size="small"
              class="rate-btn"
              @click.stop="openQuickRate(order)"
            >
              ★ 立即评价验收
            </el-button>
            <el-button
              size="small"
              plain
              style="border-radius: 6px; padding: 4px 10px"
              @click.stop="openQuickTimeline(order)"
            >
              速览轨迹
            </el-button>
            <span class="detail-link">
              详情页 →
            </span>
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
        @current-change="loadOrders"
      />
    </div>

    <!-- 页内工单进度时间轴抽屉 (免离开列表页) -->
    <el-drawer v-model="showTimelineDrawer" title="工单处置进度与轨迹速览" size="480px" append-to-body destroy-on-close>
      <div v-if="drawerOrder" v-loading="loadingDrawer" style="display: flex; flex-direction: column; gap: 16px">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
            <span style="font-size: 12px; color: #64748b">#{{ drawerOrder.orderNo }}</span>
            <span class="cal-badge" :class="getStatusBadgeClass(drawerOrder.status)">
              {{ getStatusText(drawerOrder.status) }}
            </span>
          </div>
          <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 6px">{{ drawerOrder.title }}</h3>
          <p style="font-size: 13px; color: #475569; margin: 0">{{ drawerOrder.content }}</p>
        </div>

        <div>
          <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px">全生命周期流转轨迹</h3>
          <el-timeline v-if="drawerOrder.logs && drawerOrder.logs.length > 0">
            <el-timeline-item
              v-for="log in drawerOrder.logs"
              :key="log.id"
              :timestamp="log.createTime"
              placement="top"
              type="primary"
            >
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px">
                <div style="font-size: 13px; font-weight: 600; color: #0f172a">
                  {{ log.operatorName }}
                  <span style="font-size: 11px; color: #64748b; font-weight: 400; margin-left: 6px">({{ log.operatorRole }})</span>
                </div>
                <div style="font-size: 12px; color: #475569; margin-top: 4px">{{ log.remark }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="工单已受理，等待产生更多流转节点" :image-size="56" />
        </div>

        <div style="margin-top: 12px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between">
          <el-button
            v-if="drawerOrder.status === 5"
            type="warning"
            @click="showTimelineDrawer = false; openQuickRate(drawerOrder)"
          >
            ★ 立即评价验收
          </el-button>
          <span v-else></span>
          <el-button type="primary" class="cal-primary-btn" @click="showTimelineDrawer = false; goToDetail(drawerOrder.id)">
            查看完整详情页 →
          </el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 列表页就地快捷评价弹窗 -->
    <el-dialog v-model="showRateDialog" title="工单完工验收与满意度评价" width="460px" append-to-body destroy-on-close>
      <div v-if="ratingOrder" class="quick-rate-body">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 14px">
          <div style="font-size: 12px; color: #64748b">#{{ ratingOrder.orderNo }}</div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px">{{ ratingOrder.title }}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px">
          <span style="font-size: 14px; font-weight: 600">满意度星级：</span>
          <el-rate v-model="rateStar" size="large" show-text />
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px">
          <el-button
            v-for="tag in ['维修师傅响应迅速，手艺专业！', '问题已彻底解决，非常满意！', '网格员跟进及时，服务贴心！']"
            :key="tag"
            size="small"
            round
            style="height: 24px; font-size: 11px; padding: 0 8px"
            @click="rateContent = tag"
          >
            {{ tag }}
          </el-button>
        </div>
        <el-input
          v-model="rateContent"
          type="textarea"
          :rows="3"
          placeholder="请输入您对本次处置时效与服务态度的评价（选填，默认好评）..."
        />
      </div>
      <template #footer>
        <el-button @click="showRateDialog = false">取消</el-button>
        <el-button type="primary" :loading="submittingRate" class="cal-primary-btn" @click="submitQuickRate">
          提交评价并结单
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, CopyDocument, ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import type { WorkOrder } from '@/types'

const route = useRoute()
const router = useRouter()

const isFromProfile = computed(() => {
  return (
    route.query.from === 'profile' ||
    (typeof window !== 'undefined' && window.history.state?.back?.includes('/user/profile'))
  )
})

function goBackToProfile() {
  router.push('/user/profile?tab=orders')
}

function goToSubmit(type = 1) {
  router.push({
    path: '/orders/submit',
    query: isFromProfile.value ? { type, from: 'profile' } : { type }
  })
}

function goToDetail(orderId: string | number) {
  router.push({
    path: `/orders/${orderId}`,
    query: isFromProfile.value ? { from: 'profile' } : {}
  })
}

const activeTab = ref('all')
const orders = ref<WorkOrder[]>([])
const loading = ref(false)
const page = ref(1)
const size = ref(10)
const total = ref(0)

// 页内轨迹速览抽屉
const showTimelineDrawer = ref(false)
const drawerOrder = ref<WorkOrder | null>(null)
const loadingDrawer = ref(false)

async function openQuickTimeline(order: WorkOrder) {
  drawerOrder.value = order
  showTimelineDrawer.value = true
  loadingDrawer.value = true
  try {
    const detail: any = await request.get(`/order/detail/${order.id}`)
    if (detail) drawerOrder.value = detail
  } catch (e) {
  } finally {
    loadingDrawer.value = false
  }
}

// 就地评价
const showRateDialog = ref(false)
const ratingOrder = ref<WorkOrder | null>(null)
const rateStar = ref(5)
const rateContent = ref('')
const submittingRate = ref(false)

function openQuickRate(order: WorkOrder) {
  ratingOrder.value = order
  rateStar.value = 5
  rateContent.value = ''
  showRateDialog.value = true
}

async function submitQuickRate() {
  if (!ratingOrder.value) return
  submittingRate.value = true
  try {
    await request.post('/order/evaluate', {
      orderId: ratingOrder.value.id,
      ratingStar: rateStar.value,
      ratingContent: rateContent.value.trim() || '处理及时，非常满意！'
    })
    ElMessage.success('评价成功，工单已结单！')
    showRateDialog.value = false
    await loadOrders()
  } finally {
    submittingRate.value = false
  }
}

function copyOrderNo(no?: string) {
  if (!no) return
  if (navigator.clipboard) {
    navigator.clipboard.writeText(no).then(() => {
      ElMessage.success(`已复制工单号 #${no}`)
    })
  } else {
    ElMessage.info(`工单号: #${no}`)
  }
}

onMounted(() => {
  loadOrders()
})

async function loadOrders() {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      size: size.value
    }
    if (activeTab.value === '1') params.status = 1
    else if (activeTab.value === 'processing') params.status = 4
    else if (activeTab.value === '5') params.status = 5
    else if (activeTab.value === '6') params.status = 6

    const res: any = await request.get('/order/my-list', { params })
    orders.value = res.records || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function handleTabChange() {
  page.value = 1
  loadOrders()
}

function getStatusText(status: number) {
  switch (status) {
    case 1: return '待初审'
    case 2: return '已驳回'
    case 3: return '已派单'
    case 4: return '施工处理中'
    case 5: return '待评价'
    case 6: return '已结单'
    default: return '未知'
  }
}

function getStatusBadgeClass(status: number) {
  switch (status) {
    case 1: return 'cal-badge-gray'
    case 2: return 'cal-badge-pink'
    case 3: return 'cal-badge-violet'
    case 4: return 'cal-badge-orange'
    case 5: return 'cal-badge-emerald'
    case 6: return 'cal-badge-gray'
    default: return 'cal-badge-gray'
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
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
.crumb-icon {
  margin-right: 2px;
}
.crumb-sep {
  color: var(--cal-hairline);
}
.crumb-current {
  color: var(--cal-body);
  font-weight: 500;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cal-back-btn {
  font-weight: 500;
  border-color: var(--cal-hairline);
  color: var(--cal-body);
  transition: all 0.15s ease;
}
.cal-back-btn:hover {
  color: var(--cal-ink);
  border-color: var(--cal-ink);
  background-color: var(--cal-surface-soft);
}
.page-sub {
  font-size: 14px;
  color: var(--cal-muted);
  margin-top: 4px;
}
.order-tabs {
  margin-bottom: 20px;
}
.quick-launch-bar {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.launch-card {
  width: 100%;
  font: inherit;
  text-align: left;
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}
.launch-card:hover {
  border-color: var(--cal-ink);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}
.launch-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--cal-surface-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.launch-info {
  flex: 1;
  min-width: 0;
}
.launch-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.launch-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.launch-title-row h4,
.launch-heading {
  font-size: 15px;
  font-weight: 700;
  color: var(--cal-ink);
}
.launch-info p,
.launch-desc {
  font-size: 12px;
  color: var(--cal-muted);
  line-height: 1.4;
}
.launch-cta {
  font-size: 13px;
  font-weight: 600;
  color: var(--cal-ink);
  white-space: nowrap;
}
@media (max-width: 768px) {
  .quick-launch-bar {
    grid-template-columns: 1fr;
  }
}
.order-cards-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.order-card {
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.order-card:hover {
  border-color: var(--cal-ink);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}
.card-header-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.order-no-tag {
  display: flex;
  align-items: center;
  gap: 8px;
}
.no-text {
  font-family: var(--font-code);
  font-weight: 600;
  font-size: 13px;
  color: var(--cal-muted);
}
.clickable-order-no {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  padding: 2px 4px;
  margin: -2px -4px;
  border-radius: 4px;
  font: inherit;
  color: inherit;
  cursor: pointer;
  min-height: 24px;
}
.clickable-order-no:hover,
.clickable-order-no:focus-visible {
  color: var(--cal-ink);
  background: var(--cal-surface-soft);
}
.order-card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cal-ink);
  margin-bottom: 8px;
}
.order-title-link {
  color: inherit;
  text-decoration: none;
}
.order-title-link:hover,
.order-title-link:focus-visible {
  color: var(--cal-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.order-card-desc {
  font-size: 14px;
  color: var(--cal-muted);
  line-height: 1.6;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-footer-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid var(--cal-hairline-soft);
}
.order-info-meta {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--cal-muted-soft);
}
.detail-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--cal-ink);
}
.rate-btn {
  font-size: 12px;
  font-weight: 600;
  margin-right: 12px;
  background-color: #ecfdf5;
  color: #059669;
  border-color: #d1fae5;
}
.pagination-wrap {
  margin-top: 28px;
  display: flex;
  justify-content: center;
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
    display: flex;
    gap: 8px;
  }
  .header-actions .el-button {
    flex: 1;
  }
  .order-card {
    padding: 16px;
  }
  .card-footer-line {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .order-info-meta {
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
  .action-btn {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
