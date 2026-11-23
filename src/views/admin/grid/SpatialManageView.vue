<template>
  <div class="spatial-manage-view">
    <div class="page-header">
      <div>
        <h1 class="page-title">楼宇空间结构维护</h1>
        <p class="page-sub">
          维护小区「楼栋 → 单元 → 房屋」三级空间台账，新增楼栋可按单元数与楼层数一键生成完整户室
        </p>
      </div>
    </div>

    <div class="cascade-layout">
      <!-- 一级：楼栋面板 -->
      <section class="cascade-panel">
        <div class="panel-head">
          <span class="panel-title">🏢 楼栋 <em>{{ buildings.length }}</em></span>
          <el-button type="primary" size="small" :icon="Plus" @click="openBuildingCreate">新增</el-button>
        </div>
        <el-table
          v-loading="loadingBuildings"
          :data="buildings"
          :row-class-name="rowClass(currentBuildingId)"
          @row-click="(row: Building) => selectBuilding(row.id)"
          class="cascade-table"
        >
          <el-table-column label="楼栋" min-width="142">
            <template #default="{ row }">
              <div class="b-name">{{ row.buildingName }}</div>
              <div class="b-sub">{{ row.buildingNo }} 号楼 · {{ row.totalUnits }}单元 / {{ row.totalFloors }}层</div>
            </template>
          </el-table-column>
          <el-table-column label="楼栋长" width="88" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="officer-name">{{ officerMap[row.gridOfficerId || ''] || '未分配' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" align="center">
            <template #default="{ row }">
              <div class="table-op-row">
                <el-button link type="primary" size="small" @click.stop="openBuildingEdit(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click.stop="removeBuilding(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无楼栋，点击右上角新增" :image-size="64" />
          </template>
        </el-table>
      </section>

      <!-- 二级：单元面板 -->
      <section class="cascade-panel">
        <div class="panel-head">
          <span class="panel-title">🚪 单元 <em>{{ units.length }}</em></span>
          <el-button
            type="primary"
            size="small"
            :icon="Plus"
            :disabled="!currentBuildingId"
            @click="openUnitCreate"
          >新增</el-button>
        </div>
        <div v-if="!currentBuildingId" class="panel-placeholder">
          <el-empty description="请先在左侧选择楼栋" :image-size="64" />
        </div>
        <el-table
          v-else
          v-loading="loadingUnits"
          :data="units"
          :row-class-name="rowClass(currentUnitId)"
          @row-click="(row: Unit) => selectUnit(row.id)"
          class="cascade-table"
        >
          <el-table-column label="单元" min-width="96">
            <template #default="{ row }">
              <div class="b-name">{{ row.unitName }}</div>
              <div class="b-sub">{{ row.hasElevator === 1 ? '🛗 有电梯' : '🚶 无电梯' }}</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" align="center">
            <template #default="{ row }">
              <div class="table-op-row">
                <el-button link type="primary" size="small" @click.stop="openUnitEdit(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click.stop="removeUnit(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="该楼栋暂无单元" :image-size="64" />
          </template>
        </el-table>
      </section>

      <!-- 三级：房屋面板 -->
      <section class="cascade-panel house-panel">
        <div class="panel-head">
          <span class="panel-title">🏠 房屋 <em>{{ houses.length }}</em></span>
          <div class="panel-actions">
            <el-button size="small" :disabled="!currentUnitId" @click="openBatchDialog">⚡ 批量生成</el-button>
            <el-button type="primary" size="small" :icon="Plus" :disabled="!currentUnitId" @click="openHouseCreate">新增</el-button>
          </div>
        </div>
        <div v-if="!currentUnitId" class="panel-placeholder">
          <el-empty description="请先选择楼栋下的单元" :image-size="64" />
        </div>
        <el-table v-else v-loading="loadingHouses" :data="houses" class="cascade-table" max-height="560">
          <el-table-column prop="houseNo" label="门牌" width="72">
            <template #default="{ row }">
              <span class="h-no">{{ row.houseNo }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="floorNum" label="楼层" width="52" align="center">
            <template #default="{ row }">{{ row.floorNum }}F</template>
          </el-table-column>
          <el-table-column prop="area" label="面积(㎡)" width="76" align="right">
            <template #default="{ row }">{{ row.area ?? '—' }}</template>
          </el-table-column>
          <el-table-column prop="houseType" label="户型" min-width="88" show-overflow-tooltip>
            <template #default="{ row }">{{ row.houseType || '—' }}</template>
          </el-table-column>
          <el-table-column label="居住状态" width="88" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="LIVE_STATUS[row.liveStatus]?.type || 'info'">
                {{ LIVE_STATUS[row.liveStatus]?.label || '未知' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="92" align="center" fixed="right">
            <template #default="{ row }">
              <div class="table-op-row">
                <el-button link type="primary" size="small" @click="openHouseEdit(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click="removeHouse(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="该单元暂无房屋，可单个新增或批量生成" :image-size="64" />
          </template>
        </el-table>
      </section>
    </div>

    <!-- 楼栋表单 -->
    <el-dialog
      v-model="buildingDialog.visible"
      :title="buildingDialog.editing ? '编辑楼栋' : '新增楼栋'"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="buildingFormRef" :model="buildingForm" :rules="buildingRules" label-width="92px">
        <el-form-item label="楼栋名称" prop="buildingName">
          <el-input v-model="buildingForm.buildingName" placeholder="如：翠湖苑1号楼" maxlength="64" />
        </el-form-item>
        <el-form-item label="楼栋编号" prop="buildingNo">
          <el-input v-model="buildingForm.buildingNo" placeholder="如：1，小区内不可重复" maxlength="20" />
        </el-form-item>
        <div class="form-inline">
          <el-form-item label="单元数" prop="totalUnits">
            <el-input-number v-model="buildingForm.totalUnits" :min="1" :max="30" />
          </el-form-item>
          <el-form-item label="楼层数" prop="totalFloors">
            <el-input-number v-model="buildingForm.totalFloors" :min="1" :max="80" />
          </el-form-item>
        </div>
        <el-form-item label="楼栋长">
          <el-select v-model="buildingForm.gridOfficerId" placeholder="选择网格员（可不指定）" clearable style="width: 100%">
            <el-option
              v-for="o in officers"
              :key="o.id"
              :value="o.id"
              :label="`${o.realName}${o.phone ? ' · ' + o.phone : ''}`"
            />
          </el-select>
        </el-form-item>
        <template v-if="!buildingDialog.editing">
          <el-form-item label="台账初始化">
            <el-checkbox v-model="buildingForm.autoGenerate">按单元数与楼层数自动生成单元和房屋</el-checkbox>
          </el-form-item>
          <el-form-item v-if="buildingForm.autoGenerate" label="每层户数">
            <el-input-number v-model="buildingForm.housesPerFloor" :min="1" :max="8" />
            <span class="form-tip">门牌按「楼层 + 序号」生成，如 3 层 2 户为 301室、302室</span>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="buildingDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="buildingDialog.saving" @click="submitBuilding">保存</el-button>
      </template>
    </el-dialog>

    <!-- 单元表单 -->
    <el-dialog
      v-model="unitDialog.visible"
      :title="unitDialog.editing ? '编辑单元' : `新增单元（${currentBuilding?.buildingName || ''}）`"
      width="440px"
      :close-on-click-modal="false"
    >
      <el-form ref="unitFormRef" :model="unitForm" :rules="unitRules" label-width="92px">
        <el-form-item label="单元名称" prop="unitName">
          <el-input v-model="unitForm.unitName" placeholder="如：3单元" maxlength="32" />
        </el-form-item>
        <el-form-item label="单元编号" prop="unitNo">
          <el-input v-model="unitForm.unitNo" placeholder="如：3，楼栋内不可重复" maxlength="20" />
        </el-form-item>
        <el-form-item label="电梯配置">
          <el-radio-group v-model="unitForm.hasElevator">
            <el-radio-button :value="1">🛗 有电梯</el-radio-button>
            <el-radio-button :value="0">🚶 无电梯</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="unitDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="unitDialog.saving" @click="submitUnit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 房屋表单 -->
    <el-dialog
      v-model="houseDialog.visible"
      :title="houseDialog.editing ? '编辑房屋' : `新增房屋（${currentUnit?.unitName || ''}）`"
      width="460px"
      :close-on-click-modal="false"
    >
      <el-form ref="houseFormRef" :model="houseForm" :rules="houseRules" label-width="92px">
        <div class="form-inline">
          <el-form-item label="门牌号" prop="houseNo">
            <el-input v-model="houseForm.houseNo" placeholder="如 1801 或 1801室" maxlength="32" />
          </el-form-item>
          <el-form-item label="所在楼层" prop="floorNum">
            <el-input-number v-model="houseForm.floorNum" :min="-2" :max="80" />
          </el-form-item>
        </div>
        <div class="form-inline">
          <el-form-item label="面积(㎡)">
            <el-input-number v-model="houseForm.area" :min="1" :max="2000" :precision="2" :step="0.5" />
          </el-form-item>
          <el-form-item label="居住状态">
            <el-select v-model="houseForm.liveStatus" style="width: 140px">
              <el-option :value="1" label="业主自住" />
              <el-option :value="2" label="房屋出租" />
              <el-option :value="3" label="空置" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="户型">
          <el-input v-model="houseForm.houseType" placeholder="如：三室两厅，可留空" maxlength="32" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="houseDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="houseDialog.saving" @click="submitHouse">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量生成房屋 -->
    <el-dialog v-model="batchDialog.visible" title="批量生成房屋台账" width="480px" :close-on-click-modal="false">
      <p class="batch-tip">
        为 <strong>{{ currentBuilding?.buildingName }} · {{ currentUnit?.unitName }}</strong> 按楼层区间批量建档，
        门牌按「楼层 + 序号」生成（如 3 层 4 户为 301室 ~ 304室），已存在的门牌自动跳过。
      </p>
      <el-form :model="batchForm" label-width="92px">
        <div class="form-inline">
          <el-form-item label="起始楼层">
            <el-input-number v-model="batchForm.startFloor" :min="1" :max="80" />
          </el-form-item>
          <el-form-item label="结束楼层">
            <el-input-number v-model="batchForm.endFloor" :min="1" :max="80" />
          </el-form-item>
        </div>
        <el-form-item label="每层户数">
          <el-input-number v-model="batchForm.housesPerFloor" :min="1" :max="8" />
          <span class="form-tip">预计生成 {{ batchEstimate }} 户</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="batchDialog.saving" @click="submitBatchGen">开始生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { useCommunityStore } from '@/stores/community'
import type { Building, Unit, House } from '@/types'

const LIVE_STATUS: Record<number, { label: string; type: 'success' | 'warning' | 'info' }> = {
  1: { label: '业主自住', type: 'success' },
  2: { label: '房屋出租', type: 'warning' },
  3: { label: '空置', type: 'info' }
}

// 三级台账数据
const buildings = ref<Building[]>([])
const units = ref<Unit[]>([])
const houses = ref<House[]>([])
const officers = ref<{ id: string; realName: string; phone?: string }[]>([])

const currentBuildingId = ref('')
const currentUnitId = ref('')
const loadingBuildings = ref(false)
const loadingUnits = ref(false)
const loadingHouses = ref(false)

const currentBuilding = computed(() => buildings.value.find(b => b.id === currentBuildingId.value))
const currentUnit = computed(() => units.value.find(u => u.id === currentUnitId.value))
const officerMap = computed(() =>
  Object.fromEntries(officers.value.map(o => [o.id, o.realName])) as Record<string, string>
)

function rowClass(activeId: string) {
  return ({ row }: { row: { id: string } }) => (row.id === activeId ? 'active-row' : '')
}

const userStore = useUserStore()
const communityStore = useCommunityStore()
// 平台管理员顶栏切换的当前查看小区 (其余角色后端强制本人小区)
const communityParam = computed(() =>
  userStore.isSystemAdmin ? communityStore.selectedCommunityId : undefined
)
watch(() => communityStore.selectedId, () => {
  currentBuildingId.value = ''
  loadBuildings()
})

onMounted(() => {
  loadBuildings()
  loadOfficers()
})

// ==================== 级联加载 ====================

async function loadBuildings(preferId?: string) {
  loadingBuildings.value = true
  try {
    const res: any = await request.get('/grid/buildings', {
      params: { communityId: communityParam.value }
    })
    buildings.value = res || []
    const target =
      buildings.value.find(b => b.id === (preferId || currentBuildingId.value)) || buildings.value[0]
    if (target) {
      await selectBuilding(target.id)
    } else {
      currentBuildingId.value = ''
      units.value = []
      currentUnitId.value = ''
      houses.value = []
    }
  } finally {
    loadingBuildings.value = false
  }
}

async function selectBuilding(buildingId: string) {
  currentBuildingId.value = buildingId
  currentUnitId.value = ''
  houses.value = []
  loadingUnits.value = true
  try {
    const res: any = await request.get(`/grid/units/${buildingId}`)
    units.value = res || []
    const target = units.value[0]
    if (target) {
      await selectUnit(target.id)
    }
  } finally {
    loadingUnits.value = false
  }
}

async function selectUnit(unitId: string) {
  currentUnitId.value = unitId
  loadingHouses.value = true
  try {
    const res: any = await request.get(`/grid/houses/${unitId}`)
    houses.value = res || []
  } finally {
    loadingHouses.value = false
  }
}

async function loadOfficers() {
  try {
    const res: any = await request.get('/grid/admin/officers', {
      params: { communityId: communityParam.value }
    })
    officers.value = res || []
  } catch (e) {
    officers.value = []
  }
}

async function reloadHouses() {
  if (currentUnitId.value) await selectUnit(currentUnitId.value)
}

// ==================== 楼栋维护 ====================

const buildingFormRef = ref<FormInstance>()
const buildingDialog = reactive({ visible: false, editing: false, saving: false })
const buildingForm = reactive({
  id: '',
  buildingName: '',
  buildingNo: '',
  totalUnits: 1,
  totalFloors: 18,
  gridOfficerId: '',
  autoGenerate: true,
  housesPerFloor: 2
})
const buildingRules = {
  buildingName: [{ required: true, message: '请输入楼栋名称', trigger: 'blur' }],
  buildingNo: [{ required: true, message: '请输入楼栋编号', trigger: 'blur' }]
}

function nextBuildingNo(): string {
  const nums = buildings.value
    .map(b => parseInt(b.buildingNo, 10))
    .filter(n => !Number.isNaN(n))
  return String(nums.length ? Math.max(...nums) + 1 : 1)
}

function openBuildingCreate() {
  const no = nextBuildingNo()
  Object.assign(buildingForm, {
    id: '',
    buildingName: `${no}号楼`,
    buildingNo: no,
    totalUnits: 1,
    totalFloors: 18,
    gridOfficerId: '',
    autoGenerate: true,
    housesPerFloor: 2
  })
  buildingDialog.editing = false
  buildingDialog.visible = true
}

function openBuildingEdit(row: Building) {
  Object.assign(buildingForm, {
    id: row.id,
    buildingName: row.buildingName,
    buildingNo: row.buildingNo,
    totalUnits: row.totalUnits,
    totalFloors: row.totalFloors,
    gridOfficerId: row.gridOfficerId || '',
    autoGenerate: false,
    housesPerFloor: 2
  })
  buildingDialog.editing = true
  buildingDialog.visible = true
}

async function submitBuilding() {
  await buildingFormRef.value?.validate()
  // 平台管理员创建楼栋必须落到具体小区 (后端 resolveForCreate 校验)
  if (userStore.isSystemAdmin && !communityParam.value) {
    ElMessage.warning('请先在顶栏社区切换器中选择具体小区，再维护楼栋台账')
    return
  }
  buildingDialog.saving = true
  try {
    const payload: any = {
      id: buildingDialog.editing ? buildingForm.id : undefined,
      communityId: communityParam.value,
      buildingName: buildingForm.buildingName.trim(),
      buildingNo: buildingForm.buildingNo.trim(),
      totalUnits: buildingForm.totalUnits,
      totalFloors: buildingForm.totalFloors,
      gridOfficerId: buildingForm.gridOfficerId || null
    }
    if (buildingDialog.editing) {
      await request.put('/grid/admin/building', payload)
      ElMessage.success('楼栋信息已更新')
    } else {
      payload.autoGenerate = buildingForm.autoGenerate ? 1 : 0
      if (buildingForm.autoGenerate) payload.housesPerFloor = buildingForm.housesPerFloor
      const saved: any = await request.post('/grid/admin/building', payload)
      ElMessage.success(
        buildingForm.autoGenerate ? '楼栋已创建，单元与房屋台账已同步生成' : '楼栋已创建'
      )
      buildingDialog.visible = false
      await loadBuildings(saved?.id)
      return
    }
    buildingDialog.visible = false
    await loadBuildings(buildingForm.id)
  } finally {
    buildingDialog.saving = false
  }
}

async function removeBuilding(row: Building) {
  try {
    const houseCount = await countBuildingHouses(row.id)
    await ElMessageBox.confirm(
      `删除「${row.buildingName}」将同时删除其下 ${houseCount} 户房屋台账，且不可恢复。确定删除吗？`,
      '删除楼栋',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    )
    await request.delete(`/grid/admin/building/${row.id}`)
    ElMessage.success('楼栋及其下台账已删除')
    if (currentBuildingId.value === row.id) {
      currentBuildingId.value = ''
      currentUnitId.value = ''
      units.value = []
      houses.value = []
    }
    await loadBuildings()
  } catch (e) {}
}

async function countBuildingHouses(buildingId: string): Promise<number> {
  const unitList: any = await request.get(`/grid/units/${buildingId}`)
  let count = 0
  for (const u of unitList || []) {
    const list: any = await request.get(`/grid/houses/${u.id}`)
    count += (list || []).length
  }
  return count
}

// ==================== 单元维护 ====================

const unitFormRef = ref<FormInstance>()
const unitDialog = reactive({ visible: false, editing: false, saving: false })
const unitForm = reactive({ id: '', buildingId: '', unitName: '', unitNo: '', hasElevator: 1 })
const unitRules = {
  unitName: [{ required: true, message: '请输入单元名称', trigger: 'blur' }],
  unitNo: [{ required: true, message: '请输入单元编号', trigger: 'blur' }]
}

function openUnitCreate() {
  const no = String(units.value.length + 1)
  Object.assign(unitForm, {
    id: '',
    buildingId: currentBuildingId.value,
    unitName: `${no}单元`,
    unitNo: no,
    hasElevator: 1
  })
  unitDialog.editing = false
  unitDialog.visible = true
}

function openUnitEdit(row: Unit) {
  Object.assign(unitForm, {
    id: row.id,
    buildingId: row.buildingId,
    unitName: row.unitName,
    unitNo: row.unitNo,
    hasElevator: row.hasElevator
  })
  unitDialog.editing = true
  unitDialog.visible = true
}

async function submitUnit() {
  await unitFormRef.value?.validate()
  unitDialog.saving = true
  try {
    const payload = {
      id: unitDialog.editing ? unitForm.id : undefined,
      buildingId: currentBuildingId.value,
      unitName: unitForm.unitName.trim(),
      unitNo: unitForm.unitNo.trim(),
      hasElevator: unitForm.hasElevator
    }
    if (unitDialog.editing) {
      await request.put('/grid/admin/unit', payload)
      ElMessage.success('单元信息已更新')
    } else {
      const saved: any = await request.post('/grid/admin/unit', payload)
      ElMessage.success('单元已创建')
      unitDialog.visible = false
      await selectBuilding(saved?.buildingId || currentBuildingId.value)
      if (saved?.id) await selectUnit(saved.id)
      return
    }
    unitDialog.visible = false
    await selectBuilding(currentBuildingId.value)
    if (currentUnitId.value) await selectUnit(currentUnitId.value)
  } finally {
    unitDialog.saving = false
  }
}

async function removeUnit(row: Unit) {
  try {
    const list: any = await request.get(`/grid/houses/${row.id}`)
    const houseCount = (list || []).length
    await ElMessageBox.confirm(
      `删除「${row.unitName}」将同时删除其下 ${houseCount} 户房屋台账，且不可恢复。确定删除吗？`,
      '删除单元',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    )
    await request.delete(`/grid/admin/unit/${row.id}`)
    ElMessage.success('单元及其下台账已删除')
    if (currentUnitId.value === row.id) {
      currentUnitId.value = ''
      houses.value = []
    }
    await selectBuilding(currentBuildingId.value)
  } catch (e) {}
}

// ==================== 房屋维护 ====================

const houseFormRef = ref<FormInstance>()
const houseDialog = reactive({ visible: false, editing: false, saving: false })
const houseForm = reactive({
  id: '',
  houseNo: '',
  floorNum: 1,
  area: 98.5,
  houseType: '',
  liveStatus: 3
})
const houseRules = {
  houseNo: [{ required: true, message: '请输入门牌号', trigger: 'blur' }]
}

function openHouseCreate() {
  Object.assign(houseForm, {
    id: '',
    houseNo: '',
    floorNum: 1,
    area: 98.5,
    houseType: '',
    liveStatus: 3
  })
  houseDialog.editing = false
  houseDialog.visible = true
}

function openHouseEdit(row: House) {
  Object.assign(houseForm, {
    id: row.id,
    houseNo: row.houseNo,
    floorNum: row.floorNum,
    area: row.area ?? 98.5,
    houseType: row.houseType || '',
    liveStatus: row.liveStatus
  })
  houseDialog.editing = true
  houseDialog.visible = true
}

async function submitHouse() {
  await houseFormRef.value?.validate()
  houseDialog.saving = true
  try {
    const payload: any = {
      id: houseDialog.editing ? houseForm.id : undefined,
      unitId: currentUnitId.value,
      houseNo: houseForm.houseNo.trim(),
      floorNum: houseForm.floorNum,
      area: houseForm.area,
      houseType: houseForm.houseType.trim(),
      liveStatus: houseForm.liveStatus
    }
    if (houseDialog.editing) {
      await request.put('/grid/admin/house', payload)
      ElMessage.success('房屋信息已更新')
    } else {
      await request.post('/grid/admin/house', payload)
      ElMessage.success('房屋台账已创建')
    }
    houseDialog.visible = false
    await reloadHouses()
  } finally {
    houseDialog.saving = false
  }
}

async function removeHouse(row: House) {
  try {
    await ElMessageBox.confirm(
      `确定删除房屋「${row.houseNo}」的台账吗？`,
      '删除房屋',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    )
    await request.delete(`/grid/admin/house/${row.id}`)
    ElMessage.success('房屋台账已删除')
    await reloadHouses()
  } catch (e) {}
}

// ==================== 批量生成 ====================

const batchDialog = reactive({ visible: false, saving: false })
const batchForm = reactive({ startFloor: 1, endFloor: 18, housesPerFloor: 2 })

const batchEstimate = computed(() => {
  const floors = Math.max(0, (batchForm.endFloor || 0) - (batchForm.startFloor || 0) + 1)
  return floors * (batchForm.housesPerFloor || 0)
})

function openBatchDialog() {
  Object.assign(batchForm, { startFloor: 1, endFloor: currentBuilding.value?.totalFloors || 18, housesPerFloor: 2 })
  batchDialog.visible = true
}

async function submitBatchGen() {
  if (batchForm.endFloor < batchForm.startFloor) {
    ElMessage.warning('结束楼层不能小于起始楼层')
    return
  }
  batchDialog.saving = true
  try {
    const generated: any = await request.post('/grid/admin/house/batch', {
      unitId: currentUnitId.value,
      ...batchForm
    })
    ElMessage.success(`批量建档完成，本次生成 ${generated ?? 0} 户`)
    batchDialog.visible = false
    await reloadHouses()
  } finally {
    batchDialog.saving = false
  }
}
</script>

<style scoped>
.spatial-manage-view {
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

.cascade-layout {
  display: grid;
  grid-template-columns: 356px 220px 1fr;
  gap: 16px;
  align-items: start;
}

.cascade-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
  min-height: 320px;
  display: flex;
  flex-direction: column;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 8px;
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.panel-title em {
  font-style: normal;
  color: #16a34a;
  margin-left: 2px;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.cascade-table {
  width: 100%;
  flex: 1;
  cursor: pointer;
}

:deep(.cascade-table .cell) {
  padding: 0 6px;
}

:deep(.cascade-table .active-row) {
  background: #f0fdf4;
}

:deep(.cascade-table .active-row td) {
  background: transparent;
}

.b-name {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
}

.b-sub {
  font-size: 11.5px;
  color: #94a3b8;
  margin-top: 2px;
  white-space: nowrap;
}

.officer-name {
  white-space: nowrap;
}

.table-op-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
}

.table-op-row :deep(.el-button + .el-button) {
  margin-left: 0;
}

.officer-name {
  font-size: 12px;
  color: #475569;
}

.h-no {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.panel-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.house-panel {
  min-width: 0;
}

.form-inline {
  display: flex;
  gap: 8px;
}

.form-inline .el-form-item {
  flex: 1;
}

.form-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #94a3b8;
}

.batch-tip {
  font-size: 13px;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
  line-height: 1.7;
}

@media (max-width: 1200px) {
  .cascade-layout {
    grid-template-columns: 1fr 1fr;
  }

  .house-panel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .cascade-layout {
    grid-template-columns: 1fr;
  }
}
</style>
