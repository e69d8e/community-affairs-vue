import { Client, IMessage, StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { ElNotification } from 'element-plus'
import router from '@/router'

// 连续失败达到该次数后停止自动重连，避免无效 token 造成重连风暴
const MAX_CONSECUTIVE_FAILURES = 5

class StompService {
  private client: Client | null = null
  private isConnected = false
  private latestToken = ''
  private failureCount = 0

  private onNotify?: (msg: any) => void
  private onEmergency?: (msg: any) => void

  private chatListeners: ((msg: any) => void)[] = []

  // 会话订阅登记表：断线重连后由 onConnect 统一重放，避免私信静默断流
  private sessionSubscriptions = new Map<
    string,
    { onMsg: (msg: any) => void; subscription: StompSubscription | null }
  >()

  public onChatMessage(listener: (msg: any) => void) {
    this.chatListeners.push(listener)
    return () => {
      this.chatListeners = this.chatListeners.filter(l => l !== listener)
    }
  }

  public connect(token: string, onNotify?: (msg: any) => void, onEmergency?: (msg: any) => void) {
    if (!token) return
    this.latestToken = token
    if (onNotify) this.onNotify = onNotify
    if (onEmergency) this.onEmergency = onEmergency

    // 旧连接（包括仍在握手中的）先彻底关闭，避免双连接与旧 token 无限重连
    if (this.client) {
      try {
        this.client.deactivate()
      } catch (ignored) {}
      this.client = null
      this.isConnected = false
    }
    this.failureCount = 0

    this.client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        // console.debug('[STOMP]', str)
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // 每次连接（含自动重连）前刷新为最新令牌，避免用失效 token 反复重试
      beforeConnect: () => {
        if (this.client) {
          this.client.connectHeaders = { Authorization: `Bearer ${this.latestToken}` }
        }
      }
    })

    this.client.onConnect = () => {
      this.isConnected = true
      this.failureCount = 0
      console.log('STOMP WebSocket 连接已建立')

      // 1. 订阅全区突发应急广播主题 /topic/emergency
      this.client?.subscribe('/topic/emergency', (message: IMessage) => {
        try {
          const payload = JSON.parse(message.body)
          ElNotification({
            title: '⚠️ 突发应急通告广播',
            message: payload.title + '\n' + (payload.content ? payload.content.replace(/<[^>]*>/g, '') : ''),
            type: 'warning',
            duration: 0,
            position: 'top-right',
            onClick: () => {
              if (payload.id) {
                router.push(`/notices/${payload.id}`)
              } else {
                router.push('/notices')
              }
            }
          })
          if (this.onEmergency) this.onEmergency(payload)
        } catch (e) {
          console.error('解析应急广播消息失败', e)
        }
      })

      // 2. 订阅个人定向通知队列 /user/queue/notify
      this.client?.subscribe('/user/queue/notify', (message: IMessage) => {
        try {
          const payload = JSON.parse(message.body)
          ElNotification({
            title: payload.title || '社区事务提醒',
            message: payload.summary || '您有一条新的事务处理动态，请前往查看。',
            type: 'info',
            duration: 6000,
            position: 'bottom-right',
            onClick: () => {
              const t = (payload.noticeType || '').toUpperCase()
              const title = payload.title || ''
              if (t === 'CHAT' || title.includes('私信')) {
                router.push({ path: '/user/profile', query: { tab: 'chat', sessionId: payload.bizId } })
              } else if (t === 'WORK_ORDER' || title.includes('工单') || title.includes('报修')) {
                const match = title.match(/WO\d+/)
                const orderId = payload.bizId || (match ? match[0] : '')
                router.push(orderId ? `/orders/${orderId}` : '/orders')
              } else if (t === 'NOTICE' || t === 'EMERGENCY' || title.includes('通告') || title.includes('公告')) {
                const noticeId = payload.noticeId || payload.bizId
                router.push(noticeId ? `/notices/${noticeId}` : '/notices')
              } else {
                router.push({ path: '/user/profile', query: { tab: 'notices' } })
              }
            }
          })
          if (this.onNotify) this.onNotify(payload)
        } catch (e) {
          console.error('解析个人通知消息失败', e)
        }
      })

      // 3. 订阅个人私信队列 /user/queue/chat
      this.client?.subscribe('/user/queue/chat', (message: IMessage) => {
        try {
          const payload = JSON.parse(message.body)
          this.chatListeners.forEach(listener => listener(payload))
        } catch (e) {
          console.error('解析私信消息失败', e)
        }
      })

      // 4. 重放登记过的私信会话订阅（断线重连后恢复）
      for (const [sessionId, entry] of this.sessionSubscriptions) {
        entry.subscription?.unsubscribe()
        entry.subscription = this.subscribeTopic(sessionId, entry)
      }
    }

    this.client.onDisconnect = () => {
      this.isConnected = false
    }

    this.client.onStompError = (frame) => {
      console.warn('STOMP 协议错误（多为令牌失效或被服务端拒绝）:', frame.headers['message'])
    }

    this.client.onWebSocketClose = () => {
      this.isConnected = false
      this.failureCount++
      if (this.failureCount >= MAX_CONSECUTIVE_FAILURES) {
        console.warn(`STOMP 连续 ${this.failureCount} 次连接失败，停止自动重连`)
        try {
          this.client?.deactivate()
        } catch (ignored) {}
        this.client = null
      }
    }

    this.client.activate()
  }

  private subscribeTopic(
    sessionId: string,
    entry: { onMsg: (msg: any) => void }
  ): StompSubscription | null {
    if (!this.client) return null
    return this.client.subscribe(`/topic/chat/${sessionId}`, (message: IMessage) => {
      try {
        entry.onMsg(JSON.parse(message.body))
      } catch (e) {}
    })
  }

  /**
   * 订阅私信会话主题：未连接时登记待重连后自动订阅，避免订阅被静默丢弃
   */
  public subscribeSession(sessionId: string, onMsg: (msg: any) => void): () => void {
    const entry = this.sessionSubscriptions.get(sessionId) || { onMsg, subscription: null }
    entry.onMsg = onMsg
    this.sessionSubscriptions.set(sessionId, entry)

    if (this.isConnected && entry.subscription == null) {
      entry.subscription = this.subscribeTopic(sessionId, entry)
    }

    return () => {
      try {
        entry.subscription?.unsubscribe()
      } catch (ignored) {}
      this.sessionSubscriptions.delete(sessionId)
    }
  }

  public disconnect() {
    if (this.client) {
      try {
        this.client.deactivate()
      } catch (ignored) {}
      this.client = null
    }
    this.isConnected = false
    this.sessionSubscriptions.clear()
  }
}

export const stompService = new StompService()
