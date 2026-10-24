import DOMPurify from 'dompurify'

/**
 * 统一的富文本消毒入口：所有 v-html 场景必须经过本方法，
 * 防止公告/帖子等用户或后台内容注入脚本（存储型 XSS）
 */
export function sanitizeHtml(dirty: string | undefined | null): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ADD_ATTR: ['target']
  })
}
