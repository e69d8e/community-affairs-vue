<template>
  <div class="activity-manage-view">
    <div class="page-header">
      <div>
        <h1 class="page-title">社区文体与公益活动管理</h1>
        <p class="page-sub">发布全区公益活动、管理报名名额与导出报名名单</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="showCreateModal = true">
          发布新社区活动
        </el-button>
      </div>
    </div>

    <!-- 快捷筛选与搜索栏 -->
    <div class="filter-bar card-hover">
      <el-radio-group v-model="statusFilter" size="default">
        <el-radio-button value="all">全部活动 ({{ activities.length }})</el-radio-button>
        <el-radio-button :value="1">🟢 报名中</el-radio-button>
        <el-radio-button :value="2">⏳ 待开展</el-radio-button>
        <el-radio-button :value="3">🔥 进行中</el-radio-button>
        <el-radio-button :value="4">🏁 已完结</el-radio-button>
      </el-radio-group>

      <search class="search-box" aria-label="活动搜索">
        <label for="admin-activity-search" class="visually-hidden">搜索活动名称、地点或分类</label>
        <el-input
          id="admin-activity-search"
          v-model="searchKeyword"
          type="search"
          enterkeyhint="search"
          placeholder="搜索活动名称、地点或分类..."
          :prefix-icon="SearchIcon"
          clearable
          style="width: 260px"
        />
      </search>
    </div>

    <!-- 活动列表表格 -->
    <div class="table-card card-hover">
      <div class="table-scroll-region" tabindex="0" role="region" aria-label="社区活动管理列表">
      <el-table v-loading="loading" :data="filteredActivities" style="width: 100%">
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.coverImage || DEFAULT_COVER"
              :alt="row.title"
              style="width: 70px; height: 46px; border-radius: 6px"
              fit="cover"
            />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="活动名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="110" />
        <el-table-column prop="location" label="地点" width="140" show-overflow-tooltip />
        <el-table-column label="报名进度" width="140">
          <template #default="{ row }">
            <div class="quota-cell">
              <span>{{ row.currentParticipants }} / {{ row.maxParticipants }} 人</span>
              <el-progress
                :percentage="Math.min(100, Math.round((row.currentParticipants / row.maxParticipants) * 100))"
                :stroke-width="4"
                :show-text="false"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="organizer" label="主办方" width="120" />
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button
              type="success"
              link
              size="small"
              @click="$router.push(`/admin/verify?activityId=${row.id}`)"
            >
              现场核销台
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click="handleExportRoster(row)"
            >
              导出名单
            </el-button>
            <el-button
              v-if="row.status === 1 || row.status === 2"
              type="danger"
              link
              size="small"
              @click="handleUpdateStatus(row, 5)"
            >
              取消活动
            </el-button>
            <el-button
              v-if="row.status === 3"
              type="warning"
              link
              size="small"
              @click="handleUpdateStatus(row, 4)"
            >
              置为已完结
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      </div>

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
    </div>

    <!-- 发布活动弹窗 -->
    <el-dialog v-model="showCreateModal" title="发布新社区文体公益活动" width="680px">
      <div class="quick-tpl-bar">
        <span class="qt-label">⚡ 一键填入示范模板：</span>
        <span
          v-for="tpl in activityTemplates"
          :key="tpl.label"
          class="qt-chip"
          @click="applyActivityTemplate(tpl)"
        >
          {{ tpl.label }}
        </span>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="活动标题" prop="title">
          <el-input v-model="form.title" placeholder="如：邻里金秋乒乓球友谊赛、社区长者智能手机教学" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="活动分类" prop="category">
              <el-select v-model="form.category" placeholder="请选择分类" class="w-full">
                <el-option label="邻里文体" value="邻里文体" />
                <el-option label="公益讲座" value="公益讲座" />
                <el-option label="亲子教育" value="亲子教育" />
                <el-option label="志愿服务" value="志愿服务" />
                <el-option label="节日庆典" value="节日庆典" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="名额上限" prop="maxParticipants">
              <el-input-number v-model="form.maxParticipants" :min="1" :max="500" class="w-full" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="活动地点" prop="location">
          <el-input v-model="form.location" placeholder="如：社区综合党群服务中心3楼多功能厅" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="报名开始时间" prop="signupStartTime">
              <el-date-picker v-model="form.signupStartTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" class="w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="报名截止时间" prop="signupEndTime">
              <el-date-picker v-model="form.signupEndTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" class="w-full" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="活动开始时间" prop="startTime">
              <el-date-picker v-model="form.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" class="w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="活动结束时间" prop="endTime">
              <el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" class="w-full" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="主办单位" prop="organizer">
              <el-input v-model="form.organizer" placeholder="如：社区居民委员会" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="咨询电话">
              <el-input v-model="form.contactPhone" placeholder="联系电话" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="活动封面图">
          <el-input v-model="form.coverImage" placeholder="海报图片URL或通过下方上传" />
          <div class="mt-2 flex gap-2 items-center">
            <el-button size="small" type="primary" plain :icon="Plus" @click="showCoverCropper = true">
              上传海报封面
            </el-button>
            <el-upload
              :show-file-list="false"
              :http-request="doCoverQuickUpload"
            >
              <el-button size="small" text>快速上传</el-button>
            </el-upload>
            <div v-if="form.coverImage" class="ml-2">
              <el-image :src="form.coverImage" style="width: 48px; height: 32px; border-radius: 4px;" fit="cover" />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="活动详细介绍" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="活动规则、参与须知及注意事项" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateModal = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreateActivity">确认发布</el-button>
      </template>
    </el-dialog>

    <!-- 活动海报封面上传弹窗 -->
    <ImageCropperModal
      v-model="showCoverCropper"
      title="上传海报封面"
      :aspect-ratio="16 / 9"
      :allow-aspect-change="true"
      upload-folder="activity"
      @success="(url) => form.coverImage = url"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Plus, Search as SearchIcon } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import request from '@/utils/request'
