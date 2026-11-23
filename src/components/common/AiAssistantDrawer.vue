<template>
  <div class="ai-assistant-wrapper">
    <!-- 右下角全局悬浮智能球 -->
    <button
      v-if="!drawerVisible"
      type="button"
      class="ai-floating-ball"
      :class="{ 'has-pulse': !hasOpened }"
      aria-label="唤起 AI 社区百事通助手"
      @click="openDrawer"
    >
      <div class="ball-inner">
        <span class="ai-icon" aria-hidden="true">🤖</span>
        <span class="ball-label desktop-only">AI 百事通</span>
      </div>
      <div v-if="!hasOpened" class="ai-badge-ping" aria-hidden="true"></div>
    </button>

    <!-- 侧边对话抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      direction="rtl"
      size="440px"
      :with-header="false"
      class="ai-chat-drawer"
      :lock-scroll="false"
      :append-to-body="true"
      destroy-on-close
    >
      <div class="drawer-container" @wheel.stop>
        <!-- 抽屉头部 (彻底拦截非滚动区滚轮事件，防背景穿透) -->
        <div class="drawer-header" @wheel.prevent.stop>
          <div class="header-left">
            <div class="bot-avatar" aria-hidden="true">🤖</div>
            <div class="bot-info">
              <div class="bot-title">
                AI 社区百事通
                <span class="online-tag"><i class="dot" aria-hidden="true"></i> 知识库就绪</span>
              </div>
              <div class="bot-subtitle">7×24h 政策指引 · 报修辅助 · 活动问答</div>
            </div>
          </div>
          <div class="header-actions">
            <el-tooltip content="清空当前会话" placement="bottom">
              <el-button link class="action-btn" aria-label="清空当前会话" @click="clearMessages">
                <el-icon :size="16"><Delete /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="收起抽屉" placement="bottom">
              <el-button link class="action-btn" aria-label="收起抽屉" @click="drawerVisible = false">
                <el-icon :size="18"><Close /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>

        <!-- 消息滚动列表区 (精确拦截边界滚轮穿透，支持向上滑动加载更多历史会话) -->
        <div
          ref="messagesScrollRef"
          class="messages-container"
          @scroll="handleScroll"
          @wheel="handleMessagesWheel"
        >
          <!-- 向上加载更多历史状态栏 -->
          <div v-if="loadingHistory" class="history-loading-bar">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>加载更早的历史对话...</span>
          </div>
          <div v-else-if="hasLoadedHistory && !hasMoreHistory && messages.length > 0" class="history-nomore-bar">
            <span>— 已经显示全部历史记录 —</span>
          </div>

          <!-- 默认欢迎词 -->
          <div class="message-row bot-row">
            <div class="msg-avatar">🤖</div>
            <div class="msg-bubble bot-bubble">
              <p>您好！我是社区专属的 <strong>AI 百事通管家</strong> 🏡</p>
              <p>我可以帮您解答社区政策、办事流程、垃圾分类、电瓶车充电，或者协助您一键在线报修、报名文体活动！</p>
            </div>
          </div>

          <!-- 热门常见问题引导标签 -->
          <div v-if="messages.length === 0" class="suggestions-box">
            <div class="sugg-header">💡 您可以快速向我提问：</div>
            <div class="sugg-list">
              <button
                v-for="(item, idx) in quickQuestions"
                :key="idx"
                type="button"
                class="sugg-chip"
                @click="sendQuickQuestion(item)"
              >
                {{ item }}
              </button>
            </div>
          </div>

          <!-- 动态消息流 -->
          <template v-for="msg in messages" :key="msg.id">
            <!-- 用户消息 -->
            <div v-if="msg.role === 'user'" class="message-row user-row">
              <div class="msg-bubble user-bubble">
                <div class="bubble-content">{{ msg.content }}</div>
              </div>
            </div>

            <!-- AI 助手回复消息 -->
            <div v-else class="message-row bot-row">
              <div class="msg-avatar" aria-hidden="true">🤖</div>
              <div class="msg-bubble bot-bubble">
                <div class="bubble-content" v-safe-html="formatMessage(msg.content)"></div>
                <span v-if="msg.loading" class="typing-cursor" aria-hidden="true">▌</span>

                <!-- 意图识别业务直达卡片 -->
                <div v-if="msg.card" class="action-card-widget">
                  <div class="card-glow-bar"></div>
                  <div class="card-main">
                    <div class="card-icon-wrap">
                      <el-icon :size="20"><component :is="resolveIcon(msg.card.icon)" /></el-icon>
                    </div>
                    <div class="card-text">
                      <div class="card-title">{{ msg.card.title }}</div>
                      <div class="card-desc">{{ msg.card.desc }}</div>
                    </div>
                  </div>
                  <el-button
                    type="primary"
                    size="small"
                    class="card-jump-btn"
                    @click="handleCardJump(msg.card.target)"
                  >
                    {{ msg.card.btnText || '立即办理' }}
                    <el-icon class="el-icon--right"><ArrowRight /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- 抽屉底部输入区 (彻底拦截非滚动区滚轮事件，防背景穿透) -->
        <div class="drawer-footer" @wheel.prevent.stop>
          <div class="input-box-wrap">
            <label for="ai-chat-input" class="visually-hidden">向 AI 社区百事通提问</label>
            <el-input
              id="ai-chat-input"
              v-model="inputQuery"
              type="textarea"
              :rows="2"
              resize="none"
              placeholder="输入社区政策、办事、物业或报修问题... (Enter 发送)"
              :disabled="generating"
              @keydown.enter="handleEnterPress"
            />
            <div class="input-actions-bar">
              <span class="hint-text desktop-only">Shift + Enter 换行</span>
              <div class="btn-group">
                <el-button
                  v-if="generating"
                  type="danger"
                  size="small"
                  plain
                  @click="stopGenerating"
                >
                  停止生成
                </el-button>
                <el-button
                  v-else
                  type="primary"
                  size="small"
                  :disabled="!inputQuery.trim()"
                  class="send-btn"
                  @click="submitQuestion"
                >
                  发送
                  <el-icon class="el-icon--right"><Position /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
          <div class="disclaimer">
            社区 AI 百事通生成内容仅供参考；突发重大险情请直拨物业 24h 热线。
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCommunityStore } from '@/stores/community'
import { useUserStore } from '@/stores/user'
import { streamAiChat, getAiChatHistory, clearAiChatHistory } from '@/api/ai'
import { isImeComposing } from '@/utils/ime'
import type { AiChatMessage, AiActionCard } from '@/types'
import { ElMessage } from 'element-plus'
import {
  Delete,
  Close,
  Position,
  ArrowRight,
  Tools,
  Calendar,
  House,
  ShoppingBag,
  InfoFilled,
  Loading
} from '@element-plus/icons-vue'

