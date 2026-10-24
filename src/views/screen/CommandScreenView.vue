<template>
  <div class="command-screen-container">
    <!-- 头部指挥舱 Header -->
    <header class="screen-header">
      <div class="header-left">
        <button type="button" class="back-link" @click="handleBack">
          <el-icon><ArrowLeft /></el-icon> {{ backText }}
        </button>
      </div>

      <div class="header-title-wrap">
        <h1 class="header-title">智慧社区综合治理指挥大屏</h1>
        <span class="header-sub">COMMUNITY INTEGRATED GOVERNANCE DIGITAL COCKPIT</span>
      </div>

      <div class="header-right">
        <span class="live-clock">{{ currentTimeStr }}</span>
        <button type="button" class="fullscreen-btn" @click="toggleFullScreen">
          {{ isFullScreen ? '退出全屏' : '全屏显示' }}
        </button>
      </div>
    </header>

    <!-- 顶部 4 大核心 KPI 动态指标卡 -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">社区常住人口</div>
        <div class="kpi-value text-cyan">
          {{ screenData?.totalPopulation?.toLocaleString() || '2,840' }}
          <span class="kpi-unit">人</span>
        </div>
        <div class="kpi-sub">共 {{ screenData?.totalBuildings || 6 }} 栋楼宇 · {{ screenData?.totalHouses || 860 }} 户</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">房屋入住认证率</div>
        <div class="kpi-value text-emerald">
          {{ screenData?.occupancyRate || '88.5' }}
          <span class="kpi-unit">%</span>
        </div>
        <div class="kpi-sub">网格实名绑定生效中</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">工单累计处理闭环率</div>
        <div class="kpi-value text-amber">
          {{ screenData?.finishRate || '96.8' }}
          <span class="kpi-unit">%</span>
        </div>
        <div class="kpi-sub">办结 {{ screenData?.completedOrders || 0 }} / 申报 {{ screenData?.totalOrders || 0 }} 件</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">居民综合治理满意度</div>
        <div class="kpi-value text-purple">
          {{ screenData?.avgSatisfaction || '4.92' }}
          <span class="kpi-unit">/ 5.0</span>
        </div>
        <div class="kpi-sub">基于完工星级好评统计</div>
      </div>
    </div>

    <!-- 主体三列科技感可视化布局 -->
    <div class="cockpit-grid">
      <!-- 左列：工单分类环图 + 楼栋报修热度排行 -->
      <div class="grid-col">
        <div class="chart-panel">
          <div class="panel-title-bar">
            <span class="panel-icon">📊</span>
            <span class="panel-title-text">工单报修与投诉问题分布</span>
          </div>
          <div ref="categoryChartRef" class="chart-box" />
        </div>

        <div class="chart-panel">
          <div class="panel-title-bar">
            <span class="panel-icon">🏢</span>
            <span class="panel-title-text">各楼栋网格报修热度排行</span>
          </div>
          <div ref="heatmapChartRef" class="chart-box" />
        </div>
      </div>

      <!-- 中列：数字沙盘综述 + 社区多维活力雷达 + 实时事件动态流 -->
      <div class="grid-col center-col">
        <div class="center-overview-card">
          <div class="sandtable-badge">📍 {{ screenData?.communityName || '智慧示范社区' }}</div>
          <div class="sandtable-addr">{{ screenData?.communityAddress || '高新区学府路 88 号' }}</div>
          <div ref="radarChartRef" class="radar-box" />
        </div>

        <div class="chart-panel event-stream-panel">
          <div class="panel-title-bar">
            <span class="panel-icon">⚡</span>
            <span class="panel-title-text">全区综合治理实时事件流</span>
            <span class="live-dot" />
          </div>
          <div class="event-stream-list">
            <div
              v-for="(ev, idx) in (screenData?.liveEventStream || defaultEvents)"
              :key="idx"
              class="event-stream-item"
            >
              <div class="ev-time">{{ ev.time }}</div>
              <div class="ev-tag" :class="`tag-${ev.eventType.toLowerCase()}`">{{ ev.tag }}</div>
              <div class="ev-title">{{ ev.title }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右列：工单流转漏斗 + 邻里闲置互助活跃度 -->
      <div class="grid-col">
        <div class="chart-panel">
          <div class="panel-title-bar">
            <span class="panel-icon">⏳</span>
            <span class="panel-title-text">报修工单状态全链路流转漏斗</span>
          </div>
          <div ref="funnelChartRef" class="chart-box" />
        </div>

        <div class="chart-panel">
          <div class="panel-title-bar">
            <span class="panel-icon">🛍️</span>
            <span class="panel-title-text">邻里互助与闲置交易结构</span>
          </div>
          <div ref="marketChartRef" class="chart-box" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { useCommunityStore } from '@/stores/community'
import type { ScreenData } from '@/types'

const router = useRouter()
const userStore = useUserStore()
const communityStore = useCommunityStore()
// 大屏数据按小区取数: 平台管理员取顶栏切换的小区, 其余角色取本人小区(后端强制)
const screenCommunityParam = computed(() =>
  userStore.isSystemAdmin ? communityStore.selectedCommunityId : undefined
)

const backText = computed(() => {
  if (userStore.canAccessAdmin) {
    if (typeof window !== 'undefined' && (window.history.state?.back === '/' || window.history.state?.back?.includes('/user/profile'))) {
      return '返回社区门户'
    }
    return '返回管理控制台'
  }
  return '返回社区首页'
})

function handleBack() {
  if (window.history.length > 1 && window.history.state?.back) {
    router.back()
  } else if (userStore.canAccessAdmin) {
    router.push('/admin/dashboard')
  } else {
    router.push('/')
  }
}

const screenData = ref<ScreenData | null>(null)
const currentTimeStr = ref('')
const isFullScreen = ref(false)
let timerId: any = null

// Chart DOM refs
const categoryChartRef = ref<HTMLDivElement>()
const heatmapChartRef = ref<HTMLDivElement>()
const radarChartRef = ref<HTMLDivElement>()
const funnelChartRef = ref<HTMLDivElement>()
const marketChartRef = ref<HTMLDivElement>()

// Chart instances
let categoryChart: echarts.ECharts | null = null
let heatmapChart: echarts.ECharts | null = null
let radarChart: echarts.ECharts | null = null
let funnelChart: echarts.ECharts | null = null
let marketChart: echarts.ECharts | null = null

const defaultEvents = [
  { eventType: 'ORDER', tag: '报修申报', title: '3号楼2单元501室申报入户水管加急检修', time: '14:28:10' },
  { eventType: 'NOTICE', tag: '紧急广播', title: '全区夏季消防栓隐患拉网排查通告已推达居民端', time: '14:15:02' },
  { eventType: 'SIGNUP', tag: '活动报名', title: '居民张*报名【长者手机书法公益教学】锁定核销码', time: '13:50:33' },
  { eventType: 'REPORT', tag: '举报受理', title: '2号楼架空层违规停放电瓶车举报已指派网格员处置', time: '13:30:19' },
  { eventType: 'MARKET', tag: '邻里互助', title: '4号楼业主发布【求借电钻2小时】邻里已极速响应', time: '13:12:45' }
]

onMounted(async () => {
  updateClock()
  timerId = setInterval(updateClock, 1000)

  window.addEventListener('resize', handleResize)

  await loadScreenData()
  nextTick(() => {
    initCharts()
  })
})

onUnmounted(() => {
  if (timerId) clearInterval(timerId)
  window.removeEventListener('resize', handleResize)
  categoryChart?.dispose()
  heatmapChart?.dispose()
  radarChart?.dispose()
  funnelChart?.dispose()
  marketChart?.dispose()
})

function updateClock() {
  const now = new Date()
  currentTimeStr.value = now.toLocaleDateString() + ' ' + now.toLocaleTimeString()
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullScreen.value = true
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
      isFullScreen.value = false
    }
  }
}

