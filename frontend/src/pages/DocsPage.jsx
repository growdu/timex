import { Link } from "react-router-dom";

const SECTIONS = [
  { id: "start", title: "快速开始", icon: "🚀" },
  { id: "dashboard", title: "统计大屏", icon: "📊" },
  { id: "timeline", title: "记录事件", icon: "📅" },
  { id: "space", title: "空间地图", icon: "🗺" },
  { id: "people", title: "人物关系", icon: "👥" },
  { id: "memoir", title: "回忆录编辑", icon: "📖" },
  { id: "export", title: "导出与打印", icon: "🖨" },
  { id: "tips", title: "制作美好回忆", icon: "✨" },
  { id: "faq", title: "常见问题", icon: "❓" },
];

const CONTENT = {
  start: {
    title: "快速开始",
    body: [
      { type: "p", text: "欢迎使用时光机器！这是一款面向个人成长记录与人生回忆沉淀的多维时间档案系统。" },
      { type: "h3", text: "注册账号" },
      { type: "p", text: "点击右上角「注册」按钮，填写邮箱、密码和昵称。注册成功后自动获得 14 天全功能试用。" },
      { type: "h3", text: "体验账号" },
      { type: "p", text: "如果想快速体验，可在登录页选择体验账号：demo@timex.com（时光记录者）、maker@timex.test（周屿，城市迁移）、family@timex.test（沈棠，家庭档案）。选择后自动填充，直接登录即可。" },
      { type: "h3", text: "开始记录" },
      { type: "p", text: "登录后进入统计大屏。点击右下角「＋」浮动按钮，选择「新建事件」即可创建你的第一条记录。" },
    ],
  },
  dashboard: {
    title: "统计大屏",
    body: [
      { type: "p", text: "登录后默认进入统计大屏，以卡片式布局展示你的时光数据总览。" },
      { type: "h3", text: "大屏内容" },
      { type: "ul", items: ["统计概览：事件、人物、地点、瞬间、回忆录总数", "时间线分布：按年份统计事件数量", "阶段分布：按人生阶段统计", "最近事件：最近 6 条事件", "地点分布、核心人物、素材构成、回忆录列表"] },
      { type: "p", text: "大屏底部有导出与打印区域，可导出相册、时间线或故事书。" },
    ],
  },
  timeline: {
    title: "记录事件（时间线）",
    body: [
      { type: "p", text: "事件是时光机器的核心单元。每个事件代表人生中一个有起止的故事。" },
      { type: "h3", text: "添加事件" },
      { type: "p", text: "点击页面右下角「＋」按钮，选择「新建事件」。填写标题、日期、地点、阶段和摘要，保存即可。" },
      { type: "h3", text: "记录原则" },
      { type: "ul", items: ["以「发生了什么」为单元，而非「今天的心情」", "标题要具体：写「女儿第一次叫妈妈」而非「家庭生活」", "关联人物和地点，让记忆可以从多维度找到", "定期整理：把零散的瞬间归入事件"] },
    ],
  },
  space: {
    title: "空间地图",
    body: [
      { type: "p", text: "空间页面在地图上标记你去过的所有地方，每个地点显示关联的事件数量。" },
      { type: "p", text: "点击右下角「＋」选择「添加地点」，填写名称、类型（城市/旅行/家庭/日常）和经纬度，保存后地点会出现在地图上。" },
    ],
  },
  people: {
    title: "人物关系",
    body: [
      { type: "p", text: "人物页面展示所有人物卡片，每个人物显示关联的事件数量和关系图谱。" },
      { type: "p", text: "在添加或编辑事件时可以关联人物，这样就能从人物维度查看共同经历。" },
      { type: "p", text: "点击右下角「＋」选择「添加人物」，填写姓名、角色和简介。" },
    ],
  },
  memoir: {
    title: "回忆录编辑器",
    body: [
      { type: "p", text: "回忆录编辑器采用三栏布局：左侧章节树、中间正文区、右侧来源库。" },
      { type: "h3", text: "写作方法" },
      { type: "ul", items: ["以主题分章：如「北漂三年」「西藏之旅」「小雨的诞生」", "先列大纲：把章节标题列出来，再逐章填充", "引用事件：把相关事件关联到章节，让故事有据可查", "定期回顾：回忆录是活文档，可以不断修订"] },
    ],
  },
  export: {
    title: "导出与打印",
    body: [
      { type: "p", text: "从统计大屏底部进入导出页面，支持三种格式：" },
      { type: "ul", items: ["📸 相册：按事件展示，含瞬间、人物、地点，可按年筛选", "📅 时间线：按年份分组展示全部事件", "📖 故事书：以回忆录章节为结构，展示完整故事"] },
      { type: "p", text: "点击「打印 / 保存PDF」按钮，在打印对话框中选择「保存为 PDF」。推荐 A4 纵向，关闭背景图形。" },
    ],
  },
  tips: {
    title: "制作美好回忆的技巧",
    body: [
      { type: "h3", text: "素材管理" },
      { type: "ul", items: ["照片配文字：上传照片时写一两句当时的情况和感受", "视频抓重点：标注关键时间点或内容摘要", "混合记录：一个事件同时有照片、视频、文字--多维度更立体"] },
      { type: "h3", text: "六条线维度回顾" },
      { type: "ul", items: ["⏱ 时间：按年回顾，看哪些年份密集，哪些空白", "🗺 空间：打开地图，看你去过哪里，还有哪里没去", "❤ 感情：从人物角度，看谁出场最多", "💼 事业：按阶段筛选，看职业转折点", "🏡 亲情：筛选家庭时刻，回顾家人经历", "👥 朋友：查看朋友相关事件，维系友谊"] },
      { type: "h3", text: "导出成册" },
      { type: "ul", items: ["年度相册：每年年底导出该年度相册，打印成实体册", "人生故事书：把回忆录导出为故事书，打印装订", "送礼：打印成册作为送给家人的礼物"] },
    ],
  },
  faq: {
    title: "常见问题",
    body: [
      { type: "h3", text: "数据安全吗？" },
      { type: "p", text: "数据存储在你部署的服务器上，你完全拥有数据主权。" },
      { type: "h3", text: "试用到期后数据会丢失吗？" },
      { type: "p", text: "不会。试用到期后功能受限但数据保留，购买 License 后恢复全部功能。" },
      { type: "h3", text: "AI 功能需要什么配置？" },
      { type: "p", text: "支持 OpenAI 兼容接口（含 DeepSeek、Azure）和本地 Ollama。未配置时降级为 Mock 模式。" },
    ],
  },
};

