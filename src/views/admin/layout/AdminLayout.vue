<template>
  <div class="admin-layout">
    <!-- 移动端暗色背景遮罩 -->
    <div v-if="mobileMenuOpen" class="sidebar-backdrop" @click="mobileMenuOpen = false"></div>

    <!-- 侧边导航栏 (Cal.com surface-dark: #101010) -->
    <aside :class="['sidebar', { collapsed: isCollapsed, 'mobile-open': mobileMenuOpen }]">
      <div class="sidebar-header">
        <span class="logo-icon">🏡</span>
        <span v-if="!isCollapsed || mobileMenuOpen" class="logo-text">事务治理工作台</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed && !mobileMenuOpen"
        class="admin-menu"
        background-color="#101010"
        text-color="#a1a1aa"
        active-text-color="#ffffff"
        router
        @select="handleMenuSelect"
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataBoard /></el-icon>
          <template #title>管理工作台</template>
        </el-menu-item>

        <el-menu-item index="/admin/grid">
          <el-icon><OfficeBuilding /></el-icon>
          <template #title>网格空间与房产认证</template>
        </el-menu-item>

        <el-menu-item v-if="userStore.canManageSpatial" index="/admin/spatial">
          <el-icon><Grid /></el-icon>
          <template #title>楼宇空间结构维护</template>
        </el-menu-item>

        <el-menu-item index="/admin/orders">
          <el-icon><Tools /></el-icon>
          <template #title>工单流转与派单处置</template>
        </el-menu-item>

        <el-menu-item v-if="userStore.canManageActivities" index="/admin/activities">
          <el-icon><Calendar /></el-icon>
          <template #title>社区文体活动管理</template>
        </el-menu-item>

        <el-menu-item v-if="userStore.canVerifySignup" index="/admin/verify">
          <el-icon><Aim /></el-icon>
          <template #title>现场扫码核销签到</template>
        </el-menu-item>

        <el-sub-menu v-if="userStore.canHandleReports || userStore.canManageWords" index="moderation">
          <template #title>
            <el-icon><Warning /></el-icon>
            <span>内容合规与风控</span>
          </template>
          <el-menu-item v-if="userStore.canHandleReports" index="/admin/moderation/reports">违规举报受理</el-menu-item>
          <el-menu-item v-if="userStore.canManageWords" index="/admin/moderation/words">敏感词过滤库</el-menu-item>
        </el-sub-menu>

        <el-menu-item v-if="userStore.canManageUsers" index="/admin/system/users">
          <el-icon><User /></el-icon>
          <template #title>用户中心与权限管理</template>
        </el-menu-item>
      </el-menu>

      <div v-if="!isCollapsed || mobileMenuOpen" class="sidebar-footer">
        <button type="button" class="sidebar-logout-btn" @click="handleUserCommand('logout')">
          <el-icon><SwitchButton /></el-icon>
          <span>安全退出登录</span>
        </button>
      </div>
    </aside>

    <!-- 右侧主体内容容器 -->
    <div class="main-container">
      <!-- 顶栏 Header (64px / 移动端 56px) -->
      <header class="topbar">
        <div class="topbar-left">
          <button type="button" class="collapse-btn" aria-label="切换侧边栏" @click="toggleSidebar">
            <el-icon><Fold v-if="!isCollapsed && !mobileMenuOpen" /><Expand v-else /></el-icon>
          </button>
          <span class="role-badge">{{ getRoleTitle(userStore.user?.role) }}</span>

          <!-- 平台管理员的跨社区数据视图切换 (其余角色由后端强制本小区) -->
          <el-select
            v-if="userStore.isSystemAdmin"
            v-model="communityStore.selectedId"
            class="community-switcher"
            size="small"
            @change="communityStore.select(communityStore.selectedId)"
          >
            <el-option label="全部小区" value="all" />
            <el-option
              v-for="c in communityStore.communities"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </div>

        <div class="topbar-right">
          <!-- 消息通知中心卡片 -->
          <NotificationPopover />

          <!-- 综合指挥大屏快捷入口 (社区管理员监管职责) -->
          <router-link v-if="userStore.canViewScreen" to="/screen" target="_blank" class="screen-btn-link">
            <el-button class="cal-screen-btn" size="small">
              <span class="btn-text-full">🖥️ 综合指挥大屏</span>
              <span class="btn-text-mini">🖥️ 大屏</span>
            </el-button>
          </router-link>

          <!-- 返回居民端门户 -->
          <router-link to="/">
            <el-button size="small" class="portal-btn">
              <span class="btn-text-full">🏡 居民门户首页</span>
              <span class="btn-text-mini">🏡 门户</span>
            </el-button>
          </router-link>

          <!-- 用户头像与下拉菜单 -->
          <el-dropdown trigger="click" @command="handleUserCommand">
            <div class="user-dropdown-btn">
              <el-avatar :size="30" :src="userStore.user?.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
              <span class="user-name">{{ userStore.user?.realName || userStore.user?.username }}</span>
              <el-icon class="arrow-icon"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="portal">🏡 居民门户首页</el-dropdown-item>
                <el-dropdown-item v-if="userStore.canViewScreen" command="screen">🖥️ 综合指挥大屏</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出管理控制台</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 页面视图主体内容 -->
      <main class="content-body">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  DataBoard,
  OfficeBuilding,
  Grid,
  Tools,
  Calendar,
  Aim,
  Warning,
  User,
  Fold,
  Expand,
  ArrowDown,
  SwitchButton
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useCommunityStore } from '@/stores/community'
import NotificationPopover from '@/components/common/NotificationPopover.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const communityStore = useCommunityStore()

