<template>
  <div class="market-list-view">
    <!-- 头部横幅 -->
    <div class="page-header">
      <div>
        <h1 class="cal-display-sm">邻里互助与二手集市</h1>
        <p class="page-sub">闲置流转、借用求助、绿色拼车、技能互换，营造熟人社区温情互助网络</p>
      </div>
      <div class="header-actions">
        <button
          v-if="userStore.isLoggedIn"
          type="button"
          class="my-posts-btn"
          @click="$router.push('/user/profile?tab=market')"
        >
          📋 我的发布 ({{ myPostsTotal }})
        </button>
        <el-button type="primary" :icon="Plus" size="large" class="cal-primary-btn" @click="openPublishDialog">
          发布闲置 / 求助
        </el-button>
      </div>
    </div>

    <!-- 筛选过滤区域 -->
    <div class="filter-card cal-mockup-card">
      <div class="type-filter">
        <el-radio-group v-model="filterType" @change="resetAndLoad">
          <el-radio-button :value="0">全部分类</el-radio-button>
          <el-radio-button :value="1">🛍️ 二手闲置</el-radio-button>
          <el-radio-button :value="2">🙋 邻里求助</el-radio-button>
          <el-radio-button :value="3">📦 物品借用</el-radio-button>
          <el-radio-button :value="4">🚗 绿色拼车</el-radio-button>
          <el-radio-button :value="5">💡 技能交换</el-radio-button>
        </el-radio-group>
      </div>

      <div class="secondary-filter">
        <div class="status-tabs" role="group" aria-label="集市状态筛选">
          <button
            type="button"
            :class="['status-tab-item', { active: filterStatus === 0 }]"
            :aria-pressed="filterStatus === 0"
            @click="setStatusFilter(0)"
          >
            全部状态
          </button>
          <button
            type="button"
            :class="['status-tab-item', { active: filterStatus === 1 }]"
            :aria-pressed="filterStatus === 1"
            @click="setStatusFilter(1)"
          >
            展示中
          </button>
          <button
            type="button"
            :class="['status-tab-item', { active: filterStatus === 2 }]"
            :aria-pressed="filterStatus === 2"
            @click="setStatusFilter(2)"
          >
            流转沟通中
          </button>
          <button
            type="button"
            :class="['status-tab-item', { active: filterStatus === 3 }]"
            :aria-pressed="filterStatus === 3"
            @click="setStatusFilter(3)"
          >
            已达成结题
          </button>
        </div>

        <search class="search-box" aria-label="邻里集市搜索">
          <label for="market-search-input" class="visually-hidden">搜索物品名称或关键词</label>
          <el-input
            id="market-search-input"
            v-model="searchKeyword"
            type="search"
            enterkeyhint="search"
            placeholder="搜索物品名称、关键词..."
            :prefix-icon="SearchIcon"
            clearable
            style="width: 260px"
            @keydown.enter="handleSearchEnter"
            @clear="loadPosts"
          />
        </search>
      </div>
    </div>

    <!-- 列表网格 -->
    <div v-loading="loading" class="market-grid">
      <div v-if="posts.length === 0" class="empty-wrap">
        <el-empty description="当前暂无符合条件的闲置或互助信息，快来发布第一条吧！" />
      </div>

      <div
        v-for="item in posts"
        :key="item.id"
        class="market-card card-hover"
        @click="$router.push(`/market/${item.id}`)"
      >
        <div class="card-cover">
          <img
            :src="getFirstImage(item.images)"
            :alt="item.title"
            loading="lazy"
            class="cover-image"
          />
          <span :class="['type-tag', `type-${item.postType}`]">
            {{ getPostTypeName(item.postType) }}
          </span>
          <span v-if="item.status !== 1" class="status-overlay-tag">
            {{ item.status === 2 ? '流转中' : (item.status === 3 ? '已结题' : '已下架') }}
          </span>
        </div>

        <div class="card-content">
          <div class="price-row">
            <template v-if="item.postType === 1">
              <span v-if="item.price > 0" class="price-symbol">¥</span>
              <span class="price-val">{{ item.price > 0 ? item.price : '免费赠送' }}</span>
              <span v-if="item.tradeType === 2" class="trade-hint">可小刀</span>
            </template>
            <template v-else-if="item.postType === 2">
              <span class="help-reward-tag">求助贴</span>
              <span v-if="item.price > 0" class="reward-val">报酬 ¥{{ item.price }}</span>
              <span v-else class="reward-val free">邻里热心相助</span>
            </template>
            <template v-else>
              <span class="free-trade-tag">{{ getTradeTypeText(item.tradeType) }}</span>
            </template>
          </div>

          <h2 class="post-title">
            <router-link :to="`/market/${item.id}`" class="post-title-link" @click.stop>
              {{ item.title }}
            </router-link>
          </h2>
          <p class="post-desc">{{ item.description }}</p>

          <div class="author-row">
            <div class="author-info">
              <el-avatar :size="24" :src="item.authorAvatar || DEFAULT_AVATAR" />
              <span class="author-name">{{ item.authorName }}</span>
              <el-tag size="small" type="success" effect="plain" class="credit-badge">
                信用 {{ item.authorCreditScore || 100 }}
              </el-tag>
            </div>
            <div class="stat-info">
              <button
                type="button"
                class="stat-like-btn"
                :class="{ 'is-liked': item.hasLiked }"
                :aria-pressed="!!item.hasLiked"
                :aria-label="item.hasLiked ? '取消赞' : '为邻里点赞'"
                @click.stop="handleQuickLike(item)"
              >
                <span class="heart-icon" aria-hidden="true">{{ item.hasLiked ? '❤️' : '🤍' }}</span>
                <span class="like-num">{{ item.likeCount || 0 }}</span>
              </button>
              <span aria-label="留言数">💬 {{ item.commentCount || 0 }}</span>
            </div>
          </div>

          <!-- 卡片底部就地快捷操作条 -->
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; display: flex; align-items: center; justify-content: space-between" @click.stop>
            <template v-if="userStore.isLoggedIn && String(userStore.user?.id) === String(item.userId)">
              <span style="font-size: 11px; color: #047857; font-weight: 600">我发布的帖子</span>
              <div style="display: flex; gap: 6px">
                <el-button
                  v-if="item.status !== 3"
                  size="small"
                  type="success"
                  plain
                  style="min-height: 28px; padding: 2px 8px; font-size: 12px"
                  @click="handleCardQuickStatus(item, 3)"
                >
                  ✓ 标为已结题
                </el-button>
                <el-button
                  v-else
                  size="small"
                  type="primary"
                  plain
                  style="min-height: 28px; padding: 2px 8px; font-size: 12px"
                  @click="handleCardQuickStatus(item, 1)"
                >
                  重新上架
                </el-button>
              </div>
            </template>
            <template v-else>
              <span style="font-size: 12px; color: #475569">
                {{ item.deliveryType === 1 ? '📍 楼下自提' : '🚚 送货上门' }}
              </span>
              <el-button
                size="small"
                plain
                style="min-height: 28px; padding: 2px 10px; font-size: 12px; border-radius: 999px"
                @click="openQuickChat(item)"
              >
                💬 私信沟通
              </el-button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="size"
        :total="total"
        layout="prev, pager, next, total"
        background
        @current-change="loadPosts"
      />
    </div>

    <!-- 列表页直接私信沟通弹窗 -->
    <MarketChatModal v-model="showQuickChatModal" :post="chatTargetPost" />

    <!-- 发布弹窗 -->
    <el-dialog
      v-model="showPublishModal"
      title="发布邻里闲置与互助信息"
      width="640px"
      :before-close="handleCloseModal"
    >
      <!-- 快捷发帖模板条 -->
      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px">
        <span style="font-size: 12px; font-weight: 700; color: #475569">⚡ 一键填入模板：</span>
        <el-button
          v-for="tpl in publishTemplates"
          :key="tpl.label"
          size="small"
          round
          style="height: 26px; font-size: 12px"
          @click="applyPublishTemplate(tpl)"
        >
          {{ tpl.icon }} {{ tpl.label }}
        </el-button>
      </div>

      <el-form ref="formRef" :model="publishForm" :rules="formRules" label-width="100px">
        <el-form-item label="信息分类" prop="postType">
          <el-select v-model="publishForm.postType" placeholder="请选择分类" class="w-full">
            <el-option label="🛍️ 二手闲置转让" :value="1" />
            <el-option label="🙋 邻里求助" :value="2" />
            <el-option label="📦 物品借用 (如梯子/工具箱)" :value="3" />
            <el-option label="🚗 绿色拼车" :value="4" />
            <el-option label="💡 技能交换与便民服务" :value="5" />
          </el-select>
        </el-form-item>

        <el-form-item label="信息标题" prop="title">
          <el-input v-model="publishForm.title" placeholder="简要说明（如：99新实木电脑椅、求借电钻2小时）" maxlength="40" show-word-limit />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="交易/形式" prop="tradeType">
              <el-select v-model="publishForm.tradeType" placeholder="请选择" class="w-full">
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
              <el-select v-model="publishForm.deliveryType" placeholder="请选择" class="w-full">
                <el-option label="自提 (楼下或指定地点)" :value="1" />
                <el-option label="送货上门" :value="2" />
                <el-option label="微信约定地点" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="约定交接地">
              <el-input v-model="publishForm.tradeAddress" placeholder="如：3号楼大堂" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系方式类型">
              <el-select v-model="publishForm.contactType" class="w-full">
                <el-option label="手机号码" value="手机" />
                <el-option label="微信号" value="微信" />
                <el-option label="站内留言即可" value="站内信" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系方式内容">
              <el-input v-model="publishForm.contactValue" placeholder="留空则默认使用注册手机" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="详细说明" prop="description">
          <el-input
            v-model="publishForm.description"
            type="textarea"
            :rows="4"
            placeholder="请详细描述物品成色、转让原因或求助具体事项，倡导文明友善交流。"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="上传照片">
          <div class="market-upload-container">
            <div class="market-photo-grid">
              <div
                v-for="(url, idx) in uploadedImages"
                :key="url"
                class="market-thumb-card"
              >
                <el-image
                  :src="url"
                  :preview-src-list="uploadedImages"
                  :initial-index="idx"
                  preview-teleported
                  fit="cover"
                  class="thumb-img"
                />
                <button
                  type="button"
                  class="remove-photo-btn"
                  title="删除该照片"
                  @click="removeUploadedImage(idx)"
                >
                  <el-icon><Close /></el-icon>
                </button>
              </div>

              <!-- 上传触发器 (少于5张时展示) -->
              <div
                v-if="uploadedImages.length < 5"
                class="market-add-card"
                @click="showMarketCropper = true"
              >
                <el-icon :size="20"><Plus /></el-icon>
                <span class="add-text">添加物品照片</span>
                <span class="add-sub">{{ uploadedImages.length }}/5 张</span>
              </div>
            </div>
            <div class="upload-hint">支持上传实物多角度照片、包装成色或求助现场示意图</div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showPublishModal = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="submitPublish">确认发布</el-button>
      </template>
    </el-dialog>

    <!-- 闲置物品照片上传弹窗 -->
    <ImageCropperModal
      v-model="showMarketCropper"
      title="上传物品照片"
      :aspect-ratio="1"
      :allow-aspect-change="true"
      upload-folder="market"
      @success="handleMarketCropSuccess"
    />

    <!-- 我的发布管理弹窗 -->
    <el-dialog v-model="showMyPostsModal" title="我发布的邻里闲置与互助信息" width="680px">
      <div v-loading="loadingMyPosts" class="my-posts-container">
        <div v-if="myPosts.length === 0" class="empty-block">
          <el-empty description="您尚未发布任何闲置或求助信息">
            <el-button type="primary" @click="showMyPostsModal = false; openPublishDialog()">去发布一条</el-button>
          </el-empty>
        </div>

        <div
          v-for="item in myPosts"
          :key="item.id"
          class="my-post-manage-card"
          @click="router.push(`/market/${item.id}`); showMyPostsModal = false"
        >
          <div class="m-card-cover">
            <img :src="getFirstImage(item.images)" :alt="item.title" loading="lazy" class="m-cover-img" />
          </div>
          <div class="m-card-info">
            <div class="m-info-top">
              <span class="cal-badge cal-badge-gray">{{ getPostTypeName(item.postType) }}</span>
              <span class="cal-badge" :class="item.status === 1 ? 'cal-badge-emerald' : 'cal-badge-gray'">
                {{ item.status === 1 ? '展示中' : (item.status === 2 ? '流转中' : '已结题') }}
              </span>
            </div>
            <h3 class="m-post-title">{{ item.title }}</h3>
            <p class="m-post-desc">{{ item.description }}</p>
            <div class="m-info-bottom">
              <span class="m-price">¥ {{ item.price > 0 ? item.price : '免费赠送' }}</span>
              <span class="m-meta">发布于 {{ item.createTime }} · 👀 {{ item.viewCount }} · ❤️ {{ item.likeCount }} · 💬 {{ item.commentCount }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Plus, Search as SearchIcon, Crop, Close } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import request from '@/utils/request'
