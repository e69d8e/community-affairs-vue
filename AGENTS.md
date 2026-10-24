# AGENTS.md — 智慧社区综合事务管理系统（前端）

单仓双门户 + 独立指挥大屏前端：Vue 3.5（`<script setup>` 组合式 API）+ TypeScript + Vite 6 + Element Plus + Pinia + ECharts + STOMP/SockJS。

后端仓库：`/Users/li/Code/Java/JavaProjects/community-affairs`（Spring Boot，本地 8082）。README.md 含完整的架构、目录与五大角色权限矩阵说明，改权限相关代码前先读。

## 包管理器：pnpm（勿用 npm / yarn）

```bash
pnpm install                 # 安装依赖
pnpm approve-builds --all    # pnpm v11 需授权构建脚本（esbuild / @parcel/watcher / vue-demi 已列入 pnpm-workspace.yaml）
pnpm dev                     # 开发服务器 http://localhost:5174（host 0.0.0.0，/api 与 /ws 代理到 127.0.0.1:8082）
pnpm build                   # vue-tsc -b 类型检查 + vite build，产物在 dist/（类型错误会中断构建）
pnpm preview                 # 本地预览生产构建
```

没有独立的 lint/typecheck 脚本：类型检查只在 `pnpm build` 中经 `vue-tsc -b` 执行；也没有 ESLint/Prettier 配置，代码风格跟随现有文件。

## 部署联动（重要）

生产部署不用本工程 dist 直接上线：`pnpm build` 后需把 `dist/` 内容**覆盖到后端仓库 `./html/`**（Nginx 直出，浏览器刷新即生效，无需重启容器）。

## 目录结构与职责

- `src/constants/permissions.ts`：**权限矩阵前端单一事实来源**（角色 → 权限点，派生 Pinia `canXxx`），与后端控制器 `@PreAuthorize` 注解一一对应——改任一侧必须同步另一侧。
- `src/router/index.ts` + `src/router/guard.ts`：路由表与全局守卫（`meta.requiresAuth` / `meta.requiresAdmin`；居民访问 `/admin`、`/screen` 会被拦截并回退居民门户）。
- `src/stores/`：Pinia——`user.ts`（登录态、角色、登出）、`notice.ts`（未读红点）、`community.ts`。
- `src/utils/request.ts`：Axios 统一实例（自动注入 Bearer Token、统一错误捕获、401 回退登录）——发请求一律复用它，不要新建 axios 实例。
- `src/utils/websocket.ts`：STOMP 客户端封装（订阅 `/user/queue/notify` 与 `/topic/emergency`，断线重连）。
- `src/utils/safe-html.ts` + `src/directives/safeHtml.ts`：所有 `v-html` 渲染必须经 DOMPurify（用该指令/工具），防 XSS。
- `src/types/index.ts`：全局 DTO/VO 类型定义（WorkOrder、Activity、ScreenData 等）。
- `src/views/`：`auth/`（登录注册）、`resident/`（居民门户）、`admin/`（治理控制台，按 dashboard/grid/order/activity/moderation/system 分域）、`screen/`（16:9 指挥大屏）。
- `src/components/`（common 通用组件、market 集市组件）、`src/composables/`、`src/assets/`。

## 约定与坑

- 路径别名 `@` → `src/`（vite.config.ts 与 tsconfig 已配置）。
- 三大入口：`/`（居民门户）、`/admin`（控制台，仅四类工作人员角色可入）、`/screen`（大屏）；登录页预置五大角色一键体验通道（`admin` / `community_admin` / `property_admin` / `grid_officer` / `resident`，密码均 `123456`）。
- `vite.config.ts` 中 `define: { global: 'window' }` 是 SockJS 在 Vite 下的兼容配置，勿删。
- 开发代理指向 `127.0.0.1:8082`：先启动后端（本地 IDEA/`./mvnw spring-boot:run` + 后端仓库 `ca-nginx-dev` 与中间件容器，或全容器模式），否则接口全部 502。
- 菜单与按钮显隐从 `permissions.ts` 派生，不要在组件里硬编码角色字符串比较（角色编码统一用 `ROLES.*` 常量）。
