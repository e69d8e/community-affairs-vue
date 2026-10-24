<template>
  <div class="home-view">
    <!-- ====================================================================
         1. 顶部问候与置顶通告横幅 (Greeting & Broadcast Bar)
         ==================================================================== -->
    <section class="portal-greeting-bar">
      <div class="greeting-left">
        <div class="greeting-badge">
          <span class="badge-dot"></span>
          <span>🏡 阳光翠竹苑 · 智慧便民综合治理平台</span>
        </div>
        <h1 class="greeting-title">
          {{ greetingText }}<span v-if="userStore.isLoggedIn && userDisplayName">，{{ userDisplayName }}</span>
        </h1>
        <p class="greeting-subtitle">
          为社区居民与物业提供严谨现代的数字化服务体验。设施敏捷申报、通告直达、文体预约与邻里互助。
        </p>
      </div>

      <div class="greeting-right">
        <!-- 全局快捷检索胶囊框 (可呼出 OmniSearch ⌘K) -->
        <div class="omni-search-box" @click="handleOpenSearch" title="点击呼出全站聚合检索 (⌘K)">
          <el-icon class="search-icon"><Search /></el-icon>
          <span class="search-placeholder">检索公告、活动、互助...</span>
          <span class="search-shortcut">⌘K</span>
        </div>

        <!-- 紧急/置顶通告广播胶囊条 -->
        <div
          v-if="topNotice"
          class="top-notice-pill"
          @click="$router.push(`/notices/${topNotice.id}`)"
          :title="topNotice.title"
        >
          <div class="notice-pill-tag" :class="topNotice.noticeType === 4 ? 'tag-emergency' : 'tag-top'">
            <el-icon><Bell /></el-icon>
            <span>{{ topNotice.noticeType === 4 ? '突发应急' : '重要通报' }}</span>
          </div>
          <span class="notice-pill-title">{{ topNotice.title }}</span>
          <el-icon class="notice-pill-arrow"><ArrowRight /></el-icon>
        </div>
      </div>
    </section>

    <!-- ====================================================================
         2. 核心便民金刚区 + 居民事务速览看板 (Portal Hub Section)
         ==================================================================== -->
    <section class="portal-hub-section">
      <!-- 左侧：5 大核心便民服务金刚区 (直观磁贴) -->
      <div class="service-tiles-wrapper">
        <div class="hub-header">
          <div class="hub-title-row">
            <span class="hub-indicator"></span>
            <h2 class="hub-title">高频便民服务直达</h2>
          </div>
          <span class="hub-hint">常用事务 · 一键申报</span>
        </div>

        <div class="service-tiles-grid">
          <!-- 1. 房屋设施报修 -->
          <div class="service-tile tile-repair" @click="$router.push('/orders/submit?type=1')">
            <div class="tile-icon-wrap icon-blue">🛠️</div>
            <div class="tile-content">
              <div class="tile-title-row">
                <h3 class="tile-title">房屋设施报修</h3>
                <span class="tile-badge badge-blue">极速派工</span>
              </div>
              <p class="tile-desc">水电照明 / 管道门窗故障极速申报</p>
            </div>
          </div>

          <!-- 2. 物业投诉建议 -->
          <div class="service-tile tile-complaint" @click="$router.push('/orders/submit?type=2')">
            <div class="tile-icon-wrap icon-amber">📝</div>
            <div class="tile-content">
              <div class="tile-title-row">
                <h3 class="tile-title">物业投诉建议</h3>
                <span class="tile-badge badge-amber">直达网格</span>
              </div>
              <p class="tile-desc">噪音违停 / 物业服务诉求直达专干</p>
            </div>
          </div>

          <!-- 3. 文体公益活动 -->
          <div class="service-tile tile-activity" @click="$router.push('/activities')">
            <div class="tile-icon-wrap icon-emerald">🎪</div>
            <div class="tile-content">
              <div class="tile-title-row">
                <h3 class="tile-title">文体公益活动</h3>
                <span class="tile-badge badge-emerald">在线报名</span>
              </div>
              <p class="tile-desc">邻里文体 / 亲子公益预约与核销</p>
            </div>
          </div>

          <!-- 4. 邻里二手互助 -->
          <div class="service-tile tile-market" @click="$router.push('/market')">
            <div class="tile-icon-wrap icon-purple">🤝</div>
            <div class="tile-content">
              <div class="tile-title-row">
                <h3 class="tile-title">邻里闲置互助</h3>
                <span class="tile-badge badge-purple">友邻流转</span>
              </div>
              <p class="tile-desc">闲置转让 / 工具借用 / 技能交换</p>
            </div>
          </div>

          <!-- 5. 房屋认证绑定 -->
          <div class="service-tile tile-house" @click="$router.push('/user/profile?tab=houses')">
            <div class="tile-icon-wrap icon-teal">🏠</div>
            <div class="tile-content">
              <div class="tile-title-row">
                <h3 class="tile-title">房屋实名认证</h3>
                <span class="tile-badge badge-teal">权益核验</span>
              </div>
              <p class="tile-desc">房产绑定 / 网格空间认领与权益确认</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：居民事务速览看板 (居民任务驱动中心) -->
      <div class="resident-widget-wrapper">
        <div class="widget-card cal-mockup-card">
          <!-- 已登录居民态 -->
          <template v-if="userStore.isLoggedIn">
            <div class="widget-user-header" style="cursor: pointer" title="点击进入个人中心" @click="$router.push('/user/profile')">
              <el-avatar :size="44" :src="userStore.user?.avatar" class="widget-avatar" />
              <div class="widget-user-meta">
                <div class="user-name-line">
                  <span class="user-name">{{ userDisplayName }}</span>
                  <span class="cal-role-badge">{{ formatRole(userStore.user?.role) }}</span>
                </div>
                <div class="user-sub-line">
                  <span class="credit-pill">
                    <el-icon><Medal /></el-icon>
                    AAA级 · {{ userStore.user?.creditScore || 100 }}分
                  </span>
                  <span class="house-pill" @click.stop="$router.push('/user/profile')">
                    {{ userStore.user?.phone ? userStore.user?.phone : '个人档案' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 进行中工单状态看板 -->
            <div class="widget-status-block">
              <div class="block-label-row">
                <span class="block-label">正在处理的工单</span>
                <router-link to="/user/profile?tab=orders" class="block-link">我的工单 →</router-link>
              </div>

              <div
                v-if="activeWorkOrder"
                class="active-order-card"
                @click="$router.push(`/orders/${activeWorkOrder.id}`)"
                title="点击查看此工单处置全链路详情"
              >
                <div class="order-main-info">
                  <span class="order-tag" :class="getOrderStatusClass(activeWorkOrder.status)">
                    {{ getOrderStatusText(activeWorkOrder.status) }}
                  </span>
                  <span class="order-no">#{{ activeWorkOrder.orderNo }}</span>
                </div>
                <div class="order-title-text">{{ activeWorkOrder.title }}</div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px">
                  <span class="order-time-text">申报于 {{ formatTime(activeWorkOrder.createTime) }}</span>
                  <el-button
                    v-if="activeWorkOrder.status === 5"
                    size="small"
                    type="warning"
                    plain
                    style="height: 24px; padding: 0 8px; font-size: 11px"
                    @click.stop="openQuickRateModal(activeWorkOrder)"
                  >
                    ★ 立即评价
                  </el-button>
                </div>
              </div>

              <div v-else class="empty-status-box">
                <span class="empty-icon">✨</span>
                <span class="empty-text">当前无进行中工单，设施一切正常</span>
                <button type="button" class="quick-submit-link" @click="$router.push('/orders/submit?type=1')">
                  + 申报新工单
                </button>
              </div>
            </div>

            <!-- 凭证与统计快捷条 -->
            <div class="widget-quick-stats">
              <div
                class="stat-item"
                :title="unverifiedTicketsCount > 0 ? '点击直接出示活动核销码' : '查看我的活动凭证'"
                @click="unverifiedTicketsCount > 0 ? (showTicketsModal = true) : $router.push('/user/profile?tab=tickets')"
              >
                <span class="stat-num">{{ unverifiedTicketsCount }}</span>
                <span class="stat-desc">{{ unverifiedTicketsCount > 0 ? '待验券(亮码)' : '活动入场券' }}</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item" @click="$router.push('/user/profile?tab=orders')">
                <span class="stat-num">{{ myOrdersTotal }}</span>
                <span class="stat-desc">累计工单</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item" @click="$router.push('/user/profile')">
                <span class="stat-num">个人</span>
                <span class="stat-desc">工作台与房产</span>
              </div>
            </div>
          </template>

          <!-- 未登录访客态 -->
          <template v-else>
            <div class="guest-widget-header">
              <div class="guest-logo">🏡</div>
              <h3 class="guest-title">阳光翠竹苑 · 居民服务通道</h3>
              <p class="guest-desc">登录后即可一键申报房屋故障、实时跟踪物业工单进度，并在线出示文体活动入场券。</p>
            </div>

            <div class="guest-actions">
              <button type="button" class="guest-login-btn" @click="$router.push('/login')">
                居民 / 业主安全登录
              </button>
              <button type="button" class="guest-register-btn" @click="$router.push('/register')">
                新居民在线注册
              </button>
            </div>

            <div class="guest-preset-hint">
              <span v-if="isDev" class="hint-text">💡 体验通道：居民账号 <code class="hint-code">resident</code> / 密码 <code class="hint-code">123456</code></span>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- ====================================================================
         3. 精选双栏：要闻通告 + 生活热点 Tab (Curated Split Section)
         ==================================================================== -->
    <section class="curated-split-section">
      <!-- 左栏：社区要闻与通知通告 (精选 4 条) -->
      <div class="curated-col notices-col cal-mockup-card">
        <div class="curated-header">
          <div class="header-title-box">
            <span class="header-indicator"></span>
            <h2 class="cal-title-md">社区要闻与通知通告</h2>
          </div>
          <router-link to="/notices" class="more-link">
            查看更多 <el-icon><ArrowRight /></el-icon>
          </router-link>
        </div>

        <div class="curated-notice-list">
          <div
            v-for="item in noticeList.slice(0, 4)"
            :key="item.id"
            class="curated-notice-item"
            @click="openQuickNotice(item)"
          >
            <div class="notice-meta-left">
              <span v-if="item.isTop === 1" class="cal-badge cal-badge-orange">置顶</span>
              <span class="cal-badge" :class="getNoticeBadgeClass(item.noticeType)">
                {{ getNoticeTypeName(item.noticeType) }}
              </span>
              <h4 class="notice-title">{{ item.title }}</h4>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0">
              <span class="notice-date">{{ formatTime(item.publishTime) }}</span>
              <el-button
                size="small"
                text
                type="primary"
                style="padding: 2px 6px; font-size: 12px"
                @click.stop="openQuickNotice(item)"
              >
                速览
              </el-button>
            </div>
          </div>

          <div v-if="noticeList.length === 0" class="empty-list-hint">
            暂无社区最新公告
          </div>
        </div>
      </div>

      <!-- 右栏：社区生活热点 (Tab 切换：热门活动 / 邻里闲置) -->
      <div class="curated-col life-col cal-mockup-card">
        <div class="curated-header">
          <!-- Segmented Control 胶囊切换器 -->
          <div class="cal-segmented-control">
            <button
              type="button"
              class="segment-btn"
              :class="{ active: activeLifeTab === 'activities' }"
              @click="activeLifeTab = 'activities'"
            >
              🎉 近期文体活动 ({{ activityList.length }})
            </button>
            <button
              type="button"
              class="segment-btn"
              :class="{ active: activeLifeTab === 'market' }"
              @click="activeLifeTab = 'market'"
            >
              🤝 邻里闲置互助 ({{ postList.length }})
            </button>
          </div>

          <router-link :to="activeLifeTab === 'activities' ? '/activities' : '/market'" class="more-link">
            {{ activeLifeTab === 'activities' ? '全量活动' : '逛逛集市' }} <el-icon><ArrowRight /></el-icon>
          </router-link>
        </div>

        <div class="life-tab-content">
          <!-- 文体活动展示 (Top 2 活动精致横卡) -->
          <div v-if="activeLifeTab === 'activities'" class="activity-cards-list">
            <div
              v-for="act in activityList.slice(0, 2)"
              :key="act.id"
              class="act-mini-card"
              @click="$router.push(`/activities/${act.id}`)"
            >
              <img
                :src="act.coverImage || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800'"
                class="act-mini-cover"
                alt="activity cover"
              />
              <div class="act-mini-body">
                <div class="act-tag-row">
                  <span class="cal-badge cal-badge-emerald">{{ act.category || '社区活动' }}</span>
                  <span class="act-quota">名额：{{ act.currentParticipants || 0 }} / {{ act.maxParticipants || 50 }}</span>
                </div>
                <h4 class="act-mini-title">{{ act.title }}</h4>
                <p class="act-mini-loc">📍 {{ act.location }}</p>
                <div class="act-mini-footer">
                  <span class="act-date">{{ formatTime(act.startTime) }}</span>
                  <button
                    v-if="act.hasSignedUp"
                    type="button"
                    class="act-join-btn"
                    style="background: #10b981; color: #fff"
                    @click.stop="showTicketsModal = true"
                  >
                    🎫 已报名(亮码)
                  </button>
                  <button
                    v-else
                    type="button"
                    class="act-join-btn"
                    @click.stop="handleQuickSignup(act)"
                  >
                    立即报名
                  </button>
                </div>
              </div>
            </div>

            <div v-if="activityList.length === 0" class="empty-list-hint">
              近期暂无正在报名的文体活动
            </div>
          </div>

          <!-- 邻里闲置展示 (Top 4 宫格微卡) -->
          <div v-else class="market-mini-grid">
            <div
              v-for="post in postList.slice(0, 4)"
              :key="post.id"
              class="market-mini-card"
              @click="$router.push(`/market/${post.id}`)"
            >
              <div class="market-thumb-wrap">
                <img :src="getCover(post.images)" class="market-thumb" alt="post cover" />
                <span class="market-type-pill">{{ getPostTypeName(post.postType) }}</span>
              </div>
              <div class="market-mini-body">
                <h4 class="market-mini-title">{{ post.title }}</h4>
                <div class="market-price-line">
                  <span class="price-text">{{ post.price > 0 ? '¥' + post.price : '免费 / 借用' }}</span>
                  <span class="delivery-text">{{ post.deliveryType === 1 ? '楼下自提' : '上门送达' }}</span>
                </div>
                <div class="market-author-line">
                  <span class="author-name">{{ post.authorName }}</span>
                  <span class="credit-text">信誉 {{ post.authorCreditScore || 100 }}</span>
                </div>
              </div>
            </div>

            <div v-if="postList.length === 0" class="empty-list-hint">
              暂无邻里闲置或互助信息
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== 页内通告速览抽屉 ==================== -->
    <el-drawer v-model="showNoticeDrawer" title="社区通告正文速览" size="520px" append-to-body destroy-on-close>
      <div v-if="previewNotice" style="display: flex; flex-direction: column; gap: 16px">
        <div style="display: flex; gap: 8px; align-items: center">
          <span v-if="previewNotice.isTop === 1" class="cal-badge cal-badge-orange">置顶</span>
          <span class="cal-badge" :class="getNoticeBadgeClass(previewNotice.noticeType)">
            {{ getNoticeTypeName(previewNotice.noticeType) }}
          </span>
          <span style="font-size: 12px; color: #64748b">{{ previewNotice.publishTime }}</span>
        </div>
        <h3 style="font-size: 19px; font-weight: 700; color: #0f172a; line-height: 1.4; margin: 0">
          {{ previewNotice.title }}
        </h3>
        <div style="font-size: 12px; color: #64748b; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0">
          发布单位：{{ previewNotice.publisherName || '社区居委会' }} · 阅读 {{ previewNotice.viewCount || 0 }} 次
        </div>
        <div style="font-size: 14px; line-height: 1.8; color: #334155" v-safe-html="previewNotice.content"></div>
        <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between">
          <el-button plain size="small" @click="$router.push('/orders/submit?type=1'); showNoticeDrawer = false">
            🛠️ 申报相关报修
          </el-button>
          <el-button type="primary" size="small" class="cal-primary-btn" @click="$router.push(`/notices/${previewNotice.id}`); showNoticeDrawer = false">
            打开独立详情页 →
          </el-button>
        </div>
      </div>
    </el-drawer>

    <!-- ==================== 首页活动一键报名弹窗 ==================== -->
    <el-dialog v-model="showQuickSignupModal" title="文体公益活动一键报名" width="460px" append-to-body destroy-on-close>
      <div v-if="signingTargetAct" style="display: flex; flex-direction: column; gap: 12px">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px">
          <span class="cal-badge cal-badge-emerald">{{ signingTargetAct.category || '社区活动' }}</span>
          <h4 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 8px 0 6px">{{ signingTargetAct.title }}</h4>
          <p style="font-size: 13px; color: #475569; margin: 2px 0">📍 地点：{{ signingTargetAct.location }}</p>
          <p style="font-size: 13px; color: #475569; margin: 2px 0">⏰ 时间：{{ signingTargetAct.startTime }}</p>
        </div>
        <p style="font-size: 12px; color: #059669; background: #ecfdf5; padding: 10px 12px; border-radius: 8px; margin: 0">
          💡 确认报名后将即刻生成 6 位防伪签到码与二维码凭证，活动现场直接出示即可。
        </p>
      </div>
      <template #footer>
        <el-button @click="showQuickSignupModal = false">取消</el-button>
        <el-button type="primary" :loading="submittingSignup" class="cal-primary-btn" @click="confirmHomeSignup">
          确认立即报名
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 首页待验入场券亮码弹窗 ==================== -->
    <el-dialog v-model="showTicketsModal" title="🎫 我的待核销活动入场券" width="480px" append-to-body>
      <div v-if="myPendingTickets.length === 0" style="padding: 20px 0">
        <el-empty description="当前暂无待核销的活动入场券" :image-size="64" />
      </div>
      <div v-else style="display: flex; flex-direction: column; gap: 14px; max-height: 420px; overflow-y: auto">
        <div
          v-for="t in myPendingTickets"
          :key="t.id"
          style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; background: #f8fafc"
        >
          <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px">
            {{ t.title || t.activityTitle || '社区公益活动' }}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 12px">
            📍 {{ t.location || '社区邻里中心' }} · ⏰ {{ formatTime(t.startTime) }}
          </div>
          <img
            :src="t.myQrCodeBase64 || t.qrCodeUrl || ''"
            style="width: 140px; height: 140px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; padding: 6px"
          />
          <div style="margin-top: 8px; font-size: 13px; color: #475569">
            6位核销码：<strong style="font-size: 18px; color: #059669; letter-spacing: 2px">{{ t.myVerifyCode || t.verifyCode }}</strong>
          </div>
        </div>
      </div>
      <template #footer>
        <div style="display: flex; justify-content: space-between; width: 100%">
          <el-button link type="primary" @click="$router.push('/user/profile?tab=tickets'); showTicketsModal = false">
            前往个人中心管理凭证 →
          </el-button>
          <el-button type="primary" class="cal-primary-btn" @click="showTicketsModal = false">完成出示</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ==================== 首页工单当场评价弹窗 ==================== -->
    <el-dialog v-model="showRateModal" title="工单完工验收与星级评价" width="440px" append-to-body destroy-on-close>
      <div v-if="ratingTargetOrder" style="display: flex; flex-direction: column; gap: 12px">
        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0">
          <div style="font-size: 12px; color: #64748b">#{{ ratingTargetOrder.orderNo }}</div>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a">{{ ratingTargetOrder.title }}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px">
          <span style="font-size: 13px; font-weight: 600">满意度：</span>
          <el-rate v-model="rateStar" size="large" show-text />
        </div>
        <el-input v-model="rateContent" type="textarea" :rows="3" placeholder="请输入评价留言（默认五星好评）..." />
      </div>
      <template #footer>
        <el-button @click="showRateModal = false">取消</el-button>
        <el-button type="primary" :loading="submittingRate" class="cal-primary-btn" @click="submitHomeRate">
          提交评价并结单
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, ArrowRight, Bell, Medal } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { localQrDataUrl } from '@/utils/qrcode'
import { isDev } from '@/utils/env'
import { useUserStore } from '@/stores/user'
import type { Notice, Activity, MarketPost, WorkOrder } from '@/types'

const router = useRouter()
const userStore = useUserStore()
const openOmniSearch = inject<(kw?: string) => void>('openOmniSearch')

// 页面基础数据
const noticeList = ref<Notice[]>([])
const activityList = ref<Activity[]>([])
const postList = ref<MarketPost[]>([])
const activeLifeTab = ref<'activities' | 'market'>('activities')

// 用户个人事务速览数据
const activeWorkOrder = ref<WorkOrder | null>(null)
const myOrdersTotal = ref(0)
const unverifiedTicketsCount = ref(0)
const myPendingTickets = ref<any[]>([])

// 页内速览与交互状态
const showNoticeDrawer = ref(false)
const previewNotice = ref<Notice | null>(null)

const showQuickSignupModal = ref(false)
const signingTargetAct = ref<Activity | null>(null)
const submittingSignup = ref(false)

const showTicketsModal = ref(false)

const showRateModal = ref(false)
const ratingTargetOrder = ref<WorkOrder | null>(null)
const rateStar = ref(5)
const rateContent = ref('')
const submittingRate = ref(false)

// 居民显示名称
const userDisplayName = computed(() => {
  return userStore.user?.realName || userStore.user?.username || ''
})

// 时段温馨问候语
const greetingText = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 0 && hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

// 提取置顶或突发应急通告
const topNotice = computed(() => {
  if (noticeList.value.length === 0) return null
  return (
    noticeList.value.find((n) => n.noticeType === 4 || n.isTop === 1) ||
    noticeList.value[0] ||
    null
  )
})

onMounted(async () => {
  loadNotices()
  loadActivities()
  loadMarketPosts()
  loadUserAffairs()
})

// 监听用户登录态变化，及时刷新个人事务看板
watch(
  () => userStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      loadUserAffairs()
    } else {
      activeWorkOrder.value = null
      myOrdersTotal.value = 0
      unverifiedTicketsCount.value = 0
      myPendingTickets.value = []
    }
  }
)