import { DEFAULT_AVATAR, DEFAULT_COVER } from '@/constants/defaults'
import { isImeComposing } from '@/utils/ime'
import { useUserStore } from '@/stores/user'
import { usePublicCommunityParam } from '@/composables/usePublicCommunityParam'
import ImageCropperModal from '@/components/common/ImageCropperModal.vue'
import MarketChatModal from '@/components/market/MarketChatModal.vue'
import type { MarketPost } from '@/types'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { communityParam: publicCommunityParam, initGuestCommunity } = usePublicCommunityParam()

function handleSearchEnter(event: Event) {
  if (isImeComposing(event)) return
  resetAndLoad()
}

const loading = ref(false)
const publishing = ref(false)
const showPublishModal = ref(false)
const formRef = ref<FormInstance>()

const posts = ref<MarketPost[]>([])
const filterType = ref(0)
const filterStatus = ref(0)
const searchKeyword = ref('')
const page = ref(1)
const size = ref(12)
const total = ref(0)

const uploadedImages = ref<string[]>([])
const publishFileList = ref<any[]>([])
const showMarketCropper = ref(false)

const showMyPostsModal = ref(false)
const loadingMyPosts = ref(false)
const myPosts = ref<MarketPost[]>([])
const myPostsTotal = ref(0)