const router = useRouter()
const communityStore = useCommunityStore()
const userStore = useUserStore()

const drawerVisible = ref(false)
const hasOpened = ref(false)
const inputQuery = ref('')
const generating = ref(false)
const messages = ref<AiChatMessage[]>([])
const messagesScrollRef = ref<HTMLDivElement>()

// 历史会话分页状态 (向上滑动自动分页加载)
const historyPage = ref(1)
const hasMoreHistory = ref(false)
const loadingHistory = ref(false)
const hasLoadedHistory = ref(false)

let abortController: AbortController | null = null

const quickQuestions = [
  '📋 怎么办理居住证明或房产认证？',
  '⚡ 电瓶车充电桩怎么收费与使用？',
  '🛠️ 我家水管漏水想发起在线报修',
  '🎉 社区最近有哪些文体公益活动？',
  '♻️ 生活垃圾定时定点投放时间？'
]

// 监听登录用户切换，自动重置并重新加载会话
watch(() => userStore.user?.id, () => {
  messages.value = []
  historyPage.value = 1
  hasLoadedHistory.value = false
  hasMoreHistory.value = false
  if (drawerVisible.value) {
    initHistory()
  }
})

function openDrawer() {
  drawerVisible.value = true
  hasOpened.value = true
  if (userStore.isLoggedIn && !hasLoadedHistory.value) {
    initHistory()
  } else {
    scrollToBottom()
  }
}

/**
 * 首次打开抽屉时初始化拉取第一页最新历史
 */
