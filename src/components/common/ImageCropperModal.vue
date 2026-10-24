<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="760px"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    class="image-cropper-dialog"
    @closed="handleClosed"
  >
    <div class="cropper-container">
      <!-- 未选择文件时的上传引导区 -->
      <div v-if="!imageSource" class="upload-dropzone" @click="triggerFileInput" @dragover.prevent @drop.prevent="handleDrop">
        <input
          ref="fileInputRef"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          class="hidden-file-input"
          @change="handleFileChange"
        />
        <div class="dropzone-content">
          <el-icon class="dropzone-icon"><UploadFilled /></el-icon>
          <div class="dropzone-text">点击选择本地图片，或将图片拖拽至此处</div>
          <div class="dropzone-tip">支持 JPG、PNG、WEBP 格式，大小不超过 10MB</div>
        </div>
      </div>

      <!-- 图片编辑与裁切主工作区 -->
      <div v-else class="cropper-workspace">
        <div class="canvas-wrapper" ref="wrapperRef">
          <canvas
            ref="canvasRef"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseUp"
            @wheel.prevent="handleWheel"
          />
          <div class="crop-hint">可拖拽选框或滚轮缩放调整</div>
        </div>

        <!-- 右侧侧边栏：效果预览与操作工具 -->
        <div class="cropper-sidebar">
          <div class="sidebar-section">
            <span class="section-title">效果预览</span>
            <div class="preview-box" :class="{ 'circle-preview': isAvatarMode }">
              <canvas ref="previewCanvasRef" class="preview-canvas" />
            </div>
            <div class="preview-dims">{{ Math.round(cropBox.w) }} × {{ Math.round(cropBox.h) }} px</div>
          </div>

          <!-- 比例切换 -->
          <div v-if="allowAspectChange" class="sidebar-section">
            <span class="section-title">图片比例</span>
            <div class="ratio-buttons">
              <el-button
                size="small"
                :type="currentRatioKey === '1:1' ? 'primary' : 'default'"
                @click="setAspectRatio('1:1', 1)"
              >
                1:1 正方
              </el-button>
              <el-button
                size="small"
                :type="currentRatioKey === '4:3' ? 'primary' : 'default'"
                @click="setAspectRatio('4:3', 4 / 3)"
              >
                4:3 标准
              </el-button>
              <el-button
                size="small"
                :type="currentRatioKey === '16:9' ? 'primary' : 'default'"
                @click="setAspectRatio('16:9', 16 / 9)"
              >
                16:9 海报
              </el-button>
              <el-button
                size="small"
                :type="currentRatioKey === 'free' ? 'primary' : 'default'"
                @click="setAspectRatio('free', 0)"
              >
                自由
              </el-button>
            </div>
          </div>

          <!-- 画面旋转与翻转 -->
          <div class="sidebar-section">
            <span class="section-title">画面调整</span>
            <div class="action-buttons">
              <el-button size="small" :icon="RefreshLeft" @click="rotate(-90)">向左旋转</el-button>
              <el-button size="small" :icon="RefreshRight" @click="rotate(90)">向右旋转</el-button>
            </div>
            <div class="zoom-slider-row">
              <span class="slider-label">缩放</span>
              <el-slider
                v-model="zoom"
                :min="0.5"
                :max="3"
                :step="0.05"
                :show-tooltip="false"
                class="zoom-slider"
                @input="renderCanvas"
              />
            </div>
          </div>

          <div class="sidebar-section reupload-section">
            <el-button size="small" text type="primary" @click="triggerFileInput">
              重新选取图片
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button
          type="primary"
          :disabled="!imageSource"
          :loading="uploading"
          @click="confirmAndUpload"
        >
          {{ uploading ? '上传中...' : '确认上传' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick, onMounted, computed } from 'vue'
import { UploadFilled, RefreshLeft, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    aspectRatio?: number // 1: 1:1, 1.777: 16:9, 1.333: 4:3, 0: free
    allowAspectChange?: boolean
    uploadFolder?: string
    isAvatarMode?: boolean
  }>(),
  {
    modelValue: false,
    title: '调整并上传图片',
    aspectRatio: 1,
    allowAspectChange: true,
    uploadFolder: 'community',
    isAvatarMode: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'success', url: string): void
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const fileInputRef = ref<HTMLInputElement>()
const wrapperRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const previewCanvasRef = ref<HTMLCanvasElement>()

const imageSource = ref<string>('')
const imageElement = ref<HTMLImageElement | null>(null)
const uploading = ref(false)

const zoom = ref(1)
const rotation = ref(0) // 0, 90, 180, 270

// 裁切比例
const currentRatio = ref<number>(props.aspectRatio)
const currentRatioKey = ref<string>(
  props.aspectRatio === 1 ? '1:1' : props.aspectRatio > 1.7 ? '16:9' : props.aspectRatio > 1.3 ? '4:3' : 'free'
)

// 裁切框在 Canvas 逻辑坐标系下的区域
const cropBox = reactive({
  x: 50,
  y: 50,
  w: 240,
  h: 240
})

// 交互拖拽状态
const isDragging = ref(false)
const dragMode = ref<'move' | 'nw' | 'ne' | 'se' | 'sw' | 'none'>('none')
const dragStart = reactive({ mouseX: 0, mouseY: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0 })

const CANVAS_WIDTH = 460
const CANVAS_HEIGHT = 380

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      currentRatio.value = props.aspectRatio
      currentRatioKey.value =
        props.aspectRatio === 1 ? '1:1' : props.aspectRatio > 1.7 ? '16:9' : props.aspectRatio > 1.3 ? '4:3' : 'free'
    } else {
      handleClosed()
    }
  }
)

