# 个人画像功能 — 需求文档

> 状态：Draft v1（2026-10-12）
> 作者：Mavis（brainstorming 流）
> 设计文档：[docs/superpowers/specs/2026-10-12-face-profile-design.md](../superpowers/specs/2026-10-12-face-profile-design.md)

## 1. 背景与机会

### 1.1 现状

时光机器以「时间 / 空间 / 人物」三维度组织用户素材（参见 [product.md §6.3](../product.md)）。其中：

- **时间维度**：天然完整，所有 moment 自带 `taken_at`
- **空间维度**：每张 moment 可选 `latitude / longitude`，已与 `places` 关联
- **人物维度**：依赖用户在创建 moment 时手动指定 `person_id`，系统未能自动识别"某人在图中出现"

随着用户素材从"几十张"增长到"几千张、上万张"，手动标注每位出现人物变得越来越不可持续。结果就是 `ai_tags` 字段里积累的标签（来自 `image-tag` AI 任务）只是"场景/物体"层面（"日落、海滩、笑脸"），无法支撑"找我女儿小雨所有照片"这种**个体级**检索。

### 1.2 用户痛点

调研 3 位种子用户（demo / maker / family）发现以下高频诉求：

1. **自己照片找不回**：用户问"我 30 岁那年都在哪玩过"，期望系统能自动把所有含自己的照片聚齐
2. **朋友/家人聚合**：用户问"我和老婆过去 3 年都去过哪里"，期望系统自动匹配两人共同出现的照片
3. **手动打标太累**：现有 600+ 张照片、20+ 位人物，全靠手动关联 `event_people` 不现实

### 1.3 产品机会

引入**人脸识别**层，让"个人画像"从一类用户事件变成可自动化、可检索的实体：

- 把每位用户从"被分散在图像中的人脸"提升为 timex 的**一等公民**（虽然不必然新建实体，但语义升级）
- 与现有 `people` 实体双向映射：UI 上不变，底层新增 `face_profile`
- 与现有 6 条线 / 时间线 / 空间地图形成 **第四个浏览入口**（按人物）

### 1.4 商业价值

- **差异化**：现有竞品（Google Photos、Apple Photos）已有人脸识别但都是"封闭"。timex 可结合"个人时刻"叙事
- **粘性**：找到越多过去的"自己 / 朋友"，用户越难迁移数据
- **可控成本**：可走「云优先 + 本地 InsightFace fallback」，用户量大时降级本地，避免云成本爆炸

### 1.5 范围澄清（2026-10-12 用户决策）

本期 v1 **仅做单 self 档案**，每个登录用户对应一个人脸档案；不为 people 实体建立 face profile。
理由：用户首要诉求是"找回过去的自己"，先把 self 做扎实。person face profile 留待 v1.x 扩展。
由此带来的简化：

- 不需要 `people.is_self` 列、不需要"懒创建 self person"逻辑
- 不需要 PersonPage 新增 Tab
- 不需要 PersonsList 路径
- 数据表使用 `user_face_embeddings`（直接挂 user_id），不再走 person 维度

---

## 2. 目标与成功标准

### 2.1 业务目标

1. 用户可为自己建一个持久「面孔档案」并找回自己出现过的所有素材
2. 用户可为任何 `person` 关联面孔档案并检索该人物出现过的素材
3. 检索结果以时间线 / 人物聚类 / 地点地图三个视图呈现，可跨视图钻取

### 2.2 成功指标（建议）

| 指标 | 目标 | 度量方式 |
|---|---|---|
| Person hit precision | ≥ 80%（用户抽样验证 100 次检索，至少 80 次"命中"是用户期望的结果）| 后续人审 |
| 处理吞吐 | 单张 5MB 以内照片 ≤ 2s 结束 face-detection（含云端）| 性能测试 |
| 入库覆盖率 | 历史照片回填 ≥ 95% 成功 | 监控 |
| UI 闭环率 | /faces 入口 → 完成"找自己/找朋友"动作 ≥ 50% 访问 | 埋点 |

