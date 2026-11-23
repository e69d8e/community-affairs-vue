<template>
  <el-popover
    v-model:visible="popoverVisible"
    placement="bottom-end"
    :width="380"
    trigger="click"
    popper-class="cal-notification-popover"
    :show-arrow="false"
    @show="handlePopoverShow"
  >
    <template #reference>
      <div class="bell-trigger-wrap" title="消息通知中心">
        <el-badge :value="noticeStore.unreadCount" :hidden="noticeStore.unreadCount === 0" :max="99">
          <button type="button" class="cal-circle-btn" aria-label="消息通知中心">
            <el-icon :size="18"><Bell /></el-icon>
          </button>
        </el-badge>
      </div>
    </template>

    <div class="notification-box">
      <!-- 弹窗顶栏 -->
      <div class="notify-header">
        <div class="notify-title-col">
          <span class="notify-title">站内消息通知</span>
          <span v-if="noticeStore.unreadCount > 0" class="unread-pill">
            {{ noticeStore.unreadCount }} 条未读
          </span>
        </div>
        <div class="notify-actions-col">
          <button
            v-if="noticeStore.unreadCount > 0"
            type="button"
            class="mark-all-btn"
            :disabled="markingAll"
            @click="handleMarkAllRead"
          >
            全部标为已读
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div v-loading="loading" class="notify-body">
        <div v-if="notifications.length === 0 && !loading" class="notify-empty">
          <span class="empty-icon" aria-hidden="true">📭</span>
          <p>暂无新消息通知</p>
        </div>

        <button
          v-for="item in notifications"
          :key="item.id"
          type="button"
          :class="['notify-item', { 'is-unread': item.isRead === 0 }]"
          @click="handleItemClick(item)"
        >
          <span class="notify-item-top">
            <span v-if="item.isRead === 0" class="unread-dot" aria-hidden="true" />
            <span class="notify-badge" :class="getBadgeClass(item.noticeType)">
              {{ getBadgeText(item.noticeType) }}
            </span>
            <span class="notify-time">{{ formatTime(item.createTime) }}</span>
          </span>

          <span class="notify-item-title">{{ item.title }}</span>
          <span class="notify-item-desc">{{ item.summary }}</span>
        </button>
      </div>

      <!-- 弹窗底栏 -->
      <div class="notify-footer">
        <button type="button" class="view-all-btn" @click="goToCenter">
          进入完整通知信箱 →
        </button>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bell } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { useNoticeStore } from '@/stores/notice'
import type { UserNotice } from '@/types'

const router = useRouter()
const noticeStore = useNoticeStore()

const popoverVisible = ref(false)
const loading = ref(false)
const markingAll = ref(false)
const notifications = ref<UserNotice[]>([])

async function handlePopoverShow() {
  loading.value = true
  try {
    const res: any = await request.get('/notice/my-inbox', { params: { size: 6 } })
    notifications.value = res.records || []
    noticeStore.fetchUnreadCount()
  } catch (e) {
    console.warn('获取通知列表失败', e)
  } finally {
    loading.value = false
  }
}

async function handleMarkAllRead() {
  markingAll.value = true
  try {
    await request.put('/notice/read-all')
    ElMessage.success('已全部标记为已读')
    notifications.value.forEach(item => { item.isRead = 1 })
    noticeStore.unreadCount = 0
  } catch (e) {
    ElMessage.error('标记失败，请重试')
  } finally {
    markingAll.value = false
  }
}

async function handleItemClick(item: UserNotice) {
  popoverVisible.value = false

  // 如果未读，标记已读
  if (item.isRead === 0) {
    try {
      await request.put(`/notice/read/${item.id}`)
      item.isRead = 1
      noticeStore.fetchUnreadCount()
    } catch (ignored) {}
  }

  // 路由跳转判断
  const type = (item.noticeType || '').toUpperCase()
  const title = item.title || ''

  if (type === 'CHAT' || title.includes('私信')) {
    router.push({ path: '/user/profile', query: { tab: 'chat', sessionId: item.bizId } })
  } else if (type === 'WORK_ORDER' || title.includes('工单') || title.includes('报修')) {
    const match = title.match(/WO\d+/)
    const orderId = item.bizId || (match ? match[0] : '')
    router.push(orderId ? `/orders/${orderId}` : '/orders')
  } else if (type === 'NOTICE' || type === 'EMERGENCY' || title.includes('通告') || title.includes('公告')) {
    const noticeId = item.noticeId || item.bizId
    router.push(noticeId ? `/notices/${noticeId}` : '/notices')
  } else {
    router.push({ path: '/user/profile', query: { tab: 'notices' } })
  }
}

