import { defineConfig } from 'vitepress';

export default defineConfig({
  title: '时光机器 · Timex',
  description: '个人成长记录与人生回忆沉淀系统 — 开发者与运维文档',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,
  srcExclude: ['**/plans/**', 'README.md', 'node_modules/**'],
  themeConfig: {
    siteTitle: '时光机器',
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/setup' },
      { text: '架构', link: '/architecture' },
      { text: 'API', link: '/api' },
      { text: '路线图', link: '/roadmap' },
      { text: '变更日志', link: '/changelog' },
    ],
    sidebar: {
      '/': [
        {
          text: '新人入门',
          items: [
            { text: '介绍', link: '/' },
            { text: '快速开始', link: '/setup' },
            { text: '系统架构', link: '/architecture' },
            { text: 'API 参考', link: '/api' },
            { text: '测试覆盖报告', link: '/testing' },
          ],
        },
        {
          text: '深入了解',
          items: [
            { text: '前端结构', link: '/frontend' },
            { text: '后端结构', link: '/backend' },
            { text: '对象存储 / OSS 集成', link: '/upload' },
            { text: 'AI 集成', link: '/AI_INTEGRATION' },
          ],
        },
        {
          text: '部署 / 运维',
          items: [
            { text: '部署指南', link: '/deployment' },
            { text: '代码健康检查', link: '/health-check' },
            { text: '路线图', link: '/roadmap' },
            { text: '变更日志', link: '/changelog' },
          ],
        },
        {
          text: '产品 & 设计',
          items: [
            { text: '产品文档', link: '/product' },
            { text: '设计文档', link: '/design' },
            { text: '用户手册', link: '/user-guide' },
            { text: 'Web 原型归档', link: '/web-prototype-archive' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/growdu/timex' },
    ],
    search: {
      provider: 'local',
    },
  },
});
