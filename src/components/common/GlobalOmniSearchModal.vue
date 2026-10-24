<template>
  <el-dialog
    v-model="visible"
    :show-header="false"
    width="680px"
    class="cal-omni-search-dialog"
    destroy-on-close
    append-to-body
    @opened="onDialogOpened"
  >
    <div class="omni-search-wrapper">
      <!-- 顶部搜索输入条 -->
      <div class="omni-input-header">
        <el-icon class="search-lead-icon"><Search /></el-icon>
        <input
          ref="searchInputRef"
          v-model="query"
          type="text"
          class="omni-native-input"
          placeholder="搜索社区公告、文体活动、邻里闲置、办事服务... (支持 ↑↓ 切换)"
          @input="handleInput"
          @keydown.down.prevent="navigateResults(1)"
          @keydown.up.prevent="navigateResults(-1)"
          @keydown.enter.prevent="selectActiveItem"
          @keydown.esc="close"
        />
        <div class="search-right-actions">
          <span v-if="loading" class="searching-spinner"><el-icon class="is-loading"><Loading /></el-icon></span>
          <span v-else-if="query" class="clear-btn" @click="query = ''; searchImmediate()">清空</span>
          <span class="esc-badge">ESC</span>
        </div>
      </div>

      <!-- 分类筛选胶囊 Tab (Cal-pill-group) -->
      <div class="omni-tabs-bar">
        <button
          v-for="tab in categoryTabs"
          :key="tab.key"
          type="button"
          :class="['tab-pill', { active: activeTab === tab.key }]"
          @click="switchTab(tab.key)"
        >
          <span>{{ tab.label }}</span>
          <span v-if="tab.count > 0" class="tab-count-badge">{{ tab.count }}</span>
        </button>
      </div>

      <!-- 搜索结果 / 历史推荐区域 -->
      <div class="omni-results-body">
        <!-- 状态 1: 输入为空时，显示搜索历史与热搜推荐 -->
        <template v-if="!query.trim()">
          <!-- 历史搜索 -->
          <div v-if="searchHistory.length > 0" class="meta-section">
            <div class="meta-title-row">
              <span class="meta-title">🕒 最近搜索</span>
              <button type="button" class="clear-history-btn" @click="clearHistory">清除历史</button>
            </div>
            <div class="tags-cluster">
              <span
                v-for="item in searchHistory"
                :key="item"
                class="meta-tag history-tag"
                @click="applyQuery(item)"
              >
                {{ item }}
              </span>
            </div>
          </div>

          <!-- 热搜推荐 -->
          <div class="meta-section">
            <div class="meta-title-row">
              <span class="meta-title">🔥 社区热搜与常办事务</span>
            </div>
            <div class="tags-cluster">
              <span
                v-for="tag in hotPresets"
                :key="tag"
                class="meta-tag hot-tag"
                @click="applyQuery(tag)"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- 便捷服务直达入口 -->
          <div class="meta-section">
            <div class="meta-title-row">
              <span class="meta-title">⚡ 常用便民通道</span>
            </div>
            <div class="quick-links-grid">
              <div class="quick-link-item" @click="jumpRoute('/orders/submit?type=1')">
                <span class="ql-icon">🛠️</span>
                <div class="ql-text">
                  <span class="ql-title">在线报修申报</span>
                  <span class="ql-sub">水电管网/照明/客梯保修</span>
                </div>
              </div>
              <div class="quick-link-item" @click="jumpRoute('/orders/submit?type=2')">
                <span class="ql-icon">📝</span>
                <div class="ql-text">
                  <span class="ql-title">物业投诉建议</span>
                  <span class="ql-sub">环境卫生/噪音违停督办</span>
                </div>
              </div>
              <div class="quick-link-item" @click="jumpRoute('/market')">
                <span class="ql-icon">🤝</span>
                <div class="ql-text">
                  <span class="ql-title">闲置流转与求助</span>
                  <span class="ql-sub">邻里借用/二手好物互通</span>
                </div>
              </div>
              <div class="quick-link-item" @click="jumpRoute('/user/records?tab=tickets')">
                <span class="ql-icon">🎫</span>
                <div class="ql-text">
                  <span class="ql-title">我的活动核销码</span>
                  <span class="ql-sub">文体入场电子凭证包</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 状态 2: 正在搜索中 -->
        <div v-else-if="loading && totalResultsCount === 0" class="searching-state">
          <el-icon class="is-loading" :size="24"><Loading /></el-icon>
          <span>正在聚合全站数据...</span>
        </div>

        <!-- 状态 3: 搜索无结果 -->
        <div v-else-if="totalResultsCount === 0" class="empty-results-state">
          <span class="empty-emoji">🔍</span>
          <h4>未找到与 "{{ query }}" 相关的内容</h4>
          <p>尝试更换关键词，或从上方热门分类中快速筛选</p>
        </div>

        <!-- 状态 4: 展示分类聚合结果列表 -->
        <div v-else class="results-list-container">
          <!-- 1. 社区通知与公告 -->
          <div v-if="filteredNotices.length > 0" class="result-group">
            <div class="group-header">
              <span class="group-title">📢 社区通知与公告 ({{ notices.length }})</span>
              <span class="group-more" @click="jumpRoute(`/notices?kw=${encodeURIComponent(query)}`)">查看全部 →</span>
            </div>
            <div
              v-for="(item, idx) in filteredNotices"
              :key="'notice-' + item.id"
              :class="['result-row', { 'is-active': activeGlobalIndex === item.globalIdx }]"
              @click="handleItemClick(item)"
              @mouseenter="activeGlobalIndex = item.globalIdx"
            >
              <div class="row-left">
                <span class="item-type-badge notice">公告</span>
                <div class="row-content">
                  <h4 class="item-title" v-safe-html="highlightKeyword(item.title)"></h4>
                  <p class="item-desc" v-safe-html="highlightKeyword(stripHtml(item.content || item.summary || ''))"></p>
                </div>
              </div>
              <div class="row-right">
                <span class="row-date">{{ formatDate(item.publishTime) }}</span>
                <span class="enter-hint">↵</span>
              </div>
            </div>
          </div>

          <!-- 2. 文体与公益活动 -->
          <div v-if="filteredActivities.length > 0" class="result-group">
            <div class="group-header">
              <span class="group-title">🎪 文体公益活动 ({{ activities.length }})</span>
              <span class="group-more" @click="jumpRoute('/activities')">查看全部 →</span>
            </div>
            <div
              v-for="(item, idx) in filteredActivities"
              :key="'act-' + item.id"
              :class="['result-row', { 'is-active': activeGlobalIndex === item.globalIdx }]"
              @click="handleItemClick(item)"
              @mouseenter="activeGlobalIndex = item.globalIdx"
            >
              <div class="row-left">
                <span class="item-type-badge activity">活动</span>
                <div class="row-content">
                  <h4 class="item-title" v-safe-html="highlightKeyword(item.title)"></h4>
                  <p class="item-desc">📍 {{ item.location }} · ⏰ {{ item.startTime }}</p>
                </div>
              </div>
              <div class="row-right">
                <span class="quota-pill">剩余名额 {{ Math.max(0, (item.maxParticipants || 0) - (item.currentParticipants || 0)) }}</span>
                <span class="enter-hint">↵</span>
              </div>
            </div>
          </div>

          <!-- 3. 邻里集市与互助求助 -->
          <div v-if="filteredMarket.length > 0" class="result-group">
            <div class="group-header">
              <span class="group-title">🤝 邻里闲置与互助 ({{ marketPosts.length }})</span>
              <span class="group-more" @click="jumpRoute('/market')">查看全部 →</span>
            </div>
            <div
              v-for="(item, idx) in filteredMarket"
              :key="'market-' + item.id"
              :class="['result-row', { 'is-active': activeGlobalIndex === item.globalIdx }]"
              @click="handleItemClick(item)"
              @mouseenter="activeGlobalIndex = item.globalIdx"
            >
              <div class="row-left">
                <span class="item-type-badge market">{{ getPostTypeBadge(item.postType) }}</span>
                <div class="row-content">
                  <h4 class="item-title" v-safe-html="highlightKeyword(item.title)"></h4>
                  <p class="item-desc" v-safe-html="highlightKeyword(item.description || '')"></p>
                </div>
              </div>
              <div class="row-right">
                <span class="market-price">{{ item.price > 0 ? '¥' + item.price : '免费/互助' }}</span>
                <span class="enter-hint">↵</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部快捷操作栏 -->
      <div class="omni-footer">
        <div class="kbd-shortcuts">
          <span class="kbd-item"><kbd>↑</kbd><kbd>↓</kbd> 切换选项</span>
          <span class="kbd-item"><kbd>Enter</kbd> 确认前往</span>
          <span class="kbd-item"><kbd>ESC</kbd> 关闭面板</span>
        </div>
        <div class="footer-platform">
          <span>{{ userStore.user?.communityName || '智慧社区' }} · 全站智能中枢</span>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Loading } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import type { Notice, Activity, MarketPost } from '@/types'

