import QRCode from 'qrcode'

// 本地生成的二维码缓存，避免重复编码
const cache = new Map<string, string>()

/**
 * 本地生成二维码 DataURL（替代把核销码等隐私内容提交到第三方 api.qrserver.com）
 */
export async function localQrDataUrl(text: string | undefined | null, size = 200): Promise<string> {
  if (!text) return ''
  const key = `${size}:${text}`
  const hit = cache.get(key)
  if (hit) return hit
  const url = await QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M'
  })
  cache.set(key, url)
  return url
}
