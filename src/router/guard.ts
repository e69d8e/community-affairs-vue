import type { Router } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

export function setupRouterGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore()

    // 动态修改网页标题
    const baseTitle = '社区综合事务管理系统'
    document.title = to.meta.title ? `${to.meta.title} - ${baseTitle}` : baseTitle

    // 检查登录要求
    if (to.meta.requiresAuth && !userStore.isLoggedIn) {
      ElMessage.warning('请先登录后再访问此功能')
      return next({ path: '/login', query: { redirect: to.fullPath } })
    }

    // 检查管理后台权限要求
    if (to.meta.requiresAdmin) {
      if (!userStore.canAccessAdmin) {
        ElMessage.error('您的账号角色非工作人员，暂无权限进入管理控制台')
        return next({ path: '/' })
      }
    }

    next()
  })
}