async function openQuickNotice(item: Notice) {
  previewNotice.value = item
  showNoticeDrawer.value = true
  try {
    const detail: any = await request.get(`/notice/detail/${item.id}`)
    if (detail) previewNotice.value = detail
  } catch (e) {}
}

function handleQuickSignup(act: Activity) {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再报名参加活动')
    router.push('/login')
    return
  }
  signingTargetAct.value = act
  showQuickSignupModal.value = true
}

async function confirmHomeSignup() {
  if (!signingTargetAct.value) return
  submittingSignup.value = true
  try {
    await request.post(`/activity/signup?activityId=${signingTargetAct.value.id}`)
    ElMessage.success('报名成功！已为您生成专属电子核销码')
    signingTargetAct.value.hasSignedUp = true
    signingTargetAct.value.currentParticipants = (signingTargetAct.value.currentParticipants || 0) + 1
    showQuickSignupModal.value = false
    await loadUserAffairs()
    showTicketsModal.value = true
  } catch (e) {
  } finally {
    submittingSignup.value = false
  }
}

function openQuickRateModal(order: WorkOrder) {
  ratingTargetOrder.value = order
  rateStar.value = 5
  rateContent.value = ''
  showRateModal.value = true
}

async function submitHomeRate() {
  if (!ratingTargetOrder.value) return
  submittingRate.value = true
  try {
    await request.post('/order/evaluate', {
      orderId: ratingTargetOrder.value.id,
      ratingStar: rateStar.value,
      ratingContent: rateContent.value.trim() || '处理及时，非常满意！'
    })
    ElMessage.success('评价成功，工单已结单！')
    showRateModal.value = false
    await loadUserAffairs()
  } finally {
    submittingRate.value = false
  }
}

