<template>
  <div class="user-profile-layout">
    <!-- ==================== 左侧：个人身份名片 + 分组垂直导航 ==================== -->
    <aside class="profile-sidebar">
      <!-- 个人身份紧凑名片 -->
      <div class="identity-card cal-mockup-card">
        <div class="identity-top">
          <div class="avatar-edit-box" title="点击更换头像" @click="showAvatarCropper = true">
            <el-avatar :size="68" :src="userStore.user?.avatar || defaultAvatar" />
            <div class="avatar-mask">
              <el-icon><Camera /></el-icon>
              <span>换头像</span>
            </div>
          </div>

          <div class="identity-meta">
            <div class="name-line">
              <h2 class="real-name">{{ userStore.user?.realName || userStore.user?.username }}</h2>
              <span class="cal-badge cal-badge-emerald role-pill">
                {{ getRoleName(userStore.user?.role) }}
              </span>
              <button
                type="button"
                class="identity-logout-pill"
                title="安全退出登录"
                @click="handleLogout"
              >
                <el-icon><SwitchButton /></el-icon>
                <span>退出</span>
              </button>
            </div>
            <p class="username-text">@{{ userStore.user?.username }} · {{ userStore.user?.phone || '未绑手机' }}</p>
            <p class="reg-time-text">注册于 {{ formatRegDate(userStore.user?.createTime) }}</p>
          </div>
        </div>

        <!-- 信用积分荣誉条 -->
        <div class="credit-honor-strip">
          <div class="honor-left">
            <el-icon class="medal-icon"><Medal /></el-icon>
            <div>
              <div class="honor-title">AAA 级守信居民</div>
              <div class="honor-sub">享社区便民绿色通道</div>
            </div>
          </div>
          <div class="honor-score">
            <strong>{{ userStore.user?.creditScore || 100 }}</strong>
            <span>分</span>
          </div>
        </div>

        <!-- 名片快捷按钮 (退出登录统一走右上角胶囊, 避免同名片重复入口) -->
        <div class="identity-quick-btns">
          <el-button size="small" class="flex-1" :icon="EditPen" @click="switchTab('overview')">
            编辑资料
          </el-button>
          <el-button size="small" class="flex-1" :icon="Lock" @click="switchTab('security')">
            修改密码
          </el-button>
        </div>
      </div>

      <!-- 分组垂直导航菜单 -->
      <nav class="sidebar-nav cal-mockup-card">
        <div class="nav-group">
          <div class="nav-group-label">账户与房产</div>
          <button
            type="button"
            :class="['sidebar-nav-item', { active: activeTab === 'overview' }]"
            @click="switchTab('overview')"
          >
            <el-icon><User /></el-icon>
            <span class="nav-text">个人概览与资料</span>
          </button>
          <button
            type="button"
            :class="['sidebar-nav-item', { active: activeTab === 'houses' }]"
            @click="switchTab('houses')"
          >
            <el-icon><OfficeBuilding /></el-icon>
            <span class="nav-text">我的房产与认证</span>
            <span v-if="myHouses.length > 0" class="nav-badge">{{ myHouses.length }}</span>
          </button>
          <button
            type="button"
            :class="['sidebar-nav-item', { active: activeTab === 'security' }]"
            @click="switchTab('security')"
          >
            <el-icon><Lock /></el-icon>
            <span class="nav-text">账号与密码安全</span>
          </button>
        </div>

        <div class="nav-group">
          <div class="nav-group-label">我的社区事务 (页内直操)</div>
          <button
            type="button"
            :class="['sidebar-nav-item', { active: activeTab === 'orders' }]"
            @click="switchTab('orders')"
          >
            <el-icon><Tools /></el-icon>
            <span class="nav-text">报修与诉求工单</span>
            <span v-if="pendingEvalOrdersCount > 0" class="nav-badge badge-amber">
              {{ pendingEvalOrdersCount }} 待评
            </span>
            <span v-else-if="myOrdersTotal > 0" class="nav-badge">{{ myOrdersTotal }}</span>
          </button>
          <button
            type="button"
            :class="['sidebar-nav-item', { active: activeTab === 'tickets' }]"
            @click="switchTab('tickets')"
          >
            <el-icon><Ticket /></el-icon>
            <span class="nav-text">活动入场凭证</span>
            <span v-if="pendingTickets.length > 0" class="nav-badge badge-emerald">
              {{ pendingTickets.length }} 待验
            </span>
            <span v-else-if="mySignupsCount > 0" class="nav-badge">{{ mySignupsCount }}</span>
          </button>
          <button
            type="button"
            :class="['sidebar-nav-item', { active: activeTab === 'market' }]"
            @click="switchTab('market')"
          >
            <el-icon><Goods /></el-icon>
            <span class="nav-text">我发布的闲置</span>
            <span v-if="myPostsTotal > 0" class="nav-badge">{{ myPostsTotal }}</span>
          </button>
        </div>

        <div class="nav-group">
          <div class="nav-group-label">消息与邻里沟通</div>
          <button
            type="button"
            :class="['sidebar-nav-item', { active: activeTab === 'chat' }]"
            @click="switchTab('chat')"
          >
            <el-icon><ChatDotRound /></el-icon>
            <span class="nav-text">邻里私信沟通</span>
            <span v-if="unreadChatCount > 0" class="nav-badge badge-danger">{{ unreadChatCount }}</span>
          </button>
          <button
            type="button"
            :class="['sidebar-nav-item', { active: activeTab === 'notices' }]"
            @click="switchTab('notices')"
          >
            <el-icon><Bell /></el-icon>
            <span class="nav-text">消息通知信箱</span>
            <span v-if="noticeStore.unreadCount > 0" class="nav-badge badge-danger">{{ noticeStore.unreadCount }}</span>
          </button>
        </div>
      </nav>
    </aside>

    <!-- ==================== 右侧：一站式主工作区 ==================== -->
    <section class="profile-workspace cal-mockup-card">
      <!-- 1. 默认工作台：个人概览与资料 (Overview) -->
      <div v-if="activeTab === 'overview'" class="overview-workbench">
        <!-- A. 个人基本资料行内速改卡片 -->
        <div class="workbench-section profile-quick-edit-card">
          <div class="section-header">
            <div>
              <h3 class="section-title">个人基本资料</h3>
              <p class="section-sub">直接修改您的实名信息与联络手机号，工单回访与活动通知将自动同步</p>
            </div>
            <div class="header-right-actions">
              <el-button size="small" :icon="Camera" @click="showAvatarCropper = true">更换头像</el-button>
              <el-button size="small" :icon="Lock" @click="switchTab('security')">修改密码</el-button>
            </div>
          </div>

          <el-form class="inline-profile-form" label-position="top">
            <div class="profile-form-grid">
              <el-form-item label="真实姓名">
                <el-input v-model="editForm.realName" placeholder="请填写真实姓名" />
              </el-form-item>
              <el-form-item label="联系手机号码">
                <el-input v-model="editForm.phone" placeholder="用于接收物业工单与活动通知" />
              </el-form-item>
              <el-form-item label="登录账号 (不可改)">
                <el-input :model-value="userStore.user?.username" disabled />
              </el-form-item>
              <div class="inline-save-col">
                <el-button
                  type="primary"
                  :loading="savingProfile"
                  class="cal-primary-btn save-inline-btn"
                  @click="saveProfile"
                >
                  保存基本资料
                </el-button>
              </div>
            </div>
          </el-form>
        </div>

        <!-- B. 个人事务全景指标磁贴 (点击直接在工作区切换) -->
        <div class="metrics-tiles-grid">
          <div class="metric-tile" @click="switchTab('orders')">
            <div class="tile-icon icon-blue"><el-icon><Tools /></el-icon></div>
            <div class="tile-body">
              <div class="tile-num">
                <strong>{{ myOrdersTotal }}</strong>
                <span>笔</span>
              </div>
              <div class="tile-label">报修诉求工单</div>
            </div>
            <span class="tile-action">管理 →</span>
          </div>

          <div class="metric-tile" @click="switchTab('tickets')">
            <div class="tile-icon icon-amber"><el-icon><Ticket /></el-icon></div>
            <div class="tile-body">
              <div class="tile-num">
                <strong>{{ mySignupsCount }}</strong>
                <span>张</span>
              </div>
              <div class="tile-label">活动入场凭证</div>
            </div>
            <span class="tile-action">亮码 →</span>
          </div>

          <div class="metric-tile" @click="switchTab('market')">
            <div class="tile-icon icon-emerald"><el-icon><Goods /></el-icon></div>
            <div class="tile-body">
              <div class="tile-num">
                <strong>{{ myPostsTotal }}</strong>
                <span>件</span>
              </div>
              <div class="tile-label">我发布的闲置</div>
            </div>
            <span class="tile-action">管理 →</span>
          </div>

          <div class="metric-tile" @click="switchTab(unreadChatCount > 0 ? 'chat' : 'notices')">
            <div class="tile-icon icon-violet"><el-icon><Bell /></el-icon></div>
            <div class="tile-body">
              <div class="tile-num">
                <strong>{{ noticeStore.unreadCount + unreadChatCount }}</strong>
                <span>条</span>
              </div>
              <div class="tile-label">未读通知与私信</div>
            </div>
            <span class="tile-action">查看 →</span>
          </div>
        </div>

        <!-- C. 待办与快捷操作提醒 (当场亮码 / 当场评星) -->
        <div v-if="pendingTickets.length > 0 || recentOrders.length > 0" class="workbench-section todo-strip-section">
          <div class="section-header">
            <div>
              <h3 class="section-title">待办事务与近期动态</h3>
              <p class="section-sub">高频操作无需跳转，在此即可一键出示核销码或跟踪工单进度</p>
            </div>
          </div>

          <div class="todo-cards-grid">
            <!-- 待核销活动券快捷卡 -->
            <div v-if="pendingTickets.length > 0" class="todo-action-card ticket-todo">
              <div class="todo-badge-row">
                <span class="cal-badge cal-badge-orange">● 待核销入场券 ({{ pendingTickets.length }})</span>
                <el-button link type="primary" size="small" @click="switchTab('tickets')">全部凭证 →</el-button>
              </div>
              <h4 class="todo-title">{{ pendingTickets[0].title || pendingTickets[0].activityTitle }}</h4>
              <p class="todo-meta">⏰ {{ pendingTickets[0].startTime }} · 📍 {{ pendingTickets[0].location }}</p>
              <div class="todo-footer">
                <span class="code-pill">核销码：<strong>{{ pendingTickets[0].myVerifyCode || pendingTickets[0].verifyCode }}</strong></span>
                <el-button type="primary" size="small" round class="cal-primary-btn" @click="openQuickTicketZoom(pendingTickets[0])">
                  🔍 立即亮码签到
                </el-button>
              </div>
            </div>

            <!-- 最近一笔工单快捷卡 -->
            <div v-if="recentOrders.length > 0" class="todo-action-card order-todo">
              <div class="todo-badge-row">
                <span class="cal-badge" :class="recentOrders[0].status === 5 ? 'cal-badge-emerald' : 'cal-badge-violet'">
                  {{ getOrderStatusName(recentOrders[0].status) }}
                </span>
                <el-button link type="primary" size="small" @click="switchTab('orders')">全部工单 →</el-button>
              </div>
              <h4 class="todo-title">#{{ recentOrders[0].orderNo }} {{ recentOrders[0].title }}</h4>
              <p class="todo-meta">📍 {{ recentOrders[0].houseAddress || '公共区域' }} · {{ recentOrders[0].createTime }}</p>
              <div class="todo-footer">
                <el-button
                  v-if="recentOrders[0].status === 5"
                  type="success"
                  size="small"
                  round
                  @click="switchTabAndRate(recentOrders[0])"
                >
                  ★ 立即评价验收
                </el-button>
                <el-button
                  v-else
                  size="small"
                  round
                  @click="switchTab('orders')"
                >
                  查看处置进度
                </el-button>
                <el-button
                  size="small"
                  round
                  plain
                  @click="$router.push('/orders/submit?type=1&from=profile')"
                >
                  + 新建报修
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- D. 名下房产与一键报修速览 -->
        <div class="workbench-section">
          <div class="section-header">
            <div>
              <h3 class="section-title">名下绑定房产与住址 ({{ myHouses.length }})</h3>
              <p class="section-sub">已认证房产支持一键带入地址发起物业报修</p>
            </div>
            <el-button type="primary" size="small" :icon="Plus" class="cal-primary-btn" @click="openBindHouseModal">
              申请绑定新房产
            </el-button>
          </div>

          <div v-loading="loadingHouses" class="houses-grid">
            <div v-if="myHouses.length === 0 && !loadingHouses" class="empty-block">
              <el-empty description="您尚未绑定任何社区房屋，绑定后可享一键报修与楼栋通知" :image-size="64">
                <el-button type="primary" size="small" class="cal-primary-btn" @click="openBindHouseModal">
                  立即认领绑定房屋
                </el-button>
              </el-empty>
            </div>

            <div v-for="h in myHouses" :key="h.houseId" class="house-card">
              <div class="house-header">
                <h4>{{ h.communityName }} {{ h.buildingName }} {{ h.unitName }}</h4>
                <el-tag :type="h.certStatus === 1 ? 'success' : (h.certStatus === 0 ? 'warning' : 'danger')" size="small">
                  {{ h.certStatus === 1 ? '已认证' : (h.certStatus === 0 ? '待审核' : '已驳回') }}
                </el-tag>
              </div>
              <div class="house-no-big">{{ h.houseNo?.endsWith('室') ? h.houseNo : h.houseNo + ' 室' }}</div>
              <div class="house-footer">
                <span class="identity-type">
                  身份：<strong>{{ getIdentityText(h.identityType) }}</strong>
                </span>
                <el-button
                  v-if="h.certStatus === 1"
                  type="primary"
                  link
                  size="small"
                  :icon="Tools"
                  @click="$router.push(`/orders/submit?type=1&houseId=${h.houseId}&from=profile`)"
                >
                  一键报修此房 →
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- E. 底部账号安全退出栏 -->
        <div class="account-logout-bar">
          <div class="logout-bar-info">
            <span class="logout-bar-title">当前登录账号：{{ userStore.user?.username }}</span>
            <span class="logout-bar-sub">如需切换其他居民或工作人员账号，可安全退出</span>
          </div>
          <el-button type="danger" plain :icon="SwitchButton" class="logout-bar-btn" @click="handleLogout">
            安全退出登录
          </el-button>
        </div>
      </div>

      <!-- 2. 专项视图：我的房产与认证 (Houses) -->
      <div v-else-if="activeTab === 'houses'" class="houses-panel">
        <div class="panel-header-bar">
          <div>
            <h3 class="panel-title">我的名下房屋与住址认证</h3>
            <p class="panel-sub">完成房屋实名认证后，可获得楼栋专属通知、一键带入地址报修及业主投票权益</p>
          </div>
          <el-button type="primary" :icon="Plus" class="cal-primary-btn" @click="openBindHouseModal">
            申请绑定新房产
          </el-button>
        </div>

        <div v-loading="loadingHouses" class="houses-grid">
          <div v-if="myHouses.length === 0 && !loadingHouses" class="empty-block">
            <el-empty description="您当前尚未绑定任何房屋，请点击右上角申请认证">
              <el-button type="primary" class="cal-primary-btn" @click="openBindHouseModal">立即认领绑定房屋</el-button>
            </el-empty>
          </div>

          <div v-for="h in myHouses" :key="h.houseId" class="house-card">
            <div class="house-header">
              <h4>{{ h.communityName }} {{ h.buildingName }} {{ h.unitName }}</h4>
              <el-tag :type="h.certStatus === 1 ? 'success' : (h.certStatus === 0 ? 'warning' : 'danger')" effect="light">
                {{ h.certStatus === 1 ? '已认证有效' : (h.certStatus === 0 ? '待网格员审核' : '认证驳回') }}
              </el-tag>
            </div>
            <div class="house-no-big">{{ h.houseNo?.endsWith('室') ? h.houseNo : h.houseNo + ' 室' }}</div>
            <div class="house-footer">
              <span class="identity-type">
                居住身份：<strong>{{ getIdentityText(h.identityType) }}</strong>
              </span>
              <div class="house-actions">
                <span v-if="h.certStatus === 1" class="verified-sign">
                  <el-icon><CircleCheckFilled /></el-icon> 官方核验
                </span>
                <el-button
                  v-if="h.certStatus === 1"
                  size="small"
                  round
                  :icon="Tools"
                  @click="$router.push(`/orders/submit?type=1&houseId=${h.houseId}&from=profile`)"
                >
                  报修此房
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 专项视图：账号与密码安全 (Security & Profile) -->
      <div v-else-if="activeTab === 'security'" class="security-panel">
        <div class="panel-header-bar">
          <div>
            <h3 class="panel-title">个人资料与账号密码安全</h3>
            <p class="panel-sub">维护您的实名联络方式，定期更新登录密码以保障账号资产安全</p>
          </div>
        </div>

        <div class="settings-grid">
          <div class="settings-card">
            <div class="card-title-bar">
              <h4>居民基本信息</h4>
              <span class="sub-hint">更新您的实名身份与日常联络信息</span>
            </div>
            <el-form label-position="top">
              <el-form-item label="真实姓名">
                <el-input v-model="editForm.realName" placeholder="请填写真实姓名" size="large" />
              </el-form-item>
              <el-form-item label="联系手机号码">
                <el-input v-model="editForm.phone" placeholder="用于工单回访与活动短信联络" size="large" />
              </el-form-item>
              <el-button type="primary" :loading="savingProfile" class="cal-primary-btn" @click="saveProfile">
                保存资料修改
              </el-button>
            </el-form>
          </div>

          <div class="settings-card">
            <div class="card-title-bar">
              <h4>修改登录密码</h4>
              <span class="sub-hint">修改成功后需使用新密码重新登录</span>
            </div>
            <el-form label-position="top">
              <el-form-item label="当前旧密码">
                <el-input
                  v-model="passwordForm.oldPassword"
                  type="password"
                  show-password
                  placeholder="请输入当前旧密码"
                  size="large"
                />
              </el-form-item>
              <el-form-item label="设置新登录密码">
                <el-input
                  v-model="passwordForm.newPassword"
                  type="password"
                  show-password
                  placeholder="请输入至少 6 位新密码"
                  size="large"
                />
              </el-form-item>
              <el-button type="primary" :loading="savingPassword" class="cal-primary-btn" @click="savePassword">
                确认修改密码
              </el-button>
            </el-form>
          </div>
        </div>

        <div class="account-logout-bar" style="margin-top: 20px">
          <div class="logout-bar-info">
            <span class="logout-bar-title">退出当前账号登录</span>
            <span class="logout-bar-sub">退出后将清除本机登录凭证并返回登录页</span>
          </div>
          <el-button type="danger" plain :icon="SwitchButton" class="logout-bar-btn" @click="handleLogout">
            安全退出登录
          </el-button>
        </div>
      </div>

      <!-- 4. 专项视图：报修与诉求工单 (Orders) -->
      <ProfileOrdersPanel
        v-else-if="activeTab === 'orders'"
        ref="ordersPanelRef"
        @changed="loadOverviewData"
      />

      <!-- 5. 专项视图：我的活动入场凭证 (Tickets) -->
      <ProfileTicketsPanel
        v-else-if="activeTab === 'tickets'"
        ref="ticketsPanelRef"
        @changed="loadOverviewData"
      />

      <!-- 6. 专项视图：我发布的闲置与互助 (Market) -->
      <ProfileMarketPanel
        v-else-if="activeTab === 'market'"
        @changed="loadOverviewData"
      />

      <!-- 7. 专项视图：邻里私信沟通 (Chat) -->
      <ProfileChatPanel
        v-else-if="activeTab === 'chat'"
        ref="chatPanelRef"
        @unread-change="fetchUnreadChatCount"
      />

      <!-- 8. 专项视图：系统消息通知信箱 (Notices) -->
      <div v-else-if="activeTab === 'notices'" class="notices-panel">
        <div class="panel-header-bar">
          <div>
            <h3 class="panel-title">居民消息通知信箱</h3>
            <p class="panel-sub">汇集工单处置进度、活动核销结果、房产审核及社区突发通知</p>
          </div>
          <div class="notice-actions-group">
            <el-radio-group v-model="noticeFilter" size="small">
              <el-radio-button value="all">全部消息</el-radio-button>
              <el-radio-button value="unread">仅看未读</el-radio-button>
            </el-radio-group>
            <el-button type="success" plain size="small" @click="handleReadAllNotices">
              全部标为已读
            </el-button>
          </div>
        </div>

        <div v-loading="loadingNotices" class="notices-list">
          <div v-if="filteredNotices.length === 0 && !loadingNotices" class="empty-block">
            <el-empty description="暂无通知消息记录" :image-size="68" />
          </div>

          <div
            v-for="n in filteredNotices"
            :key="n.id"
            :class="['notice-item', { unread: n.isRead === 0 }]"
            @click="handleReadSingleNotice(n)"
          >
            <div class="notice-main">
              <div class="notice-title-row">
                <span v-if="n.isRead === 0" class="unread-dot" />
                <span class="notice-title">{{ n.title }}</span>
                <span class="cal-badge" :class="getNoticeBadgeClass(n.noticeType)">
                  {{ getNoticeBadgeText(n.noticeType) }}
                </span>
              </div>
              <div class="notice-summary">{{ n.summary }}</div>
            </div>
            <div class="notice-right">
              <div class="notice-time">{{ n.createTime }}</div>
              <div class="notice-action-hint">
                <span>{{ getNoticeActionHint(n) }}</span>
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== 弹窗组件区 ==================== -->
    <!-- 1. 申请房屋认证弹窗 (已清理重复上传框，统一为清晰单入口) -->
    <el-dialog v-model="showBindModal" title="居民房产与住址认证申请" width="520px" append-to-body destroy-on-close>
      <el-form label-width="105px">
        <el-form-item label="所属楼栋">
          <el-select v-model="selectedBuilding" placeholder="请选择楼栋" class="w-full" @change="onBuildingChange">
            <el-option v-for="b in buildings" :key="b.id" :label="b.buildingName" :value="b.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="单元门号">
          <el-select v-model="selectedUnit" placeholder="请选择单元" class="w-full" :disabled="!selectedBuilding" @change="onUnitChange">
            <el-option v-for="u in units" :key="u.id" :label="u.unitName" :value="u.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="具体房号">
          <el-select v-model="selectedHouse" placeholder="请选择房号" class="w-full" :disabled="!selectedUnit">
            <el-option v-for="h in houses" :key="h.id" :label="`${h.houseNo} 室 (${h.area}㎡)`" :value="h.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="居住身份">
          <el-radio-group v-model="identityType">
            <el-radio :value="1">产权业主</el-radio>
            <el-radio :value="2">业主家属</el-radio>
            <el-radio :value="3">承租租客</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="佐证材料">
          <div class="unified-cert-upload">
            <div v-if="certMaterialUrl" class="cert-uploaded-preview">
              <el-image
                :src="certMaterialUrl"
                :preview-src-list="[certMaterialUrl]"
                preview-teleported
                fit="cover"
                class="cert-img"
              />
              <div class="cert-preview-info">
                <el-tag size="small" type="success">证明材料已就绪</el-tag>
                <div class="cert-reupload-btns">
                  <el-button link type="primary" size="small" @click="showCertCropper = true">重新上传</el-button>
                  <el-button link type="danger" size="small" @click="certMaterialUrl = ''">移除</el-button>
                </div>
              </div>
            </div>
            <div v-else class="cert-upload-trigger" @click="showCertCropper = true">
              <el-icon :size="22"><Plus /></el-icon>
              <span class="trigger-main">点击上传房产证或租赁合同照片</span>
              <span class="trigger-sub">支持拍照裁切，仅供网格员实名核验使用</span>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showBindModal = false">取消</el-button>
        <el-button type="primary" :loading="submittingBind" class="cal-primary-btn" @click="submitHouseBind">
          提交认证申请
        </el-button>
      </template>
    </el-dialog>

    <!-- 2. 概览页活动凭证快速亮码弹窗 -->
    <el-dialog v-model="showQuickTicketModal" title="活动入场核销电子凭证" width="400px" center append-to-body>
      <div v-if="quickZoomTicket" class="quick-ticket-modal">
        <span class="cal-badge cal-badge-orange">● 待现场扫码核销</span>
        <h3 class="qt-title">{{ quickZoomTicket.title || quickZoomTicket.activityTitle }}</h3>
        <p class="qt-meta">⏰ {{ quickZoomTicket.startTime }}</p>
        <p class="qt-meta">📍 {{ quickZoomTicket.location }}</p>
        <div class="qt-qr-box">
          <img
            :src="quickZoomTicket.myQrCodeBase64 || quickZoomTicket.qrCodeUrl || ''"
            class="qt-qr-img"
          />
          <div class="qt-code">核销码：<strong>{{ quickZoomTicket.myVerifyCode || quickZoomTicket.verifyCode }}</strong></div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" class="cal-primary-btn w-full" @click="showQuickTicketModal = false">完成出示</el-button>
      </template>
    </el-dialog>

    <!-- 3. 头像裁切弹窗 -->
    <ImageCropperModal
      v-model="showAvatarCropper"
      title="更换个人头像"
      :aspect-ratio="1"
      :allow-aspect-change="false"
      is-avatar-mode
      upload-folder="avatar"
      @success="handleAvatarCropped"
    />

    <!-- 4. 房产证明裁切弹窗 -->
    <ImageCropperModal
      v-model="showCertCropper"
      title="上传房产/租赁证明材料"
      :aspect-ratio="4 / 3"
      :allow-aspect-change="true"
      upload-folder="house-cert"
      @success="(url: string) => certMaterialUrl = url"
    />

    <!-- 5. 站内通知详情兜底弹窗 -->
    <el-dialog v-model="showNoticeDetailModal" title="通知消息详情" width="480px" append-to-body>
      <div v-if="selectedNoticeDetail" class="notice-detail-dialog">
        <div class="dialog-notice-header">
          <span class="cal-badge" :class="getNoticeBadgeClass(selectedNoticeDetail.noticeType)">
            {{ getNoticeBadgeText(selectedNoticeDetail.noticeType) }}
          </span>
          <span class="dialog-notice-time">{{ selectedNoticeDetail.createTime }}</span>
        </div>
        <h3 class="dialog-notice-title">{{ selectedNoticeDetail.title }}</h3>
        <p class="dialog-notice-summary">{{ selectedNoticeDetail.summary }}</p>
      </div>
      <template #footer>
        <el-button @click="showNoticeDetailModal = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Plus,
  Camera,
  ArrowRight,
  ChatDotRound,
  OfficeBuilding,
  User,
  Bell,
  Tools,
  Ticket,
  Goods,
  Medal,
  CircleCheckFilled,
  EditPen,
  Lock,
  SwitchButton
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { localQrDataUrl } from '@/utils/qrcode'
import { useUserStore } from '@/stores/user'
import { useNoticeStore } from '@/stores/notice'
import ImageCropperModal from '@/components/common/ImageCropperModal.vue'
import ProfileOrdersPanel from './components/ProfileOrdersPanel.vue'
import ProfileTicketsPanel from './components/ProfileTicketsPanel.vue'
import ProfileMarketPanel from './components/ProfileMarketPanel.vue'
import ProfileChatPanel from './components/ProfileChatPanel.vue'
import type { Building, Unit, House, UserNotice, WorkOrder } from '@/types'

