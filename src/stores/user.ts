import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo } from '@/types'
import request from '@/utils/request'
import { stompService } from '@/utils/websocket'
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
    return ['ROLE_SYSTEM_ADMIN', 'ROLE_COMMUNITY_ADMIN', 'ROLE_PROPERTY_ADMIN', 'ROLE_GRID_OFFICER'].includes(
      user.value.role
    )
  })

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
    try {
      await request.post('/auth/logout')
    } catch (ignored) {}
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    stompService.disconnect()
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
    setAuth,
    fetchCurrentUser,
    logout
  }
})
