<template>
  <div class="order-submit-view">
    <div class="back-bar">
      <el-button link :icon="Back" class="cal-back-btn main-back-btn" @click="handleCancel">
        {{ backButtonText }}
      </el-button>
      <el-button
        v-if="backButtonText !== '返回工单列表'"
        link
        class="cal-back-btn sub-back-btn"
        @click="$router.push('/orders')"
      >
        查看工单中心
      </el-button>
    </div>

    <div class="submit-card cal-mockup-card">
      <div class="card-title-row">
        <h1 class="cal-display-sm">在线提报工单</h1>
        <p class="card-sub">如遇设施故障、管道漏水、违规占用或公共安全隐患，请准确描述并上传清晰现场照片</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" scroll-to-error class="order-form" @submit.prevent="handleSubmit">
        <el-form-item label="事务类型" prop="orderType">
          <el-radio-group v-model="form.orderType" size="large">
            <el-radio-button :value="1">🛠️ 设施/房屋报修</el-radio-button>
            <el-radio-button :value="2">📝 邻里投诉与物业建议</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 常用报修/投诉场景快捷标签 -->
        <div class="preset-scenarios-box">
          <span class="preset-title">⚡ 常用快捷填单模板：</span>
          <div class="preset-chips">
            <button
              v-for="p in currentPresets"
              :key="p.title"
              type="button"
              class="preset-chip"
              @click="applyPreset(p)"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- AI 智能帮我填报卡片 -->
        <div class="ai-smart-fill-card">
          <button
            type="button"
            class="ai-fill-header"
            :aria-expanded="showAiInput"
            aria-controls="ai-smart-fill-body"
            @click="toggleAiInput"
          >
            <span class="header-left">
              <span class="sparkle-icon" aria-hidden="true">✨</span>
              <span class="ai-title">AI 智能帮我填报</span>
              <span class="ai-pill">口语化/一句话自动结构化</span>
            </span>
            <span class="toggle-btn">
              {{ showAiInput ? '收起' : '展开体验' }}
              <el-icon class="el-icon--right" aria-hidden="true"><component :is="showAiInput ? ArrowUp : ArrowDown" /></el-icon>
            </span>
          </button>
          <el-collapse-transition>
            <div v-show="showAiInput" id="ai-smart-fill-body" class="ai-fill-body">
              <el-input
                v-model="aiRawInput"
                type="textarea"
                :rows="2"
                placeholder="例如：“我家阳台顶上的水管突然爆开了，水一直在往外喷，洗衣机插座都快被淋到了，很危险赶紧来修！”"
                resize="none"
              />
              <div class="ai-fill-actions">
                <span class="ai-tip">🤖 AI 将自动推断分类、规范工单标题、判定紧急程度并润色详细正文</span>
                <el-button
                  type="primary"
                  size="small"
                  :loading="aiParsing"
                  :disabled="!aiRawInput.trim()"
                  class="ai-parse-btn"
                  @click="handleAiParse"
                >
                  <el-icon><MagicStick /></el-icon>
                  一键智能填报
                </el-button>
              </div>
            </div>
          </el-collapse-transition>
        </div>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="故障或事务分类" prop="category">
              <el-select v-model="form.category" placeholder="请选择对应分类" style="width: 100%">
                <template v-if="form.orderType === 1">
                  <el-option label="水电管道管网" value="水电管道管网" />
                  <el-option label="电梯运行维保" value="电梯运行维保" />
                  <el-option label="门禁道闸系统" value="门禁道闸系统" />
                  <el-option label="楼道公共照明" value="楼道公共照明" />
                  <el-option label="绿化及路面设施" value="绿化及路面设施" />
                  <el-option label="其他公用部位" value="其他公用部位" />
                </template>
                <template v-else>
                  <el-option label="违规停放车辆" value="违规停放车辆" />
                  <el-option label="电动车飞线充电" value="电动车飞线充电" />
                  <el-option label="高空抛物与卫生" value="高空抛物与卫生" />
                  <el-option label="深夜噪音扰民" value="深夜噪音扰民" />
                  <el-option label="宠物未拴绳纠纷" value="宠物未拴绳纠纷" />
                  <el-option label="物业服务意见" value="物业服务意见" />
                </template>
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item label="关联房屋定位">
              <el-select v-model="selectedHouseId" placeholder="选择已绑定的房号或公共区域" style="width: 100%">
                <el-option label="公共区域 / 小区主干道" value="" />
                <el-option
                  v-for="h in availableHouses"
                  :key="h.houseId"
                  :label="`${h.buildingName} ${h.unitName} ${h.houseNo}`"
                  :value="String(h.houseId)"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="工单简述主题" prop="title">
          <el-input v-model="form.title" placeholder="如: 1号楼客梯运行至8楼附近有金属刮擦声" maxlength="60" show-word-limit />
        </el-form-item>

        <el-form-item label="详细情况说明" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="5"
            placeholder="请详细描述问题发生的具体位置、现象及方便维修人员联系上门的时间段..."
          />
        </el-form-item>

        <el-form-item label="现场照片上传 (最多4张)">
          <div class="order-upload-container">
            <!-- 缩略图列表 -->
            <div class="photo-preview-grid">
              <div
                v-for="(file, idx) in fileList"
                :key="file.url"
                class="photo-thumb-card"
              >
                <el-image
                  :src="file.url"
                  :preview-src-list="fileList.map(f => f.url)"
                  :initial-index="idx"
                  preview-teleported
                  fit="cover"
                  class="thumb-img"
                />
                <button
                  type="button"
                  class="remove-photo-btn"
                  aria-label="删除该照片"
                  @click="fileList.splice(idx, 1)"
                >
                  <el-icon aria-hidden="true"><Close /></el-icon>
                </button>
              </div>

              <!-- 上传卡片触发器 (少于4张时展示) -->
              <button
                v-if="fileList.length < 4"
                type="button"
                class="photo-add-card"
                @click="showOrderCropper = true"
              >
                <el-icon :size="24" aria-hidden="true"><Plus /></el-icon>
                <span class="add-text">添加现场照片</span>
                <span class="add-sub">{{ fileList.length }}/4 张</span>
              </button>
            </div>
            <div class="upload-hint">支持上传水管跑冒滴漏、电梯告示牌、路灯故障或违规占道现场清晰照片</div>
          </div>
        </el-form-item>

        <el-form-item label="紧急加急标识">
          <el-switch v-model="form.isUrgent" :active-value="1" :inactive-value="0" active-text="突发险情加急处置" />
          <span class="urgent-tip">（突发爆水管、电梯困人等重大险情将第一时间置顶调度）</span>
        </el-form-item>

        <div class="submit-actions">
          <el-button size="large" @click="handleCancel">取消</el-button>
          <el-button type="primary" native-type="submit" size="large" :loading="submitting">
            确认提交申报
          </el-button>
        </div>
      </el-form>
    </div>

    <!-- 工单现场照片弹窗 -->
    <ImageCropperModal
      v-model="showOrderCropper"
      title="上传现场照片"
      :aspect-ratio="4 / 3"
      :allow-aspect-change="true"
      upload-folder="order"
      @success="handleOrderCropSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Plus, Crop, Close, Back, User, ArrowUp, ArrowDown, MagicStick } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type UploadProps } from 'element-plus'
