<template>
  <div class="resident-layout">
    <!-- 顶部统一导航栏 (Cal.com 64px 纯白细边框风格) -->
    <header class="navbar">
      <div class="nav-container">
        <router-link to="/" class="brand">
          <span class="brand-icon">🏡</span>
          <div class="brand-text">
            <span class="brand-title">阳光翠竹苑</span>
            <span class="brand-sub">智慧治理服务平台</span>
          </div>
        </router-link>

        <!-- Cal 标志性 nav-pill-group 胶囊导航群 -->
        <nav class="nav-links cal-pill-group">
          <router-link to="/" class="nav-item cal-pill-item" exact-active-class="active">首页</router-link>
          <router-link to="/notices" class="nav-item cal-pill-item" active-class="active">社区公告</router-link>
          <router-link to="/orders" class="nav-item cal-pill-item" active-class="active">在线报修/投诉</router-link>
          <router-link to="/activities" class="nav-item cal-pill-item" active-class="active">文体活动</router-link>
          <router-link to="/market" class="nav-item cal-pill-item" active-class="active">闲置与互助</router-link>
        </nav>

        <div class="nav-actions">
          <!-- 全站快捷检索触发器 -->
          <button
            type="button"
            class="cal-search-trigger-btn desktop-only"
            title="全站聚合搜索 (快捷键 ⌘K)"
            @click="openOmniSearch()"
          >
            <el-icon :size="15"><Search /></el-icon>
            <span class="trigger-label">搜索...</span>
            <span class="trigger-kbd">⌘K</span>
          </button>

          <!-- 站内信未读提醒卡片 (NotificationPopover) -->
          <NotificationPopover v-if="userStore.isLoggedIn" />

          <!-- 综合指挥大屏直通入口 (具备管理/网格/物业权限时展示) -->
          <el-tooltip v-if="userStore.canAccessAdmin" content="打开智慧社区综合指挥大屏" placement="bottom">
            <el-button class="screen-btn desktop-only" :icon="DataAnalysis" @click="$router.push('/screen')">
              指挥大屏
            </el-button>
          </el-tooltip>

          <!-- 登录状态判断 (桌面端) -->
          <div class="desktop-auth-actions desktop-only">
            <template v-if="userStore.isLoggedIn">
              <el-dropdown trigger="hover">
                <div class="user-avatar-wrap" title="点击直接进入个人中心" @click="$router.push('/user/profile')">
                  <el-avatar :size="34" :src="userStore.user?.avatar" class="cal-avatar" />
                  <span class="user-name">{{ userStore.user?.realName || userStore.user?.username }}</span>
                  <span class="cal-role-badge">
                    {{ formatRole(userStore.user?.role) }}
                  </span>
                </div>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="userStore.canAccessAdmin" @click="$router.push('/admin/dashboard')">
                      <el-icon><Monitor /></el-icon> 管理工作台
                    </el-dropdown-item>
                    <el-dropdown-item @click="$router.push('/user/profile')">
                      <el-icon><User /></el-icon> 个人概览与资料
                    </el-dropdown-item>
                    <el-dropdown-item @click="$router.push('/user/profile?tab=orders')">
                      <el-icon><Document /></el-icon> 我的报修与工单
                    </el-dropdown-item>
                    <el-dropdown-item @click="$router.push('/user/profile?tab=tickets')">
                      <el-icon><Ticket /></el-icon> 我的活动入场券
                    </el-dropdown-item>
                    <el-dropdown-item @click="$router.push('/user/profile?tab=market')">
                      <el-icon><Bell /></el-icon> 我的闲置与私信
                    </el-dropdown-item>
                    <el-dropdown-item divided @click="handleLogout">
                      <el-icon><SwitchButton /></el-icon> 退出登录
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>

            <template v-else>
              <el-button link class="cal-link-btn" @click="$router.push('/login')">登录</el-button>
              <el-button type="primary" class="cal-primary-btn" @click="$router.push('/register')">居民注册</el-button>
            </template>
          </div>

          <!-- 移动端汉堡菜单触发按钮 -->
          <button type="button" class="mobile-menu-btn mobile-only" aria-label="打开菜单" @click="showMobileDrawer = true">
            <el-icon :size="20"><Menu /></el-icon>
          </button>
        </div>
      </div>
    </header>

    <!-- 主视图容器 (平滑页面切换) -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 全局快捷搜索弹窗 -->
    <GlobalOmniSearchModal ref="omniSearchRef" />

    <!-- 统一 Cal.com 风格深色页脚 (#101010) -->
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-grid">
          <div class="footer-col brand-col">
            <div class="footer-brand">
              <span class="footer-logo">🏡</span>
              <h3 class="footer-title">阳光翠竹苑 · 智慧社区</h3>
            </div>
            <p class="footer-desc">
              高效、温情、自主协同的现代化社区综合事务治理服务平台。
            </p>
            <div class="footer-pills">
              <span class="cal-footer-tag">现代化治理示范</span>
              <span class="cal-footer-tag">绿色低碳自治</span>
            </div>
          </div>

          <div class="footer-col">
            <h4 class="col-title">便民服务</h4>
            <ul class="col-links">
              <li><router-link to="/orders/submit?type=1">在线设施报修</router-link></li>
              <li><router-link to="/orders/submit?type=2">邻里诉求直通</router-link></li>
              <li><router-link to="/activities">社区公益活动</router-link></li>
              <li><router-link to="/market">闲置赠送与借用</router-link></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4 class="col-title">政务与服务中心</h4>
            <p class="footer-text">📍 杭州市西湖区文三西路888号邻里中心</p>
            <p class="footer-text">⏰ 便民大厅：工作日 08:30 - 17:30</p>
            <p class="footer-text">📞 24h应急报修：0571-88889999</p>
            <p class="footer-text">👮 网格联络热线：13800000004</p>
          </div>
        </div>

        <div class="footer-bottom">
          <p>© 2026 阳光翠竹苑智慧社区治理平台 · 工程示范项目 · 遵循 Cal.com 现代 SaaS 设计规范</p>
        </div>
      </div>
    </footer>

    <!-- 移动端常驻底部导航 TabBar (<= 900px) -->
    <nav class="mobile-bottom-bar mobile-only">
      <router-link to="/" class="tab-item" exact-active-class="active">
        <span class="tab-icon">🏡</span>
        <span class="tab-label">首页</span>
        <span class="active-indicator"></span>
      </router-link>
      <router-link to="/orders" class="tab-item" active-class="active">
        <span class="tab-icon">🛠️</span>
        <span class="tab-label">报修</span>
        <span class="active-indicator"></span>
      </router-link>
      <router-link to="/activities" class="tab-item" active-class="active">
        <span class="tab-icon">🎫</span>
        <span class="tab-label">活动</span>
        <span class="active-indicator"></span>
      </router-link>
      <router-link to="/market" class="tab-item" active-class="active">
        <span class="tab-icon">🛍️</span>
        <span class="tab-label">集市</span>
        <span class="active-indicator"></span>
      </router-link>
      <router-link to="/user/profile" class="tab-item" active-class="active">
        <el-badge :value="noticeStore.unreadCount" :hidden="noticeStore.unreadCount === 0" :max="99" class="tab-badge">
          <span class="tab-icon">👤</span>
        </el-badge>
        <span class="tab-label">我的</span>
        <span class="active-indicator"></span>
      </router-link>
    </nav>

    <!-- 移动端侧边抽屉菜单 (<= 900px) -->
    <el-drawer
      v-model="showMobileDrawer"
      direction="rtl"
      size="300px"
      :with-header="false"
      class="mobile-nav-drawer"
    >
      <div class="mobile-drawer-content">
        <div class="drawer-header">
          <div class="drawer-brand">
            <span class="brand-icon">🏡</span>
            <div>
              <div class="brand-title">阳光翠竹苑</div>
              <div class="brand-sub">智慧治理服务平台</div>
            </div>
          </div>
          <button type="button" class="drawer-close-btn" @click="showMobileDrawer = false">
            <el-icon :size="18"><Close /></el-icon>
          </button>
        </div>

        <!-- 用户身份卡片 -->
        <div v-if="userStore.isLoggedIn" class="drawer-user-card" @click="navTo('/user/profile')">
          <el-avatar :size="46" :src="userStore.user?.avatar" class="cal-avatar" />
          <div class="drawer-user-info">
            <div class="drawer-user-name">{{ userStore.user?.realName || userStore.user?.username }}</div>
            <div class="drawer-user-meta">
              <span class="cal-role-badge">{{ formatRole(userStore.user?.role) }}</span>
              <span class="drawer-credit">信用分 <strong>{{ userStore.user?.creditScore || 100 }}</strong></span>
            </div>
          </div>
        </div>
        <div v-else class="drawer-login-card">
          <p class="drawer-login-tip">登录体验智慧社区完整便民服务</p>
          <div class="drawer-auth-btns">
            <el-button size="small" class="w-full" @click="navTo('/login')">账号登录</el-button>
            <el-button type="primary" size="small" class="cal-primary-btn w-full" @click="navTo('/register')">实名注册</el-button>
          </div>
        </div>

        <!-- 快捷功能直通菜单 -->
        <div class="drawer-section">
          <div class="drawer-section-title">便民服务直达</div>
          <div class="drawer-nav-list">
            <div class="drawer-nav-item" @click="navTo('/')">
              <span class="item-icon">🏡</span>
              <span class="item-name">社区门户首页</span>
            </div>
            <div class="drawer-nav-item" @click="navTo('/notices')">
              <span class="item-icon">📢</span>
              <span class="item-name">重要公告与应急通报</span>
            </div>
            <div class="drawer-nav-item" @click="navTo('/orders/submit?type=1')">
              <span class="item-icon">🛠️</span>
              <span class="item-name">提报设施故障报修</span>
            </div>
            <div class="drawer-nav-item" @click="navTo('/orders/submit?type=2')">
              <span class="item-icon">📝</span>
              <span class="item-name">邻里诉求与物业建议</span>
            </div>
            <div class="drawer-nav-item" @click="navTo('/activities')">
              <span class="item-icon">🎫</span>
              <span class="item-name">社区文体与公益报名</span>
            </div>
            <div class="drawer-nav-item" @click="navTo('/market')">
              <span class="item-icon">🛍️</span>
              <span class="item-name">邻里闲置互助集市</span>
            </div>
          </div>
        </div>

        <!-- 个人中心与管理直达 -->
        <div v-if="userStore.isLoggedIn" class="drawer-section">
          <div class="drawer-section-title">居民中心与管理后台</div>
          <div class="drawer-nav-list">
            <div v-if="userStore.canAccessAdmin" class="drawer-nav-item highlight-item" @click="navTo('/screen')">
              <span class="item-icon">🖥️</span>
              <span class="item-name">智慧治理综合指挥大屏</span>
            </div>
            <div v-if="userStore.canAccessAdmin" class="drawer-nav-item highlight-item" @click="navTo('/admin/dashboard')">
              <span class="item-icon">📊</span>
              <span class="item-name">管理工作台控制台</span>
            </div>
            <div class="drawer-nav-item" @click="navTo('/user/profile')">
              <span class="item-icon">👤</span>
              <span class="item-name">个人概览与资料</span>
            </div>
            <div class="drawer-nav-item" @click="navTo('/user/profile?tab=tickets')">
              <span class="item-icon">🎟️</span>
              <span class="item-name">我的入场凭证与闲置</span>
            </div>
            <div class="drawer-nav-item" @click="navTo('/user/profile?tab=orders')">
              <span class="item-icon">📋</span>
              <span class="item-name">我的工单办理历史</span>
            </div>
          </div>
        </div>

        <!-- 便民服务热线 & 退出 -->
        <div class="drawer-footer-info">
          <div class="hotline-card">
            <div class="hotline-item">📞 应急热线：<strong>0571-88889999</strong></div>
            <div class="hotline-item">👮 网格联络：<strong>13800000004</strong></div>
          </div>
          <div v-if="userStore.isLoggedIn" class="logout-btn-wrap">
            <el-button type="danger" plain size="small" class="w-full" :icon="SwitchButton" @click="handleLogout">
              安全退出登录
            </el-button>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Bell,
  Search,
  DataAnalysis,
  Monitor,
  User,
  Document,
  SwitchButton,
  Ticket,
  Menu,
  Close
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useNoticeStore } from '@/stores/notice'
import { ElMessage } from 'element-plus'
import NotificationPopover from '@/components/common/NotificationPopover.vue'
import GlobalOmniSearchModal from '@/components/common/GlobalOmniSearchModal.vue'

