import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '@/utils/request'

export const useNoticeStore = defineStore('notice', () => {
  const unreadCount = ref<number>(0)
  const emergencyNotice = ref<any>(null)

  async function fetchUnreadCount() {
    try {
      const count: any = await request.get('/notice/unread-count')
      unreadCount.value = count || 0
    } catch (e) {
      unreadCount.value = 0
    }
  }

  function setEmergency(notice: any) {
    emergencyNotice.value = notice
  }

  function clearEmergency() {
    emergencyNotice.value = null
  }

  return {
    unreadCount,
    emergencyNotice,
    fetchUnreadCount,
    setEmergency,
    clearEmergency
  }
})