// 列表页直接私信与状态切换
const showQuickChatModal = ref(false)
const chatTargetPost = ref<MarketPost | null>(null)

function openQuickChat(item: MarketPost) {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再与邻里私信沟通')
    router.push('/login')
    return
  }
  chatTargetPost.value = item
  showQuickChatModal.value = true
}

async function handleCardQuickStatus(item: MarketPost, newStatus: number) {
  try {
    await request.put('/market/status', {
      postId: item.id,
      status: newStatus
    })
    item.status = newStatus
    ElMessage.success(newStatus === 3 ? '已标记为达成结题' : '已重新上架展示')
  } catch (e) {}
}

const publishTemplates = [
  {
    label: '二手闲置转让',
    icon: '🛍️',
    postType: 1,
    tradeType: 1,
    price: 50,
    deliveryType: 1,
    tradeAddress: '1号楼单元门厅自提',
    title: '95新家用闲置好物低价流转',
    description: '家里升级换新闲置出来，功能完好、成色很新，已清洁消毒，支持同小区邻居当面验货自提。'
  },
  {
    label: '工具免费出借',
    icon: '📦',
    postType: 3,
    tradeType: 3,
    price: 0,
    deliveryType: 1,
    tradeAddress: '2号楼大堂交接',
    title: '家用五金工具箱/折叠梯免费借用',
    description: '家里备有全套五金工具箱与加厚铝合金折叠梯，邻居日常安装维修可免费借用，用完归还即可。'
  },
  {
    label: '邻里急事求助',
    icon: '🙋',
    postType: 2,
    tradeType: 3,
    price: 0,
    deliveryType: 3,
    tradeAddress: '社区内当面沟通',
    title: '求借打气筒或搭电线应个急',
    description: '车子停在地库需要临时搭电/打气，请问哪位热心邻居家里有设备可以借用15分钟？万分感谢！'
  },
  {
    label: '工作日顺风拼车',
    icon: '🚗',
    postType: 4,
    tradeType: 2,
    price: 15,
    deliveryType: 3,
    tradeAddress: '小区东门出发',
    title: '工作日早8点前往软件园顺风拼车',
    description: '周一至周五早8:00从小区东门准时出发前往高新软件园，空余2个座位，顺路邻居欢迎联系分摊油费。'
  }
]