const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const noticeStore = useNoticeStore()

async function handleLogout() {
  await userStore.logout()
  ElMessage.success('已安全退出登录')
  router.push('/login')
}

// 支持的视图：overview (默认) | houses | security | orders | tickets | market | chat | notices
function resolveInitialTab(qTab?: string): string {
  if (!qTab) return 'overview'
  if (qTab === 'profile') return 'overview'
  const valid = ['overview', 'houses', 'security', 'orders', 'tickets', 'market', 'chat', 'notices']
  return valid.includes(qTab) ? qTab : 'overview'
}

const activeTab = ref(resolveInitialTab(route.query.tab as string))

const ordersPanelRef = ref<InstanceType<typeof ProfileOrdersPanel> | null>(null)
const ticketsPanelRef = ref<InstanceType<typeof ProfileTicketsPanel> | null>(null)
const chatPanelRef = ref<InstanceType<typeof ProfileChatPanel> | null>(null)

watch(() => route.query.tab, (newTab) => {
  activeTab.value = resolveInitialTab(newTab as string)
  handleTabActivated(activeTab.value)
})

function switchTab(tab: string) {
  activeTab.value = tab
  router.replace({ query: { ...route.query, tab: tab === 'overview' ? undefined : tab } })
  handleTabActivated(tab)
  nextTick(() => {
    const activeBtn = document.querySelector('.sidebar-nav .sidebar-nav-item.active') as HTMLElement | null
    activeBtn?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  })
}

