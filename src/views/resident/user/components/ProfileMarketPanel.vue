<template>
  <div class="profile-market-panel">
    <div class="panel-header-bar">
      <div>
        <h3 class="panel-title">我发布的闲置与互助</h3>
        <p class="panel-sub">在此一键切换物品流转状态（如标为已结题、重新上架），或直接发布新的邻里互助信息</p>
      </div>
      <div class="header-actions">
        <el-button plain @click="$router.push('/market')">
          逛集市大厅
        </el-button>
        <el-button type="primary" :icon="Plus" class="cal-primary-btn" @click="showPublishModal = true">
          发布闲置 / 求助
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-radio-group v-model="statusFilter" size="default">
        <el-radio-button :value="0">全部发布 ({{ myPosts.length }})</el-radio-button>
        <el-radio-button :value="1">展示中 ({{ countByStatus(1) }})</el-radio-button>
        <el-radio-button :value="2">流转沟通中 ({{ countByStatus(2) }})</el-radio-button>
        <el-radio-button :value="3">已达成结题 ({{ countByStatus(3) }})</el-radio-button>
      </el-radio-group>
      <el-button :icon="Refresh" plain size="small" :loading="loading" @click="loadMarketPosts">
        刷新列表
      </el-button>
    </div>

    <div v-loading="loading" class="market-posts-grid">
      <div v-if="filteredPosts.length === 0 && !loading" class="empty-block">
        <el-empty description="当前暂无符合条件的闲置或互助发布记录" :image-size="72">
          <el-button type="primary" class="cal-primary-btn" @click="showPublishModal = true">
            + 立即发布第一条闲置/求助
          </el-button>
        </el-empty>
      </div>

      <div
        v-for="post in filteredPosts"
        :key="post.id"
        class="my-post-card"
        @click="$router.push(`/market/${post.id}?from=profile`)"
      >
        <div class="post-card-thumb">
          <img :src="getFirstImage(post.images)" class="thumb-img" />
          <span :class="['type-badge', `type-${post.postType}`]">
            {{ getPostTypeName(post.postType) }}
          </span>
          <span class="status-overlay" :class="getPostStatusClass(post.status)">
            {{ getPostStatusName(post.status) }}
          </span>
        </div>

        <div class="post-card-body">
          <div class="price-line">
            <span class="price-symbol">¥</span>
            <span class="price-num">{{ post.price > 0 ? post.price : '免费互助' }}</span>
            <span class="trade-type-pill">{{ getTradeTypeText(post.tradeType) }}</span>
          </div>

          <h4 class="post-title">{{ post.title }}</h4>
          <p class="post-desc">{{ post.description }}</p>

          <div class="post-meta-row">
            <span class="post-time">{{ formatShortDate(post.createTime) }}</span>
            <div class="post-stats">
              <span title="浏览数">👀 {{ post.viewCount || 0 }}</span>
              <span title="点赞数">❤️ {{ post.likeCount || 0 }}</span>
              <span title="留言数">💬 {{ post.commentCount || 0 }}</span>
            </div>
          </div>

          <!-- 就地快捷状态操作栏 (免进详情页) -->
          <div class="post-quick-actions" @click.stop>
            <template v-if="post.status === 1">
              <el-button
                type="success"
                plain
                size="small"
                :loading="updatingId === post.id"
                @click="updatePostStatus(post, 3)"
              >
                ✓ 标为已结题
              </el-button>
              <el-button
                size="small"
                :loading="updatingId === post.id"
                @click="updatePostStatus(post, 2)"
              >
                置为流转中
              </el-button>
            </template>

            <template v-else-if="post.status === 2">
              <el-button
                type="success"
                plain
                size="small"
                :loading="updatingId === post.id"
                @click="updatePostStatus(post, 3)"
              >
                ✓ 标为已结题
              </el-button>
              <el-button
                size="small"
                :loading="updatingId === post.id"
                @click="updatePostStatus(post, 1)"
              >
                恢复展示
              </el-button>
            </template>

            <template v-else>
              <el-button
                size="small"
                plain
                :loading="updatingId === post.id"
                @click="updatePostStatus(post, 1)"
              >
                重新上架展示
              </el-button>
            </template>

            <el-button
              link
              type="primary"
              size="small"
              class="detail-btn"
              @click="$router.push(`/market/${post.id}?from=profile`)"
            >
              详情 →
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 就地发布闲置/求助弹窗 -->
    <el-dialog
      v-model="showPublishModal"
      title="发布邻里闲置与互助信息"
      width="620px"
      append-to-body
      destroy-on-close
    >
      <el-form ref="formRef" :model="publishForm" :rules="formRules" label-width="96px">
        <el-form-item label="信息分类" prop="postType">
          <el-select v-model="publishForm.postType" class="w-full">
            <el-option label="🛍️ 二手闲置转让" :value="1" />
            <el-option label="🙋 邻里求助" :value="2" />
            <el-option label="📦 物品借用 (如梯子/工具箱)" :value="3" />
            <el-option label="🚗 绿色拼车" :value="4" />
            <el-option label="💡 技能交换与便民服务" :value="5" />
          </el-select>
        </el-form-item>

        <el-form-item label="信息标题" prop="title">
          <el-input
            v-model="publishForm.title"
            placeholder="如：95新儿童平衡车转让、求借家用冲击钻半天"
            maxlength="40"
            show-word-limit
          />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="交易形式">
              <el-select v-model="publishForm.tradeType" class="w-full">
                <el-option label="一口价" :value="1" />
                <el-option label="可面议" :value="2" />
                <el-option label="免费赠送/义务互助" :value="3" />
                <el-option label="以物易物/技能互换" :value="4" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="参考金额(元)">
              <el-input-number v-model="publishForm.price" :min="0" :precision="2" class="w-full" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="交付方式">
              <el-select v-model="publishForm.deliveryType" class="w-full">
                <el-option label="自提 (楼下或指定点)" :value="1" />
                <el-option label="送货上门" :value="2" />
                <el-option label="协商约定地点" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="约定交接地">
              <el-input v-model="publishForm.tradeAddress" placeholder="如：2号楼单元门厅" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="详细说明" prop="description">
          <el-input
            v-model="publishForm.description"
            type="textarea"
            :rows="3"
            placeholder="请描述物品成色、交接时间或求助事项详情..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="实物照片">
          <div class="upload-photo-row">
            <div v-for="(url, idx) in uploadedImages" :key="url" class="photo-item">
              <el-image :src="url" :preview-src-list="uploadedImages" fit="cover" class="img-box" />
              <button type="button" class="del-btn" @click="uploadedImages.splice(idx, 1)">
                <el-icon><Close /></el-icon>
              </button>
            </div>
            <div v-if="uploadedImages.length < 5" class="add-photo-trigger" @click="showCropper = true">
              <el-icon :size="18"><Plus /></el-icon>
              <span>添加照片 ({{ uploadedImages.length }}/5)</span>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showPublishModal = false">取消</el-button>
        <el-button type="primary" :loading="publishing" class="cal-primary-btn" @click="submitPublish">
          确认发布
        </el-button>
      </template>
    </el-dialog>

    <ImageCropperModal
      v-model="showCropper"
      title="上传闲置物品照片"
      :aspect-ratio="1"
      :allow-aspect-change="true"
      upload-folder="market"
      @success="(url: string) => uploadedImages.push(url)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Refresh, Close } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import request from '@/utils/request'
