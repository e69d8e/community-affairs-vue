// 通用接口响应结构
export interface Result<T = any> {
  code: number
  message: string
  data: T
  timestamp: number
}

// 分页结构
export interface PageResult<T = any> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

// 用户信息
export interface UserInfo {
  id: string
  username: string
  realName: string
  phone: string
  avatar: string
  gender: number
  role: string
  status: number
  creditScore: number
  createTime?: string
  boundHouses?: HouseInfo[]
}

// 关联房产
export interface HouseInfo {
  houseId: string
  communityName: string
  buildingName: string
  unitName: string
  houseNo: string
  identityType: number // 1-业主, 2-家属, 3-租客
  certStatus: number   // 0-待审, 1-已认证, 2-已驳回
}

// 工单
export interface WorkOrder {
  id: string
  orderNo: string
  orderType: number // 1-报修, 2-投诉
  category: string
  communityId: string
  communityName?: string
  buildingId?: string
  buildingName?: string
  houseId?: string
  houseAddress?: string
  reporterId: string
  reporterName: string
  reporterPhone: string
  title: string
  content: string
  images?: string
  status: number // 1-待审核, 2-驳回, 3-已派单, 4-处理中, 5-完工待评, 6-已评价结单
  isUrgent: number
  reviewerId?: string
  reviewRemark?: string
  reviewTime?: string
  handlerId?: string
  handlerName?: string
  handlerPhone?: string
  handleTime?: string
  handleResult?: string
  handleImages?: string
  finishTime?: string
  ratingStar?: number
  ratingContent?: string
  createTime: string
  logs?: OrderLog[]
}

export interface OrderLog {
  id: string
  orderId: string
  actionType: string
  fromStatus: number
  toStatus: number
  operatorId: string
  operatorName: string
  operatorRole: string
  remark?: string
  evidenceImages?: string
  createTime: string
}

// 社区活动
export interface Activity {
  id: string
  title: string
  coverImage?: string
  category: string
  communityId: string
  location: string
  startTime: string
  endTime: string
  signupStartTime: string
  signupEndTime: string
  maxParticipants: number
  currentParticipants: number
  status: number // 0-草稿, 1-报名中, 2-截止待开展, 3-进行中, 4-已完结, 5-已取消
  organizer: string
  contactPhone?: string
  description: string
  hasSignedUp?: boolean
  mySignupStatus?: number
  myVerifyCode?: string
  myQrCodeBase64?: string
  qrCodeUrl?: string
}

// 二手闲置与互助
export interface MarketPost {
  id: string
  postType: number // 1-二手闲置, 2-求助, 3-借用, 4-拼车, 5-技能交换
  communityId: string
  userId: string
  authorName: string
  authorAvatar?: string
  authorCreditScore?: number
  title: string
  description: string
  price: number
  tradeType: number
  deliveryType: number
  tradeAddress?: string
  contactType?: string
  contactValue?: string
  images?: string
  status: number // 1-展示中, 2-流转中, 3-达成结题, 4-封禁
  viewCount: number
  likeCount: number
  commentCount: number
  createTime: string
  hasLiked?: boolean
  hasFavorited?: boolean
  comments?: CommentItem[]
}

export interface CommentItem {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  parentId?: string
  replyToUserId?: string
  replyToUserName?: string
  content: string
  likeCount: number
  createTime: string
}

// 公告与通知
export interface Notice {
  id: string
  title: string
  noticeType: number // 1-政策, 2-便民, 3-物业, 4-突发应急
  communityId: string
  targetScope: number
  targetBuildingIds?: string
  isTop: number
  content: string
  publishTime: string
  publisherName: string
  viewCount: number
  status: number
}

// 站内信
export interface UserNotice {
  id: string
  userId: string
  noticeId?: string
  noticeType: string
  title: string
  summary: string
  bizId?: string
  isRead: number
  createTime: string
}

// 搜索文档
export interface SearchItem {
  id: string
  itemType: string
  targetId: string
  title: string
  content: string
  category: string
  coverImage?: string
  publishTime: string
  extraInfo?: string
}

// 空间实体
export interface Community {
  id: string
  name: string
  code: string
  address: string
  contactPerson?: string
  contactPhone?: string
  description?: string
}

export interface Building {
  id: string
  communityId: string
  buildingName: string
  buildingNo: string
  totalUnits: number
  totalFloors: number
  gridOfficerId?: string
}

export interface Unit {
  id: string
  buildingId: string
  unitName: string
  unitNo: string
  hasElevator: number
}

export interface House {
  id: string
  communityId: string
  buildingId: string
  unitId: string
  houseNo: string
  floorNum: number
  area: number
  houseType: string
  liveStatus: number
}

// 大屏数据
export interface ScreenData {
  communityName: string
  communityAddress: string
  totalPopulation: number
  totalBuildings: number
  totalHouses: number
  occupancyRate: number
  totalOrders: number
  completedOrders: number
  finishRate: number
  avgSatisfaction: number
  buildingHeatmap: Array<{ name: string; value: number }>
  orderFunnel: Array<{ name: string; value: number }>
  categoryPie: Array<{ name: string; value: number }>
  marketPostStats: Array<{ name: string; value: number }>
  activityRadar: Array<{ name: string; max: number; value: number }>
  liveEventStream: Array<{ eventType: string; title: string; time: string; tag: string }>
}

// 统计大屏日常看板
export interface DashboardMetricsVo {
  totalResidents: number
  pendingOrders: number
  processingOrders: number
  activeActivities: number
  openReports: number
  totalNotices: number
  repairFinishRate: number
  monthlyPostCount: number
}

// 邻里私信消息
export interface ChatMessage {
  id: string
  sessionId: string
  postId: string
  postTitle?: string
  senderId: string
  senderName: string
  senderAvatar?: string
  receiverId: string
  receiverName: string
  receiverAvatar?: string
  content: string
  isRead: number
  isSelf?: boolean
  createTime: string
}

// 邻里私信会话列表项
export interface ChatSession {
  sessionId: string
  postId: string
  postTitle: string
  postPrice?: number
  postCover?: string
  postType: number
  otherUserId: string
  otherUserName: string
  otherUserAvatar?: string
  otherUserCreditScore?: number
  lastMessage: string
  lastTime: string
  unreadCount: number
}