import { useUserStore } from '@/stores/user'
import request from '@/utils/request'
import ImageCropperModal from '@/components/common/ImageCropperModal.vue'
import { parseOrderText } from '@/api/ai'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isFromProfile = computed(() => {
  return (
    route.query.from === 'profile' ||
    (typeof window !== 'undefined' && window.history.state?.back?.includes('/user/profile'))
  )
})

const backButtonText = computed(() => {
  if (isFromProfile.value) {
    return '返回居民个人中心'
  }
  if (typeof window !== 'undefined' && window.history.state?.back === '/') {
    return '返回社区首页'
  }
  return '返回工单列表'
})

function handleCancel() {
  if (isFromProfile.value) {
    router.push('/user/profile')
  } else if (window.history.length > 1 && window.history.state?.back) {
    router.back()
  } else {
    router.push('/orders')
  }
}

const formRef = ref<FormInstance>()
const submitting = ref(false)
const selectedHouseId = ref('')
const availableHouses = ref<any[]>([])
const fileList = ref<any[]>([])
const showOrderCropper = ref(false)

const repairPresets = [
  { label: '🚰 水管跑水渗漏', category: '水电管道管网', title: '主水管道渗水急需检修', content: '管道出现明显渗漏水现象，地面有积水，请尽快安排物业维修师傅上门查看排除险情。', isUrgent: 1 },
  { label: '🛗 客梯运行异响', category: '电梯运行维保', title: '客梯运行伴随金属摩擦异响', content: '电梯在上升或下降途中伴随异响并有轻微抖动，存在安全乘梯隐患，建议及时维保排查。', isUrgent: 0 },
  { label: '💡 楼道照明暗灯', category: '楼道公共照明', title: '楼梯间公共照明灯泡不亮', content: '楼道公共照明灯损坏，夜间上下楼视线受阻，请物业协助更换新节能灯泡。', isUrgent: 0 },
  { label: '🚪 单元门禁失灵', category: '门禁道闸系统', title: '单元入户大门磁吸锁无法闭合', content: '楼栋单元门禁常开无法自动上锁，外来人员可随意进出，存在防盗安全隐患。', isUrgent: 0 },
  { label: '🌿 绿化损毁杂乱', category: '绿化及路面设施', title: '小区公共绿化带破损倒伏', content: '草坪及绿化灌木损坏严重，请绿化养护人员及时补种清理。', isUrgent: 0 }
]

