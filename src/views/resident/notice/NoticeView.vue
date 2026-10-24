<template>
  <div class="notice-view">
    <div class="page-header">
      <div>
        <h1 class="cal-display-sm">社区通知与公告中心</h1>
        <p class="page-sub">及时获悉居委会政策宣讲、物业检修与重要民生信息</p>
      </div>
      <div class="search-input" style="display: flex; gap: 8px; align-items: center">
        <el-input
          v-model="keyword"
          placeholder="检索公告关键词..."
          clearable
          style="width: 260px"
          @keyup.enter="handleSearch"
          @clear="handleClear"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" class="cal-primary-btn" @click="handleSearch">搜索</el-button>
      </div>
    </div>

    <!-- 分类标签页 (Cal Tabs) -->
    <el-tabs v-model="activeTab" class="notice-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="全部要闻" name="all" />
      <el-tab-pane label="突发应急" name="4" />
      <el-tab-pane label="政策宣传" name="1" />
      <el-tab-pane label="便民提示" name="2" />
      <el-tab-pane label="物业通知" name="3" />
    </el-tabs>

    <!-- 公告列表卡片 (Cal Mockup Card) -->
    <div v-loading="loading" class="notice-list-card cal-mockup-card">
      <div v-if="notices.length === 0" class="empty-wrap">
        <el-empty description="暂无相关公告资讯" />
      </div>

      <div
        v-for="item in notices"
        :key="item.id"
        class="notice-row"
        @click="$router.push(`/notices/${item.id}`)"
      >
        <div class="notice-main">
          <div class="notice-badges">
            <span v-if="item.isTop === 1" class="cal-badge cal-badge-orange">置顶</span>
            <span class="cal-badge" :class="getNoticeBadgeClass(item.noticeType)">
              {{ getNoticeTypeName(item.noticeType) }}
            </span>
          </div>
          <h3 class="notice-title">{{ item.title }}</h3>
        </div>
        <div class="notice-meta">
          <span class="meta-item"><el-icon><User /></el-icon> {{ item.publisherName }}</span>
          <span class="meta-item"><el-icon><View /></el-icon> {{ item.viewCount }} 次阅读</span>
          <span class="meta-item time">{{ item.publishTime }}</span>
          <el-button
            size="small"
            plain
            style="border-radius: 6px; padding: 4px 10px"
            @click.stop="openQuickRead(item)"
          >
            👁️ 速览正文
          </el-button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="size"
        :total="total"
        layout="prev, pager, next, total"
        background
        @current-change="loadNotices"
      />
    </div>

    <!-- 页内公告速览抽屉 (免反复进出详情页) -->
    <el-drawer v-model="showQuickDrawer" title="公告正文速览" size="540px" append-to-body destroy-on-close>
      <div v-if="quickNotice" style="display: flex; flex-direction: column; gap: 16px">
        <div style="display: flex; align-items: center; justify-content: space-between">
          <div style="display: flex; gap: 8px; align-items: center">
            <span v-if="quickNotice.isTop === 1" class="cal-badge cal-badge-orange">置顶</span>
            <span class="cal-badge" :class="getNoticeBadgeClass(quickNotice.noticeType)">
              {{ getNoticeTypeName(quickNotice.noticeType) }}
            </span>
          </div>
          <el-radio-group v-model="fontScale" size="small">
            <el-radio-button value="normal">标准字号</el-radio-button>
            <el-radio-button value="large">大字适老</el-radio-button>
          </el-radio-group>
        </div>

        <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.4; margin: 0">
          {{ quickNotice.title }}
        </h2>

        <div style="font-size: 12px; color: #64748b; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0">
          发布单位：{{ quickNotice.publisherName }} · 发布于 {{ quickNotice.publishTime }} · 阅读 {{ quickNotice.viewCount }} 次
        </div>

        <div
          :style="{
            fontSize: fontScale === 'large' ? '18px' : '15px',
            lineHeight: fontScale === 'large' ? '1.95' : '1.8',
            color: '#334155'
          }"
          v-safe-html="quickNotice.content"
        ></div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center">
          <div style="display: flex; gap: 8px">
            <el-button size="small" :disabled="currentQuickIdx <= 0" @click="switchQuickNotice(-1)">
              ← 上一篇
            </el-button>
            <el-button size="small" :disabled="currentQuickIdx >= notices.length - 1" @click="switchQuickNotice(1)">
              下一篇 →
            </el-button>
          </div>
          <el-button type="primary" size="small" class="cal-primary-btn" @click="$router.push(`/notices/${quickNotice.id}`); showQuickDrawer = false">
            进入完整页面 →
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Search, User, View } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { usePublicCommunityParam } from '@/composables/usePublicCommunityParam'
import type { Notice } from '@/types'

