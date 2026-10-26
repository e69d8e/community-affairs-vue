<template>
  <div class="profile-chat-panel">
    <div class="panel-header-bar">
      <div>
        <h3 class="panel-title">邻里私信沟通</h3>
        <p class="panel-sub">与社区邻里就二手闲置、物品借用或日常互助进行一对一实时沟通</p>
      </div>
      <el-button plain size="small" @click="$router.push('/market')">
        前往集市大厅 →
      </el-button>
    </div>

    <div :class="['chat-tab-container', { 'mobile-chat-active': mobileShowChat }]">
      <!-- 左侧会话列表 -->
      <div class="session-list-panel">
        <div class="session-panel-header">
          <span class="panel-label">私信会话</span>
          <el-tag size="small" type="info" round>{{ chatSessions.length }} 个会话</el-tag>
        </div>

        <div v-loading="loadingSessions" class="session-items-scroll">
          <div v-if="chatSessions.length === 0 && !loadingSessions" class="empty-sessions">
            <el-empty description="暂无私信沟通记录" :image-size="60">
              <el-button type="primary" size="small" class="cal-primary-btn" @click="$router.push('/market')">
                去闲置集市逛逛
              </el-button>
            </el-empty>
          </div>

          <div
            v-for="s in chatSessions"
            :key="s.sessionId"
            :class="['session-card', { active: currentSession?.sessionId === s.sessionId }]"
            @click="selectSession(s, true)"
          >
            <div class="session-avatar-col">
              <el-avatar :size="40" :src="s.otherUserAvatar || defaultAvatar" />
              <span v-if="s.unreadCount > 0" class="session-badge">{{ s.unreadCount }}</span>
            </div>
            <div class="session-body-col">
              <div class="session-top-line">
                <span class="other-user-name">{{ s.otherUserName }}</span>
                <span class="last-time">{{ formatChatTime(s.lastTime) }}</span>
              </div>
              <div class="post-related-tag">
                <span class="post-type-mini">{{ getPostTypeName(s.postType) }}</span>
                <span class="post-title-mini">{{ s.postTitle }}</span>
              </div>
              <div class="last-msg-preview">{{ s.lastMessage }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧对话详情与发送面板 -->
      <div class="chat-main-panel">
        <template v-if="currentSession">
          <div class="chat-header-bar">
            <div class="chat-target-user">
              <button
                type="button"
                class="mobile-chat-back-btn"
                aria-label="返回会话列表"
                @click="mobileShowChat = false"
              >
                ← 列表
              </button>
              <el-avatar :size="36" :src="currentSession.otherUserAvatar || defaultAvatar" />
              <div class="target-user-info">
                <div class="name-badge-row">
                  <span class="target-name">{{ currentSession.otherUserName }}</span>
                  <el-tag size="small" type="success" effect="plain">
                    信用分 {{ currentSession.otherUserCreditScore || 100 }}
                  </el-tag>
                </div>
                <span class="session-item-brief">
                  关联：{{ currentSession.postTitle }}
                  <template v-if="currentSession.postPrice !== undefined && currentSession.postPrice !== null">
                    (¥ {{ currentSession.postPrice }})
                  </template>
                </span>
              </div>
            </div>
            <el-button
              link
              type="primary"
              :icon="ArrowRight"
              @click="$router.push(`/market/${currentSession.postId}?from=profile`)"
            >
              查看物品详情
            </el-button>
          </div>

          <!-- 消息气泡流 -->
          <div ref="chatScrollRef" v-loading="loadingMessages" class="chat-flow-area">
            <div v-if="sessionMessages.length === 0 && !loadingMessages" class="empty-chat-state">
              <el-icon :size="28" style="color: #94a3b8"><ChatDotRound /></el-icon>
              <p>暂无私信记录，发送第一条消息开启邻里交流吧！</p>
            </div>

            <div
              v-for="msg in sessionMessages"
              :key="msg.id"
              :class="['flow-msg-row', { 'is-mine': msg.isSelf }]"
            >
              <el-avatar
                :size="32"
                :src="msg.isSelf ? (userStore.user?.avatar || defaultAvatar) : (msg.senderAvatar || defaultAvatar)"
                class="flow-avatar"
              />
              <div class="flow-bubble-wrap">
                <div class="flow-sender-meta">
                  <span class="flow-name">{{ msg.isSelf ? '我' : msg.senderName }}</span>
                  <span class="flow-time">{{ formatChatTime(msg.createTime) }}</span>
                </div>
                <div class="flow-bubble">{{ msg.content }}</div>
              </div>
            </div>
          </div>

          <!-- 快捷常用语栏 -->
          <div class="chat-quick-row">
            <span class="quick-label">快捷语：</span>
            <div class="quick-pills-wrap">
              <button
                v-for="phrase in quickPhrases"
                :key="phrase"
                type="button"
                class="quick-pill"
                @click="chatInput = phrase"
              >
                {{ phrase }}
              </button>
            </div>
          </div>

          <!-- 底部输入框 -->
          <div class="chat-input-bar">
            <el-input
              v-model="chatInput"
              type="textarea"
              :rows="2"
              placeholder="请输入私信内容 (按 Enter 发送)..."
              maxlength="500"
              resize="none"
              @keydown.enter.exact.prevent="sendChatMessage"
            />
            <div class="chat-send-actions">
              <span class="chat-guard-tip">自觉遵守邻里文明守约，友好沟通</span>
              <el-button
                type="primary"
                :loading="sendingChat"
                :disabled="!chatInput.trim()"
                class="cal-primary-btn"
                size="small"
                @click="sendChatMessage"
              >
                发送私信
              </el-button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="no-session-selected">
            <el-icon :size="44" style="color: #cbd5e1"><ChatDotRound /></el-icon>
            <h4>未选择私信会话</h4>
            <p>请在左侧列表中选择一位邻里，或前往闲置集市发起问询。</p>
            <el-button type="primary" plain size="small" @click="$router.push('/market')">
              浏览邻里集市
            </el-button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, ChatDotRound } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { stompService } from '@/utils/websocket'
