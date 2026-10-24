// 环境标识（集中断言，避免各处直接引用 import.meta.env 触发类型问题）
export const isDev = !!(import.meta as any).env?.DEV
