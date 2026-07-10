import { Link } from "react-router-dom";

const POSTS = [
  {
    id: 1,
    title: "如何用时光机器记录你的第一年",
    excerpt: "从零开始，用事件、人物和地点搭建你的个人时光档案。本文将带你完成从注册到第一本回忆录的全过程。",
    date: "2026-07-01",
    tag: "新手指南",
    icon: "🚀",
    color: "#3b5bdb",
  },
  {
    id: 2,
    title: "从散乱照片到人生故事书",
    excerpt: "手机里几千张照片，却从来没有翻看过？本文教你如何用回忆录编辑器，把照片变成一本可以打印的故事书。",
    date: "2026-06-20",
    tag: "回忆录技巧",
    icon: "📖",
    color: "#0c8599",
  },
  {
    id: 3,
    title: "六条线维度：一种全新的人生回顾方法",
    excerpt: "时间、空间、感情、事业、亲情、朋友--六条线不只是导航分类，更是一种审视人生的哲学。本文分享六条线的设计理念。",
    date: "2026-06-10",
    tag: "产品理念",
    icon: "🧭",
    color: "#e64980",
  },
  {
    id: 4,
    title: "家庭档案整理：给孩子的时光礼物",
    excerpt: "从出生到入学，孩子的每一个第一次都值得记录。本文分享如何用时光机器建立家庭成长档案，最终导出成册作为礼物。",
    date: "2026-05-28",
    tag: "使用场景",
    icon: "🏡",
    color: "#2f9e44",
  },
  {
    id: 5,
    title: "用 AI 让回忆整理事半功倍",
    excerpt: "时光机器支持 AI 自动标注照片、转写音频、生成摘要。本文介绍如何配置和使用 AI 功能，让回忆整理效率翻倍。",
    date: "2026-05-15",
    tag: "AI 功能",
    icon: "✨",
    color: "#7048e8",
  },
  {
    id: 6,
    title: "年度回顾：用数据看见自己的成长",
    excerpt: "又到年底，如何用时光机器的统计大屏做一次有深度的年度回顾？本文分享一套实操方法，帮你发现这一年的成长轨迹。",
    date: "2026-05-01",
    tag: "使用技巧",
    icon: "📊",
    color: "#f08c00",
  },
];

export default function BlogPage() {
  return (
    <div className="blog-page">
      <header className="landing-header">
        <Link to="/" className="brand">
          <div className="brand-mark">时</div>
          <div><strong>时光机器</strong><span>博客</span></div>
        </Link>
        <div className="landing-header-actions">
          <Link to="/docs" className="landing-header-link">文档</Link>
          <Link to="/register" className="ghost-button">注册</Link>
          <Link to="/login" className="primary-button">登录</Link>
        </div>
      </header>
      <main className="blog-main">
        <div className="blog-hero">
          <h1>时光机器博客</h1>
          <p>记录方法、使用技巧、产品理念与用户故事</p>
        </div>
        <div className="blog-grid">
          {POSTS.map((p) => (
            <article key={p.id} className="blog-card" style={{ borderTopColor: p.color }}>
              <div className="blog-card-header">
                <span className="blog-card-icon" style={{ color: p.color }}>{p.icon}</span>
                <span className="blog-card-tag" style={{ color: p.color, background: `${p.color}15` }}>{p.tag}</span>
              </div>
              <h2>{p.title}</h2>
              <p>{p.excerpt}</p>
              <div className="blog-card-footer">
                <span className="blog-card-date">{p.date}</span>
                <Link to="/blog" className="blog-card-link">阅读 →</Link>
              </div>
            </article>
          ))}
        </div>
        <div className="blog-cta">
          <h2>开始记录你的时光</h2>
          <Link to="/register" className="primary-button">免费注册 →</Link>
        </div>
      </main>
    </div>
  );
}