function handleTabActivated(tab: string) {
  if (tab === 'overview' || tab === 'houses') {
    loadMyHouses()
  }
  if (tab === 'overview' || tab === 'security') {
    initEditForm()
  }
  if (tab === 'notices') {
    loadMyNotices()
  }
}

// 头像与资料编辑
const showAvatarCropper = ref(false)
const showCertCropper = ref(false)
const savingProfile = ref(false)
const editForm = reactive({
  realName: '',
  phone: '',
  avatar: ''
})

// 修改密码
const savingPassword = ref(false)
const passwordForm = reactive({
  oldPassword: '',
  newPassword: ''
})

// 概览统计与待办数据
const loadingHouses = ref(false)
const myHouses = ref<any[]>([])
const myOrdersTotal = ref(0)
const recentOrders = ref<WorkOrder[]>([])
const pendingEvalOrdersCount = ref(0)
const mySignupsCount = ref(0)
const pendingTickets = ref<any[]>([])
const myPostsTotal = ref(0)
const unreadChatCount = ref(0)

// 概览快速亮码弹窗
const showQuickTicketModal = ref(false)
const quickZoomTicket = ref<any>(null)

async function openQuickTicketZoom(ticket: any) {
  quickZoomTicket.value = ticket
  showQuickTicketModal.value = true
  if (!ticket.myQrCodeBase64 && !ticket.qrCodeUrl) {
    const code = ticket.myVerifyCode || ticket.verifyCode
    if (code) {
      ticket.qrCodeUrl = await localQrDataUrl(String(code), 180)
    }
  }
}

