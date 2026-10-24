<template>
  <el-config-provider :locale="zhCn">
    <router-view />

    <!-- 全局一键回到顶部悬浮钮 -->
    <el-backtop :right="26" :bottom="32" class="cal-backtop" />

    <!-- 突发应急通告置顶全屏弹窗 -->
    <el-dialog
      v-model="showEmergencyDialog"
      title="⚠️ 社区突发应急通告广播"
      width="540px"
      :show-close="true"
      center
      class="emergency-dialog"
    >
      <div v-if="noticeStore.emergencyNotice" class="emergency-body">
        <h3 class="emergency-title">{{ noticeStore.emergencyNotice.title }}</h3>
        <div class="emergency-content" v-safe-html="noticeStore.emergencyNotice.content"></div>
        <div class="emergency-time">广播时间：{{ noticeStore.emergencyNotice.publishTime }}</div>
      </div>
      <template #footer>
        <el-button type="danger" @click="showEmergencyDialog = false">我已知晓，注意防范</el-button>
      </template>
    </el-dialog>
  </el-config-provider>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useNoticeStore } from '@/stores/notice'

const noticeStore = useNoticeStore()
const showEmergencyDialog = ref(false)

watch(
  () => noticeStore.emergencyNotice,
  (val) => {
    if (val) {
      showEmergencyDialog.value = true
    }
  }
)
</script>

<style scoped>
.emergency-body {
  padding: 10px 0;
}
.emergency-title {
  color: #ef4444;
  font-size: 18px;
  margin-bottom: 12px;
  text-align: center;
}
.emergency-content {
  line-height: 1.7;
  color: #374151;
  background: #fef2f2;
  padding: 14px;
  border-radius: 8px;
  border-left: 4px solid #ef4444;
  margin-bottom: 12px;
}
.emergency-time {
  text-align: right;
  font-size: 13px;
  color: #9ca3af;
}
</style>