onMounted(() => {
  if (userStore.isSystemAdmin) {
    communityStore.fetchCommunities()
  }
})

const isCollapsed = ref(false)
const mobileMenuOpen = ref(false)

const activeMenu = computed(() => route.path)

function toggleSidebar() {
  if (window.innerWidth <= 768) {
    mobileMenuOpen.value = !mobileMenuOpen.value
  } else {
    isCollapsed.value = !isCollapsed.value
  }
}

function handleMenuSelect() {
  if (window.innerWidth <= 768) {
    mobileMenuOpen.value = false
  }
}

async function handleUserCommand(cmd: string) {
  mobileMenuOpen.value = false
  if (cmd === 'profile') {
    router.push('/user/profile')
  } else if (cmd === 'portal') {
    router.push('/')
  } else if (cmd === 'screen') {
    router.push('/screen')
  } else if (cmd === 'logout') {
    await userStore.logout()
    ElMessage.success('已安全退出登录')
    router.push('/login')
  }
}

function getRoleTitle(role?: string) {
  switch (role) {
    case 'ROLE_SYSTEM_ADMIN': return '超级管理员工作台'
    case 'ROLE_COMMUNITY_ADMIN': return '社区管委会协同台'
    case 'ROLE_PROPERTY_ADMIN': return '物业调度管理中心'
    case 'ROLE_GRID_OFFICER': return '网格联络员终端'
    default: return '综合事务治理端'
  }
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--cal-surface-soft);
}

.sidebar {
  width: 250px;
  background: var(--cal-surface-dark);
  display: flex;
  flex-direction: column;
  transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  border-right: 1px solid #1f1f1f;
  z-index: 50;
}

.sidebar.collapsed {
  width: 68px;
}

.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  border-bottom: 1px solid #1f1f1f;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.2px;
  white-space: nowrap;
}

.admin-menu {
  border-right: none;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 8px;
}

.sidebar-footer {
  flex-shrink: 0;
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid #1f1f1f;
}

.sidebar-logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid #3f1d1d;
  background: #1a0f0f;
  color: #f87171;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sidebar-logout-btn:hover {
  background: #2a1414;
  border-color: #7f1d1d;
  color: #fca5a5;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  border-radius: var(--radius-md) !important;
  margin: 4px 0;
  height: 44px;
  line-height: 44px;
  font-size: 13px;
  font-weight: 500;
  color: #a1a1aa !important;
  transition: all 0.15s ease;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background-color: #1a1a1a !important;
  color: #ffffff !important;
}

:deep(.el-menu-item.is-active) {
  background-color: #1f1f1f !important;
  color: #ffffff !important;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  height: 64px;
  background: var(--cal-canvas);
  border-bottom: 1px solid var(--cal-hairline);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--cal-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 6px;
  border-radius: var(--radius-sm);
  transition: all 0.15s;
}
.collapse-btn:hover {
  background: var(--cal-surface-soft);
  color: var(--cal-ink);
}

.role-badge {
  background: var(--cal-surface-card);
  color: var(--cal-ink);
  font-size: 12px;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--cal-hairline);
}

.community-switcher {
  width: 180px;
}

@media (max-width: 768px) {
  .community-switcher {
    width: 130px;
  }
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.cal-screen-btn {
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius-md);
  background: #111111;
  color: #ffffff;
  border: 1px solid #111111;
}
.cal-screen-btn:hover {
  background: #242424;
  border-color: #242424;
  color: #ffffff;
}

.portal-btn {
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-md);
  border: 1px solid var(--cal-hairline);
  color: var(--cal-ink);
  background: var(--cal-canvas);
}
.portal-btn:hover {
  background: var(--cal-surface-soft);
  border-color: var(--cal-ink);
}

.user-dropdown-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--cal-hairline);
  transition: all 0.15s;
}
.user-dropdown-btn:hover {
  background: var(--cal-surface-soft);
  border-color: var(--cal-ink);
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--cal-ink);
}

.btn-text-mini {
  display: none;
}

.content-body {
  flex: 1;
  padding: 28px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .btn-text-full {
    display: none;
  }
  .btn-text-mini {
    display: inline;
  }
  .screen-btn-link {
    display: none;
  }

  /* 移动端侧边栏抽屉模式 */
  .sidebar {
    position: fixed !important;
    top: 0;
    bottom: 0;
    left: 0;
    width: 260px !important;
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
    z-index: 1000;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.45);
  }
  .sidebar.mobile-open {
    transform: translateX(0) !important;
  }
  .sidebar.collapsed {
    width: 260px !important;
  }

  .sidebar-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 999;
  }

  .topbar {
    height: 56px;
    padding: 0 12px;
  }
  .topbar-left {
    gap: 8px;
    min-width: 0;
  }
  .role-badge {
    display: none;
  }
  .topbar-right {
    gap: 8px;
    flex-shrink: 0;
  }
  .user-name {
    display: none;
  }
  .user-dropdown-btn {
    padding: 3px 6px;
  }
  .user-dropdown-btn .arrow-icon {
    display: none;
  }

  .content-body {
    padding: 16px 12px;
  }
}
</style>
