import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import './style.css'
import { safeHtml } from './directives/safeHtml'
import { useUserStore } from './stores/user'
import { useNoticeStore } from './stores/notice'
import { stompService } from './utils/websocket'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn
})
app.directive('safe-html', safeHtml)

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 如果已有 Token，尝试自动连接 STOMP 消息推送，并接通未读数与应急通告回调
const userStore = useUserStore()
const noticeStore = useNoticeStore()
if (userStore.token) {
  stompService.connect(
    userStore.token,
    () => noticeStore.fetchUnreadCount(),
    (notice) => noticeStore.setEmergency(notice)
  )
  userStore.fetchCurrentUser()
  noticeStore.fetchUnreadCount()
}

app.mount('#app')
