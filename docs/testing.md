# 测试覆盖报告

> 后端 156 tests / 80% 行覆盖，前端 152 tests / 核心派生层 100% 覆盖

## 当前快照（2026-06-30）

### 后端

| 指标 | 值 |
|---|---|
| 测试总数 | **156 passing** |
| 文件数（spec） | **15** |
| 语句覆盖 | **77.17%** |
| 分支覆盖 | **72.62%** |
| 函数覆盖 | **64.77%** |
| 行覆盖 | **80.00%** |
| tsc 错误 | **0** |

### 前端

| 指标 | 值 |
|---|---|
| 测试总数 | **152 passing** |
| apiAdapter / lines / lineMatchers | **100%** |
| 12 个 useData hooks | **~100%** |
| Pages / components | **待补**（下一轮） |

### 100% 覆盖模块（核心）

| 模块 | 类型 | 行覆盖 |
|---|---|---|
| `people.controller` | 后端 | 100% |
| `events.controller` | 后端 | 100% |
| `places.controller` | 后端 | 100% |
| `moments.controller` | 后端 | 100% |
| `memoirs.controller` | 后端 | 100% |
| `license.controller` | 后端 | 100% |
| `auth.controller` | 后端 | 100% |
| `app.controller` | 后端 | 100% |
| `events.service` | 后端 | 100% |
| `places.service` | 后端 | 100% |
| `moments.service` | 后端 | 100% |
| `memoirs.service` | 后端 | 100% |
| `apiAdapter.js` | 前端 | 100% |
| `lines.js` | 前端 | 100% |
| `lineMatchers.js` | 前端 | 100% |

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
npm run test:watch        # watch 模式
npm run test:coverage     # 覆盖率
npm run test:ui           # Vitest UI 浏览器

# 单文件
npx vitest run src/data/apiAdapter.test.js
```

## Mock 约定（写入规范，避免反复踩坑）

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

**queryBuilder 模式**（复杂查询）：

```ts
const buildQueryBuilder = (result: [any[], number]) => {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(result),
  };
  eventsRepository.createQueryBuilder.mockReturnValue(qb);
  return qb;
};

it('should filter by stage', async () => {
  const qb = buildQueryBuilder([[], 0]);
  await service.findAll('user-1', { stage: EventStage.STUDENT });
  expect(qb.andWhere).toHaveBeenCalledWith('event.stage = :stage', { stage: EventStage.STUDENT });
});
```

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

**DTO 字段陷阱**：

```ts
// ❌ summary / mediaUrl 不在 UpdateMomentDto 上
const dto = { summary: 'X', mediaUrl: 'y' };

// ✅ 用 `as any` 或查 dto 真实字段
const dto: any = { content: 'X', title: 'Y', aiTags: ['tag1'] };
```

### 后端：Controller 测试（薄）

```ts
const mockUser = { id: 'user-1' } as any;
const mockEvent: any = { id: 'event-1', userId: 'user-1' };

it('findAll → forwards stage and pagination', async () => {
  eventsService.findAll.mockResolvedValue({ events: [mockEvent], total: 1 });

  await controller.findAll(mockUser, EventStage.STUDENT, 1, 20);

  expect(eventsService.findAll).toHaveBeenCalledWith('user-1', {
    stage: EventStage.STUDENT,
    page: 1,
    limit: 20,
  });
});
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

## 测试哲学

1. **业务逻辑 100% 覆盖**（services / pure functions）— 这是核心价值
2. **Controllers 100% 覆盖**（薄转发）— 防止参数解构错误
3. **DTO / Entity 不测**（TypeORM 已测）
4. **Pages 暂跳**（E2E 替代，或 Phase 13）
5. **Mock strict** — 实际值 / mockReturnThis 链验证行为而不只调过

## CI 集成

`.github/workflows/ci.yml` 已包含：

- `backend-test`：lint + typecheck + test
- `frontend-test`：lint + test + build
- `health-check`（每天凌晨 + PR）：`./scripts/health-check.sh all`

## 添加测试的标准流程

1. 写 spec（与被测文件同目录 `*.spec.ts`）
2. 跑测试：`npm test -- src/xxx/xxx.spec.ts`
3. 跑覆盖率：`npm run test:cov` 看新模块行覆盖
4. 跑 tsc：`cd backend && npx tsc --noEmit`
5. 跑 lint：`npm run lint`
6. 全过 → commit

## 已知 / 故意留下的低覆盖

| 模块 | 覆盖 | 原因 |
|---|---|---|
| `app.service` | 50% | 仅 `getHello()`，无害 |
| 某 Postgres / Redis glue | ~50% | 集成层用 E2E 替代 |
| Pages (frontend) | ~5% | E2E / Phase 13 计划补 |

