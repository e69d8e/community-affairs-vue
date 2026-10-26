import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo } from '@/types'
import request from '@/utils/request'
import { stompService } from '@/utils/websocket'
import { hasPermission, STAFF_ROLES, type PermissionKey } from '@/constants/permissions'
import { useNoticeStore } from './notice'

function getInitialUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem('user')
    if (!raw || raw === 'undefined' || raw === 'null') return null
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const user = ref<UserInfo | null>(getInitialUser())

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isSystemAdmin = computed(() => user.value?.role === 'ROLE_SYSTEM_ADMIN')
  const isCommunityAdmin = computed(() => user.value?.role === 'ROLE_COMMUNITY_ADMIN' || isSystemAdmin.value)
  const isPropertyAdmin = computed(() => user.value?.role === 'ROLE_PROPERTY_ADMIN')
  const isGridOfficer = computed(() => user.value?.role === 'ROLE_GRID_OFFICER')
  const isResident = computed(() => user.value?.role === 'ROLE_RESIDENT')

  // 是否具备后台管理权限 (管理员/网格员/物业)
  const canAccessAdmin = computed(() => {
    if (!user.value) return false
    return STAFF_ROLES.includes(user.value.role)
  })

  // 与后端 @PreAuthorize 对齐的功能权限点,详见 @/constants/permissions.ts
  const canManageUsers = computed(() => hasPermission(user.value?.role, 'manageUsers'))
  const canManageWords = computed(() => hasPermission(user.value?.role, 'manageWords'))
  const canSyncSearch = computed(() => hasPermission(user.value?.role, 'syncSearch'))
  const canManageActivities = computed(() => hasPermission(user.value?.role, 'manageActivities'))
  const canViewScreen = computed(() => hasPermission(user.value?.role, 'viewScreen'))
  const canVerifySignup = computed(() => hasPermission(user.value?.role, 'verifySignup'))
  const canHandleReports = computed(() => hasPermission(user.value?.role, 'handleReports'))
  const canPublishNotice = computed(() => hasPermission(user.value?.role, 'publishNotice'))
  const canHandleOrder = computed(() => hasPermission(user.value?.role, 'handleOrder'))
  const canExportOrder = computed(() => hasPermission(user.value?.role, 'exportOrder'))
  const canAuditOrder = computed(() => hasPermission(user.value?.role, 'auditOrder'))
  const canManageGrid = computed(() => hasPermission(user.value?.role, 'manageGrid'))
  const canManageSpatial = computed(() => hasPermission(user.value?.role, 'manageSpatial'))

  /** 通用权限判断(编程式调用场景) */
  function can(permission: PermissionKey): boolean {
    return hasPermission(user.value?.role, permission)
  }

  function setAuth(newToken: string, newUser: UserInfo) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))

    // 建立 STOMP 实时通信通道，并接通未读数与应急通告回调
    const noticeStore = useNoticeStore()
    stompService.connect(
      newToken,
      () => noticeStore.fetchUnreadCount(),
      (notice) => noticeStore.setEmergency(notice)
    )
    noticeStore.fetchUnreadCount()
  }

  async function fetchCurrentUser() {
    if (!token.value) return null
    try {
      const res: any = await request.get('/auth/current')
      user.value = res
      localStorage.setItem('user', JSON.stringify(res))
      return res
    } catch (e) {
      return null
    }
  }

  async function logout() {
    const oldToken = token.value
    // 先清本地登录态，保证无论网络如何都能立即退出（原实现先 await 后端，弱网下最长卡 15s 超时）
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    stompService.disconnect()
    if (oldToken) {
      // 后台通知服务端注销 token，不阻塞页面跳转
      request
        .post('/auth/logout', null, { headers: { Authorization: `Bearer ${oldToken}` } })
        .catch(() => {})
    }
  }

  return {
    token,
    user,
    isLoggedIn,
    isSystemAdmin,
    isCommunityAdmin,
    isPropertyAdmin,
    isGridOfficer,
    isResident,
    canAccessAdmin,
    canManageUsers,
    canManageWords,
    canSyncSearch,
    canManageActivities,
    canViewScreen,
    canVerifySignup,
    canHandleReports,
    canPublishNotice,
    canHandleOrder,
    canExportOrder,
    canAuditOrder,
    canManageGrid,
    canManageSpatial,
    can,
    setAuth,
    fetchCurrentUser,
    logout
  }
})