function handleClosed() {
  imageSource.value = ''
  imageElement.value = null
  zoom.value = 1
  rotation.value = 0
  uploading.value = false
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files && files[0]) {
    loadFile(files[0])
  }
}

function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files
  if (files && files[0]) {
    loadFile(files[0])
  }
}

function loadFile(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择有效的图片文件')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('图片文件过大，请选择 10MB 以内的图片')
    return
  }

  const reader = new FileReader()
  reader.onload = (evt) => {
    imageSource.value = evt.target?.result as string
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageElement.value = img
      zoom.value = 1
      rotation.value = 0
      nextTick(() => {
        initCropBox()
        renderCanvas()
      })
    }
    img.src = imageSource.value
  }
  reader.readAsDataURL(file)
}

function setAspectRatio(key: string, ratio: number) {
  currentRatioKey.value = key
  currentRatio.value = ratio
  adjustCropBoxToRatio()
  renderCanvas()
}

function initCropBox() {
  const padding = 30
  const maxW = CANVAS_WIDTH - padding * 2
  const maxH = CANVAS_HEIGHT - padding * 2

  let w = 240
  let h = 240
  if (currentRatio.value > 0) {
    if (currentRatio.value >= 1) {
      w = Math.min(maxW, 280)
      h = w / currentRatio.value
      if (h > maxH) {
        h = maxH
        w = h * currentRatio.value
      }
    } else {
      h = Math.min(maxH, 280)
      w = h * currentRatio.value
    }
  }

  cropBox.w = w
  cropBox.h = h
  cropBox.x = (CANVAS_WIDTH - w) / 2
  cropBox.y = (CANVAS_HEIGHT - h) / 2
}

function adjustCropBoxToRatio() {
  if (currentRatio.value <= 0) return // free
  let newW = cropBox.w
  let newH = newW / currentRatio.value

  if (newH > CANVAS_HEIGHT - 20) {
    newH = CANVAS_HEIGHT - 20
    newW = newH * currentRatio.value
  }
  if (newW > CANVAS_WIDTH - 20) {
    newW = CANVAS_WIDTH - 20
    newH = newW / currentRatio.value
  }

  cropBox.w = newW
  cropBox.h = newH

  if (cropBox.x + cropBox.w > CANVAS_WIDTH) cropBox.x = CANVAS_WIDTH - cropBox.w
  if (cropBox.y + cropBox.h > CANVAS_HEIGHT) cropBox.y = CANVAS_HEIGHT - cropBox.h
  if (cropBox.x < 10) cropBox.x = 10
  if (cropBox.y < 10) cropBox.y = 10
}

