// 环境标识（集中断言，避免各处直接引用 import.meta.env 触发类型问题）
// 演示环境 = Vite 开发模式 或 本机部署访问(localhost/127.0.0.1)：
// 展示快捷登录通道、体验账号提示、演示监测面板等答辩演示功能；真实域名部署时自动隐藏
const isLocalHost = typeof window !== 'undefined'
  && ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(window.location.hostname)

export const isDev = !!(import.meta as any).env?.DEV || isLocalHost
