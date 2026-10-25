import axios, { AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import type { Result } from '@/types'

const service = axios.create({
  baseURL: '/api',
  timeout: 15000
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 服务不可达弹窗去重：页面并发请求在后端未启动时会同时失败，时间窗内只提示一次
const SERVICE_UNREACHABLE_THROTTLE_MS = 3000
let lastServiceUnreachableAt = 0

function isServiceUnreachable(error: any): boolean {
  // 无 response：连接被拒/断网/超时；或经 Nginx 反代时后端宕机返回的 502/503/504
  if (!error.response) return true
  return [502, 503, 504].includes(error.response.status)
}

function showServiceUnreachable() {
  const now = Date.now()
  if (now - lastServiceUnreachableAt < SERVICE_UNREACHABLE_THROTTLE_MS) return
  lastServiceUnreachableAt = now
  const offline = typeof navigator !== 'undefined' && !navigator.onLine
  ElMessage.error(offline ? '网络连接已断开，请检查本机网络后重试' : '无法连接服务器，请确认后端服务已启动')
}

// 401 并发去重：多个请求同时过期时只清理一次、跳转一次
let redirectingToLogin = false

function handleUnauthorized() {
  if (redirectingToLogin) return
  redirectingToLogin = true
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  const redirect = encodeURIComponent(window.location.pathname + window.location.search)
  window.location.href = `/login?redirect=${redirect}`
}

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<Result>) => {
    // 处理文件下载流等二进制响应
    if (response.config.responseType === 'blob') {
      return response
    }

    const res = response.data
    if (res.code === 200) {
      return res.data
    } else {
      if (res.code === 401) {
        ElMessage.error('登录已失效，请重新登录')
        handleUnauthorized()
      } else {
        ElMessage.error(res.message || '请求处理异常')
      }
      return Promise.reject(new Error(res.message || 'Error'))
    }
  },
  (error) => {
    if (isServiceUnreachable(error)) {
      showServiceUnreachable()
      return Promise.reject(error)
    }
    if (error.response.status === 401) {
      ElMessage.error('登录已失效，请重新登录')
      handleUnauthorized()
      return Promise.reject(error)
    }
    const msg = error.response.data?.message || `请求失败（HTTP ${error.response.status}）`
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

export default service