import { DEFAULT_COVER } from '@/constants/defaults'
import { uploadFile } from '@/utils/upload'
import { useUserStore } from '@/stores/user'
import { useCommunityStore } from '@/stores/community'
import ImageCropperModal from '@/components/common/ImageCropperModal.vue'
import type { Activity } from '@/types'

const userStore = useUserStore()
const communityStore = useCommunityStore()

// 平台管理员顶栏切换的当前查看小区 (其余角色后端强制本人小区)
const communityParam = computed(() =>
  userStore.isSystemAdmin ? communityStore.selectedCommunityId : undefined
)

watch(() => communityStore.selectedId, () => {
  page.value = 1
  loadActivities()
})

const loading = ref(false)
const activities = ref<Activity[]>([])
const page = ref(1)
const size = ref(10)
const total = ref(0)
const statusFilter = ref<'all' | number>('all')
const searchKeyword = ref('')

const filteredActivities = computed(() => {
  return activities.value.filter(act => {
    if (statusFilter.value !== 'all' && act.status !== statusFilter.value) return false
    if (searchKeyword.value.trim()) {
      const kw = searchKeyword.value.trim().toLowerCase()
      const matchTitle = act.title?.toLowerCase().includes(kw)
      const matchLoc = act.location?.toLowerCase().includes(kw)
      const matchCat = act.category?.toLowerCase().includes(kw)
      if (!matchTitle && !matchLoc && !matchCat) return false
    }
    return true
  })
})

const showCreateModal = ref(false)
const showCoverCropper = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  title: '',
  category: '邻里文体',
  location: '',
  maxParticipants: 30,
  signupStartTime: '',
  signupEndTime: '',
  startTime: '',
  endTime: '',
  organizer: '社区居委会',
  contactPhone: '010-88886666',
  coverImage: '',
  description: '',
  status: 1
})

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

const activityTemplates = [
  {
    label: '🏓 邻里金秋乒乓球赛',
    title: '邻里金秋杯乒乓球友谊赛',
    category: '邻里文体',
    location: '社区党群服务中心2楼文体活动室',
    maxParticipants: 32,
    organizer: '社区居委会文体组',
    coverImage: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?w=600',
    description: '为丰富社区居民业余文化生活，增进邻里情谊，特举办本次乒乓球友谊赛。比赛采用三局两胜制，提供饮用水及纪念奖品，欢迎各位球友踊跃报名！'
  },
  {
    label: '📱 长者智能手机公益课堂',
    title: '银龄跨越数字鸿沟 · 智能手机应用公益课堂',
    category: '公益讲座',
    location: '社区综合服务中心3楼多功能厅',
    maxParticipants: 40,
    organizer: '社区青年志愿者服务队',
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600',
    description: '手把手教社区长者使用微信视频、线上挂号、生活缴费及防电信诈骗技巧，现场志愿者一对一辅导。'
  },
  {
    label: '🌱 周末绿植认养与环保日',
    title: '共建绿色家园 · 周末多肉盆栽DIY与旧物置换日',
    category: '亲子教育',
    location: '小区中心花园阳光草坪',
    maxParticipants: 50,
    organizer: '社区居委会 & 物业绿化部',
    coverImage: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=600',
    description: '携带家中闲置书籍或空塑料瓶即可现场免费领养多肉绿植一盆，专业园艺师现场指导亲子盆栽种植。'
  }
]

