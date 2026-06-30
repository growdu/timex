---
title: 时光机器文档
---

# 时光机器文档

> 个人成长记录与人生回忆沉淀系统 — 面向开发者与运维的完整文档

## 索引

### 新人入门
1. [快速开始](./setup.md) — 5 分钟跑起来
2. [系统架构](./architecture.md) — 数据流、模块划分、技术选型
3. [API 参考](./api.md) — 所有 REST 端点
4. [测试覆盖报告](./testing.md) — 156/152 tests / 80% 行 / Mock 约定

### 深入了解
- [前端结构](./frontend.md) — 目录、状态管理、路由、API 适配层
- [后端结构](./backend.md) — NestJS 模块、实体关系、Auth 流程
- [测试覆盖](./testing.md) — 覆盖率快照 + 添加测试的标准流程

### 部署 / 运维
- [部署指南](./deployment.md) — GitHub Pages + Docker
- [路线图 / 当前状态](./roadmap.md) — 已完成、本轮升级、下一轮候选
- [变更日志](./changelog.md) — 最近改动
- [代码健康检查](./health-check.md) — 本地与 CI 一致的体检脚本

### 已有文档（散文 / 长文）
- [产品文档](./product.md) — 产品定义、用户、问题、需求
- [设计文档](./design.md) — 信息架构、组件、交互、视觉
- [Web 原型文档](./web-prototype.md) — `web-test/` 静态原型的设计说明

## 阅读顺序建议

| 角色 | 推荐阅读 |
|---|---|
| **新加入的前端** | setup → architecture → frontend → api |
| **新加入的后端** | setup → architecture → backend → api |
| **产品 / 设计** | product → design → roadmap |
| **DevOps / 维护** | setup → deployment → changelog |
| **代码审查者** | architecture → frontend + backend → health-check → changelog |

## 项目元信息

- **仓库**：`growdu/timex`
- **技术栈**：NestJS 11 + TypeORM + PostgreSQL 16 + Redis（后端）/ React 19 + Vite + TanStack Query + Zustand（前端）
- **在线演示**：<https://growdu.github.io/timex/>
- **后端 API**：开发环境 `http://localhost:3000/api`