async function loadNotices() {
  try {
    const res: any = await request.get('/notice/list', { params: { size: 6 } })
    noticeList.value = res.records || []
  } catch (ignored) {}
}

async function loadActivities() {
  try {
    const res: any = await request.get('/activity/list', { params: { size: 4, status: 1 } })
    activityList.value = res.records || []
  } catch (ignored) {}
}

async function loadMarketPosts() {
  try {
    const res: any = await request.get('/market/list', { params: { size: 4 } })
    postList.value = res.records || []
  } catch (ignored) {}
}

async function loadUserAffairs() {
  if (!userStore.isLoggedIn) return
  // 1. 获取我的工单记录
  try {
    const res: any = await request.get('/order/my-list', { params: { size: 10 } })
    const records: WorkOrder[] = res.records || []
    myOrdersTotal.value = res.total || records.length
    // 优先匹配正在进行中状态的工单 (5: 待评价, 1: 待初审, 3: 已派单, 4: 施工处理中)
    activeWorkOrder.value =
      records.find((o) => [5, 1, 3, 4].includes(o.status)) ||
      records[0] ||
      null
  } catch (ignored) {}

  // 2. 获取待参加活动凭证数
  try {
    const tickets: any = await request.get('/activity/my-signups')
    if (Array.isArray(tickets)) {
      myPendingTickets.value = tickets.filter(
        (t: any) => t.mySignupStatus !== 2 && t.verifyStatus !== 1
      )
      unverifiedTicketsCount.value = myPendingTickets.value.length
      fillLocalQrCodes(myPendingTickets.value, 160)
    }
  } catch (ignored) {}
}


