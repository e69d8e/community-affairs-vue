<template>
  <div v-loading="loading" class="dashboard-view">
    <!-- 欢迎与快捷栏 (Cal Mockup Card) -->
    <div class="welcome-banner cal-mockup-card">
      <div>
        <h2 class="welcome-title">欢迎工作台，{{ userStore.user?.realName || userStore.user?.username }}！</h2>
        <p class="welcome-desc">今日{{ userStore.user?.communityName || '社区' }}运行平稳，网格与物业工单流转正常。</p>
      </div>
      <div class="banner-quick-actions">
        <el-button v-if="userStore.canPublishNotice" type="danger" plain :icon="Bell" @click="showNoticeModal = true">
          发布全区紧急通告
        </el-button>
        <el-button v-if="userStore.canSyncSearch" type="primary" :icon="Refresh" :loading="syncingEs" class="cal-primary-btn" @click="handleSyncEs">
          同步检索索引
        </el-button>
      </div>
    </div>

    <!-- 核心统计指标卡片网格 (点击卡片直接穿透至对应管理模块) -->
    <div class="metrics-grid">
      <div
        class="metric-card cal-mockup-card"
        :class="{ 'is-clickable': userStore.canManageUsers }"
        :title="userStore.canManageUsers ? '点击进入用户与居民管理' : ''"
        @click="userStore.canManageUsers && $router.push('/admin/system/users')"
      >
        <div class="metric-header">
          <span class="metric-label">在册住户居民</span>
          <span class="metric-icon-mini icon-blue">🏡</span>
        </div>
        <div class="metric-num-wrap">
          <span class="metric-num">{{ metrics?.totalResidents || 0 }}</span>
          <span class="unit">户</span>
        </div>
        <div v-if="userStore.canManageUsers" class="metric-sub-note">点击进入用户与居民管理 →</div>
        <div v-else class="metric-sub-note">覆盖全区 6 栋楼宇</div>
      </div>

      <div
        class="metric-card cal-mockup-card is-clickable"
        title="点击筛选待初审工单"
        @click="$router.push('/admin/orders?status=1')"
      >
        <div class="metric-header">
          <span class="metric-label">待初审 / 待派工单</span>
          <span class="metric-icon-mini icon-red">🛠️</span>
        </div>
        <div class="metric-num-wrap">
          <span class="metric-num text-red">{{ metrics?.pendingOrders || 0 }}</span>
          <span class="unit">件</span>
        </div>
        <div class="metric-sub-note">点击立即初审派工 →</div>
      </div>

      <div
        class="metric-card cal-mockup-card is-clickable"
        title="点击查看施工中工单"
        @click="$router.push('/admin/orders?status=4')"
      >
        <div class="metric-header">
          <span class="metric-label">维修师傅施工中</span>
          <span class="metric-icon-mini icon-amber">⚡</span>
        </div>
        <div class="metric-num-wrap">
          <span class="metric-num text-amber">{{ metrics?.processingOrders || 0 }}</span>
          <span class="unit">件</span>
        </div>
        <div class="metric-sub-note">物业工程部巡修 →</div>
      </div>

      <div
        class="metric-card cal-mockup-card is-clickable"
        title="点击查看已办结好评工单"
        @click="$router.push('/admin/orders?status=6')"
      >
        <div class="metric-header">
          <span class="metric-label">报修办结好评率</span>
          <span class="metric-icon-mini icon-emerald">✅</span>
        </div>
        <div class="metric-num-wrap">
          <span class="metric-num text-emerald">{{ metrics?.repairFinishRate || 100 }}</span>
          <span class="unit">%</span>
        </div>
        <div class="metric-sub-note">基于 5 星好评统计 →</div>
      </div>

      <div
        class="metric-card cal-mockup-card"
        :class="{ 'is-clickable': userStore.canManageActivities }"
        :title="userStore.canManageActivities ? '点击管理社区文体活动' : ''"
        @click="userStore.canManageActivities && $router.push('/admin/activities')"
      >
        <div class="metric-header">
          <span class="metric-label">报名中文体活动</span>
          <span class="metric-icon-mini icon-indigo">🎫</span>
        </div>
        <div class="metric-num-wrap">
          <span class="metric-num">{{ metrics?.activeActivities || 0 }}</span>
          <span class="unit">项</span>
        </div>
        <div v-if="userStore.canManageActivities" class="metric-sub-note">管理活动与核销 →</div>
        <div v-else class="metric-sub-note">由社区管委会统筹组织</div>
      </div>

      <div
        class="metric-card cal-mockup-card is-clickable"
        title="点击查看邻里闲置集市"
        @click="$router.push('/market')"
      >
        <div class="metric-header">
          <span class="metric-label">本月邻里闲置互助</span>
          <span class="metric-icon-mini icon-purple">🛍️</span>
        </div>
        <div class="metric-num-wrap">
          <span class="metric-num">{{ metrics?.monthlyPostCount || 0 }}</span>
          <span class="unit">条</span>
        </div>
        <div class="metric-sub-note">物品流转与借用 →</div>
      </div>

      <div
        class="metric-card cal-mockup-card"
        :class="{ 'is-clickable': userStore.canHandleReports }"
        :title="userStore.canHandleReports ? '点击处理违规举报' : ''"
        @click="userStore.canHandleReports && $router.push('/admin/moderation/reports')"
      >
        <div class="metric-header">
          <span class="metric-label">待核处违规举报</span>
          <span class="metric-icon-mini icon-rose">⚠️</span>
        </div>
        <div class="metric-num-wrap">
          <span class="metric-num text-rose">{{ metrics?.openReports || 0 }}</span>
          <span class="unit">条</span>
        </div>
        <div v-if="userStore.canHandleReports" class="metric-sub-note">违规内容与举报裁决 →</div>
        <div v-else class="metric-sub-note">由社区与网格员受理核处</div>
      </div>

      <div
        class="metric-card cal-mockup-card"
        :class="{ 'is-clickable': userStore.canPublishNotice }"
        :title="userStore.canPublishNotice ? '点击打开发布通告弹窗' : ''"
        @click="userStore.canPublishNotice && (showNoticeModal = true)"
      >
        <div class="metric-header">
          <span class="metric-label">累计发布政策通告</span>
          <span class="metric-icon-mini icon-teal">📢</span>
        </div>
        <div class="metric-num-wrap">
          <span class="metric-num">{{ metrics?.totalNotices || 0 }}</span>
          <span class="unit">篇</span>
        </div>
        <div v-if="userStore.canPublishNotice" class="metric-sub-note">+ 点击快速发布新通告</div>
        <div v-else class="metric-sub-note">由社区与物业发布</div>
      </div>
    </div>

    <!-- 下方快捷管理与处置面板 -->
    <div class="panels-grid">
      <!-- 待办工单快捷初审与派单 -->
      <div v-if="isDev" class="panel-card cal-mockup-card">
        <div class="panel-header">
          <h3 class="panel-title">🛠️ 待处理报修与投诉工单 (支持工作台直接派单)</h3>
          <el-button link type="primary" class="cal-link" @click="$router.push('/admin/orders')">查看完整工单流转 →</el-button>
        </div>

        <el-table :data="pendingOrdersList" style="width: 100%" size="small">
          <el-table-column prop="orderNo" label="单号" width="130">
            <template #default="{ row }">
              <span class="order-code">#{{ row.orderNo }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" show-overflow-tooltip />
          <el-table-column prop="orderType" label="类型" width="76">
            <template #default="{ row }">
              <span class="cal-badge" :class="row.orderType === 1 ? 'cal-badge-gray' : 'cal-badge-orange'">
                {{ row.orderType === 1 ? '报修' : '投诉' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="reporterName" label="居民" width="84" />
          <el-table-column prop="createTime" label="提交时间" width="150" />
          <el-table-column label="快捷操作" width="150">
            <template #default="{ row }">
              <el-button type="primary" size="small" style="height: 24px; padding: 0 8px; font-size: 12px" @click="openQuickDispatch(row)">
                ⚡ 当场派单
              </el-button>
              <el-button type="info" link size="small" @click="$router.push(`/admin/orders?id=${row.id}`)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 系统状态与中间件运行健康度 -->
      <div v-if="isDev" class="panel-card cal-mockup-card">
        <div class="panel-header">
          <h3 class="panel-title">🖥️ 系统核心服务运行监测</h3>
          <span class="cal-badge cal-badge-emerald">全部服务运行正常</span>
        </div>

        <div class="service-health-list">
          <div class="service-item">
            <div class="s-name">MySQL 业务数据库</div>
            <div class="s-status"><span class="ping-dot"></span> 正常连接 (Port 3306)</div>
          </div>
          <div class="service-item">
            <div class="s-name">Redis 高速缓存服务</div>
            <div class="s-status"><span class="ping-dot"></span> 正常连接 (Port 6379)</div>
          </div>
          <div class="service-item">
            <div class="s-name">全文检索服务</div>
            <div class="s-status"><span class="ping-dot"></span> 运行正常 (Port 9200)</div>
          </div>
          <div class="service-item">
            <div class="s-name">对象与文件存储服务</div>
            <div class="s-status"><span class="ping-dot"></span> 运行正常 (Port 9000)</div>
          </div>
          <div class="service-item">
            <div class="s-name">实时消息推送服务</div>
            <div class="s-status"><span class="ping-dot"></span> 实时连接在线</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 工作台当场初审派单弹窗 -->
    <el-dialog v-model="showQuickDispatchModal" title="⚡ 工作台极速初审与派工" width="480px" destroy-on-close>
      <el-form v-if="dispatchingOrder" label-width="95px">
        <el-form-item label="工单摘要">
          <div style="font-weight: 700; color: #0f172a">#{{ dispatchingOrder.orderNo }} · {{ dispatchingOrder.title }}</div>
          <div style="font-size: 12px; color: #64748b; line-height: 1.4; margin-top: 2px">{{ dispatchingOrder.content }}</div>
        </el-form-item>
        <el-form-item label="一键选派">
          <div style="display: flex; flex-wrap: wrap; gap: 6px">
            <el-button
              v-for="w in quickWorkers"
              :key="w.name"
              size="small"
              round
              :type="dispatchHandlerName === w.name ? 'primary' : 'default'"
              @click="dispatchHandlerName = w.name; dispatchHandlerPhone = w.phone"
            >
              {{ w.label }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="师傅姓名">
          <el-input v-model="dispatchHandlerName" placeholder="维修师傅或网格专干姓名" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="dispatchHandlerPhone" placeholder="联系电话" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showQuickDispatchModal = false">取消</el-button>
        <el-button type="primary" :loading="submittingDispatch" class="cal-primary-btn" @click="submitQuickDispatch">
          确认通过并派单
        </el-button>
      </template>
    </el-dialog>

    <!-- 发布突发紧急通知弹窗 -->
    <el-dialog v-model="showNoticeModal" title="发布突发应急通知 (全区广播)" width="560px">
      <!-- 应急通告快捷模板 -->
      <div style="background: #fff1f2; border: 1px dashed #fecdd3; border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px">
        <span style="font-size: 12px; font-weight: 700; color: #be123c">⚡ 应急模板：</span>
        <el-button
          v-for="tpl in noticeTemplates"
          :key="tpl.label"
          size="small"
          round
          style="height: 24px; font-size: 12px"
          @click="noticeForm.title = tpl.title; noticeForm.noticeType = tpl.type; noticeForm.content = tpl.content"
        >
          {{ tpl.label }}
        </el-button>
      </div>

      <el-form label-width="90px">
        <el-form-item label="通告标题">
          <el-input v-model="noticeForm.title" placeholder="如：暴雨防汛紧急通知、燃气安全排查" />
        </el-form-item>
        <el-form-item label="通告类型">
          <el-select v-model="noticeForm.noticeType" class="w-full">
            <el-option label="突发应急广播 (全区强提醒)" :value="4" />
            <el-option label="物业管理通告" :value="3" />
            <el-option label="便民生活提示" :value="2" />
            <el-option label="政策法规宣传" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否置顶">
          <el-switch v-model="noticeForm.isTop" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="通知正文">
          <el-input v-model="noticeForm.content" type="textarea" :rows="5" placeholder="请输入通知正文内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNoticeModal = false">取消</el-button>
        <el-button type="danger" :loading="publishingNotice" @click="handlePublishNotice">确认发布并推送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">

import { isDev } from '@/utils/env'

// 演示用服务监测面板仅在开发环境显示
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Bell, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { useCommunityStore } from '@/stores/community'
import type { DashboardMetricsVo, WorkOrder } from '@/types'

const userStore = useUserStore()
const communityStore = useCommunityStore()

// 平台管理员顶栏切换的当前查看小区 (其余角色后端强制本人小区, 参数无效)
const communityParam = computed(() =>
  userStore.isSystemAdmin ? communityStore.selectedCommunityId : undefined
)

// 顶部社区切换后刷新工作台指标
watch(() => communityStore.selectedId, () => loadData())

const loading = ref(false)
const syncingEs = ref(false)
const metrics = ref<DashboardMetricsVo | null>(null)
const pendingOrdersList = ref<WorkOrder[]>([])

// 工作台当场派单
const showQuickDispatchModal = ref(false)
const dispatchingOrder = ref<WorkOrder | null>(null)
const dispatchHandlerName = ref('张建国 (水电专修)')
const dispatchHandlerPhone = ref('13800138001')
const submittingDispatch = ref(false)

const quickWorkers = [
  { label: '🔧 张师傅(水电)', name: '张建国 (水电专修)', phone: '13800138001' },
  { label: '🛗 王工(电梯机电)', name: '王志远 (机电维保)', phone: '13800138002' },
  { label: '🪵 李师傅(木瓦门窗)', name: '李师傅 (综合维修)', phone: '13800138003' },
  { label: '👮 陈专干(网格调解)', name: '陈网格员', phone: '13800000004' }
]

function openQuickDispatch(row: WorkOrder) {
  dispatchingOrder.value = row
  dispatchHandlerName.value = row.orderType === 2 ? '陈网格员' : '张建国 (水电专修)'
  dispatchHandlerPhone.value = row.orderType === 2 ? '13800000004' : '13800138001'
  showQuickDispatchModal.value = true
}

async function submitQuickDispatch() {
  if (!dispatchingOrder.value) return
  submittingDispatch.value = true
  try {
    await request.put('/order/admin/audit', {
      orderId: dispatchingOrder.value.id,
      pass: true,
      remark: '工作台快速初审通过并指派专人跟进',
      handlerName: dispatchHandlerName.value,
      handlerPhone: dispatchHandlerPhone.value
    })
    ElMessage.success('工单已当场完成初审与派工！')
    showQuickDispatchModal.value = false
    await loadData()
  } finally {
    submittingDispatch.value = false
  }
}

const noticeTemplates = [
  {
    label: '💧 停水检修通知',
    type: 3,
    title: '关于本周末全区二次供水管道清洗与临时停水通知',
    content: '<p>尊敬的社区居民：为保障饮用水水质安全，物业工程部将于本周六 13:00-17:00 对全区二次供水箱进行清洗消毒，届时将暂停供水，请各住户提前做好储水准备。</p>'
  },
  {
    label: '⛈️ 暴雨防汛预警',
    type: 4,
    title: '【突发应急】强对流暴雨天气防汛与地库防涝紧急提醒',
    content: '<p>据气象部门预警，今日傍晚至夜间将出现强降水天气。请各位业主及时收回阳台高空花盆杂物，关闭门窗；物业防汛应急小组已全员在岗巡查地下车库排水泵站。</p>'
  },
  {
    label: '🛗 电梯例行维保',
    type: 2,
    title: '关于1-6号楼客梯月度安全维保检测的温馨提示',
    content: '<p>各位邻居：特种设备维保单位将于明日上午 09:30-11:30 分栋开展客梯月度安全例检，单台电梯停梯约25分钟，感谢您的理解与配合。</p>'
  }
]

const showNoticeModal = ref(false)
const publishingNotice = ref(false)
const noticeForm = reactive({
  title: '',
  noticeType: 4,
  isTop: 1,
  targetScope: 1,
  status: 1,
  content: ''
})

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const res: any = await request.get('/admin/dashboard/metrics', {
      params: { communityId: communityParam.value }
    })
    metrics.value = res

    // 载入待初审工单列表
    const orderRes: any = await request.get('/order/admin/list', {
      params: { status: 1, size: 5, communityId: communityParam.value }
    })
    pendingOrdersList.value = orderRes.records || []
  } finally {
    loading.value = false
  }
}

async function handleSyncEs() {
  syncingEs.value = true
  try {
    await request.post('/search/admin/sync-all')
    ElMessage.success('检索索引已同步更新！')
  } catch (e) {
  } finally {
    syncingEs.value = false
  }
}

async function handlePublishNotice() {
  if (!noticeForm.title || !noticeForm.content) {
    ElMessage.warning('请填写通告标题和正文')
    return
  }
  if (userStore.isSystemAdmin && !communityParam.value) {
    ElMessage.warning('请先在顶栏社区切换器中选择具体小区，再发布通告')
    return
  }
  publishingNotice.value = true
  try {
    await request.post('/notice/admin/publish', {
      ...noticeForm,
      communityId: communityParam.value
    })
    ElMessage.success('通告已成功发布并推送！')
    showNoticeModal.value = false
    noticeForm.title = ''
    noticeForm.content = ''
    await loadData()
  } catch (e) {
  } finally {
    publishingNotice.value = false
  }
}
</script>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.welcome-banner {
  padding: 24px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.welcome-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: var(--cal-ink);
  margin-bottom: 4px;
}

.welcome-desc {
  font-size: 13px;
  color: var(--cal-muted);
}

.banner-quick-actions {
  display: flex;
  gap: 12px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.metric-card {
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.metric-card.is-clickable {
  cursor: pointer;
}

.metric-card.is-clickable:hover {
  border-color: var(--cal-ink);
  transform: translateY(-2px);
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.metric-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--cal-muted);
}

.metric-icon-mini {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.icon-blue { background: #eff6ff; }
.icon-red { background: #fef2f2; }
.icon-amber { background: #fffbeb; }
.icon-emerald { background: #ecfdf5; }
.icon-indigo { background: #e0e7ff; }
.icon-purple { background: #f5f3ff; }
.icon-rose { background: #fff1f2; }
.icon-teal { background: #f0fdfa; }

.metric-num-wrap {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 4px;
}

.metric-num {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -1px;
  color: var(--cal-ink);
}

.metric-num.text-red { color: #dc2626; }
.metric-num.text-amber { color: #d97706; }
.metric-num.text-emerald { color: #059669; }
.metric-num.text-rose { color: #e11d48; }

.unit {
  font-size: 13px;
  font-weight: 400;
  color: var(--cal-muted);
}

.metric-sub-note {
  font-size: 11px;
  color: var(--cal-muted-soft);
}

.panels-grid {
  display: grid;
  grid-template-columns: 1.25fr 420px;
  gap: 20px;
}

.panel-card {
  padding: 24px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--cal-hairline-soft);
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--cal-ink);
}

.cal-link {
  font-size: 13px;
  color: var(--cal-ink);
  font-weight: 500;
}

.order-code {
  font-family: var(--font-code);
  font-size: 12px;
  color: var(--cal-muted);
}

.service-health-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.service-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: var(--cal-surface-soft);
  border-radius: var(--radius-sm);
  border: 1px solid var(--cal-hairline-soft);
}

.s-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--cal-ink);
}

.s-status {
  font-size: 12px;
  color: #059669;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ping-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

@media (max-width: 1200px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .panels-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .welcome-banner {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    padding: 18px 16px;
  }
  .welcome-title {
    font-size: 18px;
  }
  .banner-quick-actions {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .banner-quick-actions .el-button {
    width: 100%;
    margin-left: 0 !important;
  }
  .panel-card {
    padding: 16px;
  }
}

@media (max-width: 540px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