import ImageCropperModal from '@/components/common/ImageCropperModal.vue'
import type { MarketPost } from '@/types'

const emit = defineEmits<{
  (e: 'changed'): void
}>()

const loading = ref(false)
const myPosts = ref<MarketPost[]>([])
const statusFilter = ref(0)
const updatingId = ref<string | number | null>(null)

// 发布弹窗
const showPublishModal = ref(false)
const publishing = ref(false)
const showCropper = ref(false)
const uploadedImages = ref<string[]>([])
const formRef = ref<FormInstance>()

const publishForm = reactive({
  postType: 1,
  title: '',
  description: '',
  price: 0,
  tradeType: 1,
  deliveryType: 1,
  tradeAddress: '',
  contactType: '站内信',
  contactValue: ''
})

const formRules: FormRules = {
  postType: [{ required: true, message: '请选择信息分类', trigger: 'change' }],
  title: [{ required: true, message: '请输入信息标题', trigger: 'blur' }],
  description: [{ required: true, message: '请输入详细说明', trigger: 'blur' }]
}

const filteredPosts = computed(() => {
  if (statusFilter.value > 0) {
    return myPosts.value.filter(p => p.status === statusFilter.value)
  }
  return myPosts.value
})

function countByStatus(s: number) {
  return myPosts.value.filter(p => p.status === s).length
}

onMounted(() => {
  loadMarketPosts()
})

async function loadMarketPosts() {
  loading.value = true
  try {
    const res: any = await request.get('/market/my-posts', { params: { size: 50 } })
    myPosts.value = res.records || []
  } finally {
    loading.value = false
  }
}

