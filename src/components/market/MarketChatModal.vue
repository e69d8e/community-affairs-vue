<template>
  <el-dialog
    v-model="visible"
    :title="`与邻里【${chatTargetUser?.name || post?.authorName || '发布者'}】私信沟通`"
    width="580px"
    destroy-on-close
    append-to-body
    class="market-chat-dialog"
    @open="handleOpen"
    @close="handleClose"
  >
    <div class="chat-wrapper">
      <!-- 关联闲置/求助商品微缩卡片 -->
      <div v-if="post" class="post-preview-card">
        <img :src="getCover(post.images)" :alt="post.title" width="52" height="52" class="preview-img" />
        <div class="preview-info">
          <div class="preview-title-row">
            <span class="preview-type-badge">{{ getPostTypeName(post.postType) }}</span>
            <span class="preview-title">{{ post.title }}</span>
          </div>
          <div class="preview-meta-row">
            <span class="preview-price">
              {{ post.price > 0 ? '¥ ' + post.price : '免费 / 互助' }}
            </span>
            <span class="preview-delivery">📍 {{ post.tradeAddress || getDeliveryText(post.deliveryType) }}</span>
          </div>
        </div>
      </div>

      <!-- 快捷常用语 (根据闲置/互助类型智能切换) -->
      <div class="quick-phrases-bar">
        <span class="quick-title">⚡ 快捷沟通：</span>
        <div class="phrase-pills">
          <button
            v-for="phrase in quickPhrases"
            :key="phrase"
            type="button"
            class="phrase-pill"
            @click="usePhrase(phrase)"
          >
            {{ phrase }}
          </button>
        </div>
      </div>

      <!-- 消息气泡流容器 -->
      <div ref="messageContainerRef" v-loading="loading" class="messages-container">
        <div v-if="messages.length === 0 && !loading" class="empty-chat">
          <span class="empty-icon">💬</span>
          <p>暂无私信记录，您可以主动发送消息咨询物品成色、价格商议或互助交接方式~</p>
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['message-row', { 'is-self': msg.isSelf }]"
        >
          <el-avatar
            :size="36"
            :src="msg.isSelf ? (userStore.user?.avatar || defaultAvatar) : (msg.senderAvatar || defaultAvatar)"
            class="msg-avatar"
          />
          <div class="msg-bubble-wrap">
            <div class="msg-sender-meta">
              <span class="sender-name">{{ msg.isSelf ? '我' : msg.senderName }}</span>
              <span class="send-time">{{ formatTime(msg.createTime) }}</span>
            </div>
            <div class="msg-bubble">
              {{ msg.content }}
            </div>
          </div>
        </div>
      </div>

      <!-- 底部输入区 -->
      <div class="chat-input-area">
        <label for="market-chat-input" class="visually-hidden">私信内容</label>
        <el-input
          id="market-chat-input"
          v-model="inputContent"
          type="textarea"
          :rows="2"
          placeholder="请输入私信内容，沟通价格或互助细节 (按 Enter 发送)..."
          maxlength="500"
          resize="none"
          @keydown.enter.exact="handleEnterKey"
        />
        <div class="input-actions-row">
          <span class="input-tip">自觉遵守社区守约，请勿发布不良广告</span>
          <el-button
            type="primary"
            :loading="sending"
            :disabled="!inputContent.trim()"
            class="send-btn"
            @click="handleSend"
          >
            发 送
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { isImeComposing } from '@/utils/ime'
import { DEFAULT_AVATAR, DEFAULT_COVER } from '@/constants/defaults'
import { useUserStore } from '@/stores/user'
import { stompService } from '@/utils/websocket'
import type { MarketPost, ChatMessage } from '@/types'

const defaultAvatar = DEFAULT_AVATAR

const props = defineProps<{
  modelValue: boolean
  post?: MarketPost | null
  targetUser?: {
    id: string
    name: string
    avatar?: string
    creditScore?: number
  } | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'sent', msg: ChatMessage): void
}>()

const userStore = useUserStore()
const messageContainerRef = ref<HTMLElement | null>(null)

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const sending = ref(false)
const inputContent = ref('')
const messages = ref<ChatMessage[]>([])
let sessionSubscription: (() => void) | null = null
let removeGlobalListener: (() => void) | null = null

const chatTargetUser = computed(() => {
  if (props.targetUser) return props.targetUser
  if (props.post) {
    return {
      id: String(props.post.userId),
      name: props.post.authorName,
      avatar: props.post.authorAvatar,
      creditScore: props.post.authorCreditScore
    }
  }
  return null
})

// 智能快捷短语
const quickPhrases = computed(() => {
  const type = props.post?.postType || 1
  if (type === 1) {
    return [
      '请问这个还在吗？',
      '诚心想要，价格还能商量吗？',
      '请问在哪个楼栋自提比较方便？',
      '成色怎样，有瑕疵或暗病吗？'
    ]
  } else if (type === 2) {
    return [
      '你好，我可以帮忙！',
      '请问具体需要什么时候协助？',
      '我有相关经验，方便沟通下细节吗？'
    ]
  } else if (type === 3) {
    return [
      '你好，我家有工具可以借用！',
      '请问大概借用多久？',
      '方便到我楼下大堂拿一下吗？'
    ]
  } else if (type === 4) {
    return [
      '请问还有拼车空位吗？',
      '出发时间和路线方便沟通吗？'
    ]
  } else {
    return [
      '你好，我对这个技能交换很感兴趣！',
      '方便沟通下互助细节吗？'
    ]
  }
})

