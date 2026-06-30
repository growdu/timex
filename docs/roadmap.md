# 路线图

> 当前状态 = ✓ 完成的、🚧 进行中的、⬜ 待做的

## 核心功能

| 模块 | 状态 | 说明 |
|---|---|---|
| 注册 / 登录 | ✓ | `/register` + `/login`，3 个种子账号 |
| License 试用 | ✓ | 注册自动 14 天试用，可激活正式 License |
| 设备管理 | ✓ | `/license` 页面查看 / 注销设备 |
| 事件 CRUD | ✓ | 创建、编辑、删除、列表、时间线 |
| 地点 CRUD | ✓ | 带经纬度 |
| 人物 CRUD | ✓ | 带头像 |
| 素材 CRUD | ✓ | photo / video / audio / text |
| 回忆录 + 章节 | ✓ | 草稿 / 发布 / 归档，公开分享链接 |
| 多租户隔离 | ✓ | 所有业务表带 `user_id`，Service 层强制 |
| 时间线首页 | ✓ | 8 个模块：问候 / 统计 / 周年 / SVG 时间线 / 阶段分布 / 活跃回忆录 / 近期记忆 / 快速操作 |
| 6 条线维度 | ✓ | 时间 / 空间 / 感情 / 事业 / 亲情 / 朋友，全在前端 apiAdapter 派生，0 DB 改动 |
| **后端测试覆盖** | ✓ | **156 tests passing** / 77.17% 语句 / 72.62% 分支 / 80% 行；8/8 controllers 100%；4/4 CRUD services 100% |
| **前端测试覆盖** | 🚧 | apiAdapter 99.7% / lines + lineMatchers 100% / 12 hooks 100% / store 100% / 仅 LicensePage + LoginPage 有测试；Pages 阶段 13 补完 |
| **CI 全绿** | ✓ | health-check.sh fast + coverage 9 步全过；后端 50% / 前端 15% 分级阈值（Pages 测试补完后前端阈值升 50%） |

## 视觉与可视化（本轮升级）

| 项 | 状态 | 说明 |
|---|---|---|
| 空间页地图 | ✓ | 用 Leaflet 显示所有地点 marker + 轨迹连线 |
| 人物页关系图 | ✓ | 用 d3-force 绘制 person / event 关系网络 |
| 时间线 Rich 化 | ✓ | 替换简单列表为带 cover 渐变的 RichTimeline |
| 首页 FAB 快速操作 | ✓ | 浮动按钮 + 心情小部件 |
| PlacePage / PersonPage / EventPage mini 可视化 | ✓ | 小尺寸地图 / 关系图嵌入 hero 下 |

## 文档（本轮）

| 项 | 状态 |
|---|---|
| `docs/README.md` 索引 | ✓ |
| `docs/architecture.md` 系统架构 | ✓ |
| `docs/frontend.md` 前端结构 | ✓ |
| `docs/backend.md` 后端结构 | ✓ |
| `docs/api.md` API 参考 | ✓ |
| `docs/setup.md` 本地开发 | ✓ |
| `docs/deployment.md` 部署 | ✓ |
| `docs/roadmap.md` 路线图 | ✓ |
| `docs/changelog.md` 变更日志 | ✓ |
| `docs/health-check.md` 体检脚本说明 | ✓ |
| VitePress 站点构建 | ⬜ |
| `deploy-docs.yml` 自动部署文档 | 🚧（pandoc 兜底可用，VitePress 待起步） |

## CI/CD（本轮）

| 项 | 状态 |
|---|---|
| CI 跑 lint / test / build | ✓ |
| CI 触发所有分支 | ✓ |
| CI 注入 `VITE_API_URL` | ✓ |
| 后端 CI 跑 lint | ✓ |
| 后端 CI 跑 typecheck | ✓ |
| 前端 CI 跑 lint | ✓ |
| Pages 部署 | ✓ |
| Pages SPA fallback (404.html) | ✓ |
| Pages base path (`/timex/`) | ✓ |
| Pages cancel-in-progress | ✓ |
| README 加徽章 / 环境变量 / 部署章节 | ✓ |
| 聚合 `health-check` job（cron + PR） | ✓ |
| VitePress 文档自动部署 | 🚧 |

## 下一轮候选

### 高优先级
- 真实 OSS 集成（Aliyun OSS 上传 / 签名 URL）
- 真实 AI 集成（图片打标、语音转写、回忆录自动摘要）
- 后端 rate limit（Redis 已就位）
- 素材上传 UI（UploadModal 已有雏形）
- 编辑器升级为富文本（章节正文可插入图片、引用、视频）

### 中优先级
- 国际化（i18n，英文 / 日文）
- 主题切换（深色模式）
- 移动端 PWA
- 真实支付（License 续费 / 增值服务）
- 公开分享页的 SEO 优化

### 低优先级
- WebSocket 实时通知
- 数据导出（JSON / PDF 回忆录）
- 协作回忆录（多人共写）
- 时间线 AI 智能推荐
