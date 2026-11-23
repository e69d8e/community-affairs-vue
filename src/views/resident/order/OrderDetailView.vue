<template>
  <div v-loading="loading" class="order-detail-view">
    <div class="back-bar">
      <el-button link :icon="ArrowLeft" class="cal-back-btn main-back-btn" @click="handleBack">
        {{ backButtonText }}
      </el-button>
      <template v-if="isFromProfile">
        <span class="crumb-sep">/</span>
        <el-button link class="cal-secondary-link" @click="$router.push('/orders')">
          浏览工单列表
        </el-button>
      </template>
    </div>

    <div v-if="order" class="detail-container">
      <!-- 顶部工单状态进度条 (Cal Card) -->
      <div class="status-steps-card cal-mockup-card">
        <div class="status-header">
          <div class="order-id-badge">
            <span class="no-label">工单编号：</span>
            <span class="no-val">#{{ order.orderNo }}</span>
            <span v-if="order.isUrgent === 1" class="cal-badge cal-badge-pink">紧急加急</span>
          </div>
          <span class="cal-badge" :class="getStatusBadgeClass(order.status)">
            {{ getStatusText(order.status) }}
          </span>
        </div>
        <h1 class="order-detail-title">{{ order.title }}</h1>

        <el-steps :active="getStepIndex(order.status)" finish-status="success" align-center class="process-steps">
          <el-step title="居民申报" description="工单已成功提交" />
          <el-step title="网格/物业初审" description="核实隐患与指派" />
          <el-step title="处理施工中" description="师傅上门维修处置" />
          <el-step title="施工完工" description="凭证上传等待验收" />
          <el-step title="评价结单" description="居民满意度评星" />
        </el-steps>
      </div>

      <!-- 双栏信息展示 -->
      <div class="detail-split-grid">
        <!-- 左侧：工单正文与申报凭证 -->
        <div class="detail-main-card cal-mockup-card">
          <h2 class="section-title">工单详情内容</h2>
          <div class="info-table">
            <div class="info-row">
              <span class="row-label">工单类型：</span>
              <span class="row-val">{{ order.orderType === 1 ? '设施报修' : '投诉与建议' }}</span>
            </div>
            <div class="info-row">
              <span class="row-label">业务分类：</span>
              <span class="row-val">{{ order.category }}</span>
            </div>
            <div class="info-row">
              <span class="row-label">关联位置：</span>
              <span class="row-val">{{ order.houseAddress || '公共区域/主干道' }}</span>
            </div>
            <div class="info-row">
              <span class="row-label">申报人：</span>
              <span class="row-val">{{ order.reporterName }} ({{ order.reporterPhone }})</span>
            </div>
            <div class="info-row">
              <span class="row-label">提报时间：</span>
              <span class="row-val">{{ order.createTime }}</span>
            </div>
            <div class="info-row">
              <span class="row-label">工单主题：</span>
              <span class="row-val font-semibold">{{ order.title }}</span>
            </div>
            <div class="info-row full-col">
              <span class="row-label">情况描述：</span>
              <p class="desc-box">{{ order.content }}</p>
            </div>
          </div>

          <!-- 申报时现场照片 -->
          <div v-if="reportImages.length > 0" class="images-block">
            <h3 class="block-subtitle">现场申报照片</h3>
            <div class="image-gallery">
              <el-image
                v-for="(img, idx) in reportImages"
                :key="idx"
                :src="img"
                :preview-src-list="reportImages"
                :initial-index="idx"
                preview-teleported
                fit="cover"
                class="evidence-img"
              />
            </div>
          </div>

          <!-- 完工反馈与凭证 (若已完工) -->
          <div v-if="order.handleResult" class="finish-block">
            <h3 class="block-subtitle" style="color: #047857">维修施工完工结果</h3>
            <p class="desc-box" style="background: #ecfdf5; border-color: #a7f3d0">
              {{ order.handleResult }}
            </p>
            <div v-if="handleImages.length > 0" class="image-gallery" style="margin-top: 12px">
              <el-image
                v-for="(img, idx) in handleImages"
                :key="idx"
                :src="img"
                :preview-src-list="handleImages"
                :initial-index="idx"
                preview-teleported
                fit="cover"
                class="evidence-img"
              />
            </div>
          </div>

          <!-- 居民评价交互卡片 (若 status === 5) -->
          <div v-if="order.status === 5" class="evaluation-action-card">
            <h3>验收与满意度评价</h3>
            <p class="eval-tip">维修处理已完工，请您对本次物业服务进行星级评价（评价后将获赠 5 点社区信用积分）：</p>
            <div class="eval-form">
              <el-rate v-model="evalStar" size="large" show-text />
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; align-items: center">
                <span style="font-size: 12px; color: #047857">⚡ 快捷评价：</span>
                <el-button
                  v-for="tag in ['师傅上门很快，维修专业到位！', '设施已恢复正常，非常感谢！', '网格与物业响应迅速，五星好评！']"
                  :key="tag"
                  size="small"
                  round
                  style="min-height: 28px; font-size: 12px; padding: 2px 10px"
                  @click="evalContent = tag"
                >
                  {{ tag }}
                </el-button>
              </div>
              <el-input
                v-model="evalContent"
                type="textarea"
                :rows="3"
                placeholder="请输入您对维修师傅处理时效与服务态度的评价留言..."
                style="margin-top: 10px"
              />
              <div style="margin-top: 12px; text-align: right">
                <el-button type="success" :loading="evaluating" @click="handleEvaluate">
                  提交评价并结单
                </el-button>
              </div>
            </div>
          </div>

          <!-- 已评价展示 (若 status === 6) -->
          <div v-else-if="order.status === 6 && order.ratingStar" class="evaluated-card">
            <h3>居民评价反馈</h3>
            <el-rate :model-value="order.ratingStar" disabled size="small" />
            <p class="eval-text">{{ order.ratingContent || '默认好评' }}</p>
          </div>
        </div>

        <!-- 右侧：流转日志时间轴 -->
        <div class="detail-timeline-card cal-mockup-card">
          <h2 class="section-title">工单流转完整追溯轨迹</h2>
          <el-timeline class="order-timeline">
            <el-timeline-item
              v-for="log in order.logs || []"
              :key="log.id"
              :timestamp="log.createTime"
              placement="top"
              :type="getTimelineType(log.actionType)"
            >
              <div class="log-card">
                <div class="log-header">
                  <span class="operator">{{ log.operatorName }}</span>
                  <el-tag size="small" type="info">{{ log.operatorRole }}</el-tag>
                </div>
                <p class="log-remark">{{ log.remark }}</p>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="empty-order-card cal-mockup-card" style="padding: 60px 20px; text-align: center; margin-top: 16px;">
      <el-empty description="未检索到该工单记录，或该工单已被取消">
        <el-button type="primary" class="cal-primary-btn" @click="$router.push('/orders')">返回我的工单列表</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import type { WorkOrder } from '@/types'