const route = useRoute()
const { communityParam: publicCommunityParam, initGuestCommunity } = usePublicCommunityParam()
const activeTab = ref('all')
const keyword = ref((route.query.kw as string) || '')
const notices = ref<Notice[]>([])
const loading = ref(false)
const page = ref(1)
const size = ref(10)
const total = ref(0)

const showQuickDrawer = ref(false)
const quickNotice = ref<Notice | null>(null)
const fontScale = ref<'normal' | 'large'>('normal')

const currentQuickIdx = computed(() => {
  if (!quickNotice.value) return -1
  return notices.value.findIndex((n) => n.id === quickNotice.value?.id)
})

async function openQuickRead(item: Notice) {
  quickNotice.value = item
  showQuickDrawer.value = true
  try {
    const detail: any = await request.get(`/notice/detail/${item.id}`)
    if (detail) quickNotice.value = detail
  } catch (e) {}
}

function switchQuickNotice(delta: number) {
  const nextIdx = currentQuickIdx.value + delta
  if (nextIdx >= 0 && nextIdx < notices.value.length) {
    openQuickRead(notices.value[nextIdx])
  }
}

onMounted(() => {
  loadNotices()
})

watch(() => route.query.kw, (newKw) => {
  keyword.value = (newKw as string) || ''
  page.value = 1
  loadNotices()
})

function handleSearch() {
  page.value = 1
  loadNotices()
}

function handleClear() {
  keyword.value = ''
  page.value = 1
  loadNotices()
}

async function loadNotices() {
  await initGuestCommunity()
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      size: size.value
    }
    if (activeTab.value !== 'all') {
      params.noticeType = Number(activeTab.value)
    }
    if (keyword.value.trim()) {
      params.keyword = keyword.value.trim()
    }
    const res: any = await request.get('/notice/list', { params: { ...params, communityId: publicCommunityParam.value } })
    notices.value = res.records || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function handleTabChange() {
  page.value = 1
  loadNotices()
}

function getNoticeTypeName(type: number) {
  switch (type) {
    case 1: return '政策宣传'
    case 2: return '便民服务'
    case 3: return '物业通知'
    case 4: return '突发应急'
    default: return '常规公告'
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
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.page-sub {
  font-size: 14px;
  color: var(--cal-muted);
  margin-top: 4px;
}

.notice-tabs {
  margin-bottom: 20px;
}

.notice-list-card {
  padding: 8px 24px;
}

.notice-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 0;
  border-bottom: 1px solid var(--cal-hairline-soft);
  cursor: pointer;
  transition: all 0.15s ease;
}
.notice-row:last-child {
  border-bottom: none;
}
.notice-row:hover .notice-title {
  color: var(--cal-primary-active);
}

.notice-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}
.notice-badges {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.notice-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--cal-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-meta {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 13px;
  color: var(--cal-muted);
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-wrap {
  margin-top: 28px;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }
  .search-input,
  .search-input .el-input {
    width: 100% !important;
  }
  .notice-list-card {
    padding: 6px 14px;
  }
  .notice-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 14px 0;
  }
  .notice-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .notice-meta {
    flex-wrap: wrap;
    gap: 10px;
    font-size: 12px;
  }
}
</style>
