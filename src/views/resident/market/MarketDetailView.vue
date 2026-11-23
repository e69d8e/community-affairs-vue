<template>
  <div v-loading="loading" class="market-detail-view">
    <div class="breadcrumb-bar">
      <el-button link :icon="ArrowLeft" class="cal-back-btn main-back-btn" @click="handleBack">
        {{ backButtonText }}
      </el-button>
      <el-button
        v-if="route.query.from"
        link
        class="cal-back-btn sub-back-btn"
        @click="$router.push('/market')"
      >
        浏览集市大厅
      </el-button>
    </div>

    <div v-if="post" class="detail-container">
      <div class="main-card cal-mockup-card">
        <div class="post-layout">
          <!-- 左侧相册 -->
          <div class="gallery-col">
            <div class="main-preview">
              <img :src="currentPreviewImage" :alt="post.title" class="preview-img" />
            </div>
            <div v-if="imageList.length > 1" class="thumbnail-row" role="group" aria-label="商品图片缩略图">
              <button
                v-for="(img, idx) in imageList"
                :key="idx"
                type="button"
                :class="['thumb-btn', { active: currentPreviewImage === img }]"
                :aria-label="`查看第 ${idx + 1} 张图片`"
                :aria-pressed="currentPreviewImage === img"
                @click="currentPreviewImage = img"
              >
                <img
                  :src="img"
                  :alt="`${post.title} 缩略图 ${idx + 1}`"
                  class="thumb-img"
                />
              </button>
            </div>
          </div>

          <!-- 右侧信息与交互 -->
          <div class="info-col">
            <div class="header-tags">
              <el-tag size="large" :class="`type-badge-${post.postType}`">
                {{ getPostTypeName(post.postType) }}
              </el-tag>
              <el-tag :type="getStatusTag(post.status)" size="large" effect="dark">
                {{ getStatusText(post.status) }}
              </el-tag>
            </div>

            <h1 class="post-title">{{ post.title }}</h1>

            <div class="price-banner">
              <template v-if="post.postType === 1">
                <span v-if="post.price > 0" class="price-symbol">¥</span>
                <span class="price-val">{{ post.price > 0 ? post.price : '免费赠送' }}</span>
                <span class="trade-type-label">({{ getTradeTypeText(post.tradeType) }})</span>
              </template>
              <template v-else-if="post.postType === 2">
                <span class="reward-title">互助报酬：</span>
                <span class="price-val">{{ post.price > 0 ? `¥ ${post.price}` : '邻里志愿互助' }}</span>
              </template>
              <template v-else>
                <span class="price-val">{{ getTradeTypeText(post.tradeType) }}</span>
              </template>
            </div>

            <!-- 发布者卡片 -->
            <div class="author-card">
              <el-avatar :size="48" :src="post.authorAvatar || DEFAULT_AVATAR" />
              <div class="author-details">
                <div class="author-title-row">
                  <span class="author-name">{{ post.authorName }}</span>
                  <el-tag size="small" type="success" effect="plain">
                    社区信用分 {{ post.authorCreditScore || 100 }}
                  </el-tag>
                </div>
                <div class="publish-time">发布于 {{ post.createTime }} · 浏览 {{ post.viewCount }} 次</div>
              </div>
            </div>

            <!-- 交易与联络信息 -->
            <div class="meta-list">
              <div class="meta-row">
                <span class="label">交付方式：</span>
                <span class="val">{{ getDeliveryText(post.deliveryType) }}</span>
              </div>
              <div v-if="post.tradeAddress" class="meta-row">
                <span class="label">约定地点：</span>
                <span class="val">{{ post.tradeAddress }}</span>
              </div>
              <div class="meta-row">
                <span class="label">联系方式：</span>
                <span class="val contact-val">
                  <template v-if="post.contactType">{{ post.contactType }}：</template>
                  {{ post.contactValue || '请在下方留言或点击「私信沟通」' }}
                </span>
              </div>
            </div>

            <!-- 操作按钮组 -->
            <div class="action-btn-group">
              <el-button
                v-if="!isAuthor"
                type="primary"
                round
                class="chat-contact-btn"
                :icon="ChatDotRound"
                @click="openChatModal"
              >
                私信沟通
              </el-button>

              <el-button
                :type="post.hasLiked ? 'danger' : 'default'"
                :icon="post.hasLiked ? StarFilled : Star"
                round
                @click="handleToggleLike"
              >
                {{ post.hasLiked ? '已点赞' : '点赞' }} ({{ post.likeCount }})
              </el-button>

              <el-button
                :type="post.hasFavorited ? 'warning' : 'default'"
                :icon="post.hasFavorited ? CollectionTag : CollectionTag"
                round
                @click="handleToggleFavorite"
              >
                {{ post.hasFavorited ? '已收藏' : '收藏' }}
              </el-button>

              <el-button type="info" plain round :icon="Warning" @click="openReportDialog">
                举报违规
              </el-button>

              <el-button round :icon="Share" title="分享商品链接给邻里" @click="handleShareLink">
                分享
              </el-button>

              <!-- 作者本人状态快捷管理 (直观一键按钮取代隐藏下拉) -->
              <template v-if="isAuthorOrAdmin">
                <el-button
                  v-if="post.status !== 3"
                  type="success"
                  round
                  @click="handleStatusChange(3)"
                >
                  ✓ 标为已达成结题
                </el-button>
                <el-button
                  v-if="post.status === 1"
                  type="warning"
                  plain
                  round
                  @click="handleStatusChange(2)"
                >
                  置为流转沟通中
                </el-button>
                <el-button
                  v-if="post.status !== 1"
                  type="primary"
                  plain
                  round
                  @click="handleStatusChange(1)"
                >
                  重新上架展示
                </el-button>
              </template>
            </div>
          </div>
        </div>

        <el-divider />

        <!-- 详细内容正文 -->
        <div class="description-section">
          <h2 class="section-title">详细说明</h2>
          <p class="desc-text">{{ post.description }}</p>
        </div>

        <el-divider />

        <!-- 邻里留言与评论互动区 -->
        <div class="comment-section">
          <h2 class="section-title">邻里留言 ({{ post.comments?.length || 0 }})</h2>

          <div class="comment-input-box">
            <!-- 快捷礼貌问询短语条 -->
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 10px">
              <span style="font-size: 12px; color: #475569">⚡ 快捷问询：</span>
              <el-button
                v-for="phrase in quickCommentPhrases"
                :key="phrase"
                size="small"
                round
                style="min-height: 28px; font-size: 12px; padding: 2px 10px"
                @click="newComment = phrase"
              >
                {{ phrase }}
              </el-button>
            </div>

            <el-input
              v-model="newComment"
              type="textarea"
              :rows="3"
              placeholder="善意提问、礼貌沟通，请自觉遵守社区公约并维护良好邻里氛围..."
              maxlength="200"
              show-word-limit
            />
            <div class="comment-btn-row">
              <el-button type="primary" :loading="submittingComment" @click="handleSendComment">
                发送留言
              </el-button>
            </div>
          </div>

          <div class="comments-list">
            <div v-if="!post.comments || post.comments.length === 0" class="empty-comment">
              暂无留言，快来留下你的问询或友好建议吧~
            </div>

            <div v-for="c in post.comments" :key="c.id" class="comment-item">
              <el-avatar :size="36" :src="c.userAvatar || DEFAULT_AVATAR" />
              <div class="comment-content">
                <div class="comment-header">
                  <span class="comment-author">{{ c.userName }}</span>
                  <span class="comment-time">{{ c.createTime }}</span>
                </div>
                <div class="comment-text">{{ c.content }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 举报对话框 -->
    <el-dialog v-model="showReportModal" title="向社区网格中心举报不良信息" width="500px">
      <el-form label-width="90px">
        <el-form-item label="举报原因">
          <el-select v-model="reportReason" placeholder="请选择违规类型" class="w-full">
            <el-option label="虚假欺诈 / 涉及违禁品" value="虚假欺诈 / 涉及违禁品" />
            <el-option label="不良言论 / 辱骂攻击" value="不良言论 / 辱骂攻击" />
            <el-option label="广告骚扰 / 垃圾引流" value="广告骚扰 / 垃圾引流" />
            <el-option label="其他违反邻里公约行为" value="其他违反邻里公约行为" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细说明">
          <el-input v-model="reportRemark" type="textarea" :rows="3" placeholder="请详细陈述事实依据" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReportModal = false">取消</el-button>
        <el-button type="danger" :loading="submittingReport" @click="handleSubmitReport">提交举报</el-button>
      </template>
    </el-dialog>

    <!-- 邻里闲置与互助私信沟通弹窗 -->
    <MarketChatModal v-model="showChatModal" :post="post" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Star,
  StarFilled,
  CollectionTag,
  Warning,
  ChatDotRound,
  Share
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { DEFAULT_AVATAR, DEFAULT_COVER } from '@/constants/defaults'
import { useUserStore } from '@/stores/user'
import MarketChatModal from '@/components/market/MarketChatModal.vue'
import type { MarketPost } from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const quickCommentPhrases = [
  '邻居您好，请问这个物品还在吗？',
  '请问今天傍晚方便在楼下大堂自提吗？',
  '已给您发送站内私信，请查收~',
  '好物帮顶！祝邻居早日流转成功'
]

const backButtonText = computed(() => {
  if (route.query.from === 'records' || route.query.from === 'profile') {
    return '返回个人中心'
  }
  return '返回集市列表'
})

function handleBack() {
  if (route.query.from === 'records' || route.query.from === 'profile') {
    router.push('/user/profile?tab=market')
  } else if (window.history.length > 1 && window.history.state?.back) {
    router.back()
  } else {
    router.push('/market')
  }
}

const loading = ref(false)
const post = ref<MarketPost | null>(null)
const currentPreviewImage = ref('')
const newComment = ref('')
const submittingComment = ref(false)

const showReportModal = ref(false)
const reportReason = ref('')
const reportRemark = ref('')
const submittingReport = ref(false)

const showChatModal = ref(false)

const imageList = computed(() => {
  if (!post.value?.images) return [DEFAULT_COVER]
  try {
    const arr = JSON.parse(post.value.images)
    if (Array.isArray(arr) && arr.length > 0) return arr
  } catch (e) {}
  return [DEFAULT_COVER]
})

const isAuthor = computed(() => {
  if (!userStore.user || !post.value) return false
  return String(userStore.user.id) === String(post.value.userId)
})

const isAuthorOrAdmin = computed(() => {
  if (!userStore.user || !post.value) return false
  return String(userStore.user.id) === String(post.value.userId) || userStore.canAccessAdmin
})

function openChatModal() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再发起私信沟通')
    router.push('/login')
    return
  }
  showChatModal.value = true
}