const route = useRoute()
const router = useRouter()
const order = ref<WorkOrder | null>(null)
const loading = ref(false)

const isFromProfile = computed(() => {
  return (
    route.query.from === 'profile' ||
    (typeof window !== 'undefined' && window.history.state?.back?.includes('/user/profile'))
  )
})

const backButtonText = computed(() => {
  if (isFromProfile.value) {
    return '返回个人中心工单'
  }
  return '返回工单列表'
})

function handleBack() {
  if (route.query.from === 'profile') {
    router.push('/user/profile?tab=orders')
  } else if (window.history.length > 1 && window.history.state?.back) {
    router.back()
  } else {
    router.push('/orders')
  }
}

const evalStar = ref(5)
const evalContent = ref('')
const evaluating = ref(false)

onMounted(() => {
  loadDetail()
})

async function loadDetail() {
  const id = String(route.params.id || '').trim()
  if (!id) return
  loading.value = true
  try {
    const res: any = await request.get(`/order/detail/${id}`)
    order.value = res
  } catch (e) {
    // 仅当传入的是工单编号（非纯数字主键）时才走列表反查兜底，避免瞬时错误触发大列表请求
    if (/^\d+$/.test(id)) {
      loading.value = false
      return
    }
    try {
      const listRes: any = await request.get('/order/my-list', { params: { size: 50 } })
      const records = listRes.records || []
      const matched = records.find(
        (o: any) => String(o.id) === id || String(o.orderNo) === id || id.includes(String(o.orderNo))
      )
      if (matched) {
        const res2: any = await request.get(`/order/detail/${matched.id}`)
        order.value = res2
      } else {
        const adminRes: any = await request.get('/order/list', { params: { size: 50 } })
        const adminRecords = adminRes.records || []
        const adminMatched = adminRecords.find(
          (o: any) => String(o.id) === id || String(o.orderNo) === id || id.includes(String(o.orderNo))
        )
        if (adminMatched) {
          const res3: any = await request.get(`/order/detail/${adminMatched.id}`)
          order.value = res3
        }
      }
    } catch (e2) {}
  } finally {
    loading.value = false
  }
}

const reportImages = computed(() => {
  if (!order.value?.images) return []
  try {
    return JSON.parse(order.value.images)
  } catch (e) {
    return []
  }
})