function rotate(deg: number) {
  rotation.value = (rotation.value + deg + 360) % 360
  renderCanvas()
}

function handleWheel(e: WheelEvent) {
  const delta = e.deltaY < 0 ? 0.05 : -0.05
  zoom.value = Math.min(3, Math.max(0.5, Number((zoom.value + delta).toFixed(2))))
  renderCanvas()
}

function renderCanvas() {
  if (!canvasRef.value || !imageElement.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // 1. 绘制底层背景（网格透明底）
  drawCheckerboard(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)

  // 2. 绘制受缩放和旋转影响的图片
  ctx.save()
  ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
  ctx.rotate((rotation.value * Math.PI) / 180)
  ctx.scale(zoom.value, zoom.value)

  const img = imageElement.value
  // 计算等比铺满基准缩放
  const baseScale = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height) * 0.9
  const drawW = img.width * baseScale
  const drawH = img.height * baseScale
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
  ctx.restore()

  // 3. 绘制暗色半透明遮罩 (除裁切框外的区域)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'
  ctx.fillRect(0, 0, CANVAS_WIDTH, cropBox.y) // 上
  ctx.fillRect(0, cropBox.y + cropBox.h, CANVAS_WIDTH, CANVAS_HEIGHT - (cropBox.y + cropBox.h)) // 下
  ctx.fillRect(0, cropBox.y, cropBox.x, cropBox.h) // 左
  ctx.fillRect(cropBox.x + cropBox.w, cropBox.y, CANVAS_WIDTH - (cropBox.x + cropBox.w), cropBox.h) // 右

  // 4. 绘制裁切框边框与九宫格参考线
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 2
  ctx.strokeRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1
  // 水平三分线
  ctx.beginPath()
  ctx.moveTo(cropBox.x, cropBox.y + cropBox.h / 3)
  ctx.lineTo(cropBox.x + cropBox.w, cropBox.y + cropBox.h / 3)
  ctx.moveTo(cropBox.x, cropBox.y + (cropBox.h * 2) / 3)
  ctx.lineTo(cropBox.x + cropBox.w, cropBox.y + (cropBox.h * 2) / 3)
  // 垂直三分线
  ctx.moveTo(cropBox.x + cropBox.w / 3, cropBox.y)
  ctx.lineTo(cropBox.x + cropBox.w / 3, cropBox.y + cropBox.h)
  ctx.moveTo(cropBox.x + (cropBox.w * 2) / 3, cropBox.y)
  ctx.lineTo(cropBox.x + (cropBox.w * 2) / 3, cropBox.y + cropBox.h)
  ctx.stroke()

  // 5. 绘制四角手柄
  const handleSize = 8
  ctx.fillStyle = '#0284c7'
  drawHandle(ctx, cropBox.x, cropBox.y, handleSize)
  drawHandle(ctx, cropBox.x + cropBox.w, cropBox.y, handleSize)
  drawHandle(ctx, cropBox.x, cropBox.y + cropBox.h, handleSize)
  drawHandle(ctx, cropBox.x + cropBox.w, cropBox.y + cropBox.h, handleSize)

  // 6. 更新实时预览
  renderPreview()
}

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillRect(x - size / 2, y - size / 2, size, size)
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = 12
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      ctx.fillStyle = (x / size + y / size) % 2 === 0 ? '#1e293b' : '#334155'
      ctx.fillRect(x, y, size, size)
    }
  }
}