// 后端未返回二维码时本地生成，避免把核销码提交到第三方服务
async function fillLocalQrCodes(list: any[], size = 180) {
  for (const t of list || []) {
    if (!t.myQrCodeBase64 && !t.qrCodeUrl) {
      const code = t.myVerifyCode || t.verifyCode
      if (code) {
        t.qrCodeUrl = await localQrDataUrl(String(code), size)
      }
    }
  }
}

function handleOpenSearch() {
  if (openOmniSearch) {
    openOmniSearch()
  } else {
    router.push('/notices')
  }
}

function formatTime(str?: string) {
  if (!str) return ''
  return str.split('T')[0] || str.substring(0, 10)
}

function formatRole(role?: string) {
  switch (role) {
    case 'ROLE_SYSTEM_ADMIN': return '系统超管'
    case 'ROLE_COMMUNITY_ADMIN': return '居委会主任'
    case 'ROLE_PROPERTY_ADMIN': return '物业主管'
    case 'ROLE_GRID_OFFICER': return '网格专干'
    case 'ROLE_RESIDENT': return '认证居民'
    default: return '社区访客'
  }
}

function getNoticeTypeName(type: number) {
  switch (type) {
    case 1: return '政策宣传'
    case 2: return '便民服务'
    case 3: return '物业通知'
    case 4: return '突发应急'
    default: return '公告'
  }
}