const router = useRouter()
const userStore = useUserStore()
const visible = ref(false)
const query = ref('')
const activeTab = ref<'all' | 'notices' | 'activities' | 'market'>('all')
const loading = ref(false)
const activeGlobalIndex = ref(0)
const searchInputRef = ref<HTMLInputElement | null>(null)

// 结果集
const notices = ref<any[]>([])
const activities = ref<any[]>([])
const marketPosts = ref<any[]>([])

// 搜索历史（保存在 localStorage）
const searchHistory = ref<string[]>([])
const hotPresets = ['防汛应急', '客梯维保', '乒乓球', '电钻借用', '违规停放', '义诊公益', '低碳出借']

// 分类 Tabs
const categoryTabs = computed(() => [
  { key: 'all' as const, label: '全部综合', count: totalResultsCount.value },
  { key: 'notices' as const, label: '社区公告', count: notices.value.length },
  { key: 'activities' as const, label: '文体活动', count: activities.value.length },
  { key: 'market' as const, label: '邻里闲置', count: marketPosts.value.length }
])

// 过滤后的列表
const filteredNotices = computed(() => {
  if (activeTab.value !== 'all' && activeTab.value !== 'notices') return []
  return notices.value.slice(0, activeTab.value === 'all' ? 4 : 20)
})