function switchTabAndRate(order: WorkOrder) {
  switchTab('orders')
  nextTick(() => {
    setTimeout(() => {
      ordersPanelRef.value?.openRateDialog(order)
    }, 120)
  })
}

// 站内信
const loadingNotices = ref(false)
const myUserNotices = ref<UserNotice[]>([])
const noticeFilter = ref('all')
const showNoticeDetailModal = ref(false)
const selectedNoticeDetail = ref<UserNotice | null>(null)

const filteredNotices = computed(() => {
  if (noticeFilter.value === 'unread') {
    return myUserNotices.value.filter(n => n.isRead === 0)
  }
  return myUserNotices.value
})

// 房屋绑定弹窗
const showBindModal = ref(false)
const submittingBind = ref(false)
const buildings = ref<Building[]>([])
const units = ref<Unit[]>([])
const houses = ref<House[]>([])
const selectedBuilding = ref('')
const selectedUnit = ref('')
const selectedHouse = ref('')
const identityType = ref(1)
const certMaterialUrl = ref('')

onMounted(async () => {
  await userStore.fetchCurrentUser()
  initEditForm()
  loadMyHouses()
  loadOverviewData()
  fetchUnreadChatCount()
  if (activeTab.value === 'notices') {
    loadMyNotices()
  }
})