function handleResize() {
  categoryChart?.resize()
  heatmapChart?.resize()
  radarChart?.resize()
  funnelChart?.resize()
  marketChart?.resize()
}

async function loadScreenData() {
  try {
    const res: any = await request.get('/admin/screen/data', {
      params: { communityId: screenCommunityParam.value }
    })
    screenData.value = res
  } catch (e) {}
}

function initCharts() {
  initCategoryChart()
  initHeatmapChart()
  initRadarChart()
  initFunnelChart()
  initMarketChart()
  setTimeout(() => {
    handleResize()
  }, 200)
}

function initCategoryChart() {
  if (!categoryChartRef.value) return
  categoryChart = echarts.init(categoryChartRef.value)

  const rawData = screenData.value?.categoryPie || [
    { name: '水电暖修缮', value: 38 },
    { name: '电梯故障', value: 16 },
    { name: '公共照明', value: 22 },
    { name: '门禁道闸', value: 14 },
    { name: '邻里纠纷', value: 10 }
  ]

  categoryChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%', left: 'center', textStyle: { color: '#94a3b8', fontSize: 11 } },
    color: ['#38bdf8', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
    series: [
      {
        name: '问题类型',
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#0f172a',
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#ffffff' }
        },
        data: rawData
      }
    ]
  })
}