const filteredActivities = computed(() => {
  if (activeTab.value !== 'all' && activeTab.value !== 'activities') return []
  return activities.value.slice(0, activeTab.value === 'all' ? 3 : 20)
})

const filteredMarket = computed(() => {
  if (activeTab.value !== 'all' && activeTab.value !== 'market') return []
  return marketPosts.value.slice(0, activeTab.value === 'all' ? 4 : 20)
})

// 扁平化结果集合，方便上下键导航
const flattenedResults = computed(() => {
  const list: any[] = []
  let globalIdx = 0

  filteredNotices.value.forEach(item => {
    item.type = 'notice'
    item.globalIdx = globalIdx++
    list.push(item)
  })

  filteredActivities.value.forEach(item => {
    item.type = 'activity'
    item.globalIdx = globalIdx++
    list.push(item)
  })

  filteredMarket.value.forEach(item => {
    item.type = 'market'
    item.globalIdx = globalIdx++
    list.push(item)
  })

  return list
})

const totalResultsCount = computed(() => {
  return notices.value.length + activities.value.length + marketPosts.value.length
})

let searchTimer: any = null
// 请求序号守卫：乱序返回的旧响应直接丢弃，避免覆盖新结果
let searchSeq = 0

function handleInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchImmediate()
  }, 250)
}

async function searchImmediate() {
  const kw = query.value.trim()
  const seq = ++searchSeq
  if (!kw) {
    notices.value = []
    activities.value = []
    marketPosts.value = []
    loading.value = false
    return
  }

  loading.value = true
  activeGlobalIndex.value = 0

  try {
    const [noticeRes, actRes, marketRes]: any[] = await Promise.allSettled([
      request.get('/notice/list', { params: { keyword: kw, size: 10 } }),
      request.get('/activity/list', { params: { keyword: kw, size: 10 } }),
      request.get('/market/list', { params: { keyword: kw, size: 10 } })
    ])

    if (seq !== searchSeq) {
      // 已有更新的搜索发起，丢弃本次过期响应
      return
    }

    notices.value = noticeRes.status === 'fulfilled' ? (noticeRes.value?.records || []) : []
    activities.value = actRes.status === 'fulfilled' ? (actRes.value?.records || []) : []
    marketPosts.value = marketRes.status === 'fulfilled' ? (marketRes.value?.records || []) : []

    // 记录历史
    saveHistory(kw)
  } catch (e) {
    console.error('全站搜索异常', e)
  } finally {
    if (seq === searchSeq) {
      loading.value = false
    }
  }
}