const router = useRouter()
const userStore = useUserStore()
const noticeStore = useNoticeStore()
const showMobileDrawer = ref(false)
const omniSearchRef = ref<InstanceType<typeof GlobalOmniSearchModal> | null>(null)

function openOmniSearch(kw = '') {
  omniSearchRef.value?.open(kw)
}

provide('openOmniSearch', openOmniSearch)

function navTo(path: string) {
  showMobileDrawer.value = false
  router.push(path)
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    noticeStore.fetchUnreadCount()
  }
})

function formatRole(role?: string) {
  if (!role) return '居民'
  switch (role) {
    case 'ROLE_SYSTEM_ADMIN': return '系统管理'
    case 'ROLE_COMMUNITY_ADMIN': return '社区委'
    case 'ROLE_PROPERTY_ADMIN': return '物业调度'
    case 'ROLE_GRID_OFFICER': return '网格长'
    default: return '业主居民'
  }
}

async function handleLogout() {
  showMobileDrawer.value = false
  await userStore.logout()
  ElMessage.success('已安全退出登录')
  router.push('/login')
}
</script>

<style scoped>
.resident-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--cal-canvas);
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--cal-hairline);
  height: 64px;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}
.brand-icon {
  font-size: 26px;
}
.brand-title {
  display: block;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: var(--cal-ink);
}
.brand-sub {
  display: block;
  font-size: 11px;
  color: var(--cal-muted);
  letter-spacing: 0.2px;
}

