<template>
  <div class="report-manage-view">
    <div class="page-header">
      <div>
        <h2 class="page-title">违规与矛盾纠纷举报处理中心</h2>
        <p class="page-sub">邻里闲置违禁、不当言论及矛盾投诉受理审核，支持一键违规下架与闭环反馈</p>
      </div>
      <div class="header-actions">
        <el-radio-group v-model="filterStatus" @change="loadReports">
          <el-radio-button value="">全部记录</el-radio-button>
          <el-radio-button :value="0">待核实 ({{ pendingCount }})</el-radio-button>
          <el-radio-button :value="1">已下架处罚</el-radio-button>
          <el-radio-button :value="2">已驳回</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 表格 -->
    <div class="table-card card-hover">
      <el-table v-loading="loading" :data="reports" style="width: 100%">
        <el-table-column prop="id" label="编号" width="90" />
        <el-table-column prop="targetType" label="举报对象类型" width="140">
          <template #default="{ row }">
            <el-tag :type="row.targetType === 'MARKET_POST' ? 'primary' : 'warning'">
              {{ row.targetType === 'MARKET_POST' ? '闲置/互助贴' : '评论留言' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetId" label="目标内容ID" width="120" />
        <el-table-column prop="reason" label="违规原因" width="160" />
        <el-table-column prop="description" label="居民详细陈述" min-width="200" show-overflow-tooltip />
        <el-table-column label="处置状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="handleRemark" label="网格裁决说明" width="180" show-overflow-tooltip />
        <el-table-column prop="createTime" label="举报时间" width="160" />
        <el-table-column label="裁决操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-button type="danger" size="small" @click="openHandleModal(row, 1)">
                违规下架
              </el-button>
              <el-button type="info" plain size="small" @click="openHandleModal(row, 2)">
                驳回
              </el-button>
            </template>
            <span v-else class="text-muted">已处理归档</span>
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
          @current-change="loadReports"
        />
      </div>
    </div>

    <!-- 处理弹窗 -->
    <el-dialog
      v-model="showHandleModal"
      :title="actionStatus === 1 ? '确认下架违规内容' : '驳回举报申请'"
      width="480px"
    >
      <div class="quick-verdict-bar" :class="{ reject: actionStatus === 2 }">
        <span class="qv-label">⚡ 快捷裁决说明：</span>
        <span
          v-for="item in (actionStatus === 1 ? punishPresets : dismissPresets)"
          :key="item"
          class="qv-chip"
          @click="handleRemark = item"
        >
          {{ item }}
        </span>
      </div>

      <el-form label-width="90px">
        <el-form-item label="裁决说明">
          <el-input
            v-model="handleRemark"
            type="textarea"
            :rows="3"
            :placeholder="actionStatus === 1 ? '请填写违规下架理由（将通知发帖人并扣除信用分）' : '请填写驳回原因（未发现明确违规）'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showHandleModal = false">取消</el-button>
        <el-button
          :type="actionStatus === 1 ? 'danger' : 'primary'"
          :loading="submitting"
          @click="submitHandle"
        >
          确定裁决
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted , watch } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { useCommunityStore } from '@/stores/community'
import { useUserStore } from '@/stores/user'

const loading = ref(false)
const reports = ref<any[]>([])
const page = ref(1)
const size = ref(10)
const total = ref(0)
const pendingCount = ref(0)
const filterStatus = ref<number | ''>('')

const showHandleModal = ref(false)
const currentRow = ref<any>(null)
const actionStatus = ref(1)
const handleRemark = ref('')
const submitting = ref(false)

const punishPresets = [
  '经核实违反邻里公约，予以违规下架并扣除信用分5分',
  '涉嫌发布商业引流或虚假交易信息，予以清理下架',
  '存在不文明言论或人身攻击，已做屏蔽下架处理'
]

const dismissPresets = [
  '经网格员核实属正常邻里闲置交流，未发现违规行为',
  '举报所述情况证据不足，暂不予处罚并持续观察'
]

const userStore = useUserStore()
const communityStore = useCommunityStore()
// 平台管理员顶栏切换的当前查看小区 (其余角色后端强制本人小区)
const communityParam = computed(() =>
  userStore.isSystemAdmin ? communityStore.selectedCommunityId : undefined
)
watch(() => communityStore.selectedId, () => {
  page.value = 1
  loadReports()
})

onMounted(() => {
  loadReports()
})

async function loadReports() {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      size: size.value
    }
    if (filterStatus.value !== '') params.status = filterStatus.value
    if (communityParam.value) params.communityId = communityParam.value

    const res: any = await request.get('/moderation/admin/report/list', { params })
    reports.value = res.records || []
    total.value = res.total || 0

    // 统计待处理数量
    if (filterStatus.value === '') {
      pendingCount.value = reports.value.filter(r => r.status === 0).length
    }
  } finally {
    loading.value = false
  }
}

function openHandleModal(row: any, status: number) {
  currentRow.value = row
  actionStatus.value = status
  handleRemark.value = status === 1 ? punishPresets[0] : dismissPresets[0]
  showHandleModal.value = true
}

async function submitHandle() {
  if (!currentRow.value) return
  submitting.value = true
  try {
    await request.put('/moderation/admin/report/handle', {
      reportId: currentRow.value.id,
      status: actionStatus.value,
      remark: handleRemark.value
    })
    ElMessage.success('举报裁决已执行！')
    showHandleModal.value = false
    await loadReports()
  } finally {
    submitting.value = false
  }
}

function getStatusText(status: number) {
  switch (status) {
    case 0: return '待受理核查'
    case 1: return '已下架处罚'
    case 2: return '已驳回结题'
    default: return '已处理'
  }
}

function getStatusTag(status: number) {
  switch (status) {
    case 0: return 'warning'
    case 1: return 'danger'
    case 2: return 'info'
    default: return 'info'
  }
}
</script>

<style scoped>
.report-manage-view {
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

.quick-verdict-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
  padding: 10px 12px;
  background: #fef2f2;
  border-radius: 8px;
}

.quick-verdict-bar.reject {
  background: #f8fafc;
}

.qv-label {
  font-size: 12px;
  font-weight: 700;
  color: #dc2626;
  width: 100%;
}

.quick-verdict-bar.reject .qv-label {
  color: #475569;
}

.qv-chip {
  font-size: 12px;
  padding: 4px 10px;
  background: #ffffff;
  border: 1px solid #fecaca;
  border-radius: 999px;
  color: #b91c1c;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-verdict-bar.reject .qv-chip {
  border-color: #cbd5e1;
  color: #334155;
}

.qv-chip:hover {
  opacity: 0.85;
}
</style>