function initHeatmapChart() {
  if (!heatmapChartRef.value) return
  heatmapChart = echarts.init(heatmapChartRef.value)

  const rawData = screenData.value?.buildingHeatmap || [
    { name: '1号楼', value: 42 },
    { name: '2号楼', value: 31 },
    { name: '3号楼', value: 58 },
    { name: '4号楼', value: 24 },
    { name: '5号楼', value: 19 },
    { name: '6号楼', value: 36 }
  ]

  heatmapChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: '12%', left: '8%', right: '8%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: rawData.map(d => d.name),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b' }
    },
    series: [
      {
        type: 'bar',
        data: rawData.map(d => d.value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#38bdf8' },
            { offset: 1, color: '#0284c7' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '40%'
      }
    ]
  })
}

function initRadarChart() {
  if (!radarChartRef.value) return
  radarChart = echarts.init(radarChartRef.value)

  const rawData = screenData.value?.activityRadar || [
    { name: '文体活力', max: 100, value: 85 },
    { name: '互助友邻', max: 100, value: 92 },
    { name: '安全维稳', max: 100, value: 96 },
    { name: '环境治理', max: 100, value: 88 },
    { name: '公益志愿', max: 100, value: 78 }
  ]

  radarChart.setOption({
    radar: {
      indicator: rawData.map(r => ({ name: r.name, max: r.max })),
      center: ['50%', '50%'],
      radius: '62%',
      splitNumber: 4,
      axisName: { color: '#38bdf8', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(56, 189, 248, 0.2)' } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: 'rgba(56, 189, 248, 0.3)' } }
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: rawData.map(r => r.value),
            name: '治理活力',
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: { width: 2, color: '#06b6d4' },
            areaStyle: { color: 'rgba(6, 182, 212, 0.35)' }
          }
        ]
      }
    ]
  })
}

function initFunnelChart() {
  if (!funnelChartRef.value) return
  funnelChart = echarts.init(funnelChartRef.value)

  const rawData = screenData.value?.orderFunnel || [
    { name: '提交申报', value: 100 },
    { name: '审核派单', value: 92 },
    { name: '施工处理', value: 84 },
    { name: '完工结单', value: 78 }
  ]

  funnelChart.setOption({
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c}%' },
    color: ['#38bdf8', '#06b6d4', '#10b981', '#f59e0b'],
    series: [
      {
        name: '工单闭环率',
        type: 'funnel',
        left: '12%',
        top: 20,
        bottom: 20,
        width: '76%',
        minSize: '20%',
        maxSize: '100%',
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'inside',
          color: '#ffffff',
          fontSize: 12
        },
        itemStyle: {
          borderColor: '#0f172a',
          borderWidth: 2
        },
        data: rawData
      }
    ]
  })
}

function initMarketChart() {
  if (!marketChartRef.value) return
  marketChart = echarts.init(marketChartRef.value)

  const rawData = screenData.value?.marketPostStats || [
    { name: '二手闲置', value: 45 },
    { name: '邻里求助', value: 28 },
    { name: '物品借用', value: 20 },
    { name: '绿色拼车', value: 12 },
    { name: '技能交换', value: 18 }
  ]

  marketChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: '10%', left: '8%', right: '8%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b' }
    },
    yAxis: {
      type: 'category',
      data: rawData.map(d => d.name),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 }
    },
    series: [
      {
        type: 'bar',
        data: rawData.map(d => d.value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#a855f7' },
            { offset: 1, color: '#ec4899' }
          ]),
          borderRadius: [0, 4, 4, 0]
        },
        barWidth: '45%'
      }
    ]
  })
}
</script>