.nav-links {
  display: flex;
  align-items: center;
}
.nav-item {
  text-decoration: none;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cal-search-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--cal-hairline);
  background: var(--cal-surface-soft);
  color: var(--cal-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.cal-search-trigger-btn:hover {
  background: var(--cal-canvas);
  border-color: #d1d5db;
  color: var(--cal-ink);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.cal-search-trigger-btn .trigger-label {
  font-size: 13px;
  color: var(--cal-muted);
}
.cal-search-trigger-btn .trigger-kbd {
  font-size: 11px;
  font-weight: 600;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  padding: 1px 5px;
  border-radius: 4px;
  color: #6b7280;
}

.cal-circle-btn {
  border-color: var(--cal-hairline);
  color: var(--cal-ink);
  background: var(--cal-canvas);
}
.cal-circle-btn:hover {
  background: var(--cal-surface-soft);
  border-color: var(--cal-ink);
}

.screen-btn {
  font-size: 13px;
  font-weight: 600;
  height: 36px;
  border-radius: var(--radius-md);
  border: 1px solid var(--cal-hairline);
  color: var(--cal-ink);
  background: var(--cal-surface-soft);
}
.screen-btn:hover {
  background: var(--cal-canvas);
  border-color: var(--cal-ink);
}

.cal-link-btn {
  font-size: 14px;
  font-weight: 500;
  color: var(--cal-muted);
}
.cal-link-btn:hover {
  color: var(--cal-ink);
}

.cal-primary-btn {
  font-size: 14px;
  font-weight: 600;
  height: 38px;
  padding: 0 18px;
  border-radius: var(--radius-md);
  background-color: var(--cal-primary);
  border-color: var(--cal-primary);
  color: var(--cal-on-primary);
}

.user-avatar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--cal-hairline);
  background: var(--cal-canvas);
  transition: all 0.2s ease;
}
.user-avatar-wrap:hover {
  border-color: var(--cal-ink);
  background: var(--cal-surface-soft);
}
.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--cal-ink);
}
.cal-role-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--cal-surface-card);
  color: var(--cal-muted);
  font-weight: 500;
}