const complaintPresets = [
  { label: '🚗 车辆乱停堵道', category: '违规停放车辆', title: '私家车违规占道阻塞消防通道', content: '多辆私家车违规停放在楼栋单元门口及消防应急通道，影响居民日常通行及应急安全，请网格员协助联系挪车。', isUrgent: 0 },
  { label: '⚡ 飞线违规充电', category: '电动车飞线充电', title: '低楼层高空私拉电线充电隐患', content: '发现有居民从室内私拉插线板至楼外给电动车充电，存在重大消防火灾隐患，请及时劝阻整改。', isUrgent: 1 },
  { label: '🔊 深夜喧闹噪音', category: '深夜噪音扰民', title: '夜间持续高分贝噪音扰民', content: '深夜出现持续噪音干扰周边居民正常休息睡眠，望社区居委会与物业予以协调督办。', isUrgent: 0 },
  { label: '🗑️ 楼道堆放杂物', category: '高空抛物与卫生', title: '楼梯间过道堆放废旧纸箱杂物', content: '公共走廊与楼梯拐角堆放易燃纸箱旧家具，阻碍疏散通道，望督促清理消除隐患。', isUrgent: 0 },
  { label: '🐕 宠物未拴遛狗', category: '宠物未拴绳纠纷', title: '公共区域遛狗未系牵引绳', content: '部分业主在中心花园遛狗未牵绳，易惊吓老人和儿童，倡导文明养犬。', isUrgent: 0 }
]

const currentPresets = computed(() => {
  return form.orderType === 1 ? repairPresets : complaintPresets
})

function applyPreset(p: any) {
  form.category = p.category
  form.title = p.title
  form.content = p.content
  if (p.isUrgent !== undefined) {
    form.isUrgent = p.isUrgent
  }
  ElMessage.info(`已应用快捷模板：${p.label}`)
}

const showAiInput = ref(true)
const aiRawInput = ref('')
const aiParsing = ref(false)

function toggleAiInput() {
  showAiInput.value = !showAiInput.value
}

