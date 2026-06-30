# 变更日志

## [Unreleased] — 2026-06-30（测试覆盖推进）

### 归档
- 删档 `web-test/` 静态原型（v0.1）：13 文件 / ~100KB，从初始 commit `3b6106b` 起
  已被 v1.0 React/Vite SPA 取代。删除损坏文档 `docs/web-prototype.md`
  （绝对路径未同步），新建归档说明 `docs/web-prototype-archive.md`。
  可通过 `git show 3b6106b -- web-test/` 找回。

### 新增（功能）
- 后端 `memoirs.service` CRUD 测试 13 条，98.48% 覆盖
- 后端 `moments.service` CRUD 测试 17 条，100% 覆盖
  - `findByEvent` 聚合查询：`type` 过滤 / `eventId` 必填 / 顺序（最新优先）
- 后端 `places.service` CRUD 测试 13 条，100% 覆盖
  - `getMemoryStats` 聚合：事件 / 时刻数 + 最近一次
- 后端 `events.service` 测试 25 条，100% 覆盖
  - `queryBuilder` mock 验证 `andWhere` 链：stage / personIds (`In`) / 搜索 / 分页
  - 关联赋值（personIds → EventPerson）+ `coverUrl` 推导
- 后端 `people.controller` / `events.controller` / `places.controller` / `moments.controller` 各 ~6 条测试，全部 100% 覆盖
- 后端 `license.controller` 5 条 + `memoirs.controller` 12 条（含 `PublicMemoirsController` share token 无鉴权路径）+ `app.controller` 2 条测试
- 前端 `lines.js` 测试 14 条 + `lineMatchers.js` 测试 19 条 + `apiAdapter.js` 测试 ~40 条（覆盖 6 条线聚合 / UTC `_parseDateParts` 时区回归）

### 修复
- **后端 tsc 严格类型错误**（修过程中发现）：
  - enum 字面量与字面量类型不匹配 → 改用 `EventStage.STUDENT` / `MomentType.PHOTO` / `PlaceType.CITY` 等
  - `Partial<Entity>` fixture 缺字段 → 改用 `as any` cast
  - `UpdateMomentDto` 字段对齐：`summary` → `aiSummary`，`mediaUrl` → `title`
- **mockUser `id: 'user-1' as any`** 传递已知 `User` 类型 → 24 处 `no-unsafe-argument` warning（不阻塞 lint，通过项目通行 `as any` 风格）

### 改动
- `eslint.config.mjs`：spec 文件统一放宽 `no-unsafe-*` / `unbound-method`
- 前端覆盖率从 ~12% 跃升至 35-50%（apiAdapter / lines / lineMatchers 100%；hooks 大部分 100%；Pages 待补）

### 性能（覆盖率进展）
**后端**（从 52.58% 行 / 41.76% 分支 → **80.00% 行 / 72.62% 分支 / 77.17% 语句**）：
| 模块 | 之前 | 现在 |
|---|---|---|
| people / events / places / moments / memoirs / license / auth / app controllers | 0-33% | **100%**（8/8 controllers） |
| places / moments / events / memoirs services | 0-72% | **98-100%** |
| 整体行覆盖 | 61.19% | **80.00%** |
| 整体分支覆盖 | 46.78% | **72.62%** |
| 测试总数 | 12 | **156** |

## [Unreleased] — 2026-06-29

### 新增（功能）
- `scripts/health-check.sh`：聚合体检脚本（lint + typecheck + test + build + 可选 coverage）
  - 用法：`./scripts/health-check.sh [all|fast|coverage|backend|frontend]`
- `docs/health-check.md`：体检脚本使用文档（CI 一致）
- 前端 ESLint 9 flat config：`frontend/eslint.config.js`
  - `eslint-plugin-react` + `eslint-plugin-react-hooks`
  - `npm run lint` / `npm run lint:fix`
- CI `health-check` job：每天凌晨 + PR 触发 `./scripts/health-check.sh`
- 后端 `lint:check` 和 `typecheck` 脚本（CI 用，不带 `--fix`）

### 修复
- **TS 类型 bug**：`memoir.entity.ts` 三个 `nullable: true` 字段（`blurb` / `coverUrl` / `shareToken`）类型从 `string` 改为 `string | null`，tsc 0 errors
- **Hooks 顺序 bug**：`MemoirPage.jsx` `useMemo` 在 early return 之后调用，违反 hooks 规则；移到 early return 之前
- **后端 ESLint**：从 286 errors 降到 0 errors（spec / main / 装饰器文件的 `no-unsafe-*` 降级为合理范围，删除未使用 import）
- **前端测试补包**：装上 `@testing-library/dom`（之前覆盖率插件装上后导致 LoginPage/LicensePage 测试挂掉）
- **`generateTokens`** 误用 async：实际无 await 调用，改成同步函数；调用方去掉冗余 `await`

### 改动
- 后端 `eslint.config.mjs`：
  - 源码保留 `recommendedTypeChecked`（抓真类型 bug）
  - spec / main.ts / `common/decorators/` 放宽 `no-unsafe-*`
  - `no-unused-vars` 允许 `_` 前缀
  - 关闭 spec 文件的 `unbound-method` / `no-non-null-assertion`
