/**
 * 本地内联 SVG 占位资源，避免无外网 / 内网环境下默认头像与封面破图。
 */
export const DEFAULT_AVATAR =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none">' +
      '<rect width="80" height="80" rx="40" fill="#e2e8f0"/>' +
      '<circle cx="40" cy="31" r="14" fill="#94a3b8"/>' +
      '<path d="M16 68c0-13.255 10.745-22 24-22s24 8.745 24 22" fill="#94a3b8"/>' +
      '</svg>'
  )

export const DEFAULT_COVER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" fill="none">' +
      '<rect width="600" height="400" fill="#f1f5f9"/>' +
      '<rect x="230" y="130" width="140" height="100" rx="12" fill="#cbd5e1"/>' +
      '<circle cx="272" cy="166" r="14" fill="#f8fafc"/>' +
      '<path d="M242 218l38-36 28 24 22-18 28 30H242z" fill="#94a3b8"/>' +
      '</svg>'
  )
