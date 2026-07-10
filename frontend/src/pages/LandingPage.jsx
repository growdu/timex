import { Link } from "react-router-dom";

const C = ['#3b5bdb', '#0c8599', '#e64980', '#7048e8', '#2f9e44', '#f08c00'];

const LINES = [
  { icon: "⏱", name: "时间", desc: "以事件为核心的时间线，按年月回顾人生每一个节点", color: C[0] },
  { icon: "🗺", name: "空间", desc: "地图可视化标记足迹，串联每座城市与旅途的故事", color: C[1] },
  { icon: "❤", name: "感情", desc: "关系图谱珍藏相遇，记录每段同行的时光", color: C[2] },
  { icon: "💼", name: "事业", desc: "职业里程碑追踪成长，沉淀每个关键决策", color: C[3] },
  { icon: "🏡", name: "亲情", desc: "家庭档案三代传承，孩子的成长一个不落", color: C[4] },
  { icon: "👥", name: "朋友", desc: "友谊年表记录陪伴，重温一起笑过的岁月", color: C[5] },
];

const FEATURES = [
  { icon: "📖", title: "回忆录编辑器", desc: "章节树、正文区、来源库三栏展开，将散落的事件编排成完整的人生故事书", color: C[0] },
  { icon: "✨", title: "AI 智能增强", desc: "自动标注照片内容、转写音频、生成事件摘要，让回忆整理事半功倍", color: C[1] },
  { icon: "🔒", title: "隐私买断制", desc: "一次性买断终身使用，数据完全自主可控，绝无订阅绑架", color: C[2] },
  { icon: "📸", title: "多模态素材", desc: "照片、视频、音频、文字统一管理，一个事件可以同时包含多种素材", color: C[3] },
  { icon: "🔗", title: "事件关联引擎", desc: "人物、地点、瞬间自动串联，从任意维度都能找到同一段记忆", color: C[4] },
  { icon: "📊", title: "成长统计大屏", desc: "年度回顾、关系密度、空间迁移可视化，用数据看见自己的成长", color: C[5] },
];

const WHYS = [
  { icon: "🔐", title: "数据自主", desc: "你的数据存储在你自己的服务器上，不依赖任何云平台，彻底掌控隐私" },
  { icon: "📅", title: "事件优先", desc: "不是流水账日记，不是散乱相册--以「发生了什么」为核心，串联一切素材" },
  { icon: "🧭", title: "六线导航", desc: "时间·空间·感情·事业·亲情·朋友，六个维度审视人生，发现被忽略的角落" },
  { icon: "🖨", title: "导出成册", desc: "一键导出相册、时间线或故事书，打印装订，让数字记忆变成实体珍藏" },
];

const AUDIENCES = [
  { icon: "🚀", title: "创业者 / 自由职业者", desc: "记录创业历程，沉淀每个关键决策与里程碑事件", color: C[0] },
  { icon: "✈️", title: "旅行爱好者", desc: "地图标记足迹，串联旅途故事与沿途风景", color: C[1] },
  { icon: "👨‍👩‍👧", title: "家庭档案整理者", desc: "孩子的成长、家人的故事，一个都不落下", color: C[2] },
  { icon: "✍️", title: "写作者 / 创作者", desc: "灵感素材库，回忆录草稿随时展开写作", color: C[3] },
  { icon: "🎓", title: "学生 / 职场新人", desc: "人生节点回顾，规划下一步成长方向", color: C[4] },
  { icon: "🌱", title: "人生回顾者", desc: "任何想认真回望来路、规划未来的人", color: C[5] },
];

const SCENARIOS = [
  { icon: "📅", title: "年度回顾", desc: "按年月梳理事件，一键生成全年大事记", color: C[0] },
  { icon: "🏙️", title: "城市迁移", desc: "标记每座城市的起止时间，可视化人生轨迹", color: C[1] },
  { icon: "👶", title: "孩子成长档案", desc: "从出生到入学，记录每一个珍贵的第一次", color: C[2] },
  { icon: "🏔️", title: "旅行回忆", desc: "地图 + 照片 + 文字，重建完整旅途体验", color: C[3] },
  { icon: "📈", title: "创业历程", desc: "里程碑事件 + 团队关系 + 关键复盘记录", color: C[4] },
  { icon: "🤝", title: "人物关系梳理", desc: "关系图谱透视，谁是你生命中重要的人", color: C[5] },
];

const PLANS = [
  { name: "试用", price: "免费", period: "14 天", desc: "全功能体验，无需信用卡", highlight: false, color: C[1] },
  { name: "年费", price: "¥99", period: "/ 年", desc: "全功能 + 云同步 + AI 增强", highlight: false, color: C[0] },
  { name: "买断", price: "¥399", period: "起", desc: "终身使用，数据完全自主", highlight: true, color: C[2] },
];