function usePhrase(phrase: string) {
  inputContent.value = phrase
}

async function handleOpen() {
  if (!props.post || !chatTargetUser.value) return
  await loadMessages()
  subscribeChat()
}

function handleClose() {
  if (sessionSubscription) {
    sessionSubscription()
    sessionSubscription = null
  }
}

async function loadMessages() {
  if (!props.post || !chatTargetUser.value) return
  loading.value = true
  try {
    const res: any = await request.get('/chat/messages', {
      params: {
        postId: props.post.id,
        otherUserId: chatTargetUser.value.id
      }
    })
    messages.value = res || []
    scrollToBottom()
  } catch (e) {
  } finally {
    loading.value = false
  }
}

function subscribeChat() {
  if (!props.post || !chatTargetUser.value) return
  const myId = BigInt(userStore.user?.id || 0)
  const targetId = BigInt(chatTargetUser.value.id || 0)
  const minId = myId < targetId ? myId : targetId
  const maxId = myId < targetId ? targetId : myId
  const sessionId = `post_${props.post.id}_${minId}_${maxId}`

  if (sessionSubscription) sessionSubscription()
  sessionSubscription = stompService.subscribeSession(sessionId, (msg: any) => {
    // 收到会话广播消息
    if (!messages.value.some(m => String(m.id) === String(msg.id))) {
      msg.isSelf = String(msg.senderId) === String(userStore.user?.id)
      messages.value.push(msg)
      scrollToBottom()
      // 标记已读
      request.put('/chat/read', { sessionId }).catch(() => {})
    }
  })
}

function handleEnterKey(e: Event) {
  if (isImeComposing(e)) return
  e.preventDefault()
  handleSend()
}

async function handleSend() {
  if (!inputContent.value.trim() || !props.post || !chatTargetUser.value) return
  sending.value = true
  try {
    const res: any = await request.post('/chat/send', {
      postId: props.post.id,
      receiverId: chatTargetUser.value.id,
      content: inputContent.value.trim()
    })
    inputContent.value = ''
    if (res && !messages.value.some(m => String(m.id) === String(res.id))) {
      res.isSelf = true
      messages.value.push(res)
    }
    scrollToBottom()
    emit('sent', res)
  } catch (e) {
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messageContainerRef.value) {
      messageContainerRef.value.scrollTop = messageContainerRef.value.scrollHeight
    }
  })
}

function getCover(imagesJson?: string) {
  if (!imagesJson) return DEFAULT_COVER
  try {
    const parsed = JSON.parse(imagesJson)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : DEFAULT_COVER
  } catch (e) {
    return DEFAULT_COVER
  }
}

function getPostTypeName(type: number) {
  switch (type) {
    case 1: return '二手闲置'
    case 2: return '邻里求助'
    case 3: return '物品借用'
    case 4: return '绿色拼车'
    case 5: return '技能交换'
    default: return '互助'
  }
}

function getDeliveryText(type: number) {
  switch (type) {
    case 1: return '楼下自提'
    case 2: return '送货上门'
    default: return '私信约定地点'
  }
}

function formatTime(timeStr?: string) {
  if (!timeStr) return ''
  return timeStr.replace(/^\d{4}-/, '')
}

onMounted(() => {
  removeGlobalListener = stompService.onChatMessage((msg: any) => {
    if (props.post && String(msg.postId) === String(props.post.id)) {
      if (!messages.value.some(m => String(m.id) === String(msg.id))) {
        msg.isSelf = String(msg.senderId) === String(userStore.user?.id)
        messages.value.push(msg)
        scrollToBottom()
      }
    }
  })
})

onUnmounted(() => {
  if (removeGlobalListener) removeGlobalListener()
  if (sessionSubscription) sessionSubscription()
})
</script>

<style scoped>
.chat-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 顶部关联商品微缩卡片 */
.post-preview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.preview-img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.preview-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-type-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  background: #0f172a;
  color: #fff;
  border-radius: 4px;
  flex-shrink: 0;
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.preview-price {
  font-weight: 700;
  color: #ea580c;
}

.preview-delivery {
  color: #64748b;
  font-size: 11px;
}

/* 快捷短语条 */
.quick-phrases-bar {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 2px 0 4px;
}

.quick-title {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 24px;
}

.phrase-pills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  flex: 1;
}

.phrase-pill {
  font-size: 11px;
  color: #334155;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  line-height: 18px;
  flex-shrink: 0;
}

.phrase-pill:hover {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

/* 消息流容器 */
.messages-container {
  height: 320px;
  overflow-y: auto;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-chat {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  padding: 0 32px;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

/* 消息气泡 */
.message-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  max-width: 82%;
}

.message-row.is-self {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.msg-avatar {
  flex-shrink: 0;
}

.msg-bubble-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.msg-sender-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #94a3b8;
}

.message-row.is-self .msg-sender-meta {
  justify-content: flex-end;
}

.msg-bubble {
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 12px;
  word-break: break-word;
  background: #f1f5f9;
  color: #1e293b;
  border-top-left-radius: 2px;
}

.message-row.is-self .msg-bubble {
  background: #0f172a;
  color: #ffffff;
  border-top-left-radius: 12px;
  border-top-right-radius: 2px;
}

/* 底部输入框 */
.chat-input-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.input-tip {
  font-size: 11px;
  color: #94a3b8;
}

.send-btn {
  padding: 6px 20px;
  font-weight: 600;
  background: #0f172a;
  border-color: #0f172a;
}
.send-btn:hover {
  background: #1e293b;
  border-color: #1e293b;
}
</style>