### 2.3 非目标（本期不做）

- ❌ 多脸追踪 / 视频人脸追踪（仅做照片）
- ❌ 自动触发（上传即处理）—— 本期仅手动 + 一次 batch
- ❌ 跨用户人脸聚类（"我和你可能是同一个人"）—— 隐私边界
- ❌ 实时人脸识别（live camera）
- ❌ 用人脸做认证 / 登录

---

## 3. 目标用户与场景

### 3.1 典型用户（沿用 product.md §3.2）

- **画像 A — 持续记录型**：用户 A（demo）已经把 6 年素材全量导入，希望快速"看自己的过去"
- **画像 B — 阶段整理型**：用户 B（maker 周屿）已经积累 5 年创业素材，希望"找到自己出现的所有照片"
- **画像 C — 情感沉淀型**：用户 C（family 沈棠）希望"我和孩子他爸的这些年"自动成档

### 3.2 核心场景

#### 场景 S1 — 建立我的画像

1. 用户首次打开 `/faces`
2. 系统检测到当前 user 没有任何 `user_face_embeddings` 行；显示 onboarding 面板
3. UI 引导用户上传 1-N 张本人照片作为参考（推荐 3-5 张）
4. 上传后系统入队 `face-embed` AI job，每张参考照片抽出 512-d embedding，写入 `user_face_embeddings`
5. job 完成后 UI 出现「找我的照片」主按钮

#### 场景 S2 — 找我的照片

1. 用户点击「找我的照片」
2. 后端从 `user_face_embeddings` 拿 query embedding，对当前 user 的所有 `moment_faces` 做 ANN 检索
3. 结果按相似度阈值过滤 + topK 截断
4. 返回命中 moment 列表
5. 前端三 Tab 视图呈现：时间线（按 taken_at 倒序）/ 人物（命中 moment 的 event_people 聚合）/ 地点（命中 moment 的 place 聚合）

#### 场景 S3 — 历史照片回填

1. 用户首次进入 `/faces`，底部出现「一次性回填」按钮
2. 点击触发 `POST /api/faces/backfill`（异步、可长时间运行）
3. 后端遍历当前 user 所有 photo 类型的 moment，逐个入队 `face-extract` job
4. UI 通过 `useJobPolling` 实时显示进度（已处理 / 总数 / 失败数）
5. job 完成后刷新 `/faces`，所有命中即可查询

### 3.3 跨场景规则（隐私与边界）

- 用户**只能检索自己的素材**，跨用户隔离，由 Service 层强制 `userId` 过滤
- 一个 user **只对应一套 self face profile**（不存在多档案 management）
- 已删除 moment 的 `moment_faces` 由 FK `ON DELETE CASCADE` 自动清理
- face profile embedding **不外传**给前端（保持向量），只返回 top-K 命中与相似度

---

## 4. 功能边界

### 4.1 v1 必做

- [ ] DB migration：`user_face_embeddings` 表 + `moment_faces` 表 + pgvector 扩展
- [ ] 后端 `face` 模块：`FaceService`（CRUD self profile + 相似度搜索）、`FaceController`、`FaceProvider` 抽象（cloud + local + mock）
- [ ] 云端 `face-embed` provider（HTTP，OpenAI 风格抽象）：用户可用环境变量切换实际云
- [ ] 本地 `face-embed` provider（HTTP 客户端 + InsightFace sidecar 或 mock）
- [ ] AI job `kind: 'face-embed' | 'face-extract'` 接入 `AiService` 异步框架（复用 ai_jobs 表）
- [ ] API：`POST /api/faces/me/references`（添加参考图）/ `GET /api/faces/me`（查询 self profile）/ `POST /api/faces/search`（检索）/ `POST /api/faces/backfill`（批量提取）/ `POST /api/faces/moments/:id/extract`（单张提取）
- [ ] 前端 `/faces` 总览页：单 self profile + 三 Tab 结果视图（Timeline / People / Places）
- [ ] 前端 Moment 卡增补"提取人脸"按钮 + 提取后状态展示
- [ ] 多租户隔离：所有 Repository / Service 强制 `userId` 过滤（与既有架构同型）
- [ ] 单元 + 集成测试：与既有测试栈同型（Jest + supertest）