import type { ChatSession, ChatMessage } from '@/types'

const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const emit = defineEmits<{
  (e: 'unread-change'): void
}>()

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const chatSessions = ref<ChatSession[]>([])
const loadingSessions = ref(false)
const currentSession = ref<ChatSession | null>(null)
const mobileShowChat = ref(false)
const sessionMessages = ref<ChatMessage[]>([])
const loadingMessages = ref(false)
const chatInput = ref('')
const sendingChat = ref(false)
const chatScrollRef = ref<HTMLElement | null>(null)
let sessionSub: (() => void) | null = null
let removeChatListener: (() => void) | null = null

const quickPhrases = [
  '请问这个还在吗？',
  '方便在楼栋自提吗？',
  '诚心想要，价格还能商量吗？',
  '好的，已收到，非常感谢！',
  '我随时方便，您定时间即可'
]

onMounted(() => {
  loadChatSessions()
  removeChatListener = stompService.onChatMessage((msg: any) => {
    emit('unread-change')
    if (currentSession.value && String(msg.postId) === String(currentSession.value.postId)) {
      if (!sessionMessages.value.some(m => String(m.id) === String(msg.id))) {
        msg.isSelf = String(msg.senderId) === String(userStore.user?.id)
        sessionMessages.value.push(msg)
        scrollChatToBottom()
      }
    } else {
      loadChatSessions()
    }
  })
})

onUnmounted(() => {
  if (removeChatListener) removeChatListener()
  if (sessionSub) sessionSub()
})

