<template>
  <div class="user-manage-view">
    <div class="page-header">
      <div>
        <h2 class="page-title">用户中心与权限管理</h2>
        <p class="page-sub">管理系统用户角色分配、账号启用与停用及居民信用积分</p>
      </div>
    </div>

    <!-- 直观角色快筛与搜索栏 -->
    <div class="filter-card card-hover">
      <el-radio-group v-model="filterRole" @change="handleRoleFilterChange">
        <el-radio-button value="">全部用户 ({{ total }})</el-radio-button>
        <el-radio-button value="ROLE_SYSTEM_ADMIN">👑 超级管理员</el-radio-button>
        <el-radio-button value="ROLE_COMMUNITY_ADMIN">🏛️ 社区管理员</el-radio-button>
        <el-radio-button value="ROLE_PROPERTY_ADMIN">🛠️ 物业管理员</el-radio-button>
        <el-radio-button value="ROLE_GRID_OFFICER">📋 楼栋网格员</el-radio-button>
        <el-radio-button value="ROLE_RESIDENT">🏡 社区居民</el-radio-button>
      </el-radio-group>

      <div class="search-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索用户名、姓名、手机号..."
          :prefix-icon="Search"
          clearable
          style="width: 240px"
          @keyup.enter="loadUsers"
          @clear="loadUsers"
        />
        <el-button type="primary" :icon="Search" @click="loadUsers">查询</el-button>
        <el-button :icon="Refresh" @click="resetFilter">重置</el-button>
      </div>
    </div>

    <!-- 表格卡片 -->
    <div class="table-card card-hover">
      <el-table v-loading="loading" :data="userList" style="width: 100%">
        <el-table-column prop="id" label="UID" width="90" />
        <el-table-column label="用户头像" width="90">
          <template #default="{ row }">
            <el-avatar :size="36" :src="row.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
          </template>
        </el-table-column>
        <el-table-column prop="username" label="登录账号" width="130" />
        <el-table-column prop="realName" label="真实姓名" width="120" />
        <el-table-column label="所属社区" width="150">
          <template #default="{ row }">
            <el-tag size="small" :type="row.communityId ? 'primary' : 'warning'" effect="plain">
              {{ communityNameOf(row.communityId) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column label="当前角色" width="160">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)">
              {{ getRoleName(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="社区信用分" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="row.creditScore >= 100 ? 'success' : (row.creditScore >= 80 ? 'warning' : 'danger')">
              {{ row.creditScore || 100 }} 分
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="账号状态" width="110">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              @change="(val: any) => handleToggleStatus(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="注册时间" width="160" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openRoleModal(row)">
              分配角色
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
          @current-change="loadUsers"
        />
      </div>
    </div>

    <!-- 角色分配弹窗（可视化卡片点选） -->
    <el-dialog v-model="showRoleModal" title="分配用户角色权限" width="480px">
      <div class="target-user-banner">
        <span>当前操作账号：<strong>{{ currentSelectUser?.realName }}</strong> ({{ currentSelectUser?.username }})</span>
      </div>

      <div class="role-card-list">
        <div
          v-for="r in roleOptions"
          :key="r.value"
          class="role-option-card"
          :class="{ active: selectedNewRole === r.value }"
          @click="selectedNewRole = r.value"
        >
          <span class="ro-icon">{{ r.icon }}</span>
          <div class="ro-info">
            <span class="ro-name">{{ r.label }}</span>
            <span class="ro-desc">{{ r.desc }}</span>
          </div>
          <span v-if="selectedNewRole === r.value" class="ro-check">✓</span>
        </div>
      </div>

      <template #footer>
        <el-button @click="showRoleModal = false">取消</el-button>
        <el-button type="primary" :loading="savingRole" @click="submitUpdateRole">确认保存权限</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { useCommunityStore } from '@/stores/community'
import type { UserInfo } from '@/types'

const loading = ref(false)
const userList = ref<UserInfo[]>([])
const page = ref(1)
const size = ref(10)
const total = ref(0)
const filterRole = ref<string>('')
const searchKeyword = ref('')

const showRoleModal = ref(false)
const currentSelectUser = ref<UserInfo | null>(null)
const selectedNewRole = ref('')
const savingRole = ref(false)

const roleOptions = [
  { value: 'ROLE_SYSTEM_ADMIN', icon: '👑', label: '系统超级管理员', desc: '全模块最高管理权限、用户权限分配与系统配置' },
  { value: 'ROLE_COMMUNITY_ADMIN', icon: '🏛️', label: '社区管委会管理员', desc: '发布公告、组织公益活动、工单调度与内容治理' },
  { value: 'ROLE_PROPERTY_ADMIN', icon: '🛠️', label: '物业管理员', desc: '负责社区报修工单施工处理与结案上传' },
  { value: 'ROLE_GRID_OFFICER', icon: '📋', label: '楼栋网格员', desc: '负责楼宇空间台账核验、房产认领审批与纠纷调解' },
  { value: 'ROLE_RESIDENT', icon: '🏡', label: '社区普通居民', desc: '浏览通知、报名活动、提交工单与邻里集市互动' }
]

const communityStore = useCommunityStore()
// 用户中心仅平台管理员可访问; 顶栏切换小区即按小区过滤用户
const communityParam = computed(() => communityStore.selectedCommunityId)
watch(() => communityStore.selectedId, () => {
  page.value = 1
  loadUsers()
})
onMounted(() => {
  communityStore.fetchCommunities()
  loadUsers()
})

function communityNameOf(communityId?: string | null) {
  if (!communityId) return '平台级'
  return communityStore.communities.find((c) => c.id === String(communityId))?.name || '-'
}

function handleRoleFilterChange() {
  page.value = 1
  loadUsers()
}

async function loadUsers() {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      size: size.value
    }
    if (filterRole.value) params.role = filterRole.value
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()
    if (communityParam.value) params.communityId = communityParam.value

    const res: any = await request.get('/user/admin/list', { params })
    userList.value = res.records || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filterRole.value = ''
  searchKeyword.value = ''
  page.value = 1
  loadUsers()
}

async function handleToggleStatus(row: UserInfo, newStatus: number) {
  try {
    await request.put('/user/admin/status', {
      userId: row.id,
      status: newStatus
    })
    ElMessage.success(`账号状态已成功调整为【${newStatus === 1 ? '启用' : '禁用'}】`)
  } catch (e) {
    row.status = newStatus === 1 ? 0 : 1
  }
}

function openRoleModal(row: UserInfo) {
  currentSelectUser.value = row
  selectedNewRole.value = row.role
  showRoleModal.value = true
}

async function submitUpdateRole() {
  if (!currentSelectUser.value) return
  savingRole.value = true
  try {
    await request.put('/user/admin/role', {
      userId: currentSelectUser.value.id,
      role: selectedNewRole.value
    })
    ElMessage.success('角色权限调整已生效！')
    showRoleModal.value = false
    await loadUsers()
  } finally {
    savingRole.value = false
  }
}

function getRoleName(role?: string) {
  switch (role) {
    case 'ROLE_SYSTEM_ADMIN': return '超级管理员'
    case 'ROLE_COMMUNITY_ADMIN': return '社区管理员'
    case 'ROLE_PROPERTY_ADMIN': return '物业管理员'
    case 'ROLE_GRID_OFFICER': return '楼栋网格员'
    default: return '社区普通居民'
  }
}

function getRoleTagType(role?: string) {
  switch (role) {
    case 'ROLE_SYSTEM_ADMIN': return 'danger'
    case 'ROLE_COMMUNITY_ADMIN': return 'warning'
    case 'ROLE_PROPERTY_ADMIN': return 'primary'
    case 'ROLE_GRID_OFFICER': return 'success'
    default: return 'info'
  }
}
</script>

<style scoped>
.user-manage-view {
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
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 20px;
}

.pagination-wrap {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.target-user-banner {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #334155;
  margin-bottom: 14px;
}

.role-card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-option-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s;
}

.role-option-card:hover {
  border-color: #86efac;
  background: #f8fafc;
}

.role-option-card.active {
  border-color: #16a34a;
  background: #f0fdf4;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.12);
}

.ro-icon {
  font-size: 22px;
}

.ro-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ro-name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.ro-desc {
  font-size: 12px;
  color: #64748b;
}

.ro-check {
  font-size: 16px;
  font-weight: 800;
  color: #16a34a;
}
</style>