### 4.2 v1 不做（推迟）

- ⏸ 多档案管理（一个 user 多套 self profile）：超出范围
- ⏸ 为 person 实体建立 face profile：v1.x 扩展
- ⏸ 自动触发（上传即处理）：v1.1
- ⏸ 视频人脸识别：v1.1
- ⏸ 跨用户合影提醒：v2.0
- ⏸ 人脸聚类（HDBSCAN 自动发现匿名人物）：v2.0
- ⏸ Vector quantization / IVF-PQ 压缩：v2.0（10w+ 阶段才需要）

### 4.3 与现有架构的对齐

| 维度 | 现有模式 | 本功能延伸 |
|---|---|---|
| AI 异步任务 | ai_jobs 表 + runJob + provider 抽象 | 新增 `face-embed` / `face-extract` / `face-match` 三种 kind，复用 AiService |
| 数据库迁移 | `scripts/migrations/*.sql` + `migrate.ts` 运行器 | 新增 `2026_10_12_face_profile.sql` |
| Repository / Service | userId 强隔离、controller 接 `@CurrentUser()` | 同 |
| 上传 | S3 直传 + upload module | 复用 upload API（不重写） |
| 前端数据流 | TanStack Query + 适配层 `data/apiAdapter.js` | 同，加 `api/faces.js` + `data/faceAdapter.js` |
| 路由 | `/login` `/dashboard` 等 | 新增 `/faces` |
| 表单 / 上传 | 已有 `UploadModal` 等 | 复用 |

---

## 5. 验收标准

### 5.1 功能验收

| 用例 | 期望 |
|---|---|
| US-001 首次进入 `/faces` | 无 self profile 时显示 onboarding 面板，无需创建 person |
| US-002 上传本人 3 张参考图 | 3 个 AI job 全部 succeeded，`user_face_embeddings` 写入 3 行 |
| US-003 点"找我的照片" | 返回本人出现的所有 moment，按时间线 Tab 显示至少 N 张（N>0） |
| US-004 切换到"人物" Tab | 显示与本人同框的其他 person 聚类（基于 `event_people` 关联），点击下钻过滤时间线 |
| US-005 切换到"地点" Tab | 在地图上显示与本人有关的地点聚合 marker |
| US-006 点击 backfill | 已存在的 photos 数量 X，全部处理完，进度条 100% |
| US-007 删除 moment | `moment_faces` 自动级联删除 |
| US-008 跨用户访问 | 401 / 403 / 404（不允许看到别 user 的 face profile 数据） |
| US-009 上传重复参考图 | 抛 409 conflict（同一 userId 下 sourceUrl 重复检测） |

### 5.2 非功能验收

| 维度 | 标准 |
|---|---|
| 性能 | 单次 face-embed ≤ 2s（云端） / ≤ 1s（本地 buffalo_l + GPU）；top-100 检索 ≤ 100ms |
| 可靠性 | face-service 不可达时降级至 mock（返回空 embeddings + warn log，不让请求 500） |
| 可观测 | ai_jobs 表保留所有 face-* job 的运行记录；可查 /ai/jobs?kind=face-embed 列表 |
| 安全 | 所有 endpoint 走 SessionAuthGuard；Service 强制 userId 过滤；embedding 不外发到前端 |
| 隐私 | self person 强隔离；不允许 A 给 B 的 self 加参考图 |
| 兼容性 | 不破坏现有 ai_jobs / moments / people 表结构 |
| 部署 | FACE_PROVIDER 默认 mock，云/本地任意切换；现有 docker-compose 无须新增服务（cloud 走 HTTP） |