function getNoticeBadgeClass(type: number) {
  switch (type) {
    case 1: return 'cal-badge-violet'
    case 2: return 'cal-badge-emerald'
    case 3: return 'cal-badge-orange'
    case 4: return 'cal-badge-pink'
    default: return 'cal-badge-gray'
  }
}

function getPostTypeName(type: number) {
  switch (type) {
    case 1: return '二手闲置'
    case 2: return '邻里求助'
    case 3: return '物品借用'
    case 4: return '拼车出行'
    case 5: return '技能交换'
    default: return '互助'
  }
}

function getOrderStatusText(status: number) {
  switch (status) {
    case 1: return '待初审'
    case 2: return '已驳回'
    case 3: return '已派单'
    case 4: return '施工处置中'
    case 5: return '待评价'
    case 6: return '已办结'
    default: return '处理中'
  }
}

function getOrderStatusClass(status: number) {
  switch (status) {
    case 1: return 'badge-amber'
    case 2: return 'badge-red'
    case 3:
    case 4: return 'badge-blue'
    case 5: return 'badge-emerald'
    case 6: return 'badge-gray'
    default: return 'badge-blue'
  }
}

function getCover(imagesJson?: string) {
  if (!imagesJson) return 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600'
  try {
    const arr = JSON.parse(imagesJson)
    return arr[0] || 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600'
  } catch (e) {
    return 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600'
  }
}
</script>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* ==========================================================================
   1. 顶部问候与置顶通告横幅 (Greeting & Broadcast Bar)
   ========================================================================== */
