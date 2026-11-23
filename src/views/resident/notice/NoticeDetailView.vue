<template>
  <div v-loading="loading" class="notice-detail-view">
    <div class="back-bar" style="justify-content: space-between">
      <div style="display: flex; align-items: center; gap: 12px">
        <el-button link :icon="ArrowLeft" class="cal-back-btn main-back-btn" @click="handleBack">
          {{ backButtonText }}
        </el-button>
        <el-button
          v-if="isFromProfile"
          link
          class="cal-back-btn sub-back-btn"
          @click="$router.push('/notices')"
        >
          浏览公告中心
        </el-button>
      </div>

      <!-- 适老化字号调节与一键分享 -->
      <div v-if="notice" style="display: flex; align-items: center; gap: 10px">
        <el-radio-group v-model="fontMode" size="small">
          <el-radio-button value="normal">标准</el-radio-button>
          <el-radio-button value="large">大字适老</el-radio-button>
          <el-radio-button value="xlarge">特大</el-radio-button>
        </el-radio-group>
        <el-button size="small" plain :icon="Share" @click="copyShareLink">
          复制链接
        </el-button>
      </div>
    </div>

    <div v-if="notice" class="article-card cal-mockup-card">
      <div class="article-header">
        <div class="tags-row">
          <span v-if="notice.isTop === 1" class="cal-badge cal-badge-orange">置顶</span>
          <span class="cal-badge" :class="getNoticeBadgeClass(notice.noticeType)">
            {{ getNoticeTypeName(notice.noticeType) }}
          </span>
        </div>
        <h1 class="article-title cal-display-sm">{{ notice.title }}</h1>
        <div class="article-meta">
          <span>发布单位：{{ notice.publisherName }}</span>
          <span>发布日期：{{ notice.publishTime }}</span>
          <span>阅读量：{{ notice.viewCount }} 次</span>
        </div>
      </div>

      <div class="article-divider"></div>

      <div
        class="article-content"
        :style="{
          fontSize: fontMode === 'xlarge' ? '20px' : fontMode === 'large' ? '17.5px' : '15px',
          lineHeight: fontMode === 'xlarge' ? '2.0' : '1.85'
        }"
        v-safe-html="notice.content"
      ></div>

      <!-- 底部场景化便民引导与上下篇切换 -->
      <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid var(--cal-hairline); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px">
        <div style="display: flex; align-items: center; gap: 10px">
          <el-button size="small" plain @click="$router.push('/orders/submit?type=1')">
            🛠️ 遇到相关设施问题？立即报修
          </el-button>
          <el-button size="small" plain @click="$router.push('/orders/submit?type=2')">
            📝 提报建议与反馈
          </el-button>
        </div>

        <div style="display: flex; align-items: center; gap: 8px">
          <el-button
            size="small"
            :disabled="!prevNotice"
            :title="prevNotice?.title || '已是第一篇'"
            @click="prevNotice && $router.push(`/notices/${prevNotice.id}`)"
          >
            ← 上一篇
          </el-button>
          <el-button
            size="small"
            :disabled="!nextNotice"
            :title="nextNotice?.title || '已是最后一篇'"
            @click="nextNotice && $router.push(`/notices/${nextNotice.id}`)"
          >
            下一篇 →
          </el-button>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="article-card cal-mockup-card" style="padding: 60px 20px; text-align: center;">
      <el-empty description="未检索到该公告正文或已被归档下线">
        <el-button type="primary" class="cal-primary-btn" @click="$router.push('/notices')">返回通知公告中心</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Share } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import type { Notice } from '@/types'

const route = useRoute()
const router = useRouter()
const notice = ref<Notice | null>(null)
const allNotices = ref<Notice[]>([])
const loading = ref(false)
const fontMode = ref<'normal' | 'large' | 'xlarge'>('normal')

const isFromProfile = computed(() => {
  return (
    route.query.from === 'profile' ||
    (typeof window !== 'undefined' && window.history.state?.back?.includes('/user/profile'))
  )
})

const backButtonText = computed(() => {
  if (isFromProfile.value) {
    return '返回居民个人中心'
  }
  return '返回公告列表'
})

const currentIndex = computed(() => {
  if (!notice.value || allNotices.value.length === 0) return -1
  return allNotices.value.findIndex((n) => String(n.id) === String(notice.value?.id))
})

const prevNotice = computed(() => {
  if (currentIndex.value > 0) return allNotices.value[currentIndex.value - 1]
  return null
})

const nextNotice = computed(() => {
  if (currentIndex.value >= 0 && currentIndex.value < allNotices.value.length - 1) {
    return allNotices.value[currentIndex.value + 1]
  }
  return null
})

function copyShareLink() {
  const url = window.location.href
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      ElMessage.success('已复制通告链接，可发送至业主微信群分享')
    })
  } else {
    ElMessage.success('通告链接已准备就绪')
  }
}

function handleBack() {
  if (route.query.from === 'profile') {
    router.push('/user/profile?tab=notices')
  } else if (window.history.length > 1 && window.history.state?.back) {
    router.back()
  } else {
    router.push('/notices')
  }
}

async function fetchDetailById(id: string) {
  if (!id) return
  loading.value = true
  try {
    const listPromise = request
      .get('/notice/list', { params: { size: 50 } })
      .then((listRes: any) => {
        allNotices.value = listRes?.records || []
        return allNotices.value
      })
      .catch(() => allNotices.value)

    try {
      const res: any = await request.get(`/notice/detail/${id}`)
      notice.value = res
    } catch (e) {
      const records = await listPromise
      const matched = records.find((n: any) => String(n.id) === id || String(n.title).includes(id))
      if (matched) {
        const res2: any = await request.get(`/notice/detail/${matched.id}`)
        notice.value = res2
      }
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDetailById(String(route.params.id || '').trim())
})

watch(
  () => route.params.id,
  (newId) => {
    if (newId) fetchDetailById(String(newId).trim())
  }
)

function getNoticeTypeName(type: number) {
  switch (type) {
    case 1: return '政策宣传'
    case 2: return '便民服务'
    case 3: return '物业通知'
    case 4: return '突发应急'
    default: return '公告'
  }
}

function getNoticeBadgeClass(type: number) {
  switch (type) {
    case 1: return 'cal-badge-violet'
    case 2: return 'cal-badge-emerald'
    case 3: return 'cal-badge-orange'
    case 4: return 'cal-badge-pink'
    default: return 'cal-badge-gray'
  }
}
</script>

<style scoped>
.back-bar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.cal-back-btn {
  font-size: 13px;
  color: var(--cal-muted);
}
.cal-back-btn:hover {
  color: var(--cal-ink);
}
.sub-back-btn {
  color: var(--cal-muted);
  font-size: 13px;
}
.sub-back-btn:hover {
  color: var(--cal-ink);
}

.article-card {
  padding: 40px;
  background: var(--cal-canvas);
}

.article-header {
  margin-bottom: 24px;
}
.tags-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.article-title {
  color: var(--cal-ink);
  margin-bottom: 14px;
  line-height: 1.3;
}
.article-meta {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: var(--cal-muted);
}

.article-divider {
  height: 1px;
  background-color: var(--cal-hairline);
  margin: 24px 0;
}

.article-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--cal-body);
}

@media (max-width: 768px) {
  .article-card {
    padding: 20px 16px;
  }
  .article-meta {
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
  }
  .article-title {
    font-size: 19px !important;
  }
}
</style>