### 5.3 测试覆盖（按项目惯例）

- 单元测试（Jest）：face service、provider、controller、guard、distance 计算
- 集成测试（supertest）：完整 HTTP 流，含鉴权
- 前端组件测试：SelfProfileCard、PersonsList、Tab 切换、Upload 按钮
- 测试数：face 模块新增 ≥ 20 单测 + ≥ 6 集成测试
- 全部随 commit 提交一次；新功能涉及的所有代码必须有对应测试覆盖

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 云 API 成本失控 | 中 | 月度 quota 配额、admin 监控、提供 FACE_PROVIDER=mock 兜底 |
| InsightFace 模型下载被 GFW 阻断 | 中 | 模型文件打包进 Docker 镜像 / 提供 URL 在 .env 配置 |
| pgvector 与现有 PostgreSQL 镜像不兼容 | 中 | 锁定 `pgvector/pgvector:pg16` 作为 base；CI 跑一遍 migration |
| 用户上传含隐私照片（如别人孩子） | 低 | 强调多租户隔离；支持删除 moment 即自动级联 face data |
| AI 识别精度误识（家人被识别成"别人"） | 中 | 阈值参数化、UI 显示置信度、用户可手动标记"非此人" |
| 大表 vacuum | 低 | ivfflat 索引创建在线操作，少量数据可重建 |

---

## 7. 测试策略

按用户偏好（commit + 测试），本功能：

- 每个子模块完成 → 单元测试 + 集成测试全绿 → commit
- 提交粒度建议（参见计划文档 `docs/superpowers/plans/2026-10-12-face-profile.md` 任务拆分）：
  1. migration（加表 + pgvector） + 单测
  2. face entity / repository + 单测
  3. face provider 接口 + mock provider + 单测
  4. cloud/local provider + 单测
  5. face service（self CRUD + 检索） + 单测
  6. face controller + 集成测试
  7. ai job 接入（face-embed/face-extract） + 单测
  8. 检索接口（pgvector） + 集成测试
  9. batch backfill + 集成测试
  10. 前端 /faces 总览页（1-2 commit）
  11. 前端 Moment Detail 按钮（1 commit）

每 commit 含：
- 实现代码
- 单元测试（覆盖 service / utility / pure function）
- 集成测试（覆盖 controller / API / 端到端）
- 通过 `npm run test` 与 `npm run lint`

---

## 8. 后续路径（v1.x / v2）

| 版本 | 内容 |
|---|---|
| v1.0 | 本文档范围 |
| v1.1 | 上传自动入队 + 周期性 rebuild + 视频封面帧人脸 |
| v1.2 | person 头像自动从最强 face cropping 生成（取代手动 avatar 上传） |
| v2.0 | face cluster + 命名向导（让用户为匿名人物起名并归并 person） |
| v2.x | 跨用户协作、合影统计 |

---

## 9. 附录

### 9.1 关键术语表

| 术语 | 定义 |
|---|---|
| self face profile | 某 user 的多张本人参考照片 + 各自的 512-d embedding（直接挂 user_id，无 person 中间层） |
| face reference | 一张本人参考照片 + 检出的人脸 bbox + embedding（行：`user_face_embeddings`） |
| moment face | moment 中检测出的一个具体人脸（embedding + bbox，行：`moment_faces`） |
| ANN | Approximate Nearest Neighbor，本次用 pgvector ivfflat |

### 9.2 参考

- [docs/product.md §6.3 三维联动展现](../product.md)
- [docs/AI_INTEGRATION.md](../AI_INTEGRATION.md)
- [docs/superpowers/specs/2026-10-12-face-profile-design.md](../superpowers/specs/2026-10-12-face-profile-design.md)
- [docs/architecture.md §6 条线派生](../architecture.md)（前端派生模式参考）
- InsightFace buffalo_l（512-d embedding）
- pgvector 0.5+ / ivfflat ANN 索引（≤10w 行）
