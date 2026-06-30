# 前端结构

## 技术栈

- **React 19** + **Vite 6** SPA
- **React Router v6** 路由
- **TanStack Query v5** 数据获取 / 缓存
- **Zustand** UI 状态
- **Axios** HTTP 客户端
- **Vitest** + **React Testing Library** 单元测试
- **Leaflet** + **react-leaflet** 地图（空间页）
- **d3-force** 关系图（人物页）
- **VitePress** 文档站点

## 目录树

```
frontend/
├── index.html                  # 入口 HTML
├── vite.config.js              # Vite 配置（含 base path 用于 GitHub Pages）
├── package.json
├── public/                     # 静态资源
├── src/
│   ├── main.jsx                # ReactDOM.createRoot + BrowserRouter
│   ├── App.jsx                 # 路由表 + 全局 Provider
│   ├── styles.css              # 全局样式 + 设计 token
│   │
│   ├── api/
│   │   ├── client.js           # axios 实例（自动注入 token + 错误处理）
│   │   ├── auth.js             # /api/auth/*
│   │   ├── events.js           # /api/events/*
│   │   ├── places.js           # /api/places/*
│   │   ├── people.js           # /api/people/*
│   │   ├── memoirs.js          # /api/memoirs/*
│   │   ├── moments.js          # /api/moments/*
│   │   └── license.js          # /api/license/*
│   │
│   ├── components/             # 共享 UI 组件
│   │   ├── AppLayout.jsx       # 整体布局（顶栏 + 左导轨 + 中舞台 + 右栏）
│   │   ├── SpaceMap.jsx        # Leaflet 地图
│   │   ├── RelationshipGraph.jsx  # d3-force 关系图
│   │   ├── RichTimeline.jsx    # 垂直时间线
│   │   └── UploadModal.jsx     # 上传弹窗
│   │
│   ├── pages/                  # 路由级页面
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── TimelinePage.jsx    # 首页 / 时间线
│   │   ├── SpacePage.jsx       # /space
│   │   ├── PeoplePage.jsx      # /people
│   │   ├── MemoirPage.jsx      # /memoir
│   │   ├── LicensePage.jsx     # /license
│   │   ├── EventPage.jsx       # /events/:eventId
│   │   ├── PlacePage.jsx       # /places/:placeId
│   │   └── PersonPage.jsx      # /people/:personId/detail
│   │
│   ├── store/
│   │   ├── index.js            # Zustand store
│   │   ├── auth.js             # （如拆分）
│   │   └── ui.js               # UI 筛选状态
│   │
│   ├── data/
│   │   ├── apiAdapter.js       # 派生数据：filterEvents、getAnniversaries、getEventsByLine 等
│   │   ├── lines.js            # 6 条线元数据
│   │   └── lineMatchers.js     # 关系线角色关键词正则
│   │
│   ├── mock/                   # 开发期 fallback（已弃用，逐步由 API 替代）
│   └── test/                   # 测试 setup
└── package.json
```

## 状态管理

### 服务端状态：TanStack Query
所有从后端拉取的数据走 `useQuery` / `useMutation`，queryKey 形如：

```js
['events']                          // 全部事件
['events', 'timeline', options]     // 时间线
['people', { stage: 'family' }]     // 带筛选
['memoirs', options]
```

修改数据后通过 `queryClient.invalidateQueries({ queryKey: [...] })` 失效缓存。

### 客户端状态：Zustand
- `useUIStore` —— 当前选中的事件 / 人物 / 地点、年份 / 阶段筛选、关键词搜索
- `useAuthStore` —— 当前用户、token（实际 token 在 localStorage，store 仅镜像）

### 状态归属决策

| 类型 | 归属 | 例子 |
|---|---|---|
| 跨页面共享的 UI 状态 | Zustand | 选中的 eventId、筛选条件 |
| 服务端权威数据 | TanStack Query | events 列表、people 列表 |
| 表单临时态 | 组件 useState | 登录表单、章节编辑器 |
| 主题 / 偏好 | localStorage | 主题、密度 |

## 路由表

| 路径 | 页面 | 鉴权 |
|---|---|---|
| `/` | 重定向到 `/timeline` | — |
| `/login` | LoginPage | 未登录可访问 |
| `/register` | RegisterPage | 未登录可访问 |
| `/timeline` | TimelinePage（首页） | 需登录 |
| `/space` | SpacePage | 需登录 |
| `/people` | PeoplePage | 需登录 |
| `/memoir` | MemoirPage | 需登录 |
| `/license` | LicensePage | 需登录 |
| `/events/:eventId` | EventPage | 需登录 |
| `/places/:placeId` | PlacePage | 需登录 |
| `/people/:personId/detail` | PersonPage | 需登录 |

未登录用户访问受保护路由时，重定向到 `/login`；已登录用户访问 `/login` 或 `/register` 时重定向到 `/timeline`。

## API 适配层 `data/apiAdapter.js`

由于后端返回的是**原始数据**（events 数组、places 数组），而前端需要大量**派生**计算（按年聚合、按人筛选、周年纪念、阶段分布、JSON-safe 关系图节点），`apiAdapter.js` 把所有派生逻辑集中在一起。它是一个工厂函数：

```js
const api = createApiAdapter({ events, people, places, memoirs });
api.filterEvents(events, { year: 2024, stage: 'family' });
api.getAnniversaries(events, new Date());
api.getStageDistribution(events);
// 6 条线维度
api.getEventsByLine('emotion', events);
api.getLineStats('career', events);
api.getAllLines(events);
```

页面只调用 `api.*` 方法，不直接操作原始数据，便于 mock 替换和测试。

## 6 条线派生

`data/lines.js` 维护 6 条线元数据（id / label / icon / gradient / blurb），`data/lineMatchers.js` 用关键词正则 + 阶段映射把事件归到「感情 / 事业 / 亲情 / 朋友」4 条关系线（时间 / 空间是结构维度直接由 place / date 判定）。`apiAdapter` 暴露 `getEventsByLine / getLineStats / getAllLines` 三个方法供 hub / 详情页 / TimelinePage 集成使用，**零 DB / 零 API 改动**。详见 [architecture.md](./architecture.md#6-条线派生逻辑)。

## 设计 Token

CSS 变量集中声明在 `:root`，所有页面统一引用：

```css
--bg / --paper / --paper-strong / --line
--ink / --text / --muted
--navy / --teal / --rust / --amber       4 个品牌色
--radius-xl / --radius-lg / --radius-md  3 档圆角
--font-sans / --font-serif               2 个字体栈
--radius-pill: 999px                     胶囊
--shadow                                  通用阴影
```

## 测试

- `src/test/setup.js` —— Vitest 初始化
- `*.test.jsx` 与被测文件同目录（如 `LoginPage.test.jsx`）
- 跑 `npm run test:run` 单次跑测试，`npm test` 监听模式

## 性能注意事项

- Leaflet / d3 都按需 import：`import { MapContainer } from 'react-leaflet'`
- 大列表（> 50 节点）使用虚拟化（react-window，待集成）
- 路由切换使用 React Router 的 lazy()（已为 `/memoir` / `/license` 等做准备）