function initEditForm() {
  editForm.realName = userStore.user?.realName || ''
  editForm.phone = userStore.user?.phone || ''
  editForm.avatar = userStore.user?.avatar || ''
}

async function handleAvatarCropped(url: string) {
  try {
    await request.put('/user/profile', {
      realName: userStore.user?.realName || userStore.user?.username,
      phone: userStore.user?.phone,
      avatar: url
    })
    ElMessage.success('个人头像更换成功！')
    await userStore.fetchCurrentUser()
    initEditForm()
  } catch (e) {}
}

async function saveProfile() {
  savingProfile.value = true
  try {
    await request.put('/user/profile', editForm)
    ElMessage.success('个人基本资料已保存更新！')
    await userStore.fetchCurrentUser()
  } finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  if (!passwordForm.oldPassword || !passwordForm.newPassword) {
    ElMessage.warning('请填写当前旧密码与新密码')
    return
  }
  if (passwordForm.newPassword.length < 6) {
    ElMessage.warning('新密码长度不能少于 6 位')
    return
  }
  savingPassword.value = true
  try {
    await request.put('/user/password', passwordForm)
    ElMessage.success('密码修改成功，请使用新密码重新登录！')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    userStore.logout()
    router.push('/login')
  } finally {
    savingPassword.value = false
  }
}