.portal-greeting-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 0 8px 0;
  border-bottom: 1px solid var(--cal-hairline);
}

.greeting-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.greeting-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--cal-muted);
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: var(--cal-success);
}

.greeting-title {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.8px;
  color: var(--cal-ink);
  line-height: 1.2;
}

.greeting-subtitle {
  font-size: 13px;
  color: var(--cal-muted);
  max-width: 580px;
  line-height: 1.5;
}

.greeting-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.omni-search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 14px;
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 280px;
}

.omni-search-box:hover {
  background: var(--cal-canvas);
  border-color: #cbd5e1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.search-icon {
  font-size: 15px;
  color: var(--cal-muted);
}

.search-placeholder {
  font-size: 13px;
  color: var(--cal-muted);
  flex: 1;
}

.search-shortcut {
  font-size: 11px;
  font-weight: 600;
  color: var(--cal-muted-soft);
  background: #ffffff;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--cal-hairline);
}

.top-notice-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 380px;
  padding: 6px 12px;
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all 0.2s ease;
}

.top-notice-pill:hover {
  border-color: #111111;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.notice-pill-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

.tag-emergency {
  background: #fee2e2;
  color: #dc2626;
}

.tag-top {
  background: #fef3c7;
  color: #d97706;
}

.notice-pill-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--cal-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-pill-arrow {
  font-size: 12px;
  color: var(--cal-muted);
  flex-shrink: 0;
}

/* ==========================================================================
   2. 核心便民金刚区 + 居民事务看板 (Portal Hub Section)
   ========================================================================== */
.portal-hub-section {
  display: grid;
  grid-template-columns: 1.45fr 1fr;
  gap: 24px;
  align-items: stretch;
}

.service-tiles-wrapper {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hub-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hub-indicator {
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background-color: var(--cal-primary);
}

.hub-title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: var(--cal-ink);
}

.hub-hint {
  font-size: 12px;
  color: var(--cal-muted);
}

.service-tiles-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

/* 第5个卡片跨2列整行 */
.service-tile:last-child {
  grid-column: span 2;
}

.service-tile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.service-tile:hover {
  transform: translateY(-2px);
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.tile-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.icon-blue { background: #eff6ff; }
.icon-amber { background: #fffbeb; }
.icon-emerald { background: #ecfdf5; }
.icon-purple { background: #f5f3ff; }
.icon-teal { background: #f0fdfa; }

.tile-content {
  flex: 1;
  min-width: 0;
}

.tile-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.tile-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--cal-ink);
}

.tile-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
  flex-shrink: 0;
}

.badge-blue { background: #e0f2fe; color: #0284c7; }
.badge-amber { background: #fef3c7; color: #d97706; }
.badge-emerald { background: #d1fae5; color: #059669; }
.badge-purple { background: #ede9fe; color: #7c3aed; }
.badge-teal { background: #ccfbf1; color: #0d9488; }
.badge-red { background: #fee2e2; color: #ef4444; }
.badge-gray { background: #f3f4f6; color: #6b7280; }

.tile-desc {
  font-size: 12px;
  color: var(--cal-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 居民事务看板卡片 */
.resident-widget-wrapper {
  display: flex;
  flex-direction: column;
}

.widget-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 18px;
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-xl);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

/* 登录态卡片头部 */
.widget-user-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--cal-hairline-soft);
}

.widget-user-meta {
  flex: 1;
  min-width: 0;
}

.user-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--cal-ink);
}

.cal-role-badge {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  background: var(--cal-surface-card);
  color: var(--cal-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.user-sub-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.credit-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 500;
  color: #10b981;
}

.house-pill {
  font-size: 11px;
  color: var(--cal-muted);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* 状态展示块 */
.widget-status-block {
  padding: 12px 0;
  flex: 1;
}

.block-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.block-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--cal-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.block-link {
  font-size: 12px;
  color: var(--cal-ink);
  text-decoration: none;
  font-weight: 500;
}

.block-link:hover {
  text-decoration: underline;
}

.active-order-card {
  padding: 12px;
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}

.active-order-card:hover {
  background: #ffffff;
  border-color: #cbd5e1;
}

.order-main-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.order-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
  flex-shrink: 0;
}

.order-no {
  font-family: var(--font-code);
  font-size: 11px;
  color: var(--cal-muted);
}

.order-title-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--cal-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.order-time-text {
  font-size: 11px;
  color: var(--cal-muted);
}

.empty-status-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 10px;
  background: var(--cal-surface-soft);
  border-radius: var(--radius-md);
  text-align: center;
}

.empty-icon {
  font-size: 18px;
}

.empty-text {
  font-size: 12px;
  color: var(--cal-muted);
}

.quick-submit-link {
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--cal-ink);
  cursor: pointer;
  padding: 2px 8px;
  text-decoration: underline;
}

/* 底部统计条 */
.widget-quick-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-top: 12px;
  border-top: 1px solid var(--cal-hairline-soft);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: var(--radius-md);
  transition: background 0.15s ease;
}

.stat-item:hover {
  background: var(--cal-surface-soft);
}

.stat-num {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--cal-ink);
}

.stat-desc {
  font-size: 11px;
  color: var(--cal-muted);
}

.stat-divider {
  width: 1px;
  height: 24px;
  background-color: var(--cal-hairline);
}

/* 访客态样式 */
.guest-widget-header {
  text-align: center;
  padding: 16px 8px 12px 8px;
}

.guest-logo {
  font-size: 32px;
  margin-bottom: 8px;
}

.guest-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--cal-ink);
  margin-bottom: 6px;
}

.guest-desc {
  font-size: 12px;
  color: var(--cal-muted);
  line-height: 1.6;
}

.guest-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}

.guest-login-btn {
  width: 100%;
  height: 38px;
  background: var(--cal-primary);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.guest-login-btn:hover {
  background: var(--cal-primary-active);
}

.guest-register-btn {
  width: 100%;
  height: 36px;
  background: transparent;
  color: var(--cal-ink);
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.guest-register-btn:hover {
  background: var(--cal-surface-soft);
  border-color: #cbd5e1;
}

.guest-preset-hint {
  font-size: 11px;
  color: var(--cal-muted);
  text-align: center;
  background: var(--cal-surface-soft);
  padding: 6px 10px;
  border-radius: var(--radius-md);
}

.hint-code {
  font-family: var(--font-code);
  font-weight: 600;
  color: var(--cal-ink);
}

/* ==========================================================================
   3. 精选双栏：要闻通告 + 生活热点 Tab (Curated Split Section)
   ========================================================================== */
.curated-split-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.curated-col {
  padding: 20px;
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
}

.curated-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--cal-hairline-soft);
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-indicator {
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background-color: var(--cal-primary);
}

.cal-title-md {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--cal-ink);
}

.more-link {
  font-size: 12px;
  color: var(--cal-muted);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.15s ease;
}

.more-link:hover {
  color: var(--cal-ink);
}

/* 左栏通知列表 */
.curated-notice-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.curated-notice-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}

.curated-notice-item:hover {
  background: var(--cal-surface-soft);
}

.notice-meta-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.notice-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--cal-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.notice-date {
  font-size: 12px;
  color: var(--cal-muted);
  flex-shrink: 0;
}

/* 右栏 Segmented Control */
.cal-segmented-control {
  display: inline-flex;
  align-items: center;
  background: var(--cal-surface-soft);
  padding: 3px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--cal-hairline);
}

