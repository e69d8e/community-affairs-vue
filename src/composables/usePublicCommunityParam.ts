import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useCommunityStore } from '@/stores/community'

/**
 * 公开列表接口(公告/活动/二手)的 communityId 参数:
 * - 登录用户: 不传, 后端默认取本人所属小区
 * - 游客匿名浏览: 传第一个启用中的小区, 保证多社区部署下匿名首页仍可浏览
 */
export function usePublicCommunityParam() {
  const userStore = useUserStore()
  const communityStore = useCommunityStore()
  const guestCommunityId = ref<string | undefined>(undefined)

  async function initGuestCommunity() {
    if (!userStore.isLoggedIn && !guestCommunityId.value) {
      const list = await communityStore.fetchCommunities()
      guestCommunityId.value = list[0]?.id
    }
  }

  const communityParam = computed(() =>
    userStore.isLoggedIn ? undefined : guestCommunityId.value
  )

  return { communityParam, initGuestCommunity }
}