async function loadOverviewData() {
  try {
    const ordersRes: any = await request.get('/order/my-list', { params: { size: 10 } })
    const records: WorkOrder[] = ordersRes.records || []
    myOrdersTotal.value = ordersRes.total || records.length
    recentOrders.value = records
    pendingEvalOrdersCount.value = records.filter(o => o.status === 5).length
  } catch (e) {}

  try {
    const actsRes: any = await request.get('/activity/my-signups')
    const list = actsRes || []
    mySignupsCount.value = list.length
    pendingTickets.value = list.filter((t: any) => !(t.mySignupStatus === 2 || t.verifyStatus === 1))
  } catch (e) {}

  try {
    const marketRes: any = await request.get('/market/my-posts', { params: { size: 1 } })
    myPostsTotal.value = marketRes.total || 0
  } catch (e) {}

  noticeStore.fetchUnreadCount()
}

async function fetchUnreadChatCount() {
  try {
    const res: any = await request.get('/chat/unread-count')
    unreadChatCount.value = res || 0
  } catch (e) {}
}

async function loadMyHouses() {
  loadingHouses.value = true
  try {
    const res: any = await request.get('/grid/my-houses')
    myHouses.value = res || []
  } finally {
    loadingHouses.value = false
  }
}

async function openBindHouseModal() {
  showBindModal.value = true
  const res: any = await request.get('/grid/buildings')
  buildings.value = res || []
}

async function onBuildingChange(bId: any) {
  selectedUnit.value = ''
  selectedHouse.value = ''
  const res: any = await request.get(`/grid/units/${bId}`)
  units.value = res || []
}

async function onUnitChange(uId: any) {
  selectedHouse.value = ''
  const res: any = await request.get(`/grid/houses/${uId}`)
  houses.value = res || []
}

async function submitHouseBind() {
  if (!selectedHouse.value) {
    ElMessage.warning('请选择要认领绑定的具体房号')
    return
  }
  submittingBind.value = true
  try {
    await request.post('/grid/house-bind', {
      houseId: selectedHouse.value,
      identityType: identityType.value,
      certMaterial: certMaterialUrl.value
    })
    ElMessage.success('房屋绑定申请已提交，等待网格员核验！')
    showBindModal.value = false
    await loadMyHouses()
    await userStore.fetchCurrentUser()
  } finally {
    submittingBind.value = false
  }
}

async function loadMyNotices() {
  loadingNotices.value = true
  try {
    const res: any = await request.get('/notice/my-inbox', { params: { size: 50 } })
    myUserNotices.value = res.records || []
  } finally {
    loadingNotices.value = false
  }
}

async function handleReadAllNotices() {
  await request.put('/notice/read-all')
  ElMessage.success('已将所有站内信标记为已读')
  noticeStore.fetchUnreadCount()
  await loadMyNotices()
}

async function handleReadSingleNotice(item: UserNotice) {
  if (item.isRead === 0) {
    try {
      await request.put(`/notice/read/${item.id}`)
      item.isRead = 1
      noticeStore.fetchUnreadCount()
    } catch (e) {}
  }

  const t = (item.noticeType || '').toUpperCase()
  const title = item.title || ''
  const summary = item.summary || ''

  if (t === 'CHAT' || title.includes('私信')) {
    switchTab('chat')
    nextTick(() => {
      chatPanelRef.value?.loadChatSessions({ bizId: item.bizId, title, summary })
    })
    return
  }
  if (t === 'WORK_ORDER' || title.includes('工单') || title.includes('报修') || title.includes('投诉')) {
    switchTab('orders')
    return
  }
  if (t === 'ACTIVITY' || title.includes('活动') || title.includes('报名') || title.includes('核销')) {
    if (title.includes('核销') || title.includes('入场') || summary.includes('核销') || summary.includes('凭证')) {
      switchTab('tickets')
    } else if (item.bizId) {
      router.push(`/activities/${item.bizId}?from=profile`)
    } else {
      switchTab('tickets')
    }
    return
  }
  if (t === 'MARKET' || title.includes('集市') || title.includes('闲置') || title.includes('互助')) {
    if (item.bizId) {
      router.push(`/market/${item.bizId}?from=profile`)
    } else {
      switchTab('market')
    }
    return
  }
  if (t === 'HOUSE' || t === 'HOUSE_BIND' || title.includes('房产') || title.includes('认证')) {
    switchTab('houses')
    return
  }
  if (t === 'NOTICE' || t === 'EMERGENCY' || title.includes('通告') || title.includes('公告')) {
    const targetId = item.noticeId || item.bizId
    if (targetId) {
      router.push(`/notices/${targetId}?from=profile`)
      return
    }
  }

  selectedNoticeDetail.value = item
  showNoticeDetailModal.value = true
}

