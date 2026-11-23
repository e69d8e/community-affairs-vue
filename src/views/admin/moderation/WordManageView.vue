<template>
  <div class="word-manage-view">
    <div class="page-header">
      <div>
        <h1 class="page-title">敏感词库与内容合规管理</h1>
        <p class="page-sub">对居民发布的闲置、求助、邻里留言等内容进行实时合规检测与违规拦截</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="showAddModal = true">
          添加过滤敏感词
        </el-button>
      </div>
    </div>

    <!-- 检索与分类快筛工具栏 -->
    <div class="filter-card card-hover">
      <el-radio-group v-model="categoryFilter" size="default">
        <el-radio-button value="all">全部类别 ({{ words.length }})</el-radio-button>
        <el-radio-button value="违禁涉暴">🚫 违禁涉暴</el-radio-button>
        <el-radio-button value="欺诈引流">⚠️ 欺诈引流</el-radio-button>
        <el-radio-button value="低俗辱骂">🤬 低俗辱骂</el-radio-button>
        <el-radio-button value="垃圾广告">📢 垃圾广告</el-radio-button>
      </el-radio-group>

      <search class="search-wrap" aria-label="敏感词搜索">
        <label for="word-manage-search" class="visually-hidden">搜索敏感词</label>
        <el-input
          id="word-manage-search"
          v-model="searchKeyword"
          type="search"
          enterkeyhint="search"
          placeholder="搜索敏感词..."
          :prefix-icon="SearchIcon"
          clearable
          style="width: 240px"
          @keydown.enter="handleSearchEnter"
          @clear="loadWords"
        />
        <el-button type="primary" :icon="SearchIcon" @click="loadWords">查询</el-button>
      </search>
    </div>

    <!-- 词库表格 -->
    <div class="table-card card-hover">
      <div class="table-scroll-region" tabindex="0" role="region" aria-label="敏感词库列表">
      <el-table v-loading="loading" :data="filteredWords" style="width: 100%">
        <el-table-column prop="id" label="ID" width="100" />
        <el-table-column prop="word" label="敏感词汇" min-width="160">
          <template #default="{ row }">
            <span class="word-highlight">{{ row.word }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="风险类别" width="140">
          <template #default="{ row }">
            <el-tag :type="getCategoryTag(row.category)">
              {{ row.category }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="匹配机制" width="120">
          <template #default="{ row }">
            <span>{{ row.matchType === 1 ? '精确全词' : '模糊包含' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="录入时间" width="180" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" link size="small" @click="handleDeleteWord(row)">
              移除词条
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      </div>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="size"
          :total="total"
          layout="prev, pager, next, total"
          background
          @current-change="loadWords"
        />
      </div>
    </div>

    <!-- 添加弹窗 -->
    <el-dialog v-model="showAddModal" title="录入新敏感过滤词" width="460px">
      <div class="preset-word-bar">
        <span class="pw-label">⚡ 常见高危词一键填入：</span>
        <span
          v-for="item in presetWords"
          :key="item.word"
          class="pw-chip"
          @click="applyPresetWord(item)"
        >
          {{ item.word }} ({{ item.category }})
        </span>
      </div>

      <el-form label-width="90px">
        <el-form-item label="敏感词汇">
          <el-input v-model="newWord" placeholder="输入词汇 (如：枪支、诈骗、办证)" />
        </el-form-item>
        <el-form-item label="所属类别">
          <el-select v-model="newCategory" class="w-full">
            <el-option label="违禁品/涉暴" value="违禁涉暴" />
            <el-option label="虚假欺诈" value="欺诈引流" />
            <el-option label="不文明辱骂" value="低俗辱骂" />
            <el-option label="广告营销" value="垃圾广告" />
          </el-select>
        </el-form-item>
        <el-form-item label="匹配规则">
          <el-radio-group v-model="newMatchType">
            <el-radio :value="2">模糊包含匹配 (推荐)</el-radio>
            <el-radio :value="1">精确全词匹配</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddModal = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveWord">保存词条</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Search as SearchIcon } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { isImeComposing } from '@/utils/ime'

function handleSearchEnter(event: Event) {
  if (isImeComposing(event)) return
  loadWords()
}

const loading = ref(false)
const words = ref<any[]>([])
const page = ref(1)
const size = ref(10)
const total = ref(0)
const searchKeyword = ref('')
const categoryFilter = ref('all')

const filteredWords = computed(() => {
  if (categoryFilter.value === 'all') return words.value
  return words.value.filter(w => w.category === categoryFilter.value)
})

const showAddModal = ref(false)
const saving = ref(false)
const newWord = ref('')
const newCategory = ref('违禁涉暴')
const newMatchType = ref(2)

const presetWords = [
  { word: '刷单返利', category: '欺诈引流' },
  { word: '高息理财', category: '欺诈引流' },
  { word: '代开发票', category: '垃圾广告' },
  { word: '赌博棋牌', category: '违禁涉暴' },
  { word: '加微私聊优惠', category: '垃圾广告' }
]

function applyPresetWord(item: { word: string; category: string }) {
  newWord.value = item.word
  newCategory.value = item.category
}

onMounted(() => {
  loadWords()
})

async function loadWords() {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      size: size.value
    }
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()

    const res: any = await request.get('/moderation/admin/word/list', { params })
    words.value = res.records || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

async function handleSaveWord() {
  if (!newWord.value.trim()) {
    ElMessage.warning('请输入敏感词汇')
    return
  }
  saving.value = true
  try {
    await request.post('/moderation/admin/word/save', {
      word: newWord.value.trim(),
      category: newCategory.value,
      matchType: newMatchType.value
    })
    ElMessage.success('敏感词添加成功！')
    showAddModal.value = false
    newWord.value = ''
    await loadWords()
  } finally {
    saving.value = false
  }
}

async function handleDeleteWord(row: any) {
  try {
    await ElMessageBox.confirm(`确定要移除敏感词【${row.word}】吗？`, '删除确认', {
      type: 'warning'
    })
    await request.delete(`/moderation/admin/word/delete/${row.id}`)
    ElMessage.success('已从敏感词库中移除')
    await loadWords()
  } catch (e) {}
}

function getCategoryTag(cat: string) {
  switch (cat) {
    case '违禁涉暴': return 'danger'
    case '欺诈引流': return 'warning'
    case '低俗辱骂': return 'danger'
    default: return 'info'
  }
}
</script>

<style scoped>
.word-manage-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.filter-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 20px;
}

.word-highlight {
  font-weight: 700;
  color: #dc2626;
  background: #fef2f2;
  padding: 2px 8px;
  border-radius: 4px;
}

.pagination-wrap {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.preset-word-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
  padding: 10px 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
}

.pw-label {
  font-size: 12px;
  font-weight: 700;
  color: #b45309;
  width: 100%;
}

.pw-chip {
  font-size: 12px;
  padding: 4px 10px;
  background: #ffffff;
  border: 1px solid #fcd34d;
  border-radius: 999px;
  color: #92400e;
  cursor: pointer;
  transition: all 0.15s;
}

.pw-chip:hover {
  background: #fef3c7;
}
</style>