.main-content {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Footer Cal.com 深色规范 (#101010) */
.footer {
  background-color: var(--cal-surface-dark);
  color: var(--cal-on-dark-soft);
  padding: 40px 0 24px 0;
  margin-top: 48px;
  border-top: 1px solid #1f1f1f;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1.5fr;
  gap: 36px;
  padding-bottom: 28px;
  border-bottom: 1px solid #242424;
}

.brand-col .footer-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.brand-col .footer-logo {
  font-size: 24px;
}
.brand-col .footer-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--cal-on-dark);
  letter-spacing: -0.3px;
}
.brand-col .footer-desc {
  font-size: 13px;
  line-height: 1.7;
  color: var(--cal-on-dark-soft);
  margin-bottom: 16px;
  max-width: 420px;
}
.footer-pills {
  display: flex;
  gap: 8px;
}
.cal-footer-tag {
  font-size: 11px;
  background: #1a1a1a;
  color: #a1a1aa;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  border: 1px solid #2e2e2e;
}

.col-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--cal-on-dark);
  margin-bottom: 16px;
  letter-spacing: 0.2px;
}
.col-links {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.col-links a {
  font-size: 13px;
  color: var(--cal-on-dark-soft);
  transition: color 0.15s ease;
}
.col-links a:hover {
  color: var(--cal-on-dark);
}

.footer-text {
  font-size: 13px;
  line-height: 1.8;
  color: var(--cal-on-dark-soft);
}

.footer-bottom {
  padding-top: 28px;
  text-align: center;
  font-size: 12px;
  color: #71717a;
}

/* 响应式辅助类 */
.mobile-only {
  display: none !important;
}

@media (max-width: 900px) {
  .mobile-only {
    display: flex !important;
  }
  .desktop-only {
    display: none !important;
  }

  .nav-links {
    display: none !important;
  }

  .nav-container {
    padding: 0 16px;
  }

  .brand-sub {
    display: none;
  }

  .brand-title {
    font-size: 16px;
  }

  .mobile-menu-btn {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--cal-hairline);
    background: var(--cal-canvas);
    color: var(--cal-ink);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .mobile-menu-btn:hover {
    background: var(--cal-surface-soft);
    border-color: var(--cal-ink);
  }

  .main-content {
    padding: 16px 14px calc(76px + env(safe-area-inset-bottom)) 14px;
  }

  .footer {
    padding: 36px 0 calc(90px + env(safe-area-inset-bottom)) 0;
    margin-top: 40px;
  }

  .footer-grid {
    grid-template-columns: 1fr;
    gap: 28px;
    padding-bottom: 32px;
  }
}

/* ==========================================================================
   移动端常驻底部导航 TabBar
   ========================================================================== */
.mobile-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid var(--cal-hairline);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 990;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
}