function saveHistory(kw: string) {
  if (!kw) return
  let list = [...searchHistory.value]
  list = list.filter(item => item !== kw)
  list.unshift(kw)
  if (list.length > 8) list = list.slice(0, 8)
  searchHistory.value = list
  try {
    localStorage.setItem('community_search_history', JSON.stringify(list))
  } catch (ignored) {}
}

function loadHistory() {
  try {
    const raw = localStorage.getItem('community_search_history')
    if (raw) {
      searchHistory.value = JSON.parse(raw)
    }
  } catch (ignored) {}
}

function clearHistory() {
  searchHistory.value = []
  localStorage.removeItem('community_search_history')
}

function applyQuery(kw: string) {
  query.value = kw
  searchImmediate()
}

function switchTab(tab: 'all' | 'notices' | 'activities' | 'market') {
  activeTab.value = tab
  activeGlobalIndex.value = 0
}

function navigateResults(delta: number) {
  const len = flattenedResults.value.length
  if (len === 0) return
  let next = activeGlobalIndex.value + delta
  if (next < 0) next = len - 1
  if (next >= len) next = 0
  activeGlobalIndex.value = next
}

function selectActiveItem() {
  const item = flattenedResults.value.find(i => i.globalIdx === activeGlobalIndex.value)
  if (item) {
    handleItemClick(item)
  } else if (query.value.trim()) {
    // 默认跳转到公告
    jumpRoute(`/notices?kw=${encodeURIComponent(query.value.trim())}`)
  }
}

function handleItemClick(item: any) {
  close()
  if (item.type === 'notice') {
    router.push(`/notices/${item.id}`)
  } else if (item.type === 'activity') {
    router.push(`/activities/${item.id}`)
  } else if (item.type === 'market') {
    router.push(`/market/${item.id}`)
  }
}

function jumpRoute(path: string) {
  close()
  router.push(path)
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function highlightKeyword(text?: string) {
  if (!text) return ''
  const kw = query.value.trim()
  if (!kw) return escapeHtml(text)
  const escaped = kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  // 正文先做 HTML 实体转义再注入高亮标签，防止帖子标题等内容注入脚本
  return escapeHtml(text).replace(regex, '<mark class="omni-highlight">$1</mark>')
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim().substring(0, 90)
}

function formatDate(str?: string) {
  if (!str) return ''
  return str.split('T')[0] || str.substring(0, 10)
}

function getPostTypeBadge(type: number) {
  switch (type) {
    case 1: return '闲置'
    case 2: return '求助'
    case 3: return '借用'
    case 4: return '拼车'
    case 5: return '技能'
    default: return '互助'
  }
}

function open(initialQuery = '') {
  visible.value = true
  if (initialQuery) {
    query.value = initialQuery
    searchImmediate()
  }
}

function close() {
  visible.value = false
}

function onDialogOpened() {
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

// 全局快捷键监听 Cmd+K / Ctrl+K
function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    if (visible.value) {
      close()
    } else {
      open()
    }
  }
}

onMounted(() => {
  loadHistory()
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  clearTimeout(searchTimer)
})

defineExpose({
  open,
  close
})
</script>

<style scoped>
.omni-search-wrapper {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
}

/* 顶部搜索输入条 */
.omni-input-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--cal-hairline-soft, #f3f4f6);
  gap: 12px;
}

