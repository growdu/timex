---
layout: home
title: 时光机器
hero:
  name: 时光机器
  text: 个人成长记录与人生回忆沉淀系统
  tagline: 时间 · 空间 · 感情 · 事业 · 亲情 · 朋友 — 6 条线维度导航
  actions:
    - theme: brand
      text: 快速开始
      link: /setup
    - theme: alt
      text: 查看架构
      link: /architecture
    - theme: alt
      text: API 参考 →
      link: /api
features:
  - title: 6 条线维度导航
    details: 把所有记忆从「什么时候 / 在哪儿 / 和谁」三个角度重新切一遍：时间 / 空间 / 感情 / 事业 / 亲情 / 朋友。
  - title: 多模态素材 + 回忆录
    details: 事件 / 地点 / 人物 / 素材 + 章节式回忆录，支持公开分享链接与打印导出 PDF。
  - title: 自部署 / 数据自主
    details: NestJS + PostgreSQL + MinIO 一键起；多租户隔离，每位用户独立数据空间。
---

## 开发者文档

### 新人入门

1. [快速开始](/setup) — 5 分钟跑起来
2. [系统架构](/architecture) — 数据流、模块划分、技术选型
3. [API 参考](/api) — 所有 REST 端点
4. [测试覆盖报告](/testing) — 264 + 234 tests passing / Pages 平均覆盖 96%

### 深入了解

- [前端结构](/frontend) — 目录、状态管理、路由、API 适配层
- [后端结构](/backend) — NestJS 模块、实体关系、Auth 流程
- [对象存储 / OSS 集成](/upload) — MinIO / Aliyun OSS / AWS S3 切换指南
- [AI 集成](/AI_INTEGRATION) — 三种 provider + 云优先路由

### 部署 / 运维

- [部署指南](/deployment) — GitHub Pages + Docker
- [代码健康检查](/health-check) — 本地与 CI 一致的体检脚本
- [路线图](/roadmap) — 已完成、本轮升级、下一轮候选
- [变更日志](/changelog) — 最近改动

### 产品 & 设计

- [产品文档](/product) — 产品定义、用户、问题、需求
- [设计文档](/design) — 信息架构、组件、交互、视觉
- [用户手册](/user-guide)
- [Web 原型归档说明](/web-prototype-archive)

## 阅读顺序建议

| 角色 | 推荐阅读 |
|---|---|
| **新加入的前端** | setup → architecture → frontend → api |
| **新加入的后端** | setup → architecture → backend → api |
| **产品 / 设计** | product → design → roadmap |
| **DevOps / 维护** | setup → deployment → changelog |
| **代码审查者** | architecture → frontend + backend → health-check → changelog |

## 项目元信息

- 仓库：`growdu/timex`
- 技术栈：NestJS 11 + TypeORM + PostgreSQL 16 + Redis（后端）/ React 18 + Vite 6 + TanStack Query + Zustand（前端）
- 在线演示：<https://growdu.github.io/timex/>
- 后端 API：开发环境 `http://localhost:3000/api`
