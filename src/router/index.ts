import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { setupRouterGuard } from './guard'

const routes: RouteRecordRaw[] = [
  // 居民前台门户布局路由
  {
    path: '/',
    component: () => import('@/views/resident/layout/ResidentLayout.vue'),
    children: [
      {
        path: '',
        name: 'ResidentHome',
        component: () => import('@/views/resident/home/HomeView.vue'),
        meta: { title: '社区门户首页' }
      },
      {
        path: 'notices',
        name: 'ResidentNoticeList',
        component: () => import('@/views/resident/notice/NoticeView.vue'),
        meta: { title: '通知通告中心' }
      },
      {
        path: 'notices/:id',
        name: 'ResidentNoticeDetail',
        component: () => import('@/views/resident/notice/NoticeDetailView.vue'),
        meta: { title: '公告详情' }
      },
      {
        path: 'orders',
        name: 'ResidentOrderList',
        component: () => import('@/views/resident/order/OrderListView.vue'),
        meta: { title: '我的报修与投诉', requiresAuth: true }
      },
      {
        path: 'orders/submit',
        name: 'ResidentOrderSubmit',
        component: () => import('@/views/resident/order/OrderSubmitView.vue'),
        meta: { title: '在线申报工单', requiresAuth: true }
      },
      {
        path: 'orders/:id',
        name: 'ResidentOrderDetail',
        component: () => import('@/views/resident/order/OrderDetailView.vue'),
        meta: { title: '工单跟踪详情', requiresAuth: true }
      },
      {
        path: 'activities',
        name: 'ResidentActivityList',
        component: () => import('@/views/resident/activity/ActivityListView.vue'),
        meta: { title: '社区活动报名' }
      },
      {
        path: 'activities/:id',
        name: 'ResidentActivityDetail',
        component: () => import('@/views/resident/activity/ActivityDetailView.vue'),
        meta: { title: '活动详情与核销码' }
      },
      {
        path: 'market',
        name: 'ResidentMarketList',
        component: () => import('@/views/resident/market/MarketListView.vue'),
        meta: { title: '邻里互助与二手集市' }
      },
      {
        path: 'market/:id',
        name: 'ResidentMarketDetail',
        component: () => import('@/views/resident/market/MarketDetailView.vue'),
        meta: { title: '物品与求助详情' }
      },
      {
        path: 'user/profile',
        name: 'ResidentUserProfile',
        component: () => import('@/views/resident/user/UserProfileView.vue'),
        meta: { title: '居民个人中心', requiresAuth: true }
      },
      {
        path: 'user/records',
        name: 'ResidentUserRecords',
        redirect: (to) => ({
          path: '/user/profile',
          query: { ...to.query, tab: (to.query.tab as string) || 'tickets' }
        })
      }
    ]
  },

  // 中后台综合治理控制台路由
  {
    path: '/admin',
    component: () => import('@/views/admin/layout/AdminLayout.vue'),
    redirect: '/admin/dashboard',
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/dashboard/DashboardView.vue'),
        meta: { title: '管理工作台首页' }
      },
      {
        path: 'grid',
        name: 'AdminGrid',
        component: () => import('@/views/admin/grid/GridManageView.vue'),
        meta: { title: '网格空间与房产认证' }
      },
      {
        path: 'orders',
        name: 'AdminOrders',
        component: () => import('@/views/admin/order/OrderManageView.vue'),
        meta: { title: '工单审核与派单处置' }
      },
      {
        path: 'activities',
        name: 'AdminActivities',
        component: () => import('@/views/admin/activity/ActivityManageView.vue'),
        meta: { title: '文体公益活动管理' }
      },
      {
        path: 'verify',
        name: 'AdminVerify',
        component: () => import('@/views/admin/activity/VerifyScanView.vue'),
        meta: { title: '现场扫码核销签到' }
      },
      {
        path: 'moderation/reports',
        name: 'AdminReports',
        component: () => import('@/views/admin/moderation/ReportManageView.vue'),
        meta: { title: '违规与纠纷举报处理' }
      },
      {
        path: 'moderation/words',
        name: 'AdminWords',
        component: () => import('@/views/admin/moderation/WordManageView.vue'),
        meta: { title: '敏感词库与合规拦截' }
      },
      {
        path: 'system/users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/system/UserManageView.vue'),
        meta: { title: '用户中心与权限管理' }
      }
    ]
  },

  // 指挥大屏驾驶舱 (独立无边框全屏展示)
  {
    path: '/screen',
    name: 'CommandScreen',
    component: () => import('@/views/screen/CommandScreenView.vue'),
    meta: { title: '智慧社区综合治理指挥大屏', requiresAuth: true, requiresAdmin: true }
  },

  // 登录与注册
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { title: '用户登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { title: '新居民在线注册' }
  },

  // 404 回退
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

setupRouterGuard(router)

export default router