function applyActivityTemplate(tpl: any) {
  const now = new Date()
  const signupEnd = new Date(now.getTime() + 3 * 24 * 3600 * 1000)
  const actStart = new Date(now.getTime() + 4 * 24 * 3600 * 1000)
  actStart.setHours(9, 30, 0, 0)
  const actEnd = new Date(actStart.getTime() + 2.5 * 3600 * 1000)

  form.title = tpl.title
  form.category = tpl.category
  form.location = tpl.location
  form.maxParticipants = tpl.maxParticipants
  form.organizer = tpl.organizer
  form.coverImage = tpl.coverImage
  form.description = tpl.description
  form.signupStartTime = formatDateTime(now)
  form.signupEndTime = formatDateTime(signupEnd)
  form.startTime = formatDateTime(actStart)
  form.endTime = formatDateTime(actEnd)
  ElMessage.success(`已填入【${tpl.label}】模板及默认排期时间`)
}

const rules: FormRules = {
  title: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  location: [{ required: true, message: '请输入地点', trigger: 'blur' }],
  maxParticipants: [{ required: true, message: '请输入名额上限', trigger: 'blur' }],
  signupStartTime: [{ required: true, message: '请选择报名开启时间', trigger: 'change' }],
  signupEndTime: [{ required: true, message: '请选择报名截止时间', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  organizer: [{ required: true, message: '请输入主办单位', trigger: 'blur' }],
  description: [{ required: true, message: '请输入活动详情介绍', trigger: 'blur' }]
}

// 快速上传封面：自定义 http-request 走秒传预检封装（SHA-256 命中免传输）
async function doCoverQuickUpload(option: any) {
  try {
    const { url, instant } = await uploadFile(option.file, 'activity')
    form.coverImage = url
    option.onSuccess({ data: { url, instant } })
  } catch (err: any) {
    option.onError(err)
    ElMessage.error(err?.message || '封面上传失败，请重试')
  }
}

onMounted(() => {
  loadActivities()
})

async function loadActivities() {
  loading.value = true
  try {
    const res: any = await request.get('/activity/list', {
      params: { page: page.value, size: size.value, communityId: communityParam.value }
    })
    activities.value = res.records || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

async function handleCreateActivity() {
  if (!formRef.value) return
  await formRef.value.validate()

  if (userStore.isSystemAdmin && !communityParam.value) {
    ElMessage.warning('请先在顶栏社区切换器中选择具体小区，再创建活动')
    return
  }
  submitting.value = true
  try {
    await request.post('/activity/admin/create', { ...form, communityId: communityParam.value })
    ElMessage.success('活动发布成功！已在居民端同步上线')
    showCreateModal.value = false
    await loadActivities()
  } finally {
    submitting.value = false
  }
}

async function handleUpdateStatus(row: Activity, status: number) {
  try {
    await request.put('/activity/admin/status', {
      activityId: row.id,
      status: status
    })
    ElMessage.success('活动状态更新成功')
    await loadActivities()
  } catch (e) {}
}

async function handleExportRoster(row: Activity) {
  try {
    const res: any = await request.get(`/activity/admin/export/${row.id}`, { responseType: 'blob' })
    const blob = new Blob([res.data || res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `活动报名花名册_${row.title}_${Date.now()}.xlsx`
    link.click()
    URL.revokeObjectURL(link.href)
    ElMessage.success('活动花名册导出成功！')
  } catch (e) {
    ElMessage.error('导出活动花名册失败')
  }
}

function getStatusText(status: number) {
  switch (status) {
    case 1: return '报名中'
    case 2: return '报名截止待开展'
    case 3: return '进行中'
    case 4: return '已完结'
    case 5: return '已取消'
    default: return '待发布'
  }
}

function getStatusTag(status: number) {
  switch (status) {
    case 1: return 'success'
    case 2: return 'warning'
    case 3: return 'primary'
    case 4: return 'info'
    default: return 'info'
  }
}
</script>

<style scoped>
.activity-manage-view {
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

.filter-bar {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.table-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 20px;
}

.quota-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.pagination-wrap {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.quick-tpl-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
}

.qt-label {
  font-size: 12px;
  font-weight: 700;
  color: #15803d;
}

.qt-chip {
  font-size: 12px;
  padding: 4px 12px;
  background: #ffffff;
  border: 1px solid #86efac;
  border-radius: 999px;
  color: #166534;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.qt-chip:hover {
  background: #dcfce7;
  border-color: #22c55e;
}
</style>
