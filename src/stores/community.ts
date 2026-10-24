import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CommunityOption } from '@/types'
import request from '@/utils/request'

/**
 * 多社区上下文:
 * - communities: 启用中的小区列表(注册下拉 / 管理端切换器共用, 来自公开接口 /auth/communities)
 * - selectedId: 平台管理员(SYSTEM_ADMIN)在管理端的"当前查看小区", 'all' 表示全部小区;
 *   其余角色由后端强制使用本人小区, 不消费该状态
 */
export const useCommunityStore = defineStore('community', () => {
  const communities = ref<CommunityOption[]>([])
  const selectedId = ref<string>(localStorage.getItem('adminCommunityId') || 'all')
  const loaded = ref(false)

  /** 传给后端接口的 communityId 查询参数; 'all' 时返回 undefined(不过滤) */
  const selectedCommunityId = computed<string | undefined>(() =>
    selectedId.value === 'all' ? undefined : selectedId.value
  )

  const selectedCommunityName = computed<string>(() => {
    if (selectedId.value === 'all') return '全部小区'
    return communities.value.find((c) => c.id === selectedId.value)?.name || '当前小区'
  })

  async function fetchCommunities(force = false) {
    if (loaded.value && !force) return communities.value
    try {
      const res: any = await request.get('/auth/communities')
      communities.value = (res || []).map((c: any) => ({
        id: String(c.id),
        name: c.name,
        code: c.code,
        address: c.address
      }))
      loaded.value = true
    } catch (e) {
      communities.value = []
    }
    return communities.value
  }

  function select(id: string) {
    selectedId.value = id
    localStorage.setItem('adminCommunityId', id)
  }

  return { communities, selectedId, selectedCommunityId, selectedCommunityName, fetchCommunities, select }
})
