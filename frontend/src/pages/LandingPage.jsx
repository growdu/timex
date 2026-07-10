import { Link } from "react-router-dom";

const C = ['#3b5bdb', '#0c8599', '#e64980', '#7048e8', '#2f9e44', '#f08c00'];

// 用三个真实故事作为开场，每个故事都展示"用什么方式记录、产出什么"
const STORIES = [
  {
    icon: "👶",
    title: "沈棠的故事 · 家庭档案",
    user: "孩子妈妈",
    color: C[4],
    scene: "从 2018 年小满出生，到 2024 年背上书包——她要的不是一堆照片，而是一本能每年拿出来翻的家庭册。",
    how: [
      "📅 事件：6 个核心（出生、入园、上小学、第一次夏令营……）",
      "👥 人物：小满、老公、外婆三代时间线交织",
      "📖 回忆录：《小满成长记》三章 + 已发布",
      "🖨 成果：每年打印一本年度相册，放在书架上",
    ],
    demo: "family@timex.test",
  },
  {
    icon: "🚀",
    title: "周屿的故事 · 城市迁移",
    user: "独立开发者",
    color: C[1],
    scene: "2023 年从武汉到北京，2024 年南下杭州，2025 年又到深圳——三年三座城市，他想看见自己的轨迹。",
    how: [
      "📅 事件：7 个核心（北漂、入职、决定南下、创业、迁移……）",
      "🗺 空间：地图上三座城市清晰排列，时间线贯穿",
      "👥 人物：合伙人林浩 / 杭州同事 / 深圳朋友，关系网随迁移变化",
      "📖 回忆录：《我的三城记》三章：北漂三年 / 杭州的春天 / 深圳湾的日落",
    ],
    demo: "maker@timex.test",
  },
  {
    icon: "✨",
    title: "创业者的故事 · 年度复盘",
    user: "2024 关键转折年",
    color: C[3],
    scene: "创业启动、西藏自驾、女儿出生、融资完成——一年里的事业里程碑和家庭大事，他要看得清楚、分得明白。",
    how: [
      "📅 事件：5 个核心（创业会议、自驾、女儿出生、融资、新办公室）",
      "📊 大屏：年度时间线分布 + 阶段筛选一次看清",
      "⚖ 权重：把\"女儿出生\"标 100，自动浮在年度 Top",
      "📖 回忆录：《我的 2024》三章已发布",
    ],
    demo: "demo@timex.com",
  },
];

// 核心亮点：差异化的能力，不是功能堆砌
const HIGHLIGHTS = [
  {
    icon: "📅",
    title: "事件优先，不是日记不是相册",
    desc: "以「发生了什么」为单元。一个月后回看，事件还在；日记/相册里早已淹没。",
  },
  {
    icon: "🧭",
    title: "六条线导航，发现被遗忘的角落",
    desc: "时间 / 空间 / 感情 / 事业 / 亲情 / 朋友——同样 200 条事件，六种看法。",
  },
  {
    icon: "📖",
    title: "从素材到故事书：回忆录编辑器",
    desc: "章节树 + 正文区 + 来源库三栏。写到一半扔下，半年后回来还能续。",
  },
  {
    icon: "🖨",
    title: "可打印成册：让数字成为礼物",
    desc: "相册 / 时间线 / 故事书三种格式，一键导出为可打印的 PDF。",
  },
  {
    icon: "🔒",
    title: "数据自主，隐私买断",
    desc: "支持自部署，数据完全在你自己的服务器上。无月费、无订阅、无广告。",
  },
  {
    icon: "🤖",
    title: "可选 AI 增强，不强制云依赖",
    desc: "支持 OpenAI 兼容 / Ollama 本地模型。未配置时降级为 Mock 模式。",
  },
];

// 谁会用它
const AUDIENCES = [
  { icon: "🧒", title: "为孩子做成长档案的父母", desc: "从第一声啼哭到小学入学，每年都有清晰可翻的轨迹" },
  { icon: "✈️", title: "热爱旅行和记录的人", desc: "把每次旅行的地图、照片、感悟串成可分享的游记" },
  { icon: "🚀", title: "记录创业 / 职业转折的奋斗者", desc: "关键决策、合伙人、里程碑沉淀成自己的人生复盘" },
  { icon: "✍️", title: "准备写回忆录 / 自传的写作者", desc: "素材库 + 章节编辑，零散笔记直接编排成书" },
  { icon: "🏠", title: "整理家庭三代档案的家族记录者", desc: "孩子成长、父母晚年、自己的中年，一处全景可见" },
  { icon: "🌱", title: "任何想认真回望来路、规划未来的人", desc: "年度回顾、城市迁移、关系梳理——让数据看见自己" },
];

