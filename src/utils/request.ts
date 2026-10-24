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
    let msg = '网络连接超时或后端服务未响应'
    if (error.response && error.response.data) {
      msg = error.response.data.message || msg
      if (error.response.status === 401) {
        ElMessage.error('登录已失效，请重新登录')
        handleUnauthorized()
        return Promise.reject(error)
      }
    }
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

export default service
