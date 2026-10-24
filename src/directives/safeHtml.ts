import type { Directive } from 'vue'
import { sanitizeHtml } from '@/utils/safe-html'

/**
 * v-safe-html：消毒后的 v-html，用于富文本渲染场景
 */
export const safeHtml: Directive<HTMLElement, string | undefined | null> = {
  mounted(el, binding) {
    el.innerHTML = sanitizeHtml(binding.value)
  },
  updated(el, binding) {
    el.innerHTML = sanitizeHtml(binding.value)
  }
}
