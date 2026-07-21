# 测试覆盖报告

> 后端 234 tests / 68.14% 行覆盖，前端 264 tests / 整体 48.1% 行覆盖（Pages 47.69%，核心派生层 100% 覆盖）

## 当前快照（2026-07-21）

### 后端

| 指标 | 值 |
|---|---|
| 测试总数 | **234 passing** |
| 文件数（spec） | **25** |
| 语句覆盖 | **68.14%** |
| 行覆盖 | **69.71%**（与历次持平） |
| tsc 错误 | **0** |

### 前端

| 指标 | 值 |
|---|---|
| 测试总数 | **264 passing** |
| 文件数（spec） | **19** |
| **整体覆盖** | **48.10% / 74.47% branch / 67.29% funcs** |
| apiAdapter / lines / lineMatchers | **100%** |
| 12 个 useData hooks | **~100%** |
| FabStack / LineCard / RichTimeline | **97–100%** |
| AiActionButton | **93.61%** |
| Pages 总覆盖 | **47.69%**（DashboardPage 100%） |

### 100% 覆盖模块（关键清单）

| 模块 | 类型 | 行覆盖 |
|---|---|---|
| `DashboardPage` | 前端 Page | **100%** |
| `LinesPage` | 前端 Page | **98.43%** |
| `MemoirPage` | 前端 Page | **98.28%** |
| `PeoplePage` | 前端 Page | **97.67%** |
| `SpacePage` | 前端 Page | **95.38%** |
| `TimelinePage` | 前端 Page | **89.47%** |
| `FabStack` | 前端组件 | **100%** |
| `LineCard` | 前端组件 | **100%** |
| `RichTimeline` | 前端组件 | **97.22%** |
| `CleanHeader` | 前端组件 | **100%** |
| `AiActionButton` | 前端组件 | **93.61%** |
| `apiAdapter.js` | 前端数据 | **100%** |
| `lines.js` | 前端数据 | **100%** |
| `lineMatchers.js` | 前端数据 | **85–100%** |
| `store/index.js` | 前端状态 | **90.9%** |
| `people/events/places/moments/memoirs/license/auth/upload.controller` | 后端 | **100%** |
| `events/places/moments/memoirs/auth/license/upload.service` | 后端 | **100%** |

## Pages 测试（2026-07-21 新增）

本轮一次性补齐 6 个复杂 Pages 测试，全部走 `MemoryRouter` + 真实 `createApiAdapter`（不 mock 业务逻辑），并共享 `__fixtures__/`：

- `src/pages/__fixtures__/data.js`：sampleEvents / samplePeople / samplePlaces / sampleMemoirs + sampleDashboardStats
- `src/pages/__fixtures__/layout.jsx`：极小 Layout mock + rightRail 提取

测试覆盖：

- 加载/错误/空态/有数据四种典型状态
- 详情区渲染（Shared Event Flow / Candidate Event Pool 等）
- 用户交互：setUiState 调用、按钮点击触发 onLogin/onAddEntity
- 路由参数联动：`/lines/:lineId` 选中态
- Layout activeNav 透传
- 反向断言：无 api / 无 data 时 0 计数降级

合计 **60 个 Pages 测试 100% 通过，平均覆盖 96%**。

## 运行测试

### 一键体检

```bash
./scripts/health-check.sh        # lint + typecheck + test + build
./scripts/health-check.sh coverage  # 含覆盖率报告
```

### 后端

```bash
cd backend

npm test                  # 全部测试
npm run test:watch        # watch 模式
npm run test:cov          # 覆盖率
npm run test:ci           # CI 模式（无 watch）

# 单文件 / 模式
npx jest src/people
npx jest -t 'should find'
```

### 前端

```bash
cd frontend

npm test                  # 全部测试
npm run test:run          # CI 模式
npm run test:coverage     # 覆盖率

# 单文件
npx vitest run src/pages/DashboardPage.test.jsx
```

## Mock 约定

### 后端：NestJS service 测试

**最小样板**（mock repos + service）：

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { Event } from './event.entity';

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: { findOne: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    eventsRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: eventsRepository },
      ],
    }).compile();

    service = module.get(EventsService);
  });
});
```

**queryBuilder 模式**（复杂查询）：见 `events.service.spec.ts`

**enum 字面量陷阱**（tsc 严格模式）：

```ts
// ❌ 会被 tsc 拒绝：'core' 不是 EventStage 字面量
await service.findAll('user-1', { stage: 'core' });

// ✅ 改用 enum 值
import { EventStage } from './event-stage.enum';
await service.findAll('user-1', { stage: EventStage.STUDENT });
```

**fixture 类型陷阱**（`Partial<Entity>` 字段不全）：

```ts
// ❌ tsc 拒绝缺字段
const mockEvent: Partial<Event> = { id: 'event-1' };

// ✅ Mock fixture 统一用 `as any`
const mockEvent: any = { id: 'event-1', userId: 'user-1' };
```

### 前端：Vitest 单元测试

```js
import { describe, it, expect } from 'vitest';
import { getEventsByLine } from './apiAdapter';