const FAQS = [
  { q: "我的数据安全吗？", a: "数据存储在你部署的服务器上（PostgreSQL 数据库 + 对象存储），你完全拥有数据主权。我们不接触你的任何数据。" },
  { q: "试用到期后数据会丢失吗？", a: "不会。试用到期后账号功能受限，但数据完整保留。购买 License 后即可恢复全部功能。" },
  { q: "可以导出数据吗？", a: "可以。支持导出时光相册、完整时间线和故事书三种格式，可打印或保存为 PDF。" },
  { q: "支持多人使用吗？", a: "每个用户有独立的数据空间，互不可见。可以注册多个账号分别使用。" },
  { q: "AI 功能需要额外付费吗？", a: "不需要。AI 功能包含在年费和买断方案中，支持 OpenAI 兼容接口和本地 Ollama。" },
  { q: "如何购买 License？", a: "在系统内 License 页面输入授权码激活。支持年费（¥99/年）和一次性买断（¥399起）。" },
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="brand">
          <div className="brand-mark">时</div>
          <div><strong>时光机器</strong><span>个人成长记录系统</span></div>
        </div>
        <div className="landing-header-actions">
          <Link to="/docs" className="landing-header-link">文档</Link>
          <Link to="/blog" className="landing-header-link">博客</Link>
          <Link to="/register" className="ghost-button">注册</Link>
          <Link to="/login" className="primary-button">登录</Link>
        </div>
      </header>

      <main className="landing-main">
        {/* Hero */}
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <span className="section-eyebrow">Personal Growth Archive</span>
            <h1>用六条线，<br />串联你的人生。</h1>
            <p>时光机器是一款面向个人成长记录与人生回忆沉淀的多维时间档案系统。记录事件、管理人物、标记地点、整理回忆录--让你的每一段经历都有迹可循，让回忆不再散落。</p>
            <div className="landing-cta">
              <Link to="/register" className="primary-button">免费开始 -></Link>
              <Link to="/docs" className="ghost-button">了解文档</Link>
            </div>
          </div>
        </section>

        {/* 六条线 */}
        <section className="landing-section landing-section-tinted">
          <h2 className="landing-section-title">六条线维度导航</h2>
          <p className="landing-section-sub">从六个维度审视你的人生，发现被遗忘的角落</p>
          <div className="landing-lines">
            {LINES.map((l) => (
              <div className="landing-line-card" key={l.name} style={{ background: `linear-gradient(135deg, ${l.color}15, rgba(255,255,255,0.7))` }}>
                <div className="icon-badge" style={{ background: `${l.color}1a`, color: l.color }}>{l.icon}</div>
                <strong>{l.name}</strong>
                <p>{l.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 核心功能 */}
        <section className="landing-section">
          <h2 className="landing-section-title">核心功能</h2>
          <p className="landing-section-sub">不止于记录，更在于串联、整理与传承</p>
          <div className="landing-features">
            {FEATURES.map((f) => (
              <div className="landing-feature-item" key={f.title}>
                <div className="icon-badge icon-badge-sm" style={{ background: `${f.color}1a`, color: f.color }}>{f.icon}</div>
                <div><strong>{f.title}</strong><p>{f.desc}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* 为什么选择 */}
        <section className="landing-section landing-section-tinted">
          <h2 className="landing-section-title">为什么选择时光机器</h2>
          <div className="landing-whys">
            {WHYS.map((w) => (
              <div className="landing-why-card" key={w.title}>
                <span className="feature-icon">{w.icon}</span>
                <strong>{w.title}</strong>
                <p>{w.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 面向对象 */}
        <section className="landing-section">
          <h2 className="landing-section-title">谁在使用</h2>
          <div className="landing-audiences">
            {AUDIENCES.map((a) => (
              <div className="landing-audience-card" key={a.title}>
                <div className="icon-badge icon-badge-sm" style={{ background: `${a.color}1a`, color: a.color }}>{a.icon}</div>
                <strong>{a.title}</strong>
                <p>{a.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 使用场景 */}
        <section className="landing-section landing-section-tinted">
          <h2 className="landing-section-title">使用场景</h2>
          <div className="landing-features">
            {SCENARIOS.map((s) => (
              <div className="landing-feature-item" key={s.title}>
                <div className="icon-badge icon-badge-sm" style={{ background: `${s.color}1a`, color: s.color }}>{s.icon}</div>
                <div><strong>{s.title}</strong><p>{s.desc}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* 定价 */}
        <section className="landing-section">
          <h2 className="landing-section-title">选择你的方案</h2>
          <div className="landing-plans">
            {PLANS.map((p) => (
              <div className={`landing-plan-card ${p.highlight ? "is-highlight" : ""}`} key={p.name} style={p.highlight ? { borderColor: p.color } : {}}>
                <strong>{p.name}</strong>
                <div className="plan-price"><span style={{ color: p.color }}>{p.price}</span><small>{p.period}</small></div>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="landing-section landing-section-tinted">
          <h2 className="landing-section-title">常见问题</h2>
          <div className="landing-faq">
            {FAQS.map((f, i) => (
              <details className="faq-item" key={i}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="landing-cta-section">
          <div className="landing-cta-inner">
            <h2>开始记录你的时光</h2>
            <p>注册即获 14 天全功能试用，无需信用卡。</p>
            <Link to="/register" className="primary-button">免费注册 →</Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="brand-mark">时</div>
            <div>
              <strong>时光机器</strong>
              <span>个人成长记录与人生回忆沉淀系统</span>
            </div>
          </div>
          <div className="landing-footer-links">
            <Link to="/docs">文档</Link>
            <Link to="/blog">博客</Link>
            <Link to="/register">注册</Link>
            <Link to="/login">登录</Link>
          </div>
          <p className="landing-footer-copy">© 2026 时光机器 · 让回忆不再散落，让成长有迹可循</p>
        </div>
      </footer>
    </div>
  );
}