async function loadChatSessions(targetHint?: { bizId?: string; title?: string; summary?: string }) {
  loadingSessions.value = true
  try {
    const res: any = await request.get('/chat/sessions')
    chatSessions.value = res || []
  } catch (e) {
  } finally {
    loadingSessions.value = false
  }

  if (chatSessions.value.length > 0) {
    let matched: ChatSession | undefined
    const targetId = targetHint?.bizId || (route.query.sessionId as string) || currentSession.value?.sessionId
    if (targetId) {
      matched = chatSessions.value.find(
        s => s.sessionId === targetId || String(s.postId) === String(targetId) || String(s.otherUserId) === String(targetId)
      )
    }
    if (!matched && targetHint?.title) {
      const nameMatch = targetHint.title.match(/【邻里私信】\s*([^\s]+?)\s*发来/)
      if (nameMatch?.[1]) {
        matched = chatSessions.value.find(s => s.otherUserName?.includes(nameMatch[1].trim()))
      }
    }
    if (!matched && targetHint?.summary) {
      const postMatch = targetHint.summary.match(/关于【(.*?)】/)
      if (postMatch?.[1]) {
        matched = chatSessions.value.find(s => s.postTitle?.includes(postMatch[1].trim()))
      }
    }

    if (matched) {
      await selectSession(matched, !!(targetHint || route.query.sessionId))
    } else if (!currentSession.value) {
      await selectSession(chatSessions.value[0], false)
    }
  }
}

async function selectSession(session: ChatSession, openMobileDetail = false) {
  currentSession.value = session
  if (openMobileDetail) {
    mobileShowChat.value = true
  }
  loadingMessages.value = true
  try {
    const res: any = await request.get('/chat/messages', {
      params: {
        postId: session.postId,
        otherUserId: session.otherUserId
      }
    })
    sessionMessages.value = res || []
    scrollChatToBottom()

    if (session.unreadCount > 0) {
      await request.put('/chat/read', { sessionId: session.sessionId })
      session.unreadCount = 0
      emit('unread-change')
    }
  } finally {
    loadingMessages.value = false
  }

  if (sessionSub) {
    sessionSub()
    sessionSub = null
  }
  sessionSub = stompService.subscribeSession(session.sessionId, (msg: any) => {
    if (!sessionMessages.value.some(m => String(m.id) === String(msg.id))) {
      msg.isSelf = String(msg.senderId) === String(userStore.user?.id)
      sessionMessages.value.push(msg)
      scrollChatToBottom()
      request.put('/chat/read', { sessionId: session.sessionId }).catch(() => {})
      emit('unread-change')
    }
  })
}

async function sendChatMessage() {
  if (!chatInput.value.trim() || !currentSession.value) return
  sendingChat.value = true
  try {
    const res: any = await request.post('/chat/send', {
      postId: currentSession.value.postId,
      receiverId: currentSession.value.otherUserId,
      content: chatInput.value.trim()
    })
    chatInput.value = ''
    if (res && !sessionMessages.value.some(m => String(m.id) === String(res.id))) {
      res.isSelf = true
      sessionMessages.value.push(res)
    }
    if (res && currentSession.value) {
      currentSession.value.lastMessage = res.content
      currentSession.value.lastTime = res.createTime
    }
    scrollChatToBottom()
  } finally {
    sendingChat.value = false
  }
}

function scrollChatToBottom() {
  nextTick(() => {
    if (chatScrollRef.value) {
      chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
    }
  })
}

function formatChatTime(timeStr?: string) {
  if (!timeStr) return ''
  return timeStr.replace(/^\d{4}-/, '')
}

function getPostTypeName(type?: number) {
  switch (type) {
    case 1: return '二手闲置'
    case 2: return '邻里求助'
    case 3: return '物品借用'
    case 4: return '绿色拼车'
    case 5: return '技能交换'
    default: return '互助'
  }
}

defineExpose({
  loadChatSessions
})
</script>

<style scoped>
.panel-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--cal-hairline-soft);
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-bottom: 4px;
}

.panel-sub {
  font-size: 13px;
  color: var(--cal-muted);
}

.chat-tab-container {
  display: grid;
  grid-template-columns: 270px 1fr;
  height: 540px;
  border: 1px solid var(--cal-hairline);
  border-radius: 12px;
  overflow: hidden;
  background: var(--cal-canvas);
}

.session-list-panel {
  border-right: 1px solid var(--cal-hairline);
  background: var(--cal-surface-soft);
  display: flex;
  flex-direction: column;
}