describe('getEventsByLine', () => {
  it('filters events to a single line', () => {
    const events = [
      { id: 1, personIds: ['p-friend'] },
      { id: 2, personIds: [] },
    ];
    const result = getEventsByLine(events, 'friends');
    expect(result.map(e => e.id)).toEqual([1]);
  });
});
```

**Mock fetch 模式**（hooks / api）：

```js
import { vi } from 'vitest';

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: [] }),
  })
);
```

### 前端：Pages 组件测试（共享 fixtures）

```js
import { MemoryRouter } from "react-router-dom";
import SpacePage from "./SpacePage.jsx";
import { makeApi, sampleEvents, samplePeople, samplePlaces } from "./__fixtures__/data.js";
import { makeLayoutMock } from "./__fixtures__/layout.jsx";

const Layout = makeLayoutMock();
const api = makeApi();
const data = { events: sampleEvents, people: samplePeople, places: samplePlaces };

render(
  <MemoryRouter initialEntries={["/space"]}>
    <SpacePage
      Layout={Layout}
      session={{ name: "测试者" }}
      uiState={{ stage: "all" }}
      filteredEvents={sampleEvents}
      setUiState={vi.fn()}
      logout={vi.fn()}
      api={api}
      selectedPlace={samplePlaces[0]}
      data={data}
    />
  </MemoryRouter>
);
```

**注意事项**：

1. **`event.people` 字段是 Person 对象数组**，不是字符串名数组 — 后端 TypeORM `ManyToMany` 返回对象。`api.getEventPeopleIds(e)` 仅在 `people` 是对象数组时返回 ID 列表
2. Layout mock 接收 `rightRail` 作为 prop，挂到 `<aside>` 内
3. setUiState 被调用时通过 `vi.fn()` 捕获，断言 `{ key: value }` 匹配

### 反向断言技巧

测试"没有出现 X"或"出现 N 次"：

```js
// 不出现
expect(screen.queryByText("...")).toBeNull();

// 多个匹配
expect(screen.getAllByText("...").length).toBeGreaterThan(0);

// split textNode（h2 含变量）
expect(screen.getByText(/的共同地点/)).toBeTruthy();
```

## 测试哲学

1. **业务逻辑 100% 覆盖**（services / pure functions）— 核心价值
2. **Controllers 100% 覆盖**（薄转发）— 防止参数解构错误
3. **DTO / Entity 不测**（TypeORM 已测）
4. **Pages 必须真实渲染**（不 mock 业务逻辑）— 走 `__fixtures__/` 共享数据
5. **Mock strict** — 实际值 / mockReturnThis 链验证行为而不只调过

## CI 集成

`.github/workflows/ci.yml` 包含：

- `backend-test`：lint + typecheck + test
- `frontend-test`：lint + test + build
- `health-check`（每天凌晨 + PR）：`./scripts/health-check.sh all`

## 添加测试的标准流程

1. 写 spec（与被测文件同目录 `*.spec.ts` / `*.test.jsx`）
2. 跑测试：`npm test -- src/xxx/xxx.spec.ts` / `npx vitest run src/pages/XxxPage.test.jsx`
3. 跑覆盖率：后端 `npm run test:cov`，前端 `npx vitest run --coverage`
4. 跑 tsc：`cd backend && npx tsc --noEmit`
5. 跑 lint：`npm run lint`
6. 全过 → commit

## 已知 / 故意留下的低覆盖

| 模块 | 覆盖 | 原因 |
|---|---|---|
| `App.jsx` | 0% | Router 入口，E2E 覆盖 |
| `main.jsx` | 0% | 启动文件 |
| `AppLayout.jsx` | 0% | 容器组件，由 Pages fixtures 间接覆盖 |
| 大部分 `src/api/*.js` | 0% | 网络层，被 MSW handlers 替代 |
| `BlogPage / DocsPage / EventPage / ExportAlbum / ExportStorybook / ExportTimeline / LandingPage / LicensePage / PersonPage / PlacePage` | 0% | 未补 Page 测试（roadmap 下一轮候选） |
| 后端 `ai.controller` | 0% | AI 集成层，待 Mock provider 测试补 |
| 后端 `jwt.strategy` | 0% | 守卫集成层，E2E 覆盖 |
| 后端 `request-logger.middleware` / `security-headers.middleware` | 0% | 中间件，E2E 覆盖 |

## 已知 warning（非错误）

- 前端 `no-unused-vars` 4 处新增（AppLayout 3 + fixtures/layout 1），技术债，分批清理
- 后端 `main.ts` `no-unsafe-argument` 2 处：装饰器拿 req/res 是 any，无法根除
- **后端 eslint 在 ESLint 9.x + typescript-eslint v8 下 plugin namespace resolve 失败**（pre-existing，与本次改动无关）；CI 当前仅依赖 `tsc --noEmit` 替代品为真值，lint 阶段会 warn 但不影响 test/typecheck/build 通过