async function initHistory() {
  if (!userStore.isLoggedIn) return
  loadingHistory.value = true
  try {
    const res = await getAiChatHistory({ page: 1, size: 15 })
    const records = res.records || []
    if (records.length > 0) {
      messages.value = records.map(r => ({
        id: String(r.id),
        role: r.role as 'user' | 'assistant',
        content: r.content,
        card: r.card,
        time: r.time || (r.createTime ? r.createTime.slice(11, 16) : '')
      }))
      historyPage.value = 1
      hasMoreHistory.value = 1 < (res.pages || 0)
      await nextTick()
      scrollToBottom()
    } else {
      hasMoreHistory.value = false
    }
  } catch (err) {
    console.warn('获取 AI 历史记录失败:', err)
  } finally {
    loadingHistory.value = false
    hasLoadedHistory.value = true
  }
}

/**
 * 精确拦截消息列表边界滚轮穿透：
 * 当滚动到达顶部且继续向上滑、或到达底部且继续向下滑时，立即阻止事件默认行为与冒泡，
 * 杜绝任何惯性或边界溢出传递给底层背景页面
 */
function handleMessagesWheel(e: WheelEvent) {
  const el = messagesScrollRef.value
  if (!el) return

  const delta = e.deltaY
  const isUp = delta < 0
  const isDown = delta > 0

  // 向上滑且已在最顶部 (scrollTop <= 0)
  if (isUp && el.scrollTop <= 0) {
    e.preventDefault()
    e.stopPropagation()
    return
  }

  // 向下滑且已在最底部 (scrollTop + clientHeight >= scrollHeight - 1)
  const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
  if (isDown && isAtBottom) {
    e.preventDefault()
    e.stopPropagation()
    return
  }

  // 抽屉内部正常滚动，阻断事件向外冒泡
  e.stopPropagation()
}

/**
 * 监听聊天容器滚动：当向上滑动接近顶部时触发加载更早历史
 */
function handleScroll() {
  const el = messagesScrollRef.value
  if (!el || loadingHistory.value || !hasMoreHistory.value) return
  if (el.scrollTop < 40) {
    loadMoreHistory()
  }
}

/**
 * 向上滑动加载更早历史分页
 */
async function loadMoreHistory() {
  if (loadingHistory.value || !hasMoreHistory.value || !userStore.isLoggedIn) return
  loadingHistory.value = true

  const el = messagesScrollRef.value
  const oldScrollHeight = el ? el.scrollHeight : 0
  const oldScrollTop = el ? el.scrollTop : 0

  try {
    const nextPage = historyPage.value + 1
    const res = await getAiChatHistory({ page: nextPage, size: 15 })
    const records = res.records || []

    if (records.length > 0) {
      const historyMsgs: AiChatMessage[] = records.map(r => ({
        id: String(r.id),
        role: r.role as 'user' | 'assistant',
        content: r.content,
        card: r.card,
        time: r.time || (r.createTime ? r.createTime.slice(11, 16) : '')
      }))
      messages.value = [...historyMsgs, ...messages.value]
      historyPage.value = nextPage
      hasMoreHistory.value = nextPage < (res.pages || 0)

      // 保持当前查看位置不跳跃
      await nextTick()
      if (el) {
        el.scrollTop = el.scrollHeight - oldScrollHeight + oldScrollTop
      }
    } else {
      hasMoreHistory.value = false
    }
  } catch (err) {
    console.warn('加载更多历史记录失败:', err)
  } finally {
    loadingHistory.value = false
  }
}

/**
 * 清空当前用户历史记录
 */
async function clearMessages() {
  if (generating.value) {
    stopGenerating()
  }
  try {
    if (userStore.isLoggedIn) {
      await clearAiChatHistory()
    }
    messages.value = []
    historyPage.value = 1
    hasMoreHistory.value = false
    hasLoadedHistory.value = true
    ElMessage.success('已清空所有历史对话')
  } catch (err) {
    ElMessage.error('清空历史对话失败')
  }
}

function sendQuickQuestion(question: string) {
  // 去除前面的 Emoji 图标
  const cleanQ = question.replace(/^[^\w\u4e00-\u9fa5]+/, '').trim()
  inputQuery.value = cleanQ
  submitQuestion()
}