function applyPublishTemplate(tpl: typeof publishTemplates[0]) {
  publishForm.postType = tpl.postType
  publishForm.tradeType = tpl.tradeType
  publishForm.price = tpl.price
  publishForm.deliveryType = tpl.deliveryType
  publishForm.tradeAddress = tpl.tradeAddress
  publishForm.title = tpl.title
  publishForm.description = tpl.description
  ElMessage.success(`已填入【${tpl.label}】模板，您可按需微调`)
}

async function handleQuickLike(item: any) {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请登录后再为邻里点赞')
    router.push('/login')
    return
  }
  try {
    const res: any = await request.post(`/market/like/${item.id}`)
    item.hasLiked = res
    item.likeCount = Math.max(0, (item.likeCount || 0) + (res ? 1 : -1))
    ElMessage.success(res ? '点赞成功 ❤️' : '已取消点赞')
  } catch (err) {}
}

function removeUploadedImage(idx: number) {
  uploadedImages.value.splice(idx, 1)
  publishFileList.value.splice(idx, 1)
}

async function loadMyPosts() {
  if (!userStore.isLoggedIn) return
  loadingMyPosts.value = true
  try {
    const res: any = await request.get('/market/my-posts', { params: { size: 50 } })
    myPosts.value = res.records || []
    myPostsTotal.value = res.total || myPosts.value.length
  } catch (e) {
  } finally {
    loadingMyPosts.value = false
  }
}