function renderPreview() {
  if (!previewCanvasRef.value || !canvasRef.value) return
  const pCanvas = previewCanvasRef.value
  const ctx = pCanvas.getContext('2d')
  if (!ctx) return

  const pSize = 130
  pCanvas.width = pSize
  pCanvas.height = pSize

  ctx.clearRect(0, 0, pSize, pSize)

  if (props.isAvatarMode) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(pSize / 2, pSize / 2, pSize / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
  }

  // 从当前主 canvas 的图片层中获取原图截取部分
  // 创建临时离屏 canvas 抽取无遮罩的纯净画面
  const offscreen = document.createElement('canvas')
  offscreen.width = CANVAS_WIDTH
  offscreen.height = CANVAS_HEIGHT
  const octx = offscreen.getContext('2d')
  if (octx && imageElement.value) {
    octx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
    octx.rotate((rotation.value * Math.PI) / 180)
    octx.scale(zoom.value, zoom.value)
    const img = imageElement.value
    const baseScale = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height) * 0.9
    const drawW = img.width * baseScale
    const drawH = img.height * baseScale
    octx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)

    // 将裁切框区域绘制到预览画布
    ctx.drawImage(
      offscreen,
      cropBox.x,
      cropBox.y,
      cropBox.w,
      cropBox.h,
      0,
      0,
      pSize,
      pSize
    )
  }

  if (props.isAvatarMode) {
    ctx.restore()
  }
}

// 鼠标操作手柄与移动
function handleMouseDown(e: MouseEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  const handleMargin = 12
  // 判断点击的是哪个把手
  if (Math.hypot(mouseX - cropBox.x, mouseY - cropBox.y) < handleMargin) {
    dragMode.value = 'nw'
  } else if (Math.hypot(mouseX - (cropBox.x + cropBox.w), mouseY - cropBox.y) < handleMargin) {
    dragMode.value = 'ne'
  } else if (Math.hypot(mouseX - cropBox.x, mouseY - (cropBox.y + cropBox.h)) < handleMargin) {
    dragMode.value = 'sw'
  } else if (Math.hypot(mouseX - (cropBox.x + cropBox.w), mouseY - (cropBox.y + cropBox.h)) < handleMargin) {
    dragMode.value = 'se'
  } else if (
    mouseX >= cropBox.x &&
    mouseX <= cropBox.x + cropBox.w &&
    mouseY >= cropBox.y &&
    mouseY <= cropBox.y + cropBox.h
  ) {
    dragMode.value = 'move'
  } else {
    dragMode.value = 'none'
    return
  }

  isDragging.value = true
  dragStart.mouseX = mouseX
  dragStart.mouseY = mouseY
  dragStart.boxX = cropBox.x
  dragStart.boxY = cropBox.y
  dragStart.boxW = cropBox.w
  dragStart.boxH = cropBox.h
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value || dragMode.value === 'none') return
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  const dx = mouseX - dragStart.mouseX
  const dy = mouseY - dragStart.mouseY

  if (dragMode.value === 'move') {
    let nx = dragStart.boxX + dx
    let ny = dragStart.boxY + dy
    nx = Math.max(0, Math.min(CANVAS_WIDTH - cropBox.w, nx))
    ny = Math.max(0, Math.min(CANVAS_HEIGHT - cropBox.h, ny))
    cropBox.x = nx
    cropBox.y = ny
  } else if (dragMode.value === 'se') {
    let nw = Math.max(60, dragStart.boxW + dx)
    let nh = currentRatio.value > 0 ? nw / currentRatio.value : Math.max(60, dragStart.boxH + dy)
    if (cropBox.x + nw > CANVAS_WIDTH) nw = CANVAS_WIDTH - cropBox.x
    if (cropBox.y + nh > CANVAS_HEIGHT) nh = CANVAS_HEIGHT - cropBox.y
    cropBox.w = nw
    cropBox.h = currentRatio.value > 0 ? nw / currentRatio.value : nh
  }
  renderCanvas()
}

function handleMouseUp() {
  isDragging.value = false
  dragMode.value = 'none'
}