onMounted(() => {
  loadDetail()
})

async function loadDetail() {
  const id = route.params.id
  if (!id) return
  loading.value = true
  try {
    const res: any = await request.get(`/market/detail/${id}`)
    post.value = res
    if (imageList.value.length > 0) {
      currentPreviewImage.value = imageList.value[0]
    }
  } catch (err) {
    ElMessage.error('获取信息详情失败')
  } finally {
    loading.value = false
  }
}

async function handleToggleLike() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再点赞')
    router.push('/login')
    return
  }
  if (!post.value) return
  try {
    const res: any = await request.post(`/market/like/${post.value.id}`)
    post.value.hasLiked = res
    post.value.likeCount = Math.max(0, (post.value.likeCount || 0) + (res ? 1 : -1))
    ElMessage.success(res ? '点赞成功' : '已取消点赞')
  } catch (err) {}
}

async function handleToggleFavorite() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再收藏')
    router.push('/login')
    return
  }
  if (!post.value) return
  try {
    const res: any = await request.post(`/market/favorite/${post.value.id}`)
    post.value.hasFavorited = res
    ElMessage.success(res ? '收藏成功' : '已取消收藏')
  } catch (err) {}
}

async function handleStatusChange(newStatus: number) {
  if (!post.value) return
  try {
    await request.put('/market/status', {
      postId: post.value.id,
      status: newStatus
    })
    ElMessage.success('状态流转已更新')
    await loadDetail()
  } catch (err) {}
}