function handleMarketCropSuccess(url: string) {
  uploadedImages.value.push(url)
  publishFileList.value.push({
    name: `crop_${Date.now()}.jpg`,
    url: url,
    response: { url }
  })
}

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.token}`
}))

const publishForm = reactive({
  postType: 1,
  title: '',
  description: '',
  price: 0,
  tradeType: 1,
  deliveryType: 1,
  tradeAddress: '',
  contactType: '微信',
  contactValue: ''
})

const formRules: FormRules = {
  postType: [{ required: true, message: '请选择分类', trigger: 'change' }],
  title: [{ required: true, message: '请输入信息标题', trigger: 'blur' }],
  description: [{ required: true, message: '请输入详细介绍说明', trigger: 'blur' }]
}

onMounted(() => {
  loadPosts()
  if (userStore.isLoggedIn) {
    loadMyPosts()
  }
  if (route.query.my === '1' || route.query.tab === 'my') {
    showMyPostsModal.value = true
  }
})

watch(() => route.query, (q) => {
  if (q.my === '1' || q.tab === 'my') {
    showMyPostsModal.value = true
    loadMyPosts()
  }
})

async function loadPosts() {
  await initGuestCommunity()
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      size: size.value
    }
    if (filterType.value > 0) params.postType = filterType.value
    if (filterStatus.value > 0) params.status = filterStatus.value
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()

    const res: any = await request.get('/market/list', { params: { ...params, communityId: publicCommunityParam.value } })
    posts.value = res.records || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function resetAndLoad() {
  page.value = 1
  loadPosts()
}

function setStatusFilter(status: number) {
  filterStatus.value = status
  page.value = 1
  loadPosts()
}

function openPublishDialog() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再发布邻里互助信息')
    router.push('/login')
    return
  }
  showPublishModal.value = true
}

function handleCloseModal() {
  showPublishModal.value = false
}

function handleUploadSuccess(res: any) {
  const url = res.url || res.data?.url
  if (url) {
    uploadedImages.value.push(url)
  }
}

function handleRemoveImage(uploadFile: any) {
  const url = uploadFile.url || uploadFile.response?.url || uploadFile.response?.data?.url
  if (url) {
    uploadedImages.value = uploadedImages.value.filter(u => u !== url)
  }
}

async function submitPublish() {
  if (!formRef.value) return
  const ok = await formRef.value.validate().then(() => true).catch(() => false)
  if (!ok) return

  publishing.value = true
  try {
    const payload = {
      ...publishForm,
      images: uploadedImages.value.length > 0 ? JSON.stringify(uploadedImages.value) : null
    }
    await request.post('/market/publish', payload)
    ElMessage.success('发布成功！已在邻里集市展示')
    showPublishModal.value = false
    // 重置表单
    uploadedImages.value = []
    publishFileList.value = []
    publishForm.title = ''
    publishForm.description = ''
    publishForm.price = 0
    await loadPosts()
    await loadMyPosts()
  } catch (err) {
  } finally {
    publishing.value = false
  }
}

function getFirstImage(imagesJson?: string) {
  if (!imagesJson) return DEFAULT_COVER
  try {
    const arr = JSON.parse(imagesJson)
    if (Array.isArray(arr) && arr.length > 0) {
      return arr[0]
    }
  } catch (e) {}
  return DEFAULT_COVER
}

function getPostTypeName(type: number) {
  switch (type) {
    case 1: return '二手闲置'
    case 2: return '邻里求助'
    case 3: return '物品借用'
    case 4: return '绿色拼车'
    case 5: return '技能交换'
    default: return '互助'
  }
}

function getTradeTypeText(tradeType: number) {
  switch (tradeType) {
    case 1: return '一口价'
    case 2: return '可面议'
    case 3: return '免费赠送'
    case 4: return '互助交换'
    default: return '协商'
  }
}
</script>

<style scoped>
.market-list-view {
  max-width: 1240px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}
.page-sub {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.filter-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 20px;
  margin-bottom: 24px;
}

.type-filter {
  margin-bottom: 16px;
}

.secondary-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
}

.status-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-tab-item {
  font: inherit;
  font-size: 13px;
  color: var(--cal-muted);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  padding: 5px 12px;
  min-height: 30px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

.status-tab-item:hover {
  color: var(--cal-ink);
}

.status-tab-item.active {
  color: var(--cal-ink);
  background: var(--cal-surface-card);
  border-color: var(--cal-hairline);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
@media (forced-colors: active) {
  .status-tab-item.active {
    border-color: Highlight;
  }
}

.market-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.empty-wrap {
  grid-column: 1 / -1;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px 0;
}

.market-card {
  background: var(--cal-canvas);
  border-radius: var(--radius-md);
  border: 1px solid var(--cal-hairline);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.market-card:hover {
  border-color: var(--cal-ink);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.card-cover {
  position: relative;
  width: 100%;
  height: 180px;
  background: #f8fafc;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.type-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  color: #ffffff;
}

.type-1 { background: #3b82f6; }
.type-2 { background: #ef4444; }
.type-3 { background: #f59e0b; }
.type-4 { background: #10b981; }
.type-5 { background: #8b5cf6; }

.status-overlay-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(15, 23, 42, 0.75);
  color: #ffffff;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
}

.card-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.price-symbol {
  font-size: 14px;
  font-weight: 700;
  color: #ef4444;
}

.price-val {
  font-size: 20px;
  font-weight: 800;
  color: #ef4444;
}

.trade-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-left: 4px;
}

.help-reward-tag {
  background: #fef2f2;
  color: #ef4444;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.reward-val {
  font-size: 15px;
  font-weight: 700;
  color: #ef4444;
  margin-left: 6px;
}

.reward-val.free {
  color: #10b981;
}

.free-trade-tag {
  background: #f0fdf4;
  color: #166534;
  font-size: 13px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.post-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 6px;
  line-height: 1.45;
  overflow-wrap: break-word;
}
.post-title-link {
  color: inherit;
  text-decoration: none;
}
.post-title-link:hover,
.post-title-link:focus-visible {
  color: var(--cal-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.post-desc {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}

.author-row {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.author-name {
  font-size: 12px;
  color: #475569;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.credit-badge {
  font-size: 10px;
}

.stat-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #94a3b8;
}

.stat-like-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  min-height: 24px;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
  user-select: none;
}
.stat-like-btn:hover {
  background: #fef2f2;
  color: #ef4444;
  transform: scale(1.05);
}
.stat-like-btn.is-liked {
  color: #ef4444;
  font-weight: 600;
}

/* 物品多图上传网格 */
.market-upload-container {
  width: 100%;
}

.market-photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.market-thumb-card {
  position: relative;
  width: 90px;
  height: 90px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-sizing: border-box;
  flex-shrink: 0;
}

.market-thumb-card .thumb-img {
  width: 100%;
  height: 100%;
  display: block;
}

.remove-photo-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  transition: all 0.15s ease;
  z-index: 2;
}
.remove-photo-btn:hover {
  background: #ef4444;
  transform: scale(1.08);
}

.market-add-card {
  width: 90px;
  height: 90px;
  border-radius: 8px;
  border: 1.5px dashed #cbd5e1;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: #64748b;
  box-sizing: border-box;
  flex-shrink: 0;
  transition: all 0.15s ease;
  padding: 6px;
  user-select: none;
}
.market-add-card:hover {
  border-color: #0f172a;
  color: #0f172a;
  background: #ffffff;
}

.market-add-card .add-text {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}

.market-add-card .add-sub {
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

.pagination-wrap {
  margin-top: 28px;
  display: flex;
  justify-content: center;
}

@media (max-width: 1100px) {
  .market-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 800px) {
  .market-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }
  .header-actions {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .my-posts-btn,
  .header-actions .el-button {
    width: 100%;
    margin-right: 0 !important;
  }
  .secondary-filter {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .status-tabs {
    gap: 6px;
  }
  .status-tab-item {
    font-size: 12.5px;
    padding: 5px 10px;
  }
  .search-box,
  .search-box .el-input {
    width: 100% !important;
  }
}

@media (max-width: 600px) {
  .market-grid {
    grid-template-columns: 1fr;
  }
}

.my-posts-btn {
  height: 38px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--radius-md);
  background-color: var(--cal-surface-soft);
  color: var(--cal-ink);
  border: 1px solid var(--cal-hairline);
  cursor: pointer;
  transition: all 0.15s ease;
  margin-right: 12px;
}
.my-posts-btn:hover {
  background-color: var(--cal-canvas);
  border-color: var(--cal-ink);
}

.my-posts-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 520px;
  overflow-y: auto;
  padding: 4px;
}

.my-post-manage-card {
  display: flex;
  gap: 16px;
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.my-post-manage-card:hover {
  border-color: var(--cal-ink);
  background: var(--cal-surface-soft);
}

.m-card-cover {
  width: 90px;
  height: 90px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f1f5f9;
}
.m-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.m-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.m-info-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.m-post-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--cal-ink);
  margin-bottom: 4px;
}

.m-post-desc {
  font-size: 12px;
  color: var(--cal-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}

.m-info-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.m-price {
  font-size: 16px;
  font-weight: 700;
  color: #ef4444;
}

.m-meta {
  font-size: 12px;
  color: var(--cal-muted-soft);
}
</style>
