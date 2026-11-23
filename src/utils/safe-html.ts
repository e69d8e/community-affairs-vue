import DOMPurify from 'dompurify'

/** 富文本安全标签与属性白名单（覆盖社区公告富文本与搜索高亮标签） */
export const SAFE_HTML_ELEMENTS = [
  'p',
  'br',
  'div',
  'span',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'code',
  'pre',
  'hr',
  'a',
  'img',
  'mark',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td'
] as const

export const SAFE_HTML_ATTRIBUTES = [
  'class',
  'href',
  'src',
  'alt',
  'title',
  'target',
  'rel',
  'width',
  'height'
] as const

/**
 * 统一的富文本消毒入口：所有 v-html 场景必须经过本方法或 v-safe-html 指令，
 * 防止公告/帖子等用户或后台内容注入脚本（存储型 XSS）
 */
export function sanitizeHtml(dirty: string | undefined | null): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [...SAFE_HTML_ELEMENTS, '#text'],
    ALLOWED_ATTR: [...SAFE_HTML_ATTRIBUTES],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: false
  })
}