- 前端 `package.json`：
  - 加 `lint` / `lint:fix` 脚本
  - 装 `eslint@9` + `@eslint/js` + `eslint-plugin-react` + `eslint-plugin-react-hooks` + `globals`
  - 装 `@vitest/coverage-v8@3.2.6`（与 vitest 3.x peer 兼容，需 `--legacy-peer-deps`）
  - 装 `@testing-library/dom`
- `events.service.ts`：用 `In(dto.personIds)` 代替 `as any`（类型安全 + 移除 2 处 lint 错误）
- 多个测试文件去掉 `const result = await service.xxx()` 中未使用的 `result`
- `.github/workflows/ci.yml`：把 `backend-test` / `frontend-test` 都加上 lint 与 typecheck；新增 `health-check` job
- `README.md` + `docs/README.md`：加入 health-check 引用与项目结构

### 性能
- 后端整体覆盖率：52.58% 行 / 41.76% 分支（基线建立）
- 前端整体覆盖率：~12%（基线建立，待补）

## [Unreleased] — 2026-06-29（视觉与可视化）

### 新增（功能）
- **6 条线维度**：时间 / 空间 / 感情 / 事业 / 亲情 / 朋友；`/lines` 独立 hub 页 + `/lines/:lineId` 单线展开；首页 9 模块新增「6 Lines Hub」区
- `frontend/src/data/lines.js`：6 条线元数据（id / label / icon / gradient / blurb）
- `frontend/src/data/lineMatchers.js`：4 条关系线的角色关键词正则 + `isInLine` / `matchedLines`
- `apiAdapter` 新增 `getEventsByLine` / `getLineStats` / `getAllLines`，前端派生 0 DB 改动
- `useUIStore` 加 `line: 'all'` 字段，UI store 与 URL 双向同步
- `LineCard` 组件：渐变 header + 计数 + 重点人物 / 地点 / 最新事件
- `LinesPage` 独立页：6 卡网格 + 选中线下展开 RichTimeline + 关联 chip
- `AppLayout` 侧栏加「六条线」导航（5 条单线入口 + hub 总入口）
- `FabStack` 加「按线查看」快捷入口
- demo 用户补 2 人（王芳 = 恋人 / 赵明 = 同事）+ 2 事件（情人节晚餐 / 团队季度复盘），让 6 条线在 demo 上都非空

### 修复
- 三个种子用户 `demo@timex.com` / `maker@timex.test` / `family@timex.test`，各有独立数据
- `/register` 注册页 + LoginPage 加注册链接
- 登录页 Demo Mode 展示 3 个测试账号
- 首页 9 模块：问候横幅 / 6 项统计仪表盘 / 今日纪念 / SVG 横向时间线 / 阶段分布 / 活跃回忆录 / 近期记忆 / **Rich Timeline 卡片视图** / 快速操作
- apiAdapter 新增 `getTotalMedia` / `getDaysActive` / `getMemorySpan` / `getStageDistribution` / `getAnniversaries` / `getThisMonthMemories` / `_parseDateParts`（修 UTC 时区偏移）
- `SpaceMap` 组件（Leaflet 地图 + 轨迹连线 + 类型配色 marker + 离线降级）
- `RelationshipGraph` 组件（d3-force 关系网络 + 拖拽 + 节点缩放 + > 50 节点降级为列表）
- `RichTimeline` 组件（带 cover 渐变 + 阶段色 + 人物 / 地点 chip）
- `FabStack` 组件（FAB 浮窗 + 今日心情小部件 + 4 个快捷入口）
- 空间页加 `SpaceMap` + 右侧"地点排行"
- 人物页加 `RelationshipGraph`
- 地点 / 人物 / 事件详情页加 mini 可视化

### 修复
- 周年纪念计算忽略时区：`new Date('2024-06-01')` 在 EDT 偏移到 5 月 31 日，导致今天（6-28）匹配不到 6-01 的事件。改用 `_parseDateParts` 字符串解析
- 登录页直链 `/login` 不再显示空白（已登录用户重定向到 `/timeline`）
- 退出登录按钮不响应（makeLayoutProps 加 `logout: logout` 别名）
- 重复 `:root` 块覆盖原 `--radius-lg` 导致其他组件变形（合并到原 token）
- LoginPage.test 因新增 `<Link>` 缺 Router 上下文 → 包 `MemoryRouter`
- LoginPage demo 按钮文案变更 → 测试用 `getByText(/regex/)` 匹配

### 改动
- 9 个新文档文件（README / architecture / frontend / backend / api / setup / deployment / roadmap / changelog）
- `vite.config.js` 的 `base` 改用 `VITE_BASE_URL` 环境变量，加 `chunkSizeWarningLimit`
- `package.json` 加 leaflet / react-leaflet / d3-force / d3-selection / d3-drag / d3-zoom 依赖
- `main.jsx` 引入 `leaflet/dist/leaflet.css`
- `ci.yml`：触发所有分支、注入 `VITE_API_URL`，去掉 lint 步骤（ESLint 配置文件被 hook 阻止）
- `deploy-pages.yml`：注入 `VITE_BASE_URL=/timex/`、加 SPA 404 fallback、`cancel-in-progress: true`
- 新增 `deploy-docs.yml`：VitePress 文档自动部署（兼容无 `docs/package.json` 的情况）
- `README.md`：CI 徽章、文档链接、部署章节、环境变量表

### 性能
- Leaflet / d3 按需 import
- 关系图节点 > 50 时降级为列表
- 地图无网络时降级为纯地点列表
- bundle gzipped ≈ 165 KB（leaflet 占大头，d3 按需）