.segment-btn {
  border: none;
  background: transparent;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--cal-muted);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all 0.15s ease;
}

.segment-btn.active {
  background: #ffffff;
  color: var(--cal-ink);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.life-tab-content {
  flex: 1;
}

/* 文体活动精致横卡 */
.activity-cards-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.act-mini-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px;
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.15s ease;
}

.act-mini-card:hover {
  border-color: #cbd5e1;
  background: var(--cal-surface-soft);
}

.act-mini-cover {
  width: 90px;
  height: 70px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
}

.act-mini-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.act-tag-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.act-quota {
  font-size: 11px;
  color: var(--cal-muted);
}

.act-mini-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--cal-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.act-mini-loc {
  font-size: 11px;
  color: var(--cal-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.act-mini-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}

.act-date {
  font-size: 11px;
  color: var(--cal-muted);
}

.act-join-btn {
  background: #111111;
  color: #ffffff;
  border: none;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.act-join-btn:hover {
  opacity: 0.9;
}

/* 邻里闲置 4 宫格微卡 */
.market-mini-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.market-mini-card {
  border: 1px solid var(--cal-hairline);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.15s ease;
}

.market-mini-card:hover {
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.market-thumb-wrap {
  position: relative;
  width: 100%;
  height: 80px;
}

.market-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.market-type-pill {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 10px;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  backdrop-filter: blur(4px);
}

.market-mini-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.market-mini-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--cal-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.market-price-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price-text {
  font-size: 12px;
  font-weight: 700;
  color: #ef4444;
}

.delivery-text {
  font-size: 10px;
  color: var(--cal-muted);
}

.market-author-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: var(--cal-muted-soft);
  margin-top: 2px;
}

.author-name {
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-list-hint {
  padding: 24px 0;
  text-align: center;
  font-size: 12px;
  color: var(--cal-muted);
}

/* ==========================================================================
   4. 响应式布局自适应 (Responsive Breakpoints)
   ========================================================================== */
@media (max-width: 992px) {
  .portal-greeting-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .greeting-right {
    align-items: flex-start;
    width: 100%;
  }

  .omni-search-box {
    width: 100%;
  }

  .top-notice-pill {
    max-width: 100%;
    width: 100%;
  }

  .portal-hub-section {
    grid-template-columns: 1fr;
  }

  .curated-split-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .service-tiles-grid {
    grid-template-columns: 1fr;
  }

  .service-tile:last-child {
    grid-column: span 1;
  }

  .greeting-title {
    font-size: 22px;
  }
}
</style>