function handleShareLink() {
  const url = window.location.href
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      ElMessage.success('已复制商品链接，可粘贴分享给邻里或业主群！')
    }).catch(() => {
      ElMessage.success(`分享链接：${url}`)
    })
  } else {
    ElMessage.success(`分享链接：${url}`)
  }
}

async function handleSendComment() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请登录后再参与评论')
    router.push('/login')
    return
  }
  if (!newComment.value.trim()) {
    ElMessage.warning('请输入评论留言内容')
    return
  }
  submittingComment.value = true
  try {
    await request.post('/market/comment', {
      postId: post.value?.id,
      content: newComment.value.trim()
    })
    ElMessage.success('留言发表成功')
    newComment.value = ''
    await loadDetail()
  } catch (err) {
  } finally {
    submittingComment.value = false
  }
}

function openReportDialog() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再发起举报')
    router.push('/login')
    return
  }
  reportReason.value = ''
  reportRemark.value = ''
  showReportModal.value = true
}

async function handleSubmitReport() {
  if (!reportReason.value) {
    ElMessage.warning('请选择举报原因')
    return
  }
  submittingReport.value = true
  try {
    await request.post('/moderation/report/submit', {
      targetType: 'MARKET_POST',
      targetId: post.value?.id,
      reasonCategory: reportReason.value,
      reason: reportReason.value,
      description: reportRemark.value
    })
    ElMessage.success('举报已递交网格中心审核')
    showReportModal.value = false
  } catch (err) {
  } finally {
    submittingReport.value = false
  }
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

function getDeliveryText(deliveryType: number) {
  switch (deliveryType) {
    case 1: return '居民自提 (楼下或约定点)'
    case 2: return '上门送达'
    case 3: return '指定地点交付'
    default: return '双方协商'
  }
}

function getStatusText(status: number) {
  switch (status) {
    case 1: return '正常展示中'
    case 2: return '流转沟通中'
    case 3: return '已达成结题'
    case 4: return '违规封禁'
    default: return '已下架'
  }
}

function getStatusTag(status: number) {
  switch (status) {
    case 1: return 'success'
    case 2: return 'warning'
    case 3: return 'info'
    case 4: return 'danger'
    default: return 'info'
  }
}
</script>

<style scoped>
.market-detail-view {
  max-width: 1100px;
  margin: 0 auto;
}

.breadcrumb-bar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.sub-back-btn {
  color: var(--cal-muted);
  font-size: 13px;
}

.sub-back-btn:hover {
  color: var(--cal-ink);
}

.main-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 32px;
}