function formatRegDate(dateStr?: string) {
  if (!dateStr) return '近期'
  return dateStr.split(' ')[0] || dateStr
}

function getIdentityText(type: number) {
  switch (type) {
    case 1: return '产权业主'
    case 2: return '业主家属'
    case 3: return '承租租客'
    default: return '居民'
  }
}

function getRoleName(role?: string) {
  switch (role) {
    case 'ROLE_SYSTEM_ADMIN': return '系统管理员'
    case 'ROLE_COMMUNITY_ADMIN': return '社区管委会'
    case 'ROLE_PROPERTY_ADMIN': return '物业管理员'
    case 'ROLE_GRID_OFFICER': return '楼栋网格员'
    default: return '社区居民'
  }
}

function getOrderStatusName(status: number) {
  switch (status) {
    case 1: return '待初审'
    case 2: return '已驳回'
    case 3: return '已派单'
    case 4: return '施工处理中'
    case 5: return '★ 完工待评价'
    case 6: return '已评价结单'
    default: return '处理中'
  }
}

function getNoticeBadgeClass(typeStr?: string) {
  const t = (typeStr || '').toUpperCase()
  if (t.includes('ORDER') || t.includes('工单')) return 'cal-badge-violet'
  if (t.includes('EMERGENCY') || t.includes('应急')) return 'cal-badge-pink'
  if (t.includes('NOTICE') || t.includes('通告')) return 'cal-badge-orange'
  if (t.includes('CHAT') || t.includes('私信')) return 'cal-badge-emerald'
  return 'cal-badge-gray'
}

function getNoticeBadgeText(typeStr?: string) {
  const t = (typeStr || '').toUpperCase()
  if (t === 'WORK_ORDER') return '工单动态'
  if (t === 'EMERGENCY') return '突发应急'
  if (t === 'NOTICE') return '社区通告'
  if (t === 'CHAT') return '邻里私信'
  if (t === 'ACTIVITY') return '文体活动'
  if (t === 'MARKET') return '闲置集市'
  if (t === 'HOUSE') return '房产认证'
  return typeStr || '系统通知'
}

function getNoticeActionHint(item: UserNotice) {
  const t = (item.noticeType || '').toUpperCase()
  const title = item.title || ''
  if (t === 'CHAT' || title.includes('私信')) return '打开私信'
  if (t === 'WORK_ORDER' || title.includes('工单')) return '查看工单'
  if (t === 'ACTIVITY' || title.includes('活动')) return '查看凭证'
  if (t === 'HOUSE' || title.includes('房产')) return '查看房产'
  return '查看详情'
}
</script>

<style scoped>
.user-profile-layout {
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  align-items: start;
}

/* ==================== 左侧边栏 ==================== */
.profile-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 84px;
}

.identity-card {
  padding: 20px;
}

.identity-top {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.avatar-edit-box {
  position: relative;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}

.avatar-mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.68);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.avatar-edit-box:hover .avatar-mask {
  opacity: 1;
}

.identity-meta {
  min-width: 0;
  flex: 1;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.real-name {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--cal-ink);
}

.role-pill {
  font-size: 11px;
  padding: 1px 7px;
}

.username-text,
.reg-time-text {
  font-size: 12px;
  color: var(--cal-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.credit-honor-strip {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.honor-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.medal-icon {
  font-size: 20px;
  color: #059669;
}

.honor-title {
  font-size: 12px;
  font-weight: 700;
  color: #065f46;
}

.honor-sub {
  font-size: 11px;
  color: #047857;
}

.honor-score {
  display: flex;
  align-items: baseline;
  gap: 2px;
  color: #065f46;
}

.honor-score strong {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
}

.honor-score span {
  font-size: 11px;
}

.identity-quick-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 抵消 Element Plus 相邻按钮自带的 margin-left, 统一用 flex gap 控制 */
.identity-quick-btns :deep(.el-button + .el-button) {
  margin-left: 0;
}

.flex-1 {
  flex: 1;
}

/* 左侧分组菜单 */
.sidebar-nav {
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--cal-muted);
  padding: 0 10px 4px 10px;
}

.sidebar-nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--cal-body);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.sidebar-nav-item:hover {
  background: var(--cal-surface-soft);
  color: var(--cal-ink);
}

.sidebar-nav-item.active {
  background: var(--cal-ink);
  color: #ffffff;
  font-weight: 600;
}

.nav-text {
  flex: 1;
}

.nav-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--cal-surface-soft);
  color: var(--cal-muted);
}

