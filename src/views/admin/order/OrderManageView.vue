<template>
  <div class="order-manage-view">
    <div class="page-header">
      <div>
        <h2 class="page-title">报修与投诉工单调度中心</h2>
        <p class="page-sub">负责工单初审、派单、施工跟进与完工验收管理</p>
      </div>
      <div class="header-actions">
        <el-button v-if="userStore.canExportOrder" type="success" :icon="Download" @click="handleExportExcel">
          导出工单记录
        </el-button>
      </div>
    </div>

    <!-- 直观状态分段快筛 + 组合过滤卡片 -->
    <div class="filter-card card-hover" style="display: flex; flex-direction: column; gap: 14px">
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px">
        <el-radio-group v-model="quickStatusTab" @change="onQuickStatusChange">
          <el-radio-button value="all">全部工单 ({{ total }})</el-radio-button>
          <el-radio-button :value="1">🔴 待初审</el-radio-button>
          <el-radio-button :value="3">📦 已派单</el-radio-button>
          <el-radio-button :value="4">⚡ 施工处理中</el-radio-button>
          <el-radio-button :value="5">📋 完工待验</el-radio-button>
          <el-radio-button :value="6">✅ 已评价结单</el-radio-button>
        </el-radio-group>

        <div style="display: flex; gap: 8px; align-items: center">
          <el-select v-model="filterType" placeholder="工单类型" clearable style="width: 125px" @change="loadOrders">
            <el-option label="🛠️ 报修工单" :value="1" />
            <el-option label="📝 投诉建议" :value="2" />
          </el-select>
          <el-select v-model="filterUrgent" placeholder="紧急程度" clearable style="width: 115px" @change="loadOrders">
            <el-option label="普通" :value="0" />
            <el-option label="🔥 加急" :value="1" />
          </el-select>
          <el-button :icon="Refresh" @click="resetFilter">重置</el-button>
        </div>
      </div>
    </div>

    <!-- 工单数据表格 -->
    <div class="table-card card-hover">
      <el-table v-loading="loading" :data="orderList" style="width: 100%">
        <el-table-column prop="orderNo" label="工单编号" width="140" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="row.orderType === 1 ? 'primary' : 'warning'">
              {{ row.orderType === 1 ? '报修' : '投诉' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="紧急" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isUrgent === 1" type="danger" effect="dark" size="small">加急</el-tag>
            <span v-else class="text-muted">普通</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="事项摘要" min-width="180" show-overflow-tooltip />
        <el-table-column prop="reporterName" label="申报居民" width="100" />
        <el-table-column prop="reporterPhone" label="联络电话" width="120" />
        <el-table-column label="当前状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="handlerName" label="处理师傅" width="110">
          <template #default="{ row }">
            <span>{{ row.handlerName || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="提交时间" width="160" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 1"
              type="primary"
              size="small"
              @click="openAuditModal(row)"
            >
              初审派单
            </el-button>

            <el-button
              v-if="row.status === 3 && userStore.canHandleOrder"
              type="success"
              plain
              size="small"
              @click="handleStartWork(row)"
            >
              接单施工
            </el-button>

            <el-button
              v-if="row.status === 4 && userStore.canHandleOrder"
              type="warning"
              size="small"
              @click="openCompleteModal(row)"
            >
              完工登记
            </el-button>

            <el-button
              type="info"
              link
              size="small"
              @click="openDetailTimeline(row)"
            >
              轨迹时间轴
            </el-button>
          </template>
        </el-table-column>
      </el-table>

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
    </div>

    <!-- 初审与派工弹窗 -->
    <el-dialog v-model="showAuditModal" title="工单初审与师傅指派" width="580px">
      <el-form label-width="100px">
        <el-form-item label="工单编号">
          <span>#{{ currentOrder?.orderNo }} · <strong>{{ currentOrder?.title }}</strong></span>
        </el-form-item>
        <el-form-item label="事项内容">
          <p class="dialog-desc">{{ currentOrder?.content }}</p>
        </el-form-item>

        <!-- AI 智能初审分诊研判面板 -->
        <div class="ai-triage-panel">
          <div class="ai-panel-header">
            <div class="header-left">
              <span class="ai-icon">🤖</span>
              <span class="ai-title">AI 智能分诊与派单研判</span>
            </div>
            <el-button
              size="small"
              type="primary"
              plain
              :loading="aiTriaging"
              @click="runAiTriage"
            >
              {{ aiTriageResult ? '🔄 重新研判' : '✨ 生成 AI 研判分析' }}
            </el-button>
          </div>

          <div v-if="aiTriageResult" class="ai-panel-body">
            <div class="triage-row">
              <span class="row-label">🔍 故障成因：</span>
              <span class="row-val">{{ aiTriageResult.faultDiagnosis }}</span>
            </div>
            <div class="triage-row">
              <span class="row-label">🛠️ 排查要点：</span>
              <span class="row-val">{{ aiTriageResult.maintenanceTips }}</span>
            </div>
            <div class="triage-meta-bar">
              <div class="meta-item">
                <span class="row-label">👷 建议工种：</span>
                <el-tag size="small" type="success" effect="plain">{{ aiTriageResult.recommendedRole }}</el-tag>
              </div>
              <div class="meta-item">
                <span class="row-label">⏱️ 预估工期：</span>
                <span class="font-semibold">{{ aiTriageResult.estimatedHours }} 小时</span>
              </div>
            </div>
            <div class="triage-remark-card">
              <div class="remark-title-row">
                <span class="remark-label">📝 建议审核批注：</span>
                <el-button link type="primary" size="small" @click="applyAiRemark">一键采用到输入框</el-button>
              </div>
              <div class="remark-content">{{ aiTriageResult.suggestedAuditRemark }}</div>
            </div>
          </div>
          <div v-else-if="!aiTriaging" class="ai-panel-empty">
            点击上方按钮，AI 将综合工单分类、现场照片及故障描述生成专业维修建议与审核批注。
          </div>
        </div>

        <el-form-item label="审核结论">
          <el-radio-group v-model="auditDecision">
            <el-radio :value="1">通过并指派师傅</el-radio>
            <el-radio :value="2">驳回不予受理</el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="auditDecision === 1">
          <el-form-item label="⚡ 一键选人">
            <div style="display: flex; flex-wrap: wrap; gap: 6px">
              <el-button
                v-for="w in presetHandlers"
                :key="w.name"
                size="small"
                round
                :type="handlerName === w.name ? 'primary' : 'default'"
                @click="handlerName = w.name; handlerPhone = w.phone"
              >
                {{ w.label }}
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="维修师傅姓名">
            <el-input v-model="handlerName" placeholder="如：张师傅" />
          </el-form-item>
          <el-form-item label="师傅联系电话">
            <el-input v-model="handlerPhone" placeholder="师傅手机号" />
          </el-form-item>
          <el-form-item label="派单批注">
            <el-input v-model="auditRemark" type="textarea" :rows="2" placeholder="可填写指派师傅的指导批注或排查要点（可选）" />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="快捷原因">
            <div style="display: flex; flex-wrap: wrap; gap: 6px">
              <el-button
                v-for="r in ['属于业主室内自用电器，不在公共维修范围', '信息描述不详，请补充具体楼层位置后重提', '该事项已立项处理中，请勿重复提报']"
                :key="r"
                size="small"
                round
                @click="auditRemark = r"
              >
                {{ r.slice(0, 10) }}...
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="驳回原因">
            <el-input v-model="auditRemark" type="textarea" :rows="3" placeholder="请详述驳回原因" />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="showAuditModal = false">取消</el-button>
        <el-button type="primary" :loading="submittingAudit" @click="submitAudit">确认处理</el-button>
      </template>
    </el-dialog>

    <!-- 完工登记弹窗 -->
    <el-dialog v-model="showCompleteModal" title="维修师傅完工登记" width="520px">
      <el-form label-width="100px">
        <el-form-item label="⚡ 快捷短语">
          <div style="display: flex; flex-wrap: wrap; gap: 6px">
            <el-button
              v-for="txt in ['已更换破损配件并测试运行正常，现场已清理完毕。', '已完成管道疏通与密封加固，无渗漏隐患。', '网格员已联合物业现场核实并协调处置完毕。']"
              :key="txt"
              size="small"
              round
              @click="handleResult = txt"
            >
              {{ txt.slice(0, 12) }}...
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="处理结果说明">
          <el-input
            v-model="handleResult"
            type="textarea"
            :rows="3"
            placeholder="如：已更换破损管道阀门并试水完成，现场已清理。"
          />
        </el-form-item>
        <el-form-item label="上传完工现场照">
          <el-upload
            list-type="picture-card"
            :http-request="doCompleteUpload"
            :limit="3"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCompleteModal = false">取消</el-button>
        <el-button type="primary" :loading="submittingComplete" @click="submitComplete">确认完工</el-button>
      </template>
    </el-dialog>

    <!-- 轨迹时间轴抽屉 -->
    <el-drawer v-model="showTimelineDrawer" title="工单生命周期与流转日志" size="460px">
      <div v-if="currentDetail" class="timeline-body">
        <div class="order-summary-box">
          <h4>{{ currentDetail.title }}</h4>
          <p>报修地址：{{ currentDetail.houseAddress || '社区公共区域' }}</p>
          <p>申报居民：{{ currentDetail.reporterName }} ({{ currentDetail.reporterPhone }})</p>
          <p>申报内容：{{ currentDetail.content }}</p>
        </div>

        <el-timeline class="mt-4">
          <el-timeline-item
            v-for="log in currentDetail.logs"
            :key="log.id"
            :timestamp="log.createTime"
            placement="top"
          >
            <div class="log-title">
              <strong>{{ log.operatorName }}</strong>
              <el-tag size="small" class="ml-2">{{ log.actionType }}</el-tag>
            </div>
            <div v-if="log.remark" class="log-remark">{{ log.remark }}</div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Search, Refresh, Download, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { uploadFile } from '@/utils/upload'
import { useUserStore } from '@/stores/user'
import { useCommunityStore } from '@/stores/community'
import type { WorkOrder, AiOrderTriageResult } from '@/types'
import { triageWorkOrder } from '@/api/ai'

const route = useRoute()
const userStore = useUserStore()
const communityStore = useCommunityStore()

// 平台管理员顶栏切换的当前查看小区 (其余角色后端强制本人小区)
const communityParam = computed(() =>
  userStore.isSystemAdmin ? communityStore.selectedCommunityId : undefined
)

watch(() => communityStore.selectedId, () => {
  page.value = 1
  loadOrders()
})

const loading = ref(false)
const orderList = ref<WorkOrder[]>([])
const page = ref(1)
const size = ref(10)
const total = ref(0)

const quickStatusTab = ref<string | number>('all')
const filterType = ref<number | undefined>()
const filterStatus = ref<number | undefined>()
const filterUrgent = ref<number | undefined>()

const presetHandlers = [
  { label: '🔧 张建国 (水电专修)', name: '张建国', phone: '13800138001' },
  { label: '🛗 王志远 (电梯机电)', name: '王志远', phone: '13800138002' },
  { label: '🪵 李维修师傅 (综合)', name: '李维修师傅', phone: '13800138000' },
  { label: '👮 陈网格员 (诉求调解)', name: '陈网格员', phone: '13800000004' }
]

// 初审弹窗
const showAuditModal = ref(false)
const currentOrder = ref<WorkOrder | null>(null)
const auditDecision = ref(1) // 1-通过派单, 2-驳回
const handlerName = ref('张建国')
const handlerPhone = ref('13800138001')
const auditRemark = ref('')
const submittingAudit = ref(false)

// 完工弹窗
const showCompleteModal = ref(false)
const handleResult = ref('')
const handleImages = ref<string[]>([])
const submittingComplete = ref(false)

// 轨迹时间轴
const showTimelineDrawer = ref(false)
const currentDetail = ref<WorkOrder | null>(null)

function onQuickStatusChange(val: string | number) {
  filterStatus.value = val === 'all' ? undefined : Number(val)
  page.value = 1
  loadOrders()
}

onMounted(async () => {
  if (route.query.status) {
    const st = Number(route.query.status)
    quickStatusTab.value = st
    filterStatus.value = st
  }
  await loadOrders()
  if (route.query.id) {
    const target = orderList.value.find((o) => String(o.id) === String(route.query.id))
    if (target) {
      if (target.status === 1) openAuditModal(target)
      else openDetailTimeline(target)
    }
  }
})

watch(
  () => route.query.status,
  (newSt) => {
    if (newSt) {
      const st = Number(newSt)
      quickStatusTab.value = st
      filterStatus.value = st
    } else {
      quickStatusTab.value = 'all'
      filterStatus.value = undefined
    }
    page.value = 1
    loadOrders()
  }
)

async function loadOrders() {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      size: size.value
    }
    if (filterType.value) params.orderType = filterType.value
    if (filterStatus.value) params.status = filterStatus.value
    if (filterUrgent.value !== undefined) params.isUrgent = filterUrgent.value
    if (communityParam.value) params.communityId = communityParam.value

    const res: any = await request.get('/order/admin/list', { params })
    orderList.value = res.records || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  quickStatusTab.value = 'all'
  filterType.value = undefined
  filterStatus.value = undefined
  filterUrgent.value = undefined
  page.value = 1
  loadOrders()
}

const aiTriageResult = ref<AiOrderTriageResult | null>(null)
const aiTriaging = ref(false)

async function runAiTriage() {
  if (!currentOrder.value) return
  aiTriaging.value = true
  try {
    let images: string[] = []
    if (currentOrder.value.images) {
      try {
        images = JSON.parse(currentOrder.value.images)
      } catch {}
    }
    const res = await triageWorkOrder({
      orderId: currentOrder.value.id,
      title: currentOrder.value.title,
      orderType: currentOrder.value.orderType,
      category: currentOrder.value.category,
      content: currentOrder.value.content,
      images,
      isUrgent: currentOrder.value.isUrgent
    })
    const data = res
    if (data && data.faultDiagnosis) {
      aiTriageResult.value = data
      ElMessage.success('✨ AI 智能分诊研判分析完成！')
    }
  } catch (e: any) {
    ElMessage.error(e.message || 'AI 研判失败')
  } finally {
    aiTriaging.value = false
  }
}

function applyAiRemark() {
  if (aiTriageResult.value?.suggestedAuditRemark) {
    auditRemark.value = aiTriageResult.value.suggestedAuditRemark
    ElMessage.success('已一键采用 AI 建议的审核批注！')
  }
}

function openAuditModal(row: WorkOrder) {
  currentOrder.value = row
  auditDecision.value = 1
  handlerName.value = row.orderType === 2 ? '陈网格员' : '张建国'
  handlerPhone.value = row.orderType === 2 ? '13800000004' : '13800138001'
  auditRemark.value = ''
  aiTriageResult.value = null
  showAuditModal.value = true
}

async function submitAudit() {
  if (!currentOrder.value) return
  submittingAudit.value = true
  try {
    await request.put('/order/admin/audit', {
      orderId: currentOrder.value.id,
      pass: auditDecision.value === 1,
      remark: auditRemark.value,
      handlerName: handlerName.value,
      handlerPhone: handlerPhone.value
    })
    ElMessage.success('工单初审与派单处理完成')
    showAuditModal.value = false
    await loadOrders()
  } finally {
    submittingAudit.value = false
  }
}

async function handleStartWork(row: WorkOrder) {
  try {
    await request.put(`/order/admin/start?orderId=${row.id}`)
    ElMessage.success('已登记接单开工，状态更新为【处理中】')
    await loadOrders()
  } catch (e) {}
}

function openCompleteModal(row: WorkOrder) {
  currentOrder.value = row
  handleResult.value = '工程检修完毕，现场测试正常且已恢复原貌。'
  handleImages.value = []
  showCompleteModal.value = true
}

// 完工照上传：自定义 http-request 走秒传预检封装（SHA-256 命中免传输）
async function doCompleteUpload(option: any) {
  try {
    const { url, instant } = await uploadFile(option.file, 'order')
    handleImages.value.push(url)
    option.onSuccess({ code: 200, data: { url, instant } })
  } catch (err: any) {
    option.onError(err)
    ElMessage.error(err?.message || '图片上传失败，请重试')
  }
}

async function submitComplete() {
  if (!currentOrder.value) return
  submittingComplete.value = true
  try {
    await request.put('/order/admin/complete', {
      orderId: currentOrder.value.id,
      handleResult: handleResult.value,
      handleImages: JSON.stringify(handleImages.value)
    })
    ElMessage.success('完工登记成功，已通知业主验收评价！')
    showCompleteModal.value = false
    await loadOrders()
  } finally {
    submittingComplete.value = false
  }
}

async function openDetailTimeline(row: WorkOrder) {
  try {
    const res: any = await request.get(`/order/detail/${row.id}`)
    currentDetail.value = res
    showTimelineDrawer.value = true
  } catch (e) {}
}

async function handleExportExcel() {
  try {
    const res: any = await request.get('/order/admin/export', {
      params: { communityId: communityParam.value },
      responseType: 'blob'
    })
    const blob = new Blob([res.data || res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `社区工单报修记录表_${Date.now()}.xlsx`
    link.click()
    URL.revokeObjectURL(link.href)
    ElMessage.success('工单台账 Excel 导出成功！')
  } catch (e) {
    ElMessage.error('导出工单台账失败')
  }
}

function getStatusText(status: number) {
  switch (status) {
    case 1: return '待审核'
    case 2: return '已驳回'
    case 3: return '已派单'
    case 4: return '施工处理中'
    case 5: return '完工待验'
    case 6: return '已评价结单'
    default: return '流转中'
  }
}

function getStatusTag(status: number) {
  switch (status) {
    case 1: return 'info'
    case 2: return 'danger'
    case 3: return 'primary'
    case 4: return 'warning'
    case 5: return 'success'
    case 6: return 'success'
    default: return 'info'
  }
}
</script>

<style scoped>
.order-manage-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
}

.page-sub {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

.filter-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 18px 24px 2px 24px;
}

.table-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 20px;
}

.text-muted {
  font-size: 12px;
  color: #94a3b8;
}

.pagination-wrap {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-desc {
  font-size: 13px;
  color: #334155;
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 6px;
}

.order-summary-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}

.order-summary-box h4 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
}

.order-summary-box p {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 4px;
}

.log-title {
  font-size: 13px;
  color: #1e293b;
}

.log-remark {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
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
  .header-actions .el-button {
    width: 100%;
  }
  .filter-card {
    padding: 12px 12px 4px;
  }
  .table-card {
    padding: 12px 8px;
    overflow-x: auto;
  }
}

/* AI 智能分诊研判面板 */
.ai-triage-panel {
  margin: 0 0 18px 20px;
  background: linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%);
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  overflow: hidden;
}

.ai-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(240, 253, 244, 0.85);
  border-bottom: 1px solid #dcfce7;
}

.ai-panel-header .header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ai-icon {
  font-size: 16px;
}

.ai-title {
  font-size: 13px;
  font-weight: 700;
  color: #166534;
}

.ai-panel-body {
  padding: 12px 14px;
  font-size: 12.5px;
  color: #1e293b;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.triage-row {
  line-height: 1.5;
}

.row-label {
  font-weight: 600;
  color: #334155;
}

.row-val {
  color: #0f172a;
}

.triage-meta-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 6px 0;
  border-top: 1px dashed #e2e8f0;
  border-bottom: 1px dashed #e2e8f0;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.triage-remark-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 10px;
}

.remark-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.remark-label {
  font-weight: 600;
  color: #15803d;
}

.remark-content {
  font-size: 12px;
  color: #475569;
  line-height: 1.5;
}

.ai-panel-empty {
  padding: 12px 14px;
  font-size: 12px;
  color: #64748b;
  text-align: center;
}
</style>