function handleEnterPress(e: Event) {
  if (!(e instanceof KeyboardEvent)) return
  if (e.shiftKey || isImeComposing(e)) return
  e.preventDefault()
  submitQuestion()
}

async function submitQuestion() {
  const query = inputQuery.value.trim()
  if (!query || generating.value) return

  // 1. 添加用户消息
  const userMsgId = 'user-' + Date.now()
  messages.value.push({
    id: userMsgId,
    role: 'user',
    content: query,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })

  inputQuery.value = ''
  scrollToBottom()

  // 2. 准备机器人回复占位消息
  const botMsgId = 'bot-' + (Date.now() + 1)
  const botMsg: AiChatMessage = {
    id: botMsgId,
    role: 'assistant',
    content: '',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    loading: true
  }
  messages.value.push(botMsg)
  scrollToBottom()

  generating.value = true
  abortController = new AbortController()

  // 构建历史上下文
  const history = messages.value
    .filter(m => m.id !== botMsgId && m.content)
    .slice(-6)
    .map(m => ({ role: m.role, content: m.content }))

  try {
    await streamAiChat({
      prompt: query,
      history,
      communityId: communityStore.selectedCommunityId || userStore.user?.communityId || undefined,
      signal: abortController.signal,
      onChunk: (chunk: string) => {
        botMsg.content += chunk
        scrollToBottom()
      },
      onCard: (card: AiActionCard) => {
        botMsg.card = card
        scrollToBottom()
      },
      onDone: () => {
        botMsg.loading = false
        generating.value = false
        scrollToBottom()
      },
      onError: (err: any) => {
        console.error('AI 对话流中断:', err)
        if (!botMsg.content) {
          botMsg.content = '抱歉，当前问答服务繁忙，请稍后再试或直接咨询物业热线。'
        }
        botMsg.loading = false
        generating.value = false
        scrollToBottom()
      }
    })
  } catch (err) {
    botMsg.loading = false
    generating.value = false
  }
}

function stopGenerating() {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  generating.value = false
  const last = messages.value[messages.value.length - 1]
  if (last && last.loading) {
    last.loading = false
  }
}

function handleCardJump(target: string) {
  if (target) {
    drawerVisible.value = false
    router.push(target)
  }
}

function resolveIcon(iconName?: string) {
  switch (iconName) {
    case 'Tools':
      return Tools
    case 'Calendar':
      return Calendar
    case 'House':
      return House
    case 'ShoppingBag':
      return ShoppingBag
    default:
      return InfoFilled
  }
}

function formatMessage(text: string): string {
  if (!text) return ''
  // 简单安全格式化：加粗、换行、列表
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
  return html
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesScrollRef.value) {
      messagesScrollRef.value.scrollTop = messagesScrollRef.value.scrollHeight
    }
  })
}
</script>

<style scoped>
/* 悬浮球样式 */
.ai-floating-ball {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 999;
  border: none;
  background: transparent;
  padding: 0;
  font-family: inherit;
  cursor: pointer;
  user-select: none;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: no-preference) {
  .ai-floating-ball:hover {
    transform: translateY(-4px) scale(1.05);
  }
}

/* 移动端 (<=900px): 悬浮球抬到底部 TabBar 上方, 避免遮挡"我的"等标签 */
@media (max-width: 900px) {
  .ai-floating-ball {
    right: 16px;
    bottom: calc(76px + env(safe-area-inset-bottom));
  }
}

.ball-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px 10px 14px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 9999px;
  box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.45), 0 8px 10px -6px rgba(37, 99, 235, 0.3);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.ai-icon {
  font-size: 20px;
  line-height: 1;
}

.ball-label {
  letter-spacing: 0.5px;
}

/* 呼吸光环：遵循 reduced-motion 偏好 */
@media (prefers-reduced-motion: no-preference) {
  .has-pulse .ball-inner {
    animation: pulse-ring 2.8s infinite;
  }
}

@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.6), 0 10px 25px -5px rgba(37, 99, 235, 0.45);
  }
  70% {
    box-shadow: 0 0 0 14px rgba(37, 99, 235, 0), 0 10px 25px -5px rgba(37, 99, 235, 0.45);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0), 0 10px 25px -5px rgba(37, 99, 235, 0.45);
  }
}