.post-layout {
  display: grid;
  grid-template-columns: 460px 1fr;
  gap: 36px;
}

.gallery-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.main-preview {
  width: 100%;
  height: 380px;
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
}

.thumb-btn {
  padding: 0;
  background: transparent;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s ease, transform 0.15s ease;
}

.thumb-btn.active {
  border-color: #2563eb;
}

.thumb-img {
  display: block;
  width: 72px;
  height: 72px;
  object-fit: cover;
}

.info-col {
  display: flex;
  flex-direction: column;
}

.header-tags {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.type-badge-1 { background: #3b82f6; color: #fff; }
.type-badge-2 { background: #ef4444; color: #fff; }
.type-badge-3 { background: #f59e0b; color: #fff; }
.type-badge-4 { background: #10b981; color: #fff; }
.type-badge-5 { background: #8b5cf6; color: #fff; }

.post-title {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.4;
  margin-bottom: 16px;
}

.price-banner {
  background: #fef2f2;
  border-radius: 10px;
  padding: 14px 20px;
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 20px;
}

.price-symbol {
  font-size: 18px;
  font-weight: 700;
  color: #dc2626;
}

.price-val {
  font-size: 30px;
  font-weight: 800;
  color: #dc2626;
}

.trade-type-label, .reward-title {
  font-size: 14px;
  color: #64748b;
  margin-left: 6px;
}

.author-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.author-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.author-name {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.publish-time {
  font-size: 12px;
  color: #94a3b8;
}

.meta-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  margin-bottom: 24px;
}

.meta-row .label {
  color: #64748b;
}

.meta-row .val {
  color: #1e293b;
  font-weight: 500;
}

.contact-val {
  color: #2563eb !important;
  font-weight: 600 !important;
}

.action-btn-group {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.action-btn-group :deep(.el-button + .el-button) {
  margin-left: 0;
}

.description-section {
  padding: 10px 0;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
}

.desc-text {
  font-size: 15px;
  color: #334155;
  line-height: 1.8;
  white-space: pre-wrap;
}

.comment-section {
  padding: 10px 0;
}

.comment-input-box {
  margin-bottom: 24px;
}

.comment-btn-row {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-comment {
  font-size: 14px;
  color: #94a3b8;
  text-align: center;
  padding: 24px 0;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.comment-author {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.comment-time {
  font-size: 11px;
  color: #94a3b8;
}

.comment-text {
  font-size: 14px;
  color: #334155;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .post-layout {
    grid-template-columns: 1fr;
  }
}
</style>