const PLANS = [
  { name: "试用", price: "免费", period: "14 天", desc: "全功能体验，无需信用卡", highlight: false, color: C[1] },
  { name: "年费", price: "¥99", period: "/ 年", desc: "全功能 + 云同步 + AI 增强", highlight: false, color: C[0] },
  { name: "买断", price: "¥399", period: "起", desc: "终身使用，数据完全自主", highlight: true, color: C[2] },
];

const FAQS = [
  { q: "我的数据安全吗？", a: "支持自部署，数据存储在你自己的 PostgreSQL + MinIO 服务器上，你完全拥有数据主权。SaaS 版数据隔离。" },
  { q: "试用到期后数据会丢失吗？", a: "不会。试用到期后账号功能受限，但数据完整保留。购买 License 后即可恢复全部功能。" },
  { q: "可以导出数据吗？", a: "可以。支持相册/时间线/故事书三种格式导出为 PDF，也可 JSON 全量导出做备份。" },
  { q: "AI 功能需要什么配置？", a: "支持 OpenAI 兼容接口（含 DeepSeek、Azure）和本地 Ollama。未配置时降级为 Mock 模式，核心功能不受影响。" },
  { q: "如何购买 License？", a: "在系统内 License 页面输入授权码激活，或联系 growdu@gmail.com。" },
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
        {/* ====== Hero：用一段话+一个故事开场，让用户立刻知道能用来做什么 ====== */}
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <span className="section-eyebrow">Personal Growth Archive</span>
            <h1>把人生，<br />编成一本书。</h1>
            <p className="landing-hero-sub">
              时光机器是一款让散落在手机、相册、笔记本里的素材<strong>自己会说话</strong>的产品——以「事件」为单元，
              把照片、文字、声音、视频组织在六条线上（时间 / 空间 / 感情 / 事业 / 亲情 / 朋友），
              最终产出<strong>可打印的相册、时间线或故事书</strong>。
            </p>
            <div className="landing-hero-uses">
              <span>📅 记录</span><span>·</span>
              <span>🗺 标记</span><span>·</span>
              <span>👥 关联</span><span>·</span>
              <span>📖 写作</span><span>·</span>
              <span>🖨 打印</span>
            </div>
            <div className="landing-cta">
              <Link to="/register" className="primary-button">免费开始 →</Link>
              <Link to="/login" className="ghost-button">查看体验账号</Link>
            </div>
            <p className="landing-hero-hint">
              无需注册 · 登录页选「demo / maker / family」任意一个体验账号，密码自动填充
            </p>
          </div>
        </section>

        {/* ====== 三个真实故事：用真实场景告诉用户"我能用它做什么" ====== */}
        <section className="landing-section landing-section-tinted">
          <h2 className="landing-section-title">它能用来做什么？三个真实故事</h2>
          <p className="landing-section-sub">登录后用下面的体验账号看完整内容——所有故事数据都已内置在系统中</p>
          <div className="landing-stories">
            {STORIES.map((s) => (
              <article className="landing-story-card" key={s.title} style={{ borderColor: `${s.color}40` }}>
                <div className="landing-story-head" style={{ background: `linear-gradient(135deg, ${s.color}1a, transparent)` }}>
                  <span className="landing-story-icon" style={{ background: `${s.color}26`, color: s.color }}>{s.icon}</span>
                  <div>
                    <strong>{s.title}</strong>
                    <span className="landing-story-user">{s.user}</span>
                  </div>
                </div>
                <p className="landing-story-scene">{s.scene}</p>
                <ul className="landing-story-how">
                  {s.how.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
                <div className="landing-story-foot">
                  <span className="landing-story-demo">体验账号：<code>{s.demo}</code></span>
                  <Link to="/login" className="landing-story-link">立即查看 →</Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ====== 六大核心亮点：差异化能力 ====== */}
        <section className="landing-section">
          <h2 className="landing-section-title">为什么是它，不是别的</h2>
          <p className="landing-section-sub">和普通相册、笔记软件相比，最不一样的地方</p>
          <div className="landing-highlights">
            {HIGHLIGHTS.map((h) => (
              <div className="landing-highlight-card" key={h.title}>
                <span className="landing-highlight-icon">{h.icon}</span>
                <strong>{h.title}</strong>
                <p>{h.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ====== 谁会用它：人，而不是功能列表 ====== */}
        <section className="landing-section landing-section-tinted">
          <h2 className="landing-section-title">谁在用</h2>
          <div className="landing-audiences">
            {AUDIENCES.map((a) => (
              <div className="landing-audience-card" key={a.title}>
                <span className="landing-audience-icon">{a.icon}</span>
                <strong>{a.title}</strong>
                <p>{a.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ====== 定价 ====== */}
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

        {/* ====== FAQ ====== */}
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

        {/* ====== CTA ====== */}
        <section className="landing-cta-section">
          <div className="landing-cta-inner">
            <h2>开始记录你的时光</h2>
            <p>注册即获 14 天全功能试用，无需信用卡。</p>
            <Link to="/register" className="primary-button">免费注册 →</Link>
          </div>
        </section>
      </main>

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
