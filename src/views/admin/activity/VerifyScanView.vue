<template>
  <div class="verify-scan-view">
    <div class="page-header">
      <div>
        <h2 class="page-title">活动现场核销与签到</h2>
        <p class="page-sub">核验居民出示的活动核销码或电子凭证，办理现场签到入场</p>
      </div>
      <div class="header-actions">
        <el-button :icon="ArrowLeft" class="cal-back-btn" @click="handleBack">
          返回活动管理
        </el-button>
      </div>
    </div>

    <div class="verify-layout">
      <!-- 左侧操作台 -->
      <div class="verify-card card-hover">
        <h3 class="card-title">活动核销与签到录入</h3>

        <el-form label-position="top" class="verify-form">
          <el-form-item label="所属活动 (点击胶囊快速切换)">
            <div v-if="activeActivities.length > 0" class="activity-pill-row">
              <button
                v-for="act in activeActivities.slice(0, 4)"
                :key="act.id"
                type="button"
                class="act-pill"
                :class="{ active: String(selectedActivityId) === String(act.id) }"
                @click="selectedActivityId = act.id"
              >
                {{ act.title }}
              </button>
            </div>
            <el-select
              v-model="selectedActivityId"
              placeholder="请选择现场开展的活动"
              class="w-full"
              size="large"
            >
              <el-option
                v-for="act in activeActivities"
                :key="act.id"
                :label="`${act.title} (${act.location})`"
                :value="act.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="6位活动核销码">
            <div class="verify-input-row">
              <el-input
                v-model="verifyCode"
                placeholder="请输入居民展示的 6 位数字码"
                size="large"
                maxlength="6"
                clearable
                class="verify-input"
                @keyup.enter="handleVerify"
              />
              <el-button size="large" plain @click="handlePasteCode">
                📋 粘贴
              </el-button>
            </div>

            <!-- 触屏快捷数字键盘 -->
            <div class="numpad-grid">
              <button
                v-for="digit in ['1','2','3','4','5','6','7','8','9']"
                :key="digit"
                type="button"
                class="numpad-btn"
                @click="appendDigit(digit)"
              >
                {{ digit }}
              </button>
              <button type="button" class="numpad-btn action-btn" @click="verifyCode = ''">清空</button>
              <button type="button" class="numpad-btn" @click="appendDigit('0')">0</button>
              <button type="button" class="numpad-btn action-btn" @click="verifyCode = verifyCode.slice(0, -1)">⌫ 退格</button>
            </div>
          </el-form-item>

          <el-button
            type="primary"
            size="large"
            class="verify-btn"
            :loading="verifying"
            :disabled="!selectedActivityId || verifyCode.length !== 6"
            @click="handleVerify"
          >
            ⚡ 立即核销签到 ({{ verifyCode.length }}/6)
          </el-button>
        </el-form>

        <div class="scan-tips">
          <h4>💡 核销说明：</h4>
          <p>1. 居民在“活动详情”或“个人中心 - 活动凭证”中可出示或复制核销码；</p>
          <p>2. 支持上方触屏数字键盘点按录入，或点击【📋 粘贴】一键填入；</p>
          <p>3. 签到成功后参与数据将实时更新至管理看板与数据中心。</p>
        </div>
      </div>

      <!-- 右侧核销成功反馈卡片与历史 -->
      <div class="result-card card-hover">
        <h3 class="card-title">现场签到核验结果</h3>

        <div v-if="lastVerifiedResult" class="verified-box animate-fade-in">
          <div class="stamp-wrap">
            <div class="verified-stamp">已签到</div>
          </div>

          <div class="resident-profile-row">
            <div class="res-avatar">👤</div>
            <div class="res-info">
              <h4 class="res-name">{{ lastVerifiedResult.realName || '居民' }}</h4>
              <p class="res-phone">📱 联络手机：{{ lastVerifiedResult.phone }}</p>
              <p class="res-code">🎫 核销凭证号：<strong>{{ lastVerifiedResult.verifyCode }}</strong></p>
              <p class="res-time">⏰ 签到时间：{{ lastVerifiedResult.verifyTime || '刚刚' }}</p>
            </div>
          </div>
        </div>

        <div v-else class="empty-result">
          <el-empty description="等待录入核销码进行签到..." />
        </div>

        <el-divider />

        <h4 class="history-title">本次会话核销记录 ({{ historyList.length }})</h4>
        <div class="history-list">
          <div v-for="(h, idx) in historyList" :key="idx" class="history-item">
            <span>{{ h.realName }} ({{ h.phone }})</span>
            <span class="history-time">{{ h.time }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { useCommunityStore } from '@/stores/community'
import type { Activity } from '@/types'

const route = useRoute()
const router = useRouter()

function handleBack() {
  if (window.history.length > 1 && window.history.state?.back?.includes('/admin/activities')) {
    router.back()
  } else {
    router.push('/admin/activities')
  }
}

const activeActivities = ref<Activity[]>([])
const selectedActivityId = ref<string>('')
const verifyCode = ref('')
const verifying = ref(false)

function appendDigit(digit: string) {
  if (verifyCode.value.length < 6) {
    verifyCode.value += digit
  }
}

async function handlePasteCode() {
  try {
    const text = await navigator.clipboard.readText()
    const clean = text.replace(/\D/g, '').slice(0, 6)
    if (clean) {
      verifyCode.value = clean
      ElMessage.success(`已粘贴核销码：${clean}`)
    } else {
      ElMessage.warning('剪贴板中未检测到数字核销码')
    }
  } catch {
    ElMessage.warning('请手动输入或使用下方数字键盘点按')
  }
}

const lastVerifiedResult = ref<any>(null)
const historyList = ref<Array<{ realName: string; phone: string; time: string }>>([])

const userStore = useUserStore()
const communityStore = useCommunityStore()
const communityParam = computed(() =>
  userStore.isSystemAdmin ? communityStore.selectedCommunityId : undefined
)
watch(() => communityStore.selectedId, () => loadActivities())

onMounted(async () => {
  await loadActivities()
  if (route.query.activityId) {
    selectedActivityId.value = route.query.activityId as string
  }
})

async function loadActivities() {
  try {
    const res: any = await request.get('/activity/list', {
      params: { size: 50, communityId: communityParam.value }
    })
    activeActivities.value = res.records || []
    if (activeActivities.value.length > 0 && !selectedActivityId.value) {
      selectedActivityId.value = activeActivities.value[0].id
    }
  } catch (e) {}
}

async function handleVerify() {
  if (!selectedActivityId.value || !verifyCode.value) {
    ElMessage.warning('请选择活动并输入6位核销码')
    return
  }

  verifying.value = true
  try {
    const res: any = await request.post('/activity/admin/verify', {
      activityId: selectedActivityId.value,
      verifyCode: verifyCode.value.trim()
    })
    lastVerifiedResult.value = res
    ElMessage.success('核销成功！已登记签到入场')
    historyList.value.unshift({
      realName: res.realName || '居民',
      phone: res.phone || '-',
      time: new Date().toLocaleTimeString()
    })
    verifyCode.value = ''
  } catch (err: any) {
  } finally {
    verifying.value = false
  }
}
</script>

<style scoped>
.verify-scan-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cal-back-btn {
  border-radius: 8px;
  font-weight: 500;
  border-color: #e2e8f0;
  color: #475569;
}

.cal-back-btn:hover {
  color: #0f172a;
  border-color: #cbd5e1;
  background-color: #f8fafc;
}

.page-title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
}