.tab-item {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--cal-muted);
  position: relative;
  transition: all 0.15s ease;
  padding: 4px 0;
}

.tab-icon {
  font-size: 19px;
  line-height: 1;
  margin-bottom: 2px;
}

.tab-label {
  font-size: 10px;
  font-weight: 500;
  line-height: 1.2;
}

.tab-item.active {
  color: var(--cal-ink);
}

.tab-item.active .tab-label {
  font-weight: 700;
  color: var(--cal-ink);
}

.active-indicator {
  position: absolute;
  bottom: calc(3px + env(safe-area-inset-bottom));
  width: 14px;
  height: 2.5px;
  border-radius: var(--radius-pill);
  background-color: var(--cal-ink);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.tab-item.active .active-indicator {
  opacity: 1;
}

.tab-badge :deep(.el-badge__content) {
  font-size: 10px;
  height: 14px;
  line-height: 14px;
  padding: 0 4px;
  top: -2px;
  right: -6px;
}

/* ==========================================================================
   移动端抽屉菜单样式 (Cal.com SaaS 规范)
   ========================================================================== */
:deep(.el-drawer.mobile-nav-drawer) {
  width: 300px !important;
  max-width: 85vw !important;
}

:deep(.el-drawer.open) {
  transform: translateX(0) !important;
}

.mobile-nav-drawer :deep(.el-drawer__body) {
  padding: 0;
  background-color: var(--cal-canvas);
}

.mobile-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 20px 16px calc(24px + env(safe-area-inset-bottom)) 16px;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--cal-hairline);
  margin-bottom: 16px;
}

.drawer-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-close-btn {
  background: none;
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-sm);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cal-muted);
  cursor: pointer;
}

.drawer-user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--cal-surface-soft);
  border-radius: var(--radius-md);
  border: 1px solid var(--cal-hairline);
  cursor: pointer;
  margin-bottom: 20px;
}

.drawer-user-info {
  flex: 1;
  min-width: 0;
}

.drawer-user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--cal-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-user-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.drawer-credit {
  font-size: 11px;
  color: var(--cal-muted);
}
.drawer-credit strong {
  color: #10b981;
}

.drawer-login-card {
  padding: 16px;
  background: var(--cal-surface-soft);
  border-radius: var(--radius-md);
  border: 1px solid var(--cal-hairline);
  margin-bottom: 20px;
}

.drawer-login-tip {
  font-size: 12px;
  color: var(--cal-muted);
  margin-bottom: 12px;
  text-align: center;
}

.drawer-auth-btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.drawer-section {
  margin-bottom: 20px;
}

.drawer-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--cal-muted-soft);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding-left: 6px;
}

.drawer-nav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.drawer-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--cal-body);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.drawer-nav-item:hover {
  background: var(--cal-surface-soft);
  color: var(--cal-ink);
}

.drawer-nav-item.highlight-item {
  background: #111111;
  color: #ffffff;
}

.drawer-footer-info {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--cal-hairline);
}

.hotline-card {
  font-size: 12px;
  color: var(--cal-muted);
  line-height: 1.8;
  margin-bottom: 12px;
}

.w-full {
  width: 100%;
}
</style>