<style scoped>
.command-screen-container {
  min-height: 100vh;
  background-color: var(--cal-surface-dark);
  background-image: 
    radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.12) 0%, transparent 60%),
    linear-gradient(to bottom, #0a0a0a 0%, #121212 100%);
  color: #ffffff;
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-x: hidden;
  box-sizing: border-box;
}

.screen-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid rgba(56, 189, 248, 0.3);
  padding: 0 10px;
  position: relative;
}

.screen-header::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 30%;
  width: 40%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #38bdf8, transparent);
  box-shadow: 0 0 12px #38bdf8;
}

.back-link {
  color: #38bdf8;
  font-size: 13px;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 6px 14px;
  border-radius: 6px;
  transition: all 0.2s;
  cursor: pointer;
}

.back-link:hover {
  background: rgba(56, 189, 248, 0.25);
}

.header-title-wrap {
  text-align: center;
}

.header-title {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 3px;
  background: linear-gradient(180deg, #ffffff 0%, #7dd3fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.header-sub {
  font-size: 10px;
  letter-spacing: 2px;
  color: #38bdf8;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.live-clock {
  font-size: 14px;
  font-family: monospace;
  color: #38bdf8;
  background: rgba(15, 23, 42, 0.6);
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid rgba(56, 189, 248, 0.2);
}

.fullscreen-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.kpi-card {
  background: var(--cal-surface-dark-elevated);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 2px;
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
}

.kpi-label {
  font-size: 13px;
  color: var(--cal-on-dark-soft);
  margin-bottom: 6px;
}

.kpi-value {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -1px;
  font-family: var(--font-display);
  line-height: 1.1;
  margin-bottom: 4px;
}

.text-cyan { color: #38bdf8; text-shadow: 0 0 10px rgba(56, 189, 248, 0.5); }
.text-emerald { color: #34d399; text-shadow: 0 0 10px rgba(52, 211, 153, 0.5); }
.text-amber { color: #fbbf24; text-shadow: 0 0 10px rgba(251, 191, 36, 0.5); }
.text-purple { color: #c084fc; text-shadow: 0 0 10px rgba(192, 132, 252, 0.5); }

.kpi-unit {
  font-size: 14px;
  font-weight: 400;
  color: #94a3b8;
  margin-left: 4px;
}

.kpi-sub {
  font-size: 11px;
  color: #64748b;
}

.cockpit-grid {
  display: grid;
  grid-template-columns: 1fr 1.3fr 1fr;
  gap: 16px;
  flex: 1;
}

.grid-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-panel {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 10px;
  padding: 16px;
  box-shadow: inset 0 0 20px rgba(6, 182, 212, 0.04);
  flex: 1;
  display: flex;
  flex-direction: column;
}

.panel-title-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  border-left: 3px solid #38bdf8;
  padding-left: 8px;
}

.panel-icon {
  font-size: 14px;
}

.panel-title-text {
  font-size: 14px;
  font-weight: 700;
  color: #e2e8f0;
}

.chart-box {
  width: 100%;
  height: 240px;
  min-height: 240px;
}

.center-overview-card {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(6, 182, 212, 0.35);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 0 25px rgba(6, 182, 212, 0.1);
}

.sandtable-badge {
  display: inline-block;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  font-size: 16px;
  font-weight: 800;
  padding: 6px 18px;
  border-radius: 9999px;
  margin-bottom: 6px;
}

.sandtable-addr {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 12px;
}

.radar-box {
  width: 100%;
  height: 240px;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  margin-left: auto;
  box-shadow: 0 0 8px #10b981;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}

.event-stream-panel {
  flex: 1;
}

.event-stream-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  max-height: 210px;
}

.event-stream-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.03);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.ev-time {
  color: #64748b;
  font-family: monospace;
}

.ev-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.tag-order { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
.tag-notice { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.tag-signup { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.tag-report { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.tag-market { background: rgba(168, 85, 247, 0.2); color: #c084fc; }

.ev-title {
  color: #cbd5e1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .screen-header {
    height: auto !important;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 16px 12px;
    text-align: center;
  }
  .header-left {
    width: 100%;
    display: flex;
    justify-content: flex-start;
  }
  .header-right {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }
  .header-title-wrap {
    margin: 6px 0;
  }
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .cockpit-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .header-title {
    font-size: 20px;
  }
  .kpi-row {
    grid-template-columns: 1fr;
  }
}
</style>