// 确认并上传至 MinIO
async function confirmAndUpload() {
  if (!imageElement.value) return
  uploading.value = true

  try {
    // 1. 创建高分辨率离屏 Canvas 导出裁切内容
    const exportCanvas = document.createElement('canvas')
    const outW = Math.max(200, Math.round(cropBox.w * 2))
    const outH = Math.max(200, Math.round(cropBox.h * 2))
    exportCanvas.width = outW
    exportCanvas.height = outH
    const eCtx = exportCanvas.getContext('2d')
    if (!eCtx) throw new Error('无法创建画布环境')

    // 绘制高分辨率图像
    const offscreen = document.createElement('canvas')
    offscreen.width = CANVAS_WIDTH
    offscreen.height = CANVAS_HEIGHT
    const octx = offscreen.getContext('2d')
    if (!octx) throw new Error('无法创建离屏画布')

    octx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
    octx.rotate((rotation.value * Math.PI) / 180)
    octx.scale(zoom.value, zoom.value)
    const img = imageElement.value
    const baseScale = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height) * 0.9
    const drawW = img.width * baseScale
    const drawH = img.height * baseScale
    octx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)

    eCtx.drawImage(offscreen, cropBox.x, cropBox.y, cropBox.w, cropBox.h, 0, 0, outW, outH)

    // 2. 转换为 Blob
    const blob: Blob = await new Promise((resolve, reject) => {
      exportCanvas.toBlob((b) => {
        if (b) resolve(b)
        else reject(new Error('图片裁切转换失败'))
      }, 'image/jpeg', 0.92)
    })

    // 3. 构建 FormData 上传
    const formData = new FormData()
    formData.append('file', blob, `crop_${Date.now()}.jpg`)
    formData.append('folder', props.uploadFolder)

    const res: any = await request.post('/common/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    const finalUrl = res.url || res
    ElMessage.success('图片上传成功！')
    emit('success', finalUrl)
    dialogVisible.value = false
  } catch (err: any) {
    ElMessage.error(err.message || '上传失败，请重试')
  } finally {
    uploading.value = false
  }
}

defineExpose({
  loadFile
})
</script>

<style scoped>
.cropper-container {
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-dropzone {
  width: 100%;
  height: 380px;
  border: 2px dashed #475569;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #1e293b;
  transition: all 0.2s ease;
}
.upload-dropzone:hover {
  border-color: #38bdf8;
  background: #0f172a;
}
.hidden-file-input {
  display: none;
}
.dropzone-content {
  text-align: center;
}
.dropzone-icon {
  font-size: 56px;
  color: #38bdf8;
  margin-bottom: 16px;
}
.dropzone-text {
  font-size: 16px;
  color: #f1f5f9;
  font-weight: 600;
  margin-bottom: 8px;
}
.dropzone-tip {
  font-size: 13px;
  color: #94a3b8;
}

.cropper-workspace {
  display: flex;
  gap: 20px;
  width: 100%;
}

.canvas-wrapper {
  position: relative;
  width: 460px;
  height: 380px;
  background: #0f172a;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.canvas-wrapper canvas {
  display: block;
  cursor: crosshair;
}
.crop-hint {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.85);
  color: #94a3b8;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 12px;
  pointer-events: none;
}

.cropper-sidebar {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #1e293b;
  padding: 16px;
  border-radius: 10px;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-box {
  width: 130px;
  height: 130px;
  border-radius: 8px;
  overflow: hidden;
  background: #0f172a;
  border: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
}
.preview-box.circle-preview {
  border-radius: 50%;
  border-color: #38bdf8;
}
.preview-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.preview-dims {
  font-size: 11px;
  color: #64748b;
  text-align: center;
  margin-top: 4px;
}

.ratio-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.action-buttons {
  display: flex;
  gap: 8px;
}
.action-buttons .el-button {
  flex: 1;
}

.zoom-slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}
.slider-label {
  font-size: 12px;
  color: #94a3b8;
  width: 32px;
}
.zoom-slider {
  flex: 1;
}

.reupload-section {
  margin-top: auto;
  align-items: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
