<template>
  <div class="profile-orders-panel">
    <!-- 顶部工具栏：快捷发起 + 状态筛选 -->
    <div class="panel-header-bar">
      <div>
        <h3 class="panel-title">我的报修与诉求工单</h3>
        <p class="panel-sub">实时追踪每一笔物业报修与网格诉求进度，完工后可直接在此评星验收</p>
      </div>
      <div class="quick-create-group">
        <el-button
          type="primary"
          :icon="Tools"
          class="cal-primary-btn"
          @click="$router.push('/orders/submit?type=1&from=profile')"
        >
          申报设施报修
        </el-button>
        <el-button
          :icon="EditPen"
          @click="$router.push('/orders/submit?type=2&from=profile')"
        >
          提报投诉建议
        </el-button>
      </div>
    </div>

    <!-- 状态分段筛选 -->
    <div class="filter-bar">
      <el-radio-group v-model="activeStatus" size="default" @change="handleFilterChange">
        <el-radio-button value="all">全部工单 ({{ total }})</el-radio-button>
        <el-radio-button value="1">待初审</el-radio-button>
        <el-radio-button value="processing">处置施工中</el-radio-button>
        <el-radio-button value="5">完工待评价</el-radio-button>
        <el-radio-button value="6">已评价结单</el-radio-button>
      </el-radio-group>
      <el-button :icon="Refresh" plain size="small" :loading="loading" @click="loadOrders">
        刷新列表
      </el-button>
    </div>

    <!-- 工单列表 -->
    <div v-loading="loading" class="orders-list">
      <div v-if="orders.length === 0 && !loading" class="empty-state">
        <el-empty description="当前筛选条件下暂无工单记录" :image-size="72">
          <el-button type="primary" class="cal-primary-btn" @click="$router.push('/orders/submit?type=1&from=profile')">
            立即提报新工单
          </el-button>
        </el-empty>
      </div>

      <div
        v-for="order in orders"
        :key="order.id"
        class="order-item-card"
        @click="openOrderDrawer(order)"
      >
        <div class="card-top-row">
          <div class="left-badges">
            <span class="order-no-pill" title="点击复制工单编号" @click.stop="copyOrderNo(order.orderNo)">
              #{{ order.orderNo }}
              <el-icon :size="12"><CopyDocument /></el-icon>
            </span>
            <span v-if="order.isUrgent === 1" class="cal-badge cal-badge-pink">紧急加急</span>
            <span class="cal-badge cal-badge-gray">
              {{ order.orderType === 1 ? '🛠️ 设施报修' : '📝 投诉建议' }}
            </span>
            <span class="category-text">{{ order.category }}</span>
          </div>
          <span class="cal-badge" :class="getStatusBadgeClass(order.status)">
            {{ getStatusText(order.status) }}
          </span>
        </div>

        <h4 class="order-title">{{ order.title }}</h4>
        <p class="order-desc">{{ order.content }}</p>

        <div class="card-bottom-row">
          <div class="meta-info">
            <span v-if="order.houseAddress">📍 {{ order.houseAddress }}</span>
            <span>🕒 {{ order.createTime }}</span>
            <span v-if="order.status === 6 && order.ratingStar" class="rated-pill">
              ★ 已评 {{ order.ratingStar }} 星
            </span>
          </div>

          <div class="card-actions" @click.stop>
            <el-button
              v-if="order.status === 5"
              type="success"
              size="small"
              round
              @click="openRateDialog(order)"
            >
              ★ 立即评价验收
            </el-button>
            <el-button
              size="small"
              round
              @click="openOrderDrawer(order)"
            >
              速览进度轨迹
            </el-button>
            <el-button
              link
              type="primary"
              size="small"
              @click="$router.push(`/orders/${order.id}?from=profile`)"
            >
              完整详情 <el-icon><TopRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="total > size" class="pagination-row">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="size"
        :total="total"
        layout="prev, pager, next, total"
        background
        @current-change="loadOrders"
      />
    </div>

    <!-- 就地快捷评价弹窗 -->
    <el-dialog
      v-model="showRateModal"
      title="工单完工验收与满意度评价"
      width="460px"
      append-to-body
      destroy-on-close
    >
      <div v-if="ratingTargetOrder" class="rate-modal-body">
        <div class="rate-order-summary">
          <span class="summary-no">#{{ ratingTargetOrder.orderNo }}</span>
          <h4 class="summary-title">{{ ratingTargetOrder.title }}</h4>
          <p v-if="ratingTargetOrder.handleResult" class="summary-result">
            <strong>完工反馈：</strong>{{ ratingTargetOrder.handleResult }}
          </p>
        </div>

        <div class="rate-star-row">
          <span class="rate-label">服务满意度评星：</span>
          <el-rate v-model="rateForm.star" size="large" show-text />
        </div>

        <el-input
          v-model="rateForm.content"
          type="textarea"
          :rows="3"
          placeholder="请输入您对维修师傅响应速度与处理结果的评价（选填，默认好评）..."
          maxlength="200"
          show-word-limit
        />
        <p class="rate-credit-tip">✨ 完成评价验收后工单将正式结单，系统将为您奖励社区守信积分</p>
      </div>
      <template #footer>
        <el-button @click="showRateModal = false">稍后再评</el-button>
        <el-button type="primary" :loading="submittingRate" class="cal-primary-btn" @click="submitRating">
          确认提交评价
        </el-button>
      </template>
    </el-dialog>

    <!-- 工单进度轨迹速览抽屉 (免离开个人中心) -->
    <el-drawer
      v-model="showDrawer"
      title="工单处置进度与轨迹速览"
      size="540px"
      append-to-body
      destroy-on-close
    >
      <div v-loading="loadingDetail" class="drawer-order-body">
        <template v-if="drawerOrder">
          <div class="drawer-status-card">
            <div class="drawer-status-top">
              <span class="drawer-no">#{{ drawerOrder.orderNo }}</span>
              <span class="cal-badge" :class="getStatusBadgeClass(drawerOrder.status)">
                {{ getStatusText(drawerOrder.status) }}
              </span>
            </div>
            <h3 class="drawer-title">{{ drawerOrder.title }}</h3>
            <el-steps :active="getStepIndex(drawerOrder.status)" finish-status="success" align-center class="drawer-steps">
              <el-step title="已申报" />
              <el-step title="初审派单" />
              <el-step title="施工中" />
              <el-step title="已完工" />
              <el-step title="已评价" />
            </el-steps>
          </div>

          <!-- 待评价快捷操作卡 -->
          <div v-if="drawerOrder.status === 5" class="drawer-eval-banner">
            <div>
              <strong>工单已施工完工，等待您的验收评价</strong>
              <p>确认现场问题已解决后，即可评星结单</p>
            </div>
            <el-button type="success" size="small" round @click="openRateDialog(drawerOrder)">
              ★ 立即评价
            </el-button>
          </div>

          <div class="drawer-info-section">
            <div class="info-line"><span class="lbl">业务分类：</span><span>{{ drawerOrder.category }}</span></div>
            <div class="info-line"><span class="lbl">关联位置：</span><span>{{ drawerOrder.houseAddress || '公共区域' }}</span></div>
            <div class="info-line"><span class="lbl">提报时间：</span><span>{{ drawerOrder.createTime }}</span></div>
            <div class="info-line"><span class="lbl">详细描述：</span><span>{{ drawerOrder.content }}</span></div>
          </div>

          <div v-if="drawerOrder.handleResult" class="drawer-finish-box">
            <h4>✅ 物业/网格完工结果反馈</h4>
            <p>{{ drawerOrder.handleResult }}</p>
          </div>

          <div class="drawer-timeline-section">
            <h4 class="sec-heading">流转完整追溯时间轴</h4>
            <el-timeline v-if="drawerOrder.logs && drawerOrder.logs.length > 0">
              <el-timeline-item
                v-for="log in drawerOrder.logs"
                :key="log.id"
                :timestamp="log.createTime"
                placement="top"
                type="primary"
              >
                <div class="timeline-log-box">
                  <div class="log-who">
                    <strong>{{ log.operatorName }}</strong>
                    <el-tag size="small" type="info">{{ log.operatorRole }}</el-tag>
                  </div>
                  <p class="log-txt">{{ log.remark }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无流转日志" :image-size="50" />
          </div>

          <div class="drawer-footer-bar">
            <el-button @click="showDrawer = false">关闭面板</el-button>
            <el-button type="primary" plain @click="$router.push(`/orders/${drawerOrder.id}?from=profile`)">
              打开完整工单详情页 →
            </el-button>
          </div>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Tools, EditPen, Refresh, CopyDocument, TopRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import type { WorkOrder } from '@/types'

const emit = defineEmits<{
  (e: 'changed'): void
}>()

const loading = ref(false)
const orders = ref<WorkOrder[]>([])
const activeStatus = ref('all')
const page = ref(1)
const size = ref(8)
const total = ref(0)

// 就地评价弹窗
const showRateModal = ref(false)
const submittingRate = ref(false)
const ratingTargetOrder = ref<WorkOrder | null>(null)
const rateForm = reactive({
  star: 5,
  content: ''
})

// 抽屉详情速览
const showDrawer = ref(false)
const loadingDetail = ref(false)
const drawerOrder = ref<WorkOrder | null>(null)

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
    if (activeStatus.value === '1') params.status = 1
    else if (activeStatus.value === 'processing') params.status = 4
    else if (activeStatus.value === '5') params.status = 5
    else if (activeStatus.value === '6') params.status = 6

    const res: any = await request.get('/order/my-list', { params })
    orders.value = res.records || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
  page.value = 1
  loadOrders()
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

function openRateDialog(order: WorkOrder) {
  ratingTargetOrder.value = order
  rateForm.star = 5
  rateForm.content = ''
  showRateModal.value = true
}

async function submitRating() {
  if (!ratingTargetOrder.value) return
  submittingRate.value = true
  try {
    await request.post('/order/evaluate', {
      orderId: ratingTargetOrder.value.id,
      ratingStar: rateForm.star,
      ratingContent: rateForm.content.trim() || '维修及时，服务态度很好！'
    })
    ElMessage.success('评价验收成功！感谢您的反馈')
    showRateModal.value = false
    await loadOrders()
    if (drawerOrder.value && String(drawerOrder.value.id) === String(ratingTargetOrder.value.id)) {
      await openOrderDrawer(ratingTargetOrder.value)
    }
    emit('changed')
  } finally {
    submittingRate.value = false
  }
}

async function openOrderDrawer(order: WorkOrder) {
  showDrawer.value = true
  loadingDetail.value = true
  try {
    const res: any = await request.get(`/order/detail/${order.id}`)
    drawerOrder.value = res
  } catch (e) {
    drawerOrder.value = order
  } finally {
    loadingDetail.value = false
  }
}

function getStepIndex(status: number) {
  switch (status) {
    case 1: return 1
    case 2: return 1
    case 3: return 2
    case 4: return 3
    case 5: return 4
    case 6: return 5
    default: return 1
  }
}

function getStatusText(status: number) {
  switch (status) {
    case 1: return '待初审'
    case 2: return '已驳回'
    case 3: return '已派单'
    case 4: return '施工处理中'
    case 5: return '完工待评价'
    case 6: return '已评价结单'
    default: return '未知状态'
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

defineExpose({
  openRateDialog,
  openOrderDrawer,
  loadOrders
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

.quick-create-group {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.order-item-card {
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: 12px;
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.order-item-card:hover {
  border-color: var(--cal-ink);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.card-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.left-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.order-no-pill {
  font-family: var(--font-code);
  font-size: 12px;
  font-weight: 600;
  color: var(--cal-body);
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  padding: 2px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.order-no-pill:hover {
  border-color: var(--cal-ink);
  color: var(--cal-ink);
}

.category-text {
  font-size: 12px;
  color: var(--cal-muted);
}

.order-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-bottom: 6px;
}

.order-desc {
  font-size: 13px;
  color: var(--cal-muted);
  line-height: 1.5;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--cal-hairline);
  flex-wrap: wrap;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: var(--cal-muted);
  flex-wrap: wrap;
}

.rated-pill {
  color: #d97706;
  font-weight: 600;
  background: #fef3c7;
  padding: 1px 8px;
  border-radius: 999px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-row {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 评价弹窗 */
.rate-order-summary {
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 16px;
}

.summary-no {
  font-family: var(--font-code);
  font-size: 12px;
  color: var(--cal-muted);
}

.summary-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-top: 2px;
}

.summary-result {
  font-size: 12px;
  color: #059669;
  margin-top: 6px;
}

.rate-star-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.rate-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--cal-ink);
}

.rate-credit-tip {
  font-size: 12px;
  color: #059669;
  margin-top: 10px;
}

/* 抽屉样式 */
.drawer-order-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.drawer-status-card {
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  border-radius: 12px;
  padding: 16px;
}

.drawer-status-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.drawer-no {
  font-family: var(--font-code);
  font-size: 13px;
  color: var(--cal-muted);
}

.drawer-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-bottom: 16px;
}

.drawer-eval-banner {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #065f46;
  font-size: 13px;
}

.drawer-eval-banner p {
  font-size: 12px;
  color: #047857;
  margin-top: 2px;
}

.drawer-info-section {
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.info-line {
  display: flex;
  gap: 8px;
}

.info-line .lbl {
  color: var(--cal-muted);
  width: 72px;
  flex-shrink: 0;
}

.drawer-finish-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 12px 16px;
}

.drawer-finish-box h4 {
  font-size: 13px;
  color: #15803d;
  margin-bottom: 4px;
}

.drawer-finish-box p {
  font-size: 13px;
  color: #166534;
}

.sec-heading {
  font-size: 14px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-bottom: 12px;
}

.timeline-log-box {
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  border-radius: 8px;
  padding: 10px 12px;
}

.log-who {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 13px;
}

.log-txt {
  font-size: 12px;
  color: var(--cal-body);
}

.drawer-footer-bar {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--cal-hairline);
}

@media (max-width: 768px) {
  .panel-header-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
