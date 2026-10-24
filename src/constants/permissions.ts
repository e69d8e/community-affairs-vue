/**
 * 角色与功能权限矩阵(前端单一事实来源)
 * 与后端控制器方法上的 @PreAuthorize 注解一一对应,调整任一侧时需同步另一侧。
 * 角色职责定义见后端 init/mysql/community_affairs.sql 的 sys_role 种子数据。
 */
export const ROLES = {
  SYSTEM_ADMIN: 'ROLE_SYSTEM_ADMIN',
  COMMUNITY_ADMIN: 'ROLE_COMMUNITY_ADMIN',
  PROPERTY_ADMIN: 'ROLE_PROPERTY_ADMIN',
  GRID_OFFICER: 'ROLE_GRID_OFFICER',
  RESIDENT: 'ROLE_RESIDENT'
} as const

/** 四类工作人员(可进入管理控制台) */
export const STAFF_ROLES: readonly string[] = [
  ROLES.SYSTEM_ADMIN,
  ROLES.COMMUNITY_ADMIN,
  ROLES.PROPERTY_ADMIN,
  ROLES.GRID_OFFICER
]

/** 功能权限点 -> 允许访问的角色列表 */
export const PERMISSIONS = {
  /** 用户中心:用户列表/账号启停/角色分配(系统管理员:全局赋权与安全审计) */
  manageUsers: [ROLES.SYSTEM_ADMIN],
  /** 敏感词库维护(系统管理员:字典配置) */
  manageWords: [ROLES.SYSTEM_ADMIN],
  /** ES 全文索引手动全量同步(系统管理员:系统运维) */
  syncSearch: [ROLES.SYSTEM_ADMIN],
  /** 活动创建/状态流转/花名册导出(社区管理员:文体活动组织) */
  manageActivities: [ROLES.SYSTEM_ADMIN, ROLES.COMMUNITY_ADMIN],
  /** 综合指挥大屏(社区管理员:大屏监管) */
  viewScreen: [ROLES.SYSTEM_ADMIN, ROLES.COMMUNITY_ADMIN],
  /** 活动现场扫码核销(网格员:现场核销) */
  verifySignup: [ROLES.SYSTEM_ADMIN, ROLES.COMMUNITY_ADMIN, ROLES.GRID_OFFICER],
  /** 违规举报受理与裁决(网格员:举报初查;社区管理员:终审) */
  handleReports: [ROLES.SYSTEM_ADMIN, ROLES.COMMUNITY_ADMIN, ROLES.GRID_OFFICER],
  /** 公告发布(社区管理员:政策公告/应急广播;物业管理员:物业通知) */
  publishNotice: [ROLES.SYSTEM_ADMIN, ROLES.COMMUNITY_ADMIN, ROLES.PROPERTY_ADMIN],
  /** 工单派单/接单开工/完工登记(物业管理员:指派与验收) */
  handleOrder: [ROLES.SYSTEM_ADMIN, ROLES.PROPERTY_ADMIN],
  /** 工单台账 Excel 导出(物业处置台账+社区监管) */
  exportOrder: [ROLES.SYSTEM_ADMIN, ROLES.COMMUNITY_ADMIN, ROLES.PROPERTY_ADMIN],
  /** 工单列表与初审(网格员初审,仅本楼栋数据) */
  auditOrder: STAFF_ROLES,
  /** 网格空间与房产认证审核(网格员走访认证,仅本楼栋数据) */
  manageGrid: STAFF_ROLES,
  /** 管理工作台仪表盘指标 */
  viewDashboard: STAFF_ROLES
} as const

export type PermissionKey = keyof typeof PERMISSIONS

/** 判断角色是否具备某项功能权限 */
export function hasPermission(role: string | undefined, key: PermissionKey): boolean {
  if (!role) return false
  return (PERMISSIONS[key] as readonly string[]).includes(role)
}