function goToCenter() {
  popoverVisible.value = false
  router.push({ path: '/user/profile', query: { tab: 'notices' } })
}

function formatTime(str?: string) {
  if (!str) return ''
  return str.replace(/^\d{4}-/, '')
}

function getBadgeClass(type?: string) {
  const t = (type || '').toUpperCase()
  if (t === 'EMERGENCY') return 'badge-pink'
  if (t === 'WORK_ORDER') return 'badge-orange'
  if (t === 'ACTIVITY') return 'badge-emerald'
  if (t === 'CHAT') return 'badge-violet'
  return 'badge-blue'
}

function getBadgeText(type?: string) {
  const t = (type || '').toUpperCase()
  if (t === 'EMERGENCY') return '紧急广播'
  if (t === 'WORK_ORDER') return '工单动态'
  if (t === 'ACTIVITY') return '活动报名'
  if (t === 'CHAT') return '邻里私信'
  return '系统提醒'
}
</script>

<style scoped>
.bell-trigger-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cal-circle-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--cal-hairline, #e5e7eb);
  background: #ffffff;
  color: var(--cal-ink, #111111);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cal-circle-btn:hover {
  background: var(--cal-surface-card, #f5f5f5);
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.cal-circle-btn:active {
  transform: scale(0.95);
}

/* 弹窗内容 */
.notification-box {
  display: flex;
  flex-direction: column;
}

.notify-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.notify-title-col {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notify-title {
  font-size: 14px;
  font-weight: 700;
  color: #111111;
}

.unread-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  background: #fef2f2;
  color: #ef4444;
}

.mark-all-btn {
  font-size: 12px;
  color: #3b82f6;
  background: transparent;
  border: none;
  cursor: pointer;
}
.mark-all-btn:hover {
  text-decoration: underline;
}

.notify-body {
  max-height: 360px;
  overflow-y: auto;
}

.notify-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 0;
  color: var(--cal-muted, #5a6270);
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 6px;
}

.notify-item {
  display: block;
  width: 100%;
  text-align: left;
  font-family: inherit;
  background: transparent;
  border: none;
  padding: 12px 16px;
  border-bottom: 1px solid #f9fafb;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.notify-item:hover {
  background: #f8fafc;
}

.notify-item.is-unread {
  background: #f0fdf4;
}
.notify-item.is-unread:hover {
  background: #e6f9ed;
}

.notify-item-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.unread-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.notify-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
}

.badge-pink {
  background: #fce7f3;
  color: #db2777;
}

.badge-orange {
  background: #ffedd5;
  color: #ea580c;
}

.badge-emerald {
  background: #d1fae5;
  color: #059669;
}

.badge-violet {
  background: #ede9fe;
  color: #7c3aed;
}

.badge-blue {
  background: #e0f2fe;
  color: #0284c7;
}

.notify-time {
  margin-left: auto;
  font-size: 11px;
  color: var(--cal-muted, #5a6270);
}

.notify-item-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notify-item-desc {
  display: block;
  font-size: 12px;
  color: var(--cal-muted, #5a6270);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notify-footer {
  padding: 10px 16px;
  background: #fafafa;
  border-top: 1px solid #f3f4f6;
  text-align: center;
}

.view-all-btn {
  font-size: 12px;
  font-weight: 600;
  color: #111111;
  background: transparent;
  border: none;
  cursor: pointer;
}

.view-all-btn:hover {
  color: #3b82f6;
}
</style>

<style>
/* Popover Global Override */
.el-popover.cal-notification-popover {
  padding: 0 !important;
  border-radius: 12px !important;
  border: 1px solid #e5e7eb !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1) !important;
  overflow: hidden !important;
}
</style>
