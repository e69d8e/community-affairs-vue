import request from '@/utils/request'
import type { Result, PageResult, AiOrderParseResult, AiOrderTriageResult, AiActionCard, AiChatMessage } from '@/types'

/**
 * 居民口语化报修长文本一键 AI 结构化整理
 */
export function parseOrderText(rawText: string): Promise<AiOrderParseResult> {
  return request.post('/ai/order/parse', { rawText })
}

/**
 * 管理端工单初审 AI 智能分诊与派工建议研判
 */
export function triageWorkOrder(data: {
  orderId: string
  title?: string
  orderType?: number
  category?: string
  content?: string
  images?: string[]
  isUrgent?: number
}): Promise<AiOrderTriageResult> {
  return request.post('/ai/admin/order/triage', data)
}

/**
 * 分页获取当前用户的 AI 对话历史记录
 */
export function getAiChatHistory(params: { page: number; size: number }): Promise<PageResult<AiChatMessage>> {
  return request.get('/ai/chat/history', { params })
}

/**
 * 清空当前用户的全部 AI 对话历史记录
 */
export function clearAiChatHistory(): Promise<void> {
  return request.delete('/ai/chat/history')
}


export interface StreamChatOptions {
  prompt: string
  history?: Array<{ role: string; content: string }>
  communityId?: string | null
  onChunk: (chunk: string) => void
  onCard?: (card: AiActionCard) => void
  onDone?: () => void
  onError?: (err: any) => void
  signal?: AbortSignal
}

/**
 * AI 社区百事通 SSE 流式问答
 */
export async function streamAiChat(options: StreamChatOptions): Promise<void> {
  const { prompt, history = [], communityId, onChunk, onCard, onDone, onError, signal } = options

  const params = new URLSearchParams()
  params.set('prompt', prompt)
  if (history && history.length > 0) {
    params.set('history', JSON.stringify(history))
  }
  if (communityId) {
    params.set('communityId', String(communityId))
  }

  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    Accept: 'text/event-stream'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`/api/ai/chat/stream?${params.toString()}`, {
      method: 'GET',
      headers,
      signal
    })

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported on response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data:')) {
          const rawData = trimmed.replace(/^data:\s*/, '')
          if (!rawData) continue
          try {
            const parsed = JSON.parse(rawData)
            if (parsed.type === 'chunk' && parsed.content) {
              onChunk(parsed.content)
            } else if (parsed.type === 'card' && parsed.card && onCard) {
              onCard(parsed.card)
            } else if (parsed.type === 'done' && onDone) {
              onDone()
            }
          } catch {
            // 容错处理纯文本流
            onChunk(rawData)
          }
        }
      }
    }

    if (onDone) {
      onDone()
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return
    }
    if (onError) {
      onError(error)
    } else {
      console.error('SSE 流式传输异常:', error)
    }
  }
}
