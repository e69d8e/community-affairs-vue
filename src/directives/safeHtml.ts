import type { Directive } from 'vue'
import { SAFE_HTML_ATTRIBUTES, SAFE_HTML_ELEMENTS, sanitizeHtml } from '@/utils/safe-html'

type SanitizerHost = HTMLElement & {
  setHTML?: (
    input: string,
    options?: { sanitizer?: { elements: readonly string[]; attributes: readonly string[] } }
  ) => void
}

function renderSafeHtml(el: HTMLElement, dirty: string | undefined | null) {
  const html = dirty || ''
  if (!html) {
    el.replaceChildren()
    return
  }

  // 优先使用原生 Sanitizer API (setHTML)，不支持时回退至与之一致的 DOMPurify 策略
  if ('setHTML' in Element.prototype) {
    const host = el as SanitizerHost
    if (typeof host.setHTML === 'function') {
      host.setHTML(html, {
        sanitizer: {
          elements: SAFE_HTML_ELEMENTS,
          attributes: SAFE_HTML_ATTRIBUTES
        }
      })
      return
    }
  }

  el.innerHTML = sanitizeHtml(html)
}

/**
 * v-safe-html：消毒后的 HTML 渲染指令，用于公告、搜素高亮与 AI 回复等富文本场景
 */
export const safeHtml: Directive<HTMLElement, string | undefined | null> = {
  mounted(el, binding) {
    renderSafeHtml(el, binding.value)
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      renderSafeHtml(el, binding.value)
    }
  }
}