async function updatePostStatus(post: MarketPost, newStatus: number) {
  updatingId.value = post.id
  try {
    await request.put('/market/status', {
      postId: post.id,
      status: newStatus
    })
    post.status = newStatus
    ElMessage.success(`已更新为「${getPostStatusName(newStatus)}」`)
    emit('changed')
  } finally {
    updatingId.value = null
  }
}

async function submitPublish() {
  if (!formRef.value) return
  const ok = await formRef.value.validate().then(() => true).catch(() => false)
  if (!ok) return
  publishing.value = true
  try {
    await request.post('/market/publish', {
      ...publishForm,
      images: uploadedImages.value.length > 0 ? JSON.stringify(uploadedImages.value) : null
    })
    ElMessage.success('发布成功！已同步展示在邻里集市')
    showPublishModal.value = false
    publishForm.title = ''
    publishForm.description = ''
    publishForm.price = 0
    uploadedImages.value = []
    await loadMarketPosts()
    emit('changed')
  } finally {
    publishing.value = false
  }
}

function formatShortDate(str?: string) {
  if (!str) return ''
  return str.split(' ')[0] || str
}

function getFirstImage(imagesJson?: string): string {
  if (!imagesJson) return 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600'
  try {
    const arr = JSON.parse(imagesJson)
    if (Array.isArray(arr) && arr.length > 0) return arr[0]
  } catch (e) {}
  return 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600'
}

function getPostTypeName(type: number): string {
  switch (type) {
    case 1: return '二手转让'
    case 2: return '邻里求助'
    case 3: return '物品借用'
    case 4: return '绿色拼车'
    case 5: return '技能互换'
    default: return '邻里互助'
  }
}

function getPostStatusName(status: number): string {
  switch (status) {
    case 1: return '展示中'
    case 2: return '流转沟通中'
    case 3: return '已达成结题'
    default: return '已下架'
  }
}

function getPostStatusClass(status: number): string {
  switch (status) {
    case 1: return 'status-online'
    case 2: return 'status-pending'
    case 3: return 'status-finished'
    default: return 'status-offline'
  }
}

function getTradeTypeText(tradeType: number): string {
  switch (tradeType) {
    case 1: return '一口价'
    case 2: return '可面议'
    case 3: return '免费赠送'
    case 4: return '互换交换'
    default: return '协商约定'
  }
}

defineExpose({
  loadMarketPosts,
  openPublishModal: () => { showPublishModal.value = true }
})
</script>

<style scoped>
.panel-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--cal-hairline-soft);
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-bottom: 4px;
}

.panel-sub {
  font-size: 13px;
  color: var(--cal-muted);
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.market-posts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.empty-block {
  grid-column: 1 / -1;
}

.my-post-card {
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.2s ease;
}

.my-post-card:hover {
  border-color: var(--cal-ink);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

.post-card-thumb {
  position: relative;
  width: 100%;
  height: 150px;
  background: #f1f5f9;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.type-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.78);
  color: #fff;
}

.status-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
}

.status-online {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.status-pending {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}

.status-finished {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
}

.post-card-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.price-line {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 6px;
}

.price-symbol {
  font-size: 12px;
  font-weight: 700;
  color: #ef4444;
}

.price-num {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
  color: #ef4444;
}

.trade-type-pill {
  margin-left: auto;
  font-size: 11px;
  color: var(--cal-muted);
  background: var(--cal-surface-soft);
  padding: 2px 8px;
  border-radius: 999px;
}

.post-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-bottom: 4px;
}

.post-desc {
  font-size: 12px;
  color: var(--cal-muted);
  line-height: 1.5;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--cal-muted);
  margin-top: auto;
  padding-bottom: 10px;
}

.post-stats {
  display: flex;
  gap: 10px;
}

.post-quick-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px dashed var(--cal-hairline);
  flex-wrap: wrap;
}

.detail-btn {
  margin-left: auto;
}

.upload-photo-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.photo-item {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--cal-hairline);
}

.img-box {
  width: 100%;
  height: 100%;
}

.del-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.add-photo-trigger {
  height: 72px;
  padding: 0 16px;
  border: 1px dashed var(--cal-hairline);
  border-radius: 8px;
  background: var(--cal-surface-soft);
  color: var(--cal-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
}

.add-photo-trigger:hover {
  border-color: var(--cal-ink);
  color: var(--cal-ink);
}

@media (max-width: 768px) {
  .panel-header-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  .market-posts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
