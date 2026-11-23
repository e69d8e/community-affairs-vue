/**
 * 检查当前键盘事件是否处于输入法（IME）组词态。
 * 包含 `keyCode === 229` 兜底，防止 Safari 将 `compositionend` 提前于确认回车触发导致误提交。
 */
export function isImeComposing(event: Event): boolean {
  if (!(event instanceof KeyboardEvent)) return false
  return event.isComposing || event.keyCode === 229
}