.session-panel-header {
  padding: 12px 14px;
  border-bottom: 1px solid var(--cal-hairline);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--cal-ink);
}

.session-items-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.session-card {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.session-card:hover {
  background: #ffffff;
}

.session-card.active {
  background: #ffffff;
  border-color: var(--cal-ink);
  box-shadow: var(--shadow-sm);
}

.session-avatar-col {
  position: relative;
  flex-shrink: 0;
}

.session-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 0 5px;
  border-radius: 999px;
}

.session-body-col {
  flex: 1;
  min-width: 0;
}

.session-top-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}

.other-user-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--cal-ink);
}

.last-time {
  font-size: 11px;
  color: var(--cal-muted);
}

.post-related-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #059669;
  margin-bottom: 3px;
}

.post-type-mini {
  background: #ecfdf5;
  padding: 0 5px;
  border-radius: 4px;
  flex-shrink: 0;
}

.post-title-mini {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.last-msg-preview {
  font-size: 12px;
  color: var(--cal-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-main-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

.chat-header-bar {
  padding: 12px 18px;
  border-bottom: 1px solid var(--cal-hairline);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mobile-chat-back-btn {
  display: none;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--cal-hairline);
  background: var(--cal-surface-soft);
  color: var(--cal-ink);
  cursor: pointer;
  flex-shrink: 0;
}

.chat-target-user {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.target-user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.name-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.target-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--cal-ink);
}

.session-item-brief {
  font-size: 12px;
  color: var(--cal-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-flow-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-chat-state,
.no-session-selected {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--cal-muted);
  font-size: 13px;
  text-align: center;
  padding: 24px;
}

.flow-msg-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.flow-msg-row.is-mine {
  flex-direction: row-reverse;
}

.flow-bubble-wrap {
  max-width: 72%;
  display: flex;
  flex-direction: column;
}

.flow-msg-row.is-mine .flow-bubble-wrap {
  align-items: flex-end;
}

.flow-sender-meta {
  font-size: 11px;
  color: var(--cal-muted);
  margin-bottom: 3px;
  display: flex;
  gap: 6px;
}

.flow-bubble {
  padding: 9px 13px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid var(--cal-hairline);
  font-size: 13px;
  color: var(--cal-ink);
  line-height: 1.5;
}

.flow-msg-row.is-mine .flow-bubble {
  background: var(--cal-ink);
  color: #ffffff;
  border-color: var(--cal-ink);
}

.chat-quick-row {
  padding: 8px 14px;
  border-top: 1px solid var(--cal-hairline-soft);
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
}

.quick-label {
  font-size: 11px;
  color: var(--cal-muted);
  flex-shrink: 0;
}

.quick-pills-wrap {
  display: flex;
  gap: 6px;
}

.quick-pill {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--cal-hairline);
  background: var(--cal-surface-soft);
  color: var(--cal-body);
  cursor: pointer;
  white-space: nowrap;
}

.quick-pill:hover {
  border-color: var(--cal-ink);
  color: var(--cal-ink);
}

.chat-input-bar {
  padding: 10px 14px;
  border-top: 1px solid var(--cal-hairline);
}

.chat-send-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.chat-guard-tip {
  font-size: 11px;
  color: var(--cal-muted);
}

@media (max-width: 768px) {
  .chat-tab-container {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
  }
  .chat-tab-container:not(.mobile-chat-active) .chat-main-panel {
    display: none;
  }
  .chat-tab-container:not(.mobile-chat-active) .session-list-panel {
    max-height: 440px;
    border-right: none;
    border-bottom: none;
  }
  .chat-tab-container.mobile-chat-active .session-list-panel {
    display: none;
  }
  .chat-tab-container.mobile-chat-active .chat-main-panel {
    display: flex;
  }
  .mobile-chat-back-btn {
    display: inline-flex;
    align-items: center;
  }
  .chat-header-bar {
    padding: 10px 12px;
  }
  .chat-flow-area {
    height: 340px;
  }
}
</style>