/* 彻底阻断抽屉原生滚动链穿透 (Scroll Chaining) */
:deep(.el-drawer) {
  overscroll-behavior: contain !important;
}

:deep(.el-drawer__body) {
  padding: 0 !important;
  overflow: hidden !important;
  overscroll-behavior: contain !important;
}

/* 抽屉内布局 */
.drawer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8fafc;
  overscroll-behavior: contain !important;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  overscroll-behavior: contain !important;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bot-avatar {
  width: 40px;
  height: 40px;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eff6ff;
  border-radius: 12px;
  border: 1px solid #dbeafe;
}

.bot-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.online-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #10b981;
  background: #ecfdf5;
  padding: 1px 7px;
  border-radius: 9999px;
  border: 1px solid #a7f3d0;
}

.online-tag .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.bot-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  color: #64748b;
  padding: 6px;
}

.action-btn:hover {
  color: #0f172a;
}

/* 消息流区域 */
.messages-container {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain !important;
  -webkit-overflow-scrolling: touch;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-loading-bar,
.history-nomore-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
  font-size: 12px;
  color: var(--cal-muted);
  user-select: none;
}

.history-loading-bar .el-icon {
  animation: rotating 1.5s linear infinite;
}

.history-nomore-bar span {
  background: #f1f5f9;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 11px;
}

.message-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.user-row {
  justify-content: flex-end;
}

.msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  border: 1px solid #dbeafe;
}

.msg-bubble {
  max-width: 82%;
  padding: 12px 15px;
  font-size: 13.5px;
  line-height: 1.6;
  border-radius: 14px;
  word-break: break-word;
}

.bot-bubble {
  background: #ffffff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  border-top-left-radius: 4px;
}

.user-bubble {
  background: #2563eb;
  color: #ffffff;
  border-top-right-radius: 4px;
  box-shadow: 0 2px 6px -1px rgba(37, 99, 235, 0.3);
}

.typing-cursor {
  display: inline-block;
  margin-left: 2px;
  color: #2563eb;
  animation: blink 0.8s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 热门提问建议区 */
.suggestions-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  margin-top: 4px;
}

.sugg-header {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 10px;
}

.sugg-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sugg-chip {
  text-align: left;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12.5px;
  color: #334155;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.sugg-chip:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}
@media (prefers-reduced-motion: no-preference) {
  .sugg-chip:hover {
    transform: translateX(3px);
  }
}

/* 业务直达卡片 */
.action-card-widget {
  margin-top: 12px;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1px solid #a7f3d0;
  border-radius: 10px;
  padding: 12px;
  position: relative;
  overflow: hidden;
}

.card-glow-bar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 4px;
  background: #10b981;
}

.card-main {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.card-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #ffffff;
  color: #059669;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1fae5;
}

.card-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #065f46;
}

.card-desc {
  font-size: 12px;
  color: #047857;
  margin-top: 2px;
}

.card-jump-btn {
  width: 100%;
  background: #059669 !important;
  border-color: #059669 !important;
}

.card-jump-btn:hover {
  background: #047857 !important;
}

/* 底部输入区 */
.drawer-footer {
  padding: 14px 16px 12px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.input-box-wrap {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 8px 10px;
  transition: border-color 0.2s;
}

.input-box-wrap:focus-within {
  border-color: #2563eb;
  background: #ffffff;
}

.input-box-wrap :deep(.el-textarea__inner) {
  box-shadow: none !important;
  background: transparent !important;
  padding: 0 !important;
  font-size: 13.5px;
}

.input-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #e2e8f0;
}

.hint-text {
  font-size: 11px;
  color: var(--cal-muted);
}

.send-btn {
  background: #2563eb !important;
  border-color: #2563eb !important;
  font-weight: 600;
}

.disclaimer {
  font-size: 11px;
  color: var(--cal-muted);
  text-align: center;
  margin-top: 8px;
}

/* 与 ResidentLayout 的移动端断点 (900px) 对齐: 收起桌面文案, 悬浮球在窄屏退化为纯图标 */
@media (max-width: 900px) {
  .desktop-only {
    display: none !important;
  }
}
</style>