const handleImages = computed(() => {
  if (!order.value?.handleImages) return []
  try {
    return JSON.parse(order.value.handleImages)
  } catch (e) {
    return []
  }
})

function getStepIndex(status: number) {
  switch (status) {
    case 1: return 1
    case 2: return 1 // 驳回
    case 3: return 2 // 已派单
    case 4: return 3 // 施工处理中
    case 5: return 4 // 完工待评
    case 6: return 5 // 评价结单
    default: return 0
  }
}

function getStatusText(status: number) {
  switch (status) {
    case 1: return '待初审'
    case 2: return '已驳回'
    case 3: return '已派单待处理'
    case 4: return '施工处理中'
    case 5: return '施工完工待评价'
    case 6: return '已评价结单'
    default: return '未知'
  }
}

function getStatusTagType(status: number) {
  switch (status) {
    case 1: return 'info'
    case 2: return 'danger'
    case 3: return 'warning'
    case 4: return 'primary'
    case 5: return 'success'
    case 6: return 'info'
    default: return 'info'
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

function getTimelineType(action: string) {
  switch (action) {
    case 'SUBMIT': return 'primary'
    case 'REVIEW_PASS': return 'warning'
    case 'REVIEW_REJECT': return 'danger'
    case 'START_HANDLE': return 'warning'
    case 'COMPLETE': return 'success'
    case 'EVALUATE': return 'success'
    default: return 'info'
  }
}

async function handleEvaluate() {
  if (!order.value) return
  evaluating.value = true
  try {
    await request.post('/order/evaluate', {
      orderId: order.value.id,
      ratingStar: evalStar.value,
      ratingContent: evalContent.value
    })
    ElMessage.success('评价成功，感谢您对社区治理的支持！')
    loadDetail()
  } finally {
    evaluating.value = false
  }
}
</script>

<style scoped>
.back-bar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.cal-secondary-link {
  color: var(--cal-muted);
  font-size: 13px;
  font-weight: 500;
  padding: 0;
}
.cal-secondary-link:hover {
  color: var(--cal-text);
  text-decoration: underline;
}
.crumb-sep {
  color: var(--cal-hairline);
  font-size: 13px;
}
.detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.status-steps-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  padding: 24px 32px;
}
.order-detail-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--cal-ink, #0f172a);
  margin: 10px 0 18px;
  line-height: 1.4;
  overflow-wrap: break-word;
}
.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}
.order-id-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}
.no-label {
  color: #64748b;
}
.no-val {
  font-family: monospace;
  font-weight: 700;
  color: #0f172a;
}
.process-steps {
  margin-top: 12px;
}

.detail-split-grid {
  display: grid;
  grid-template-columns: 1.25fr 0.75fr;
  gap: 20px;
}
.detail-main-card, .detail-timeline-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  padding: 28px;
}
.section-title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.info-table {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 24px;
}
.info-row {
  font-size: 14px;
  display: flex;
}
.full-col {
  grid-column: span 2;
  flex-direction: column;
}
.row-label {
  color: #64748b;
  width: 90px;
  flex-shrink: 0;
}
.row-val {
  color: #1e293b;
}
.font-semibold {
  font-weight: 600;
}
.desc-box {
  margin-top: 8px;
  background: #f8fafc;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  line-height: 1.7;
  color: #334155;
}

.images-block, .finish-block {
  margin-top: 24px;
}
.block-subtitle {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #475569;
}
.image-gallery {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.evidence-img {
  width: 110px;
  height: 110px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.evaluation-action-card {
  margin-top: 28px;
  background: #f0fdf4;
  border: 1px dashed #86efac;
  border-radius: 10px;
  padding: 20px;
}
.evaluation-action-card h4 {
  color: #15803d;
  font-size: 16px;
  margin-bottom: 4px;
}
.eval-tip {
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 12px;
}

.evaluated-card {
  margin-top: 24px;
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.evaluated-card h4 {
  font-size: 14px;
  margin-bottom: 8px;
}
.eval-text {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

.order-timeline {
  padding-left: 10px;
}
.log-card {
  background: #f8fafc;
  border-radius: 6px;
  padding: 10px 14px;
  margin-top: 4px;
}
.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.operator {
  font-weight: 600;
  font-size: 13px;
  color: #1e293b;
}
.log-remark {
  font-size: 13px;
  color: #64748b;
}

@media (max-width: 900px) {
  .detail-split-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .status-steps-card {
    padding: 16px !important;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .process-steps {
    min-width: 520px;
    padding-bottom: 8px;
  }
  .detail-main-card,
  .detail-timeline-card {
    padding: 16px !important;
  }
  .info-table {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .full-col {
    grid-column: span 1;
  }
  .status-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
