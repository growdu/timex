# 时光机器 - 个人成长记录系统

一款面向个人成长记录与人生回忆沉淀的多模态时间档案产品。

## 🚀 快速开始

### 1. 启动数据库服务

```bash
docker-compose up -d
```

这将启动 PostgreSQL 和 Redis 服务。

### 2. 启动后端

```bash
cd backend
npm install
npm run start:dev
```

后端服务将运行在 http://localhost:3000

### 3. 启动前端（开发模式）

```bash
cd frontend
npm install
npm run dev
```

前端服务将运行在 http://localhost:5173

### 4. 打开浏览器

访问 http://localhost:5173 即可体验。

## 📁 项目结构

```
timex/
├── backend/                 # NestJS 后端
│   ├── src/
│   │   ├── auth/          # 认证模块
│   │   ├── users/         # 用户模块
│   │   ├── license/       # License授权模块
│   │   ├── devices/       # 设备管理模块
│   │   ├── events/        # 事件模块
│   │   ├── moments/       # 瞬间/素材模块
│   │   ├── people/        # 人物模块
│   │   ├── places/        # 地点模块
│   │   ├── memoirs/       # 回忆录模块
│   │   └── config/        # 配置模块
│   └── .env.example       # 环境变量示例
│
├── frontend/               # React + Vite 前端
│   ├── src/
│   │   ├── api/          # API 调用层
│   │   ├── store/        # Zustand 状态管理
│   │   ├── mocks/        # MSW Mock 服务
│   │   ├── pages/        # 页面组件
│   │   └── components/   # 通用组件
│   └── index.html
│
├── docs/                  # 产品设计文档
│   ├── product.md        # 产品定义
│   ├── design.md         # 设计文档
│   └── web-prototype.md  # Web原型说明
│
├── web-test/             # 高保真静态原型
└── docker-compose.yml     # 数据库服务配置
```

## 💡 商业模式

| 类型 | 说明 |
|------|------|
| **License买断** | Lifetime 一次性买断（¥399-599），Annual 年费（¥99/年） |
| **增值服务** | 打印相册、定制印刷、高级模板、AI增强包 |
| **试用机制** | 14天全功能Trial |

## 🔑 核心API

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取用户信息

### License
- `POST /api/license/activate` - 激活License
- `GET /api/license/status` - 获取License状态
- `GET /api/license/devices` - 获取已注册设备

### 内容
- `GET /api/events` - 获取事件列表
- `GET /api/events/timeline` - 获取时间线
- `GET /api/people` - 获取人物列表
- `GET /api/places` - 获取地点列表
- `GET /api/memoirs` - 获取回忆录列表

## 🛠️ 技术栈

**后端**: NestJS + TypeORM + PostgreSQL + Redis
**前端**: React 18 + Vite + React Router + Zustand + TanStack Query + MSW
**存储**: 阿里云OSS（生产环境）
