import request from '@/utils/request'
import type { SliderCaptchaData } from '@/types'

/**
 * 获取登录/注册滑块验证码 (带缺口背景图 + 拼图块, base64 data URI)
 */
export function getCaptcha(): Promise<SliderCaptchaData> {
  return request.get('/auth/captcha')
}