async function handleAiParse() {
  const text = aiRawInput.value.trim()
  if (!text) return
  aiParsing.value = true
  try {
    const res = await parseOrderText(text)
    const data = res
    if (data && data.title) {
      form.title = data.title
      form.content = data.standardContent
      if (data.isUrgent !== undefined) {
        form.isUrgent = data.isUrgent
      }
      if (form.orderType === 1) {
        if (data.category.includes('水') || data.category.includes('给排水')) {
          form.category = '水电管道管网'
        } else if (data.category.includes('电梯')) {
          form.category = '电梯运行维保'
        } else if (data.category.includes('门禁') || data.category.includes('安防')) {
          form.category = '门禁道闸系统'
        } else if (data.category.includes('照明') || data.category.includes('强电') || data.category.includes('弱电')) {
          form.category = '楼道公共照明'
        } else if (data.category.includes('卫生') || data.category.includes('绿化')) {
          form.category = '绿化及路面设施'
        } else {
          form.category = '其他公用部位'
        }
      } else {
        if (data.category.includes('车') || data.category.includes('停')) {
          form.category = '违规停放车辆'
        } else if (data.category.includes('电') || data.category.includes('充')) {
          form.category = '电动车飞线充电'
        } else if (data.category.includes('噪音') || data.category.includes('吵')) {
          form.category = '深夜噪音扰民'
        } else if (data.category.includes('狗') || data.category.includes('宠')) {
          form.category = '宠物未拴绳纠纷'
        } else if (data.category.includes('垃圾') || data.category.includes('卫生') || data.category.includes('抛物')) {
          form.category = '高空抛物与卫生'
        } else {
          form.category = '物业服务意见'
        }
      }
      ElMessage.success({
        message: `✨ AI 智能解析完成！${data.isUrgent === 1 ? '⚠️ 检测为紧急险情已置顶加急。' : ''}（理由：${data.urgentReason}）`,
        duration: 4000
      })
    }
  } catch (e: any) {
    ElMessage.error(e.message || 'AI 智能解析失败，请重试')
  } finally {
    aiParsing.value = false
  }
}

const form = reactive({
  orderType: 1,
  category: '',
  houseId: undefined as string | undefined,
  houseAddress: '',
  title: '',
  content: '',
  images: '',
  isUrgent: 0
})

const rules = {
  orderType: [{ required: true, message: '请选择工单类型', trigger: 'change' }],
  category: [{ required: true, message: '请选择业务分类', trigger: 'change' }],
  title: [{ required: true, message: '请填写工单简述主题', trigger: 'blur' }],
  content: [{ required: true, message: '请详细描述具体情况', trigger: 'blur' }]
}

const uploadHeaders = computed(() => {
  return userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {}
})

onMounted(async () => {
  const t = route.query.type
  if (t) {
    form.orderType = Number(t)
  }
  try {
    const res: any = await request.get('/grid/my-houses')
    availableHouses.value = res || userStore.user?.boundHouses || []
  } catch (e) {
    availableHouses.value = userStore.user?.boundHouses || []
  }
  if (route.query.houseId) {
    selectedHouseId.value = String(route.query.houseId)
  } else if (availableHouses.value.length > 0) {
    const firstCertified = availableHouses.value.find((h: any) => h.certStatus === 1)
    if (firstCertified) {
      selectedHouseId.value = String(firstCertified.houseId)
    }
  }
})

function handleUploadSuccess(response: any) {
  if (response.code === 200) {
    fileList.value.push({ url: response.data })
  }
}

function handleRemove(uploadFile: any) {
  fileList.value = fileList.value.filter((item) => item.url !== uploadFile.url)
}

function handleOrderCropSuccess(url: string) {
  fileList.value.push({ url })
  ElMessage.success('现场照片上传成功！')
}