.page-sub {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

.verify-layout {
  display: grid;
  grid-template-columns: 460px minmax(0, 1fr);
  gap: 24px;
}

.verify-card, .result-card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  padding: 28px;
  min-width: 0;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 20px;
}

.activity-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  width: 100%;
}

.act-pill {
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.act-pill:hover {
  border-color: #16a34a;
  color: #15803d;
}

.act-pill.active {
  background: #16a34a;
  border-color: #16a34a;
  color: #ffffff;
  font-weight: 600;
}

.verify-input-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.verify-input {
  flex: 1;
}

.numpad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
  margin-top: 12px;
}

.numpad-btn {
  height: 40px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.15s;
}

.numpad-btn:hover {
  background: #f0fdf4;
  border-color: #86efac;
  color: #15803d;
}

.numpad-btn:active {
  transform: scale(0.97);
}

.numpad-btn.action-btn {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
}

.verify-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 700;
  margin-top: 8px;
}

.scan-tips {
  margin-top: 24px;
  background: #f8fafc;
  border-radius: 10px;
  padding: 16px;
}

.scan-tips h4 {
  font-size: 13px;
  color: #334155;
  margin-bottom: 8px;
}

.scan-tips p {
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
}

.verified-box {
  position: relative;
  background: #f0fdf4;
  border: 2px solid #86efac;
  border-radius: 12px;
  padding: 24px;
}

.stamp-wrap {
  position: absolute;
  top: 16px;
  right: 20px;
}

.verified-stamp {
  border: 3px solid #16a34a;
  color: #16a34a;
  font-size: 18px;
  font-weight: 900;
  padding: 4px 12px;
  border-radius: 6px;
  transform: rotate(-15deg);
  letter-spacing: 2px;
}

.resident-profile-row {
  display: flex;
  gap: 20px;
  align-items: center;
}

.res-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #dcfce7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.res-name {
  font-size: 20px;
  font-weight: 800;
  color: #166534;
  margin-bottom: 6px;
}

.res-phone, .res-code, .res-time {
  font-size: 13px;
  color: #15803d;
  margin-bottom: 4px;
}

.res-code strong {
  font-size: 16px;
  color: #0f172a;
}

.history-title {
  font-size: 14px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 12px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #475569;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.history-time {
  font-size: 12px;
  color: #94a3b8;
}

.empty-result {
  padding: 40px 0;
}

@media (max-width: 960px) {
  .verify-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-wrap: wrap;
    gap: 10px;
  }
  .verify-card,
  .result-card {
    padding: 18px 14px;
  }
}
</style>