.search-lead-icon {
  font-size: 20px;
  color: var(--cal-muted, #6b7280);
}

.omni-native-input {
  flex: 1;
  font-size: 16px;
  font-family: inherit;
  color: var(--cal-ink, #111111);
  border: none;
  outline: none;
  background: transparent;
}

.omni-native-input::placeholder {
  color: #9ca3af;
  font-size: 14px;
}

.search-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-btn {
  font-size: 12px;
  color: #9ca3af;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.clear-btn:hover {
  color: #111;
  background: #f3f4f6;
}

.esc-badge {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Tabs Bar */
.omni-tabs-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: #fafafa;
  border-bottom: 1px solid var(--cal-hairline-soft, #f3f4f6);
}

.tab-pill {
  font-size: 13px;
  color: var(--cal-muted, #6b7280);
  background: transparent;
  border: 1px solid transparent;
  padding: 4px 12px;
  border-radius: 20px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.tab-pill:hover {
  color: #111;
  background: #f3f4f6;
}

.tab-pill.active {
  color: #111111;
  font-weight: 600;
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.tab-count-badge {
  font-size: 11px;
  background: #e5e7eb;
  color: #374151;
  padding: 0 5px;
  border-radius: 10px;
}

/* 结果容器 */
.omni-results-body {
  max-height: 480px;
  min-height: 240px;
  overflow-y: auto;
  padding: 16px 20px;
}

/* 历史与预设推荐 */
.meta-section {
  margin-bottom: 20px;
}

.meta-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.meta-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.clear-history-btn {
  font-size: 11px;
  color: #9ca3af;
  background: transparent;
  border: none;
  cursor: pointer;
}
.clear-history-btn:hover {
  color: #ef4444;
}

.tags-cluster {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-tag {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.meta-tag:hover {
  background: #111111;
  color: #ffffff;
}

/* 常用便民通道网格 */
.quick-links-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.quick-link-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-link-item:hover {
  background: #ffffff;
  border-color: #111111;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.ql-icon {
  font-size: 22px;
}

.ql-text {
  display: flex;
  flex-direction: column;
}

.ql-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.ql-sub {
  font-size: 11px;
  color: #64748b;
}

/* 状态展示 */
.searching-state,
.empty-results-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  text-align: center;
  color: #6b7280;
  gap: 8px;
}

.empty-emoji {
  font-size: 36px;
}

.empty-results-state h4 {
  font-size: 15px;
  color: #111111;
  margin: 4px 0;
}

.empty-results-state p {
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
}

/* 结果行 */
.result-group {
  margin-bottom: 20px;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.group-more {
  color: #3b82f6;
  cursor: pointer;
}
.group-more:hover {
  text-decoration: underline;
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.result-row:hover,
.result-row.is-active {
  background: #f8fafc;
}

.row-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.item-type-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-top: 2px;
}

.item-type-badge.notice {
  background: #ede9fe;
  color: #7c3aed;
}

.item-type-badge.activity {
  background: #d1fae5;
  color: #059669;
}

.item-type-badge.market {
  background: #fed7aa;
  color: #ea580c;
}

.row-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
  color: #111111;
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-desc {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  margin-left: 12px;
}

.row-date {
  font-size: 12px;
  color: #9ca3af;
}

.quota-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  background: #ecfdf5;
  color: #059669;
}

.market-price {
  font-size: 13px;
  font-weight: 700;
  color: #ea580c;
}

.enter-hint {
  font-size: 12px;
  color: #d1d5db;
  font-family: monospace;
}

.result-row.is-active .enter-hint {
  color: #111111;
  font-weight: bold;
}

/* 底部栏 */
.omni-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #f9fafb;
  border-top: 1px solid var(--cal-hairline-soft, #f3f4f6);
  font-size: 12px;
  color: #9ca3af;
}

.kbd-shortcuts {
  display: flex;
  align-items: center;
  gap: 12px;
}

.kbd-item kbd {
  font-size: 10px;
  font-family: inherit;
  font-weight: 600;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 1px 5px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}

:deep(.omni-highlight) {
  background: #fef08a;
  color: #854d0e;
  padding: 0 2px;
  border-radius: 2px;
}
</style>

<style>
/* 弹窗无多余边框与纯白高质感 */
.cal-omni-search-dialog {
  border-radius: 16px !important;
  overflow: hidden !important;
  padding: 0 !important;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.2) !important;
}
.cal-omni-search-dialog .el-dialog__body {
  padding: 0 !important;
}
</style>