async function handleSubmit() {
  if (!formRef.value) return
  const ok = await formRef.value.validate().then(() => true).catch(() => false)
  if (!ok) return

  if (selectedHouseId.value) {
    form.houseId = selectedHouseId.value
    const found = availableHouses.value.find((h) => String(h.houseId) === String(form.houseId))
    if (found) {
      form.houseAddress = `${found.buildingName} ${found.unitName} ${found.houseNo}`
    }
  } else {
    form.houseId = undefined
    form.houseAddress = '公共区域 / 小区主干道'
  }

  const urls = fileList.value.map((f) => f.url)
  form.images = JSON.stringify(urls)

  submitting.value = true
  try {
    await request.post('/order/submit', form)
    ElMessage.success('工单提报成功！调度中心与网格员已接收通知。')
    router.push(isFromProfile.value ? '/user/profile?tab=orders' : '/orders')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.order-submit-view {
  max-width: 820px;
  margin: 0 auto;
}
.back-bar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.crumb-sep {
  color: var(--cal-hairline);
  font-size: 13px;
}
.cal-back-btn {
  font-size: 13px;
  color: var(--cal-muted);
}
.cal-back-btn:hover {
  color: var(--cal-ink);
}
.sub-back-btn {
  color: var(--cal-muted);
  font-size: 13px;
  margin-left: 4px;
}
.sub-back-btn:hover {
  color: var(--cal-ink);
}
.submit-card {
  padding: 40px;
  background: var(--cal-canvas);
}
.card-title-row {
  margin-bottom: 28px;
  border-bottom: 1px solid var(--cal-hairline-soft);
  padding-bottom: 18px;
}
.card-sub {
  font-size: 13px;
  color: var(--cal-muted);
  margin-top: 6px;
}

/* AI 智能填报卡片 */
.ai-smart-fill-card {
  margin-bottom: 22px;
  background: linear-gradient(135deg, #f0f7ff 0%, #f8fafc 100%);
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 6px -1px rgba(37, 99, 235, 0.08);
}

.ai-fill-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  background: rgba(239, 246, 255, 0.6);
  border: none;
  border-bottom: 1px solid rgba(191, 219, 254, 0.5);
  font: inherit;
  text-align: left;
}
.ai-fill-header .toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #1d4ed8;
}

.ai-fill-header .header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sparkle-icon {
  font-size: 16px;
}

.ai-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #1d4ed8;
}

.ai-pill {
  font-size: 11px;
  padding: 2px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 9999px;
  font-weight: 500;
}

.ai-fill-body {
  padding: 14px 16px;
}

.ai-fill-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.ai-tip {
  font-size: 11.5px;
  color: #64748b;
}

.ai-parse-btn {
  background: #2563eb !important;
  border-color: #2563eb !important;
  font-weight: 600;
}

.ai-parse-btn :deep(.el-icon) {
  margin-right: 4px;
}

/* 快捷模板栏 */
.preset-scenarios-box {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-title {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-chip:hover {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

/* 现场照片统一上传网格 */
.order-upload-container {
  width: 100%;
}

.photo-preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.photo-thumb-card {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.thumb-img {
  width: 100%;
  height: 100%;
}

.remove-photo-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background-color 0.15s ease;
}
@media (pointer: coarse) {
  .remove-photo-btn::after {
    content: '';
    position: absolute;
    inset: -10px;
  }
}

.remove-photo-btn:hover {
  background: #ef4444;
}

.photo-add-card {
  width: 96px;
  height: 96px;
  padding: 0;
  font: inherit;
  border-radius: 8px;
  border: 1.5px dashed #cbd5e1;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: #475569;
  transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
}

.photo-add-card:hover {
  border-color: #0f172a;
  color: #0f172a;
  background: #ffffff;
}

.add-text {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}

.add-sub {
  font-size: 10px;
  color: #94a3b8;
  line-height: 1.2;
  white-space: nowrap;
}

.upload-hint {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
  margin-top: 8px;
}

.urgent-tip {
  margin-left: 12px;
  font-size: 12px;
  color: var(--cal-muted);
}
.submit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 36px;
  padding-top: 20px;
  border-top: 1px solid var(--cal-hairline-soft);
}

@media (max-width: 768px) {
  .submit-card {
    padding: 20px 16px;
  }
  .card-title-row {
    margin-bottom: 20px;
    padding-bottom: 14px;
  }
  .urgent-tip {
    display: block;
    margin-left: 0;
    margin-top: 6px;
  }
  .submit-actions {
    flex-direction: column-reverse;
    gap: 10px;
    margin-top: 24px;
  }
  .submit-actions .el-button {
    width: 100%;
    margin-left: 0 !important;
  }
}
</style>
