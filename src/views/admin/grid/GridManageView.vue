<template>
  <div class="grid-manage-view">
    <div class="page-header">
      <div>
        <h1 class="page-title">网格空间与房产认证管理</h1>
        <p class="page-sub">管理小区楼宇台账，审批居民实名认领房产与居住身份</p>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="manage-tabs card-hover">
      <!-- 标签页 1：待审批房产认证申请 -->
      <el-tab-pane :label="`📋 居民房产认领审批 (${total})`" name="audit">
        <div class="toolbar">
          <div class="toolbar-left">
            <el-radio-group v-model="certStatusFilter" size="small" @change="onStatusFilterChange">
              <el-radio-button :value="0">待审核</el-radio-button>
              <el-radio-button :value="1">已认证</el-radio-button>
              <el-radio-button :value="2">已驳回</el-radio-button>
              <el-radio-button value="all">全部记录</el-radio-button>
            </el-radio-group>
            <span class="tip-text">核实购房协议或租赁合同后，即可通过或驳回居民房产认证</span>
          </div>
          <div class="toolbar-actions">
            <el-button type="primary" plain size="small" @click="activeTab = 'spatial'">
              <span class="btn-icon-gap">🏢</span>查看楼宇空间台账
            </el-button>
            <el-button :icon="Refresh" size="small" @click="loadPendingBindings">刷新列表</el-button>
          </div>
        </div>

        <div class="table-scroll-region" tabindex="0" role="region" aria-label="房产认证审核列表">
        <el-table v-loading="loadingPending" :data="pendingList" style="width: 100%">
          <el-table-column label="申请人" min-width="150">
            <template #default="{ row }">
              <div class="applicant-cell">
                <div class="applicant-name">{{ row.residentName || `用户#${row.userId}` }}</div>
                <div v-if="row.residentPhone" class="applicant-sub">{{ row.residentPhone }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="认领房屋地址" min-width="210">
            <template #default="{ row }">
              <div class="house-cell">
                <span v-if="row.communityName" class="comm-mini-tag">{{ row.communityName }}</span>
                <span class="house-addr">{{ row.houseAddress || `房屋#${row.houseId}` }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="居住身份" width="110">
            <template #default="{ row }">
              <el-tag :type="row.identityType === 1 ? 'primary' : 'info'" size="small">
                {{ getIdentityText(row.identityType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="审核状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getCertStatusTag(row.certStatus)" size="small">
                {{ getCertStatusText(row.certStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="佐证材料" width="100">
            <template #default="{ row }">
              <el-image
                v-if="row.certMaterial"
                :src="row.certMaterial"
                :preview-src-list="[row.certMaterial]"
                preview-teleported
                fit="cover"
                style="width: 44px; height: 44px; border-radius: 6px; cursor: pointer"
              />
              <span v-else class="text-muted">无附件</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="申请时间" width="168" />
          <el-table-column label="审批操作" width="176" fixed="right">
            <template #default="{ row }">
              <div v-if="row.certStatus === 0" class="audit-op-row">
                <el-button type="success" size="small" @click="handleAudit(row, 1)">
                  ✓ 通过认证
                </el-button>
                <el-button type="danger" plain size="small" @click="openRejectModal(row)">
                  驳回
                </el-button>
              </div>
              <div v-else class="audited-note">
                <span v-if="row.certStatus === 2 && row.rejectReason" :title="row.rejectReason">
                  已驳回：{{ row.rejectReason }}
                </span>
                <span v-else>已于 {{ (row.reviewTime || row.createTime || '').slice(0, 10) }} 审结</span>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <div class="empty-audit-box">
              <p>{{ certStatusFilter === 0 ? '🎉 当前暂无待审批的居民房产认领申请' : '暂无符合条件的房产认证记录' }}</p>
              <el-button type="primary" plain size="small" @click="activeTab = 'spatial'">
                <span class="btn-icon-gap">🏢</span>前往查看社区楼宇空间台账 →
              </el-button>
            </div>
          </template>
        </el-table>
        </div>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="size"
            :total="total"
            layout="prev, pager, next, total"
            background
            @current-change="loadPendingBindings"
          />
        </div>
      </el-tab-pane>

      <!-- 标签页 2：空间网格台账树 -->
      <el-tab-pane label="🏢 社区楼宇空间结构" name="spatial">
        <div class="spatial-wrap">
          <!-- 直觉式楼栋与单元胶囊选择器 -->
          <div class="spatial-selector-bar">
            <div class="selector-group">
              <span class="selector-label">选择楼栋：</span>
              <div class="pill-list">
                <button
                  v-for="b in buildings"
                  :key="b.id"
                  type="button"
                  class="spatial-pill"
                  :class="{ active: currentBuildingId === b.id }"
                  :aria-pressed="currentBuildingId === b.id"
                  @click="selectBuilding(b.id)"
                >
                  🏢 {{ b.buildingName }} ({{ b.buildingNo }}号楼)
                </button>
              </div>
            </div>

            <div v-if="units.length > 0" class="selector-group">
              <span class="selector-label">选择单元：</span>
              <div class="pill-list">
                <button
                  v-for="u in units"
                  :key="u.id"
                  type="button"
                  class="spatial-pill unit-pill"
                  :class="{ active: currentUnitId === u.id }"
                  :aria-pressed="currentUnitId === u.id"
                  @click="selectUnit(u.id)"
                >
                  🚪 {{ u.unitName }}
                </button>
              </div>
            </div>
          </div>

          <!-- 单元统计与状态快筛 -->
          <div v-if="houses.length > 0" class="spatial-summary-bar">
            <div class="summary-stats">
              <span>当前单元共 <strong>{{ houses.length }}</strong> 户</span>
              <span class="stat-dot">·</span>
              <span class="text-green">常住 <strong>{{ occupiedCount }}</strong> 户</span>
              <span class="stat-dot">·</span>
              <span class="text-slate">空置 <strong>{{ houses.length - occupiedCount }}</strong> 户</span>
            </div>
            <el-radio-group v-model="houseLiveFilter" size="small">
              <el-radio-button value="all">全部户室 ({{ houses.length }})</el-radio-button>
              <el-radio-button :value="1">🟢 常住 ({{ occupiedCount }})</el-radio-button>
              <el-radio-button :value="0">⚪ 空置 ({{ houses.length - occupiedCount }})</el-radio-button>
            </el-radio-group>
          </div>

          <div v-loading="loadingHouses" class="houses-preview-grid">
            <div v-if="filteredHouses.length === 0" class="empty-block">
              <el-empty description="暂无符合筛选条件的房屋台账" />
            </div>

            <div
              v-for="h in filteredHouses"
              :key="h.id"
              class="house-block-card"
              :class="{ occupied: h.liveStatus === 1 }"
            >
              <div class="h-top">
                <span class="h-no">{{ h.houseNo?.endsWith('室') ? h.houseNo : h.houseNo + ' 室' }}</span>
                <el-tag size="small" :type="h.liveStatus === 1 ? 'success' : 'info'">
                  {{ h.liveStatus === 1 ? '常住' : '空置' }}
                </el-tag>
              </div>
              <div class="h-details">
                <span>户型：{{ h.houseType || '平层三居' }}</span>
                <span>面积：{{ h.area }} ㎡</span>
                <span>楼层：{{ h.floorNum }} F</span>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 驳回原因弹窗 -->
    <el-dialog v-model="showRejectModal" title="驳回认证申请" width="460px">
      <div class="quick-reason-bar">
        <span class="qr-label">⚡ 快捷原因：</span>
        <span
          v-for="reason in quickRejectReasons"
          :key="reason"
          class="qr-chip"
          @click="rejectReason = reason"
        >
          {{ reason }}
        </span>
      </div>
      <el-form label-width="80px">
        <el-form-item label="驳回原因">
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="3"
            placeholder="如：佐证材料模糊不清、产证信息不匹配"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRejectModal = false">取消</el-button>
        <el-button type="danger" @click="confirmReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { useCommunityStore } from '@/stores/community'
import type { Building, Unit, House } from '@/types'

const activeTab = ref('audit')

// 待审列表
const loadingPending = ref(false)
const pendingList = ref<any[]>([])
const certStatusFilter = ref<number | 'all'>(0)
const page = ref(1)
const size = ref(10)
const total = ref(0)

// 驳回
const showRejectModal = ref(false)
const currentRejectRow = ref<any>(null)
const rejectReason = ref('')
const quickRejectReasons = [
  '产证/购房合同扫描件模糊不清，请重新上传',
  '申请人实名信息与房产登记人不一致',
  '所选楼栋单元门牌号与佐证材料不符',
  '租赁合同缺少有效签章或已过租赁有效期'
]

// 空间台账
const buildings = ref<Building[]>([])
const units = ref<Unit[]>([])
const houses = ref<House[]>([])
const currentBuildingId = ref<any>('')
const currentUnitId = ref<any>('')
const loadingHouses = ref(false)
const houseLiveFilter = ref<'all' | number>('all')

const occupiedCount = computed(() => houses.value.filter(h => h.liveStatus === 1).length)

const filteredHouses = computed(() => {
  if (houseLiveFilter.value === 'all') return houses.value
  return houses.value.filter(h => h.liveStatus === houseLiveFilter.value)
})

const userStore = useUserStore()
const communityStore = useCommunityStore()
// 平台管理员顶栏切换的当前查看小区 (其余角色后端强制本人小区)
const communityParam = computed(() =>
  userStore.isSystemAdmin ? communityStore.selectedCommunityId : undefined
)
watch(() => communityStore.selectedId, () => {
  page.value = 1
  loadPendingBindings()
  currentBuildingId.value = ''
  loadBuildings()
})

onMounted(() => {
  loadPendingBindings()
  loadBuildings()
})

function onStatusFilterChange() {
  page.value = 1
  loadPendingBindings()
}

async function loadPendingBindings() {
  loadingPending.value = true
  try {
    const params: any = {
      page: page.value,
      size: size.value
    }
    if (certStatusFilter.value !== 'all') {
      params.certStatus = certStatusFilter.value
    }
    if (communityParam.value) {
      params.communityId = communityParam.value
    }
    const res: any = await request.get('/grid/admin/house-bind/list', { params })
    pendingList.value = res.records || []
    total.value = res.total || 0
  } finally {
    loadingPending.value = false
  }
}

async function handleAudit(row: any, certStatus: number) {
  try {
    await request.put('/grid/admin/house-bind/audit', {
      bindingId: row.id,
      certStatus: certStatus,
      rejectReason: ''
    })
    ElMessage.success('审核通过，该居民房屋认证已生效！')
    loadPendingBindings()
  } catch (e) {}
}

function openRejectModal(row: any) {
  currentRejectRow.value = row
  rejectReason.value = ''
  showRejectModal.value = true
}

async function confirmReject() {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请输入驳回原因')
    return
  }
  try {
    await request.put('/grid/admin/house-bind/audit', {
      bindingId: currentRejectRow.value.id,
      certStatus: 2,
      rejectReason: rejectReason.value.trim()
    })
    ElMessage.success('已驳回该认证申请')
    showRejectModal.value = false
    loadPendingBindings()
  } catch (e) {}
}

async function loadBuildings() {
  const res: any = await request.get('/grid/buildings', {
    params: { communityId: communityParam.value }
  })
  buildings.value = res || []
  if (buildings.value.length > 0 && !currentBuildingId.value) {
    await selectBuilding(buildings.value[0].id)
  }
}

async function selectBuilding(bId: any) {
  currentBuildingId.value = bId
  currentUnitId.value = ''
  houses.value = []
  const res: any = await request.get(`/grid/units/${bId}`)
  units.value = res || []
  if (units.value.length > 0) {
    await selectUnit(units.value[0].id)
  }
}

async function selectUnit(uId: any) {
  currentUnitId.value = uId
  loadingHouses.value = true
  try {
    const res: any = await request.get(`/grid/houses/${uId}`)
    houses.value = res || []
  } finally {
    loadingHouses.value = false
  }
}

function getIdentityText(type: number) {
  switch (type) {
    case 1: return '产权业主'
    case 2: return '业主家属'
    case 3: return '承租租客'
    default: return '居民'
  }
}

function getCertStatusText(status?: number) {
  switch (status) {
    case 0: return '待审核'
    case 1: return '已认证'
    case 2: return '已驳回'
    default: return '未知'
  }
}

function getCertStatusTag(status?: number) {
  switch (status) {
    case 0: return 'warning'
    case 1: return 'success'
    case 2: return 'danger'
    default: return 'info'
  }
}
</script>

<style scoped>
.grid-manage-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.manage-tabs {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  padding: 24px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.btn-icon-gap {
  margin-right: 5px;
}

.applicant-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.applicant-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #0f172a;
}

.applicant-sub {
  font-size: 12px;
  color: #64748b;
}

.house-cell {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.comm-mini-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
  font-weight: 600;
}

.house-addr {
  font-size: 13.5px;
  font-weight: 500;
  color: #1e293b;
}

.audit-op-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.audit-op-row :deep(.el-button + .el-button) {
  margin-left: 0;
}

.audited-note {
  font-size: 12px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tip-text {
  font-size: 13px;
  color: #64748b;
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

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.empty-audit-box {
  padding: 28px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 13px;
}

.spatial-wrap {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.spatial-selector-bar {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selector-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.selector-label {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  min-width: 72px;
}

.pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.spatial-pill {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.spatial-pill:hover {
  border-color: #16a34a;
  color: #15803d;
}

.spatial-pill.active {
  background: #16a34a;
  border-color: #16a34a;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(22, 163, 74, 0.2);
}

.spatial-pill.unit-pill.active {
  background: #0284c7;
  border-color: #0284c7;
  box-shadow: 0 4px 10px rgba(2, 132, 199, 0.2);
}

.spatial-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 14px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
}

.summary-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #334155;
}

.stat-dot {
  color: #94a3b8;
}

.text-green {
  color: #15803d;
}

.text-slate {
  color: #64748b;
}

.houses-preview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.house-block-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  transition: all 0.2s;
}

.house-block-card.occupied {
  background: #ffffff;
  border-color: #bbf7d0;
}

.house-block-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.05);
}

.h-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.h-no {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
}

.h-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.empty-block {
  grid-column: 1 / -1;
  padding: 30px 0;
}

.quick-reason-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
  padding: 10px 12px;
  background: #fef2f2;
  border-radius: 8px;
}

.qr-label {
  font-size: 12px;
  font-weight: 700;
  color: #dc2626;
  width: 100%;
  margin-bottom: 2px;
}

.qr-chip {
  font-size: 12px;
  padding: 4px 10px;
  background: #ffffff;
  border: 1px solid #fecaca;
  border-radius: 999px;
  color: #b91c1c;
  cursor: pointer;
  transition: all 0.15s;
}

.qr-chip:hover {
  background: #fee2e2;
  border-color: #f87171;
}
</style>
