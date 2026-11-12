<template>
  <div class="slider-captcha">
    <!-- 验证码图片区 -->
    <div class="captcha-canvas" :class="{ shaking: state === 'fail' }">
      <img
        v-if="captcha"
        class="bg-img"
        :src="captcha.bgImage"
        alt="滑块验证码背景图"
        draggable="false"
      />
      <img
        v-if="captcha"
        class="jigsaw-img"
        :src="captcha.jigsawImage"
        :style="{ left: moveX + 'px' }"
        alt=""
        draggable="false"
      />
      <div v-if="state === 'success'" class="result-mask">
        <el-icon :size="18"><CircleCheckFilled /></el-icon>
        <span>验证通过</span>
      </div>
      <button
        v-if="captcha && state === 'idle'"
        class="refresh-btn"
        type="button"
        title="换一张"
        @click="refresh"
      >
        <el-icon><Refresh /></el-icon>
      </button>
      <div v-if="loading || state === 'verifying'" class="loading-mask">
        <el-icon class="is-loading" :size="20"><Loading /></el-icon>
      </div>
    </div>

    <!-- 滑轨 -->
    <div class="slider-track" :class="{ 'is-success': state === 'success', 'is-fail': state === 'fail' }">
      <div class="track-fill" :style="{ width: fillWidth + 'px' }"></div>
      <span v-if="state === 'idle' && moveX === 0" class="track-hint">按住滑块，拖动完成拼图验证</span>
      <span v-else-if="state === 'fail'" class="track-hint hint-fail">验证未通过，正在刷新…</span>
      <span v-else-if="state === 'success'" class="track-hint hint-success">验证通过</span>
      <div
        class="slider-handle"
        :class="{ 'is-success': state === 'success', 'is-fail': state === 'fail' }"
        :style="{ left: moveX + 'px' }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
      >
        <el-icon v-if="state === 'success'"><CircleCheckFilled /></el-icon>
        <el-icon v-else><Right /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh, Right, CircleCheckFilled, Loading } from '@element-plus/icons-vue'
import { getCaptcha } from '@/api/captcha'
import type { SliderCaptchaData } from '@/types'

/**
 * 滑块拼图验证码组件：
 * 图片按后端生成图的 310px 自然尺寸 1:1 展示，保证滑动坐标不被缩放；
 * 松手后 emit verify({ captchaId, captchaX })，由父组件提交登录/注册，
 * 并通过 expose 的 markSuccess / markFail 反馈结果 (失败红色抖动后自动换新图)。
 */
const emit = defineEmits<{ verify: [payload: { captchaId: string; captchaX: number }] }>()

const MAX_MOVE = 256 // 背景宽 310 - 拼图块画布宽 54
const DRAG_THRESHOLD = 8 // 低于该距离视为误触，不提交校验

const captcha = ref<SliderCaptchaData | null>(null)
const loading = ref(false)
const state = ref<'idle' | 'verifying' | 'success' | 'fail'>('idle')
const moveX = ref(0)
const dragging = ref(false)

let dragStartX = 0
let dragStartMove = 0

const fillWidth = computed(() => moveX.value + 44)

onMounted(refresh)

async function refresh() {
  loading.value = true
  state.value = 'idle'
  moveX.value = 0
  try {
    captcha.value = await getCaptcha()
  } finally {
    loading.value = false
  }
}

function onPointerDown(e: PointerEvent) {
  if (state.value !== 'idle' || loading.value || !captcha.value) return
  dragging.value = true
  dragStartX = e.clientX
  dragStartMove = moveX.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  moveX.value = Math.min(Math.max(dragStartMove + e.clientX - dragStartX, 0), MAX_MOVE)
}

function onPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  if (moveX.value <= DRAG_THRESHOLD) {
    moveX.value = 0
    return
  }
  state.value = 'verifying'
  if (captcha.value) {
    emit('verify', { captchaId: captcha.value.captchaId, captchaX: moveX.value })
  }
}

function onPointerCancel() {
  dragging.value = false
  if (state.value === 'idle') moveX.value = 0
}

/** 登录/注册成功反馈：锁定成功态，由父组件随后关闭弹窗 */
function markSuccess() {
  state.value = 'success'
}

/** 校验失败反馈：红色抖动并自动换新图 */
function markFail() {
  state.value = 'fail'
  setTimeout(refresh, 700)
}

defineExpose({ refresh, markSuccess, markFail })
</script>

<style scoped>
.slider-captcha {
  width: 310px;
  margin: 0 auto;
  user-select: none;
}

.captcha-canvas {
  position: relative;
  width: 310px;
  height: 155px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--cal-hairline);
  background: #eef1f5;
}

.captcha-canvas.shaking {
  animation: shake 0.45s ease;
  border-color: #ef4444;
}

.bg-img {
  display: block;
  width: 310px;
  height: 155px;
}

.jigsaw-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 54px;
  height: 155px;
  pointer-events: none;
  will-change: left;
}

.result-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.2);
  color: #059669;
  font-size: 13px;
  font-weight: 600;
  animation: fade-in 0.25s ease;
}

.refresh-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.75);
  color: #475569;
  cursor: pointer;
}
.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  color: #111827;
}

.loading-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.55);
  color: var(--cal-muted);
}

.slider-track {
  position: relative;
  width: 310px;
  height: 44px;
  margin-top: 12px;
  border-radius: var(--radius-md);
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  overflow: hidden;
  transition: border-color 0.2s ease;
}
.slider-track.is-success {
  border-color: #34d399;
}
.slider-track.is-fail {
  border-color: #fca5a5;
}

.track-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--cal-primary);
  opacity: 0.1;
}
.slider-track.is-success .track-fill {
  background: #10b981;
  opacity: 0.16;
}
.slider-track.is-fail .track-fill {
  background: #ef4444;
  opacity: 0.12;
}

.track-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--cal-muted);
  pointer-events: none;
}
.hint-fail {
  color: #dc2626;
  font-weight: 600;
}
.hint-success {
  color: #059669;
  font-weight: 600;
}

.slider-handle {
  position: absolute;
  top: 3px;
  left: 0;
  width: 44px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cal-primary);
  color: var(--cal-on-primary);
  border-radius: 8px;
  cursor: grab;
  touch-action: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  transition: background 0.2s ease;
}
.slider-handle:active {
  cursor: grabbing;
}
.slider-handle.is-success {
  background: #10b981;
}
.slider-handle.is-fail {
  background: #ef4444;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20%,
  60% {
    transform: translateX(-6px);
  }
  40%,
  80% {
    transform: translateX(6px);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