.sidebar-nav-item.active .nav-badge {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.nav-badge.badge-danger {
  background: #ef4444 !important;
  color: #ffffff !important;
}

.nav-badge.badge-amber {
  background: #fef3c7 !important;
  color: #b45309 !important;
}

.nav-badge.badge-emerald {
  background: #d1fae5 !important;
  color: #065f46 !important;
}

/* ==================== 右侧工作区 ==================== */
.profile-workspace {
  padding: 24px 28px;
  min-height: 640px;
}

.overview-workbench {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.workbench-section {
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  border-radius: 14px;
  padding: 20px 22px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-bottom: 2px;
}

.section-sub {
  font-size: 12px;
  color: var(--cal-muted);
}

.header-right-actions {
  display: flex;
  gap: 8px;
}

.profile-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 14px;
  align-items: end;
}

.profile-form-grid :deep(.el-form-item) {
  margin-bottom: 0;
}

.inline-save-col {
  padding-bottom: 1px;
}

/* 4宫格统计磁贴 */
.metrics-tiles-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.metric-tile {
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.metric-tile:hover {
  border-color: var(--cal-ink);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.tile-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.icon-blue { background: #eff6ff; color: #2563eb; }
.icon-amber { background: #fef3c7; color: #d97706; }
.icon-emerald { background: #ecfdf5; color: #059669; }
.icon-violet { background: #f5f3ff; color: #7c3aed; }

.tile-body {
  flex: 1;
  min-width: 0;
}

.tile-num {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.tile-num strong {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  color: var(--cal-ink);
}

.tile-num span {
  font-size: 11px;
  color: var(--cal-muted);
}

.tile-label {
  font-size: 12px;
  color: var(--cal-muted);
}

.tile-action {
  font-size: 11px;
  font-weight: 600;
  color: var(--cal-muted);
}

/* 待办提醒卡 */
.todo-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.todo-action-card {
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.todo-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--cal-ink);
}

.todo-meta {
  font-size: 12px;
  color: var(--cal-muted);
}

.todo-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px dashed var(--cal-hairline);
  margin-top: auto;
}

.code-pill {
  font-size: 12px;
  color: var(--cal-body);
}

.code-pill strong {
  font-family: var(--font-code);
  color: #059669;
  font-size: 15px;
}

/* 房产卡片网格 */
.houses-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.empty-block {
  grid-column: 1 / -1;
}

.house-card {
  background: var(--cal-canvas);
  border: 1px solid var(--cal-hairline);
  border-radius: 12px;
  padding: 18px;
  transition: all 0.2s ease;
}

.house-card:hover {
  border-color: var(--cal-ink);
}

.house-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.house-header h4 {
  font-size: 14px;
  font-weight: 700;
  color: var(--cal-ink);
}

.house-no-big {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--cal-ink);
  margin-bottom: 12px;
}

.house-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--cal-muted);
  padding-top: 10px;
  border-top: 1px dashed var(--cal-hairline);
}

.house-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.verified-sign {
  color: #10b981;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

/* 通用子面板头部 */
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

/* 安全设置双栏 */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.settings-card {
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  border-radius: 12px;
  padding: 20px;
}

.card-title-bar {
  margin-bottom: 16px;
}

.card-title-bar h4 {
  font-size: 16px;
  font-weight: 700;
  color: var(--cal-ink);
}

.sub-hint {
  font-size: 12px;
  color: var(--cal-muted);
}

/* 站内信列表 */
.notice-actions-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notices-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notice-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid var(--cal-hairline);
  background: var(--cal-canvas);
  cursor: pointer;
  transition: all 0.15s ease;
}

.notice-item.unread {
  background: #f8fafc;
  border-left: 3px solid var(--cal-ink);
}

.notice-item:hover {
  border-color: var(--cal-ink);
}

.notice-main {
  flex: 1;
  min-width: 0;
}

.notice-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
}

.notice-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--cal-ink);
  word-break: break-word;
}

.notice-summary {
  font-size: 13px;
  color: var(--cal-muted);
  word-break: break-word;
}

.notice-right {
  text-align: right;
  flex-shrink: 0;
}

.notice-time {
  font-size: 11px;
  color: var(--cal-muted);
  margin-bottom: 4px;
}

.notice-action-hint {
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

/* 统一房产证明上传 */
.unified-cert-upload {
  width: 100%;
}

.cert-upload-trigger {
  border: 1px dashed var(--cal-hairline);
  border-radius: 10px;
  background: var(--cal-surface-soft);
  padding: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--cal-muted);
  transition: all 0.15s ease;
}

.cert-upload-trigger:hover {
  border-color: var(--cal-ink);
  color: var(--cal-ink);
}

.trigger-main {
  font-size: 13px;
  font-weight: 600;
}

.trigger-sub {
  font-size: 11px;
}

.cert-uploaded-preview {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border: 1px solid var(--cal-hairline);
  border-radius: 10px;
  background: var(--cal-surface-soft);
}

.cert-img {
  width: 68px;
  height: 68px;
  border-radius: 6px;
}

.cert-reupload-btns {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

/* 快速亮码弹窗 */
.quick-ticket-modal {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.qt-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--cal-ink);
}

.qt-meta {
  font-size: 12px;
  color: var(--cal-muted);
}

.qt-qr-box {
  margin-top: 10px;
  padding: 14px;
  background: var(--cal-surface-soft);
  border: 1px solid var(--cal-hairline);
  border-radius: 12px;
}

.qt-qr-img {
  width: 180px;
  height: 180px;
}

.qt-code {
  margin-top: 8px;
  font-size: 14px;
}

.qt-code strong {
  font-family: var(--font-code);
  font-size: 20px;
  color: #10b981;
}

.identity-logout-pill {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #dc2626;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.identity-logout-pill:hover {
  background: #fee2e2;
  border-color: #f87171;
}

.account-logout-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid #fee2e2;
  background: #fffafa;
}

.logout-bar-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.logout-bar-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--cal-ink);
}

.logout-bar-sub {
  font-size: 12px;
  color: var(--cal-muted);
}

@media (max-width: 960px) {
  .user-profile-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .profile-sidebar {
    position: static;
    gap: 10px;
    min-width: 0;
  }
  /* 移动端将 8 项纵向菜单转化为单行横向滑动胶囊导航，释放 400px+ 首屏高度 */
  .sidebar-nav {
    flex-direction: row;
    align-items: center;
    gap: 6px;
    padding: 8px 10px !important;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .sidebar-nav::-webkit-scrollbar {
    display: none;
  }
  .nav-group {
    flex-direction: row;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .nav-group-label {
    display: none;
  }
  .sidebar-nav-item {
    width: auto;
    white-space: nowrap;
    padding: 7px 12px;
    border-radius: 999px;
    font-size: 12.5px;
    gap: 6px;
    background: var(--cal-surface-soft);
    border: 1px solid var(--cal-hairline-soft);
    flex-shrink: 0;
  }
  .sidebar-nav-item.active {
    background: var(--cal-ink);
    border-color: var(--cal-ink);
    color: #ffffff;
  }
  .profile-workspace {
    padding: 16px 14px !important;
    min-height: auto;
    min-width: 0;
  }
  .workbench-section {
    padding: 14px;
  }
  .section-header,
  .panel-header-bar {
    flex-wrap: wrap;
    gap: 10px;
  }
  .profile-form-grid {
    grid-template-columns: 1fr;
  }
  .metrics-tiles-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .houses-grid,
  .settings-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 768px) {
  .reg-time-text,
  .identity-quick-btns {
    display: none;
  }
  .account-logout-bar {
    flex-direction: column;
    align-items: stretch;
    padding: 14px;
  }
  .logout-bar-btn {
    width: 100%;
  }
  .notice-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
  }
  .notice-main {
    width: 100%;
  }
  .notice-right {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-align: left;
    padding-top: 8px;
    border-top: 1px dashed var(--cal-hairline-soft);
  }
  .notice-time {
    margin-bottom: 0;
  }
}
</style>