export default function DocsPage() {
  return (
    <div className="docs-page">
      <header className="landing-header">
        <Link to="/" className="brand">
          <div className="brand-mark">时</div>
          <div><strong>时光机器</strong><span>使用文档</span></div>
        </Link>
        <div className="landing-header-actions">
          <Link to="/blog" className="landing-header-link">博客</Link>
          <Link to="/register" className="ghost-button">注册</Link>
          <Link to="/login" className="primary-button">登录</Link>
        </div>
      </header>
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <h3>目录</h3>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="docs-nav-item">
              <span>{s.icon}</span> {s.title}
            </a>
          ))}
        </aside>
        <main className="docs-content">
          {SECTIONS.map((sec) => {
            const c = CONTENT[sec.id];
            if (!c) return null;
            return (
              <section key={sec.id} id={sec.id} className="docs-section">
                <h2>{c.title}</h2>
                {c.body.map((b, i) => {
                  if (b.type === "h3") return <h3 key={i}>{b.text}</h3>;
                  if (b.type === "ul") return <ul key={i}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
                  return <p key={i}>{b.text}</p>;
                })}
              </section>
            );
          })}
          <div className="docs-cta">
            <p>准备好了吗？</p>
            <Link to="/register" className="primary-button">免费注册 →</Link>
          </div>
        </main>
      </div>
    </div>
  );
}
