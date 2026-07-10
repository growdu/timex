import { Link } from "react-router-dom";

const SECTIONS = [
  { id: "intro", title: "这是什么样的产品", icon: "🌱" },
  { id: "stories", title: "三个真实故事", icon: "📖" },
  { id: "highlights", title: "六大核心亮点", icon: "✨" },
  { id: "start", title: "5 分钟上手", icon: "🚀" },
  { id: "dashboard", title: "统计大屏", icon: "📊" },
  { id: "timeline", title: "时间线 · 事件", icon: "⏱" },
  { id: "space", title: "空间地图", icon: "🗺" },
  { id: "people", title: "人物关系", icon: "👥" },
  { id: "memoir", title: "回忆录写作", icon: "✍" },
  { id: "export", title: "导出与打印", icon: "🖨" },
  { id: "craft", title: "如何做出美好回忆", icon: "💝" },
  { id: "faq", title: "常见问题", icon: "❓" },
];

const CONTENT = {
  intro: {
    title: "这是什么样的产品",
    body: [
      { type: "lede", text: "时光机器是一款让你的人生素材自己会说话的产品——把散落在手机、相册、笔记本里的照片、文字、声音、视频，按照时间、空间、人物三个维度重新组织成一本可以翻阅的人生故事书。" },
      { type: "h3", text: "它和普通相册、笔记软件有什么不同" },
      { type: "compare", rows: [
        ["", "普通相册", "笔记软件", "时光机器"],
        ["记录单元", "一张张照片", "一篇篇日记", "一个个事件（带时间/地点/人物/素材）"],
        ["组织方式", "时间倒序堆放", "笔记本/标签", "时间·空间·人物·阶段 四维交叉"],
        ["回顾方式", "滚到几百页前", "搜索关键词", "六条线：时间 / 空间 / 感情 / 事业 / 亲情 / 朋友"],
        ["产出形式", "永远躺在云端", "越写越懒得翻", "相册 / 时间线 / 故事书（可打印装订）"],
        ["数据归属", "平台服务器", "平台服务器", "你自己的服务器（隐私买断）"],
      ]},
      { type: "h3", text: "适合谁" },
      { type: "persona", items: [
        { icon: "🧒", title: "想为孩子做成长档案的父母", desc: "从第一声啼哭到小学入学，每一年都有清晰可翻的轨迹" },
        { icon: "✈️", title: "热爱旅行和记录的人", desc: "把每次旅行的地图、照片、感悟串成可分享的游记" },
        { icon: "🚀", title: "记录创业 / 职业转折的奋斗者", desc: "把关键决策、合伙人、里程碑沉淀成自己的人生复盘" },
        { icon: "✍️", title: "准备写回忆录 / 自传的写作者", desc: "素材库 + 章节编辑，把零散笔记直接编排成书" },
        { icon: "🏠", title: "整理家庭三代档案的家族记录者", desc: "孩子的成长、父母的晚年、自己的中年，一处全景可见" },
        { icon: "🌱", title: "任何想认真回望来路、规划未来的人", desc: "年度回顾、城市迁移、关系梳理——让数据看见自己" },
      ]},
    ],
  },

  stories: {
    title: "三个真实故事（来自内置体验账号）",
    body: [
      { type: "p", text: "系统内置了三个完整故事账号。登录后你可以直接打开他们的统计大屏、时间线、地图、关系图和回忆录，亲眼看到这套工具的实际使用效果。" },
      { type: "h3", text: "故事一 · 沈棠的家庭档案 ·「小满成长记」" },
      { type: "story", items: [
        { tag: "主角", text: "沈棠，孩子妈妈，2018 年女儿小满出生" },
        { tag: "内容", text: "6 个核心事件：从出生、上幼儿园、上小学，到第一次夏令营" },
        { tag: "人物", text: "小满、老公、外婆——三代人的时间线交织" },
        { tag: "地点", text: "温馨的家、阳光小学、星空夏令营营地" },
        { tag: "回忆录", text: "《小满成长记》三章：啼哭 / 上学 / 独立飞翔，已发布" },
        { tag: "看点", text: "看母亲怎么用回忆录把零散的成长瞬间编排成有温度的故事" },
      ]},
      { type: "h3", text: "故事二 · 周屿的城市迁移 ·「我的三城记」" },
      { type: "story", items: [
        { tag: "主角", text: "周屿，独立开发者，2023 年从武汉到北京，2024 年南下杭州，2025 年到深圳" },
        { tag: "内容", text: "7 个核心事件：北漂启程、入职大厂、决定南下、杭州创业、深圳重启" },
        { tag: "地点", text: "北京朝阳 → 杭州西湖 → 深圳南山，地图上完整呈现三年轨迹" },
        { tag: "人物", text: "合伙人林浩、杭州同事陈雪、深圳朋友苏苏——关系网随城市迁移变化" },
        { tag: "回忆录", text: "《我的三城记》三章：北漂三年 / 杭州的春天 / 深圳湾的日落" },
        { tag: "看点", text: "看地图维度的回顾怎么让\"漂泊\"变成\"成长\"的可见证据" },
      ]},
      { type: "h3", text: "故事三 · 创业者的年度复盘 ·「我的 2024」" },
      { type: "story", items: [
        { tag: "主角", text: "一位创业者，2024 是关键转折年" },
        { tag: "内容", text: "5 个核心事件：第一次创业会议、西藏自驾、女儿小雨出生、融资完成、新办公室入驻" },
        { tag: "看点", text: "看阶段（stage）筛选怎么把\"事业里程碑\"和\"家庭大事\"在同一时间轴上并列" },
        { tag: "回忆录", text: "《我的 2024》三章：创业起点 / 西藏之旅 / 小雨的诞生" },
        { tag: "核心价值", text: "事件权重（weight）让\"小雨出生\"自然浮在年度回顾的最顶端" },
      ]},
      { type: "p", text: "登录入口：登录页下方下拉框选择任意一个体验账号，密码自动填充。" },
    ],
  },

  highlights: {
    title: "六大核心亮点",
    body: [
      { type: "p", text: "和市面上的相册、笔记、网盘相比，时光机器最不一样的地方在于以下六点：" },
      { type: "highlight", items: [
        { icon: "📅", title: "事件优先，不是日记不是相册", desc: "以「发生了什么」为单元，把照片、文字、声音、视频都挂在事件上。一个月后回看，事件还在；日记 / 相册里早已淹没。" },
        { icon: "🧭", title: "六条线导航，发现被遗忘的角落", desc: "时间 / 空间 / 感情 / 事业 / 亲情 / 朋友——六种方式切同一份数据。同样那 200 条事件，按时间看是日记，按空间看是地图，按人物看是关系史。" },
        { icon: "📖", title: "从素材到故事书：回忆录编辑器", desc: "章节树 + 正文区 + 来源库三栏布局，把事件直接拖到章节里当素材。写到一半扔下，半年后回来还能续——回忆录是活文档。" },
        { icon: "🖨", title: "实体化：可打印成册的导出", desc: "相册 / 时间线 / 故事书三种格式，一键导出为可打印的 HTML 页面。在浏览器里选「保存为 PDF」就能装订成册。送给父母、留给未来，都是实打实的礼物。" },
        { icon: "🔒", title: "数据自主，隐私买断", desc: "支持自部署（PostgreSQL + MinIO + Redis），数据完全在你自己的服务器上。一次性买断，无月费、无订阅绑架、无广告。" },
        { icon: "🤖", title: "可选 AI 增强，不强制云依赖", desc: "支持 OpenAI 兼容接口（DeepSeek、Azure）、本地 Ollama。未配置时降级为 Mock 模式——核心功能不需要联网也能用。" },
      ]},
    ],
  },

  start: {
    title: "5 分钟上手",
    body: [
      { type: "step", items: [
        { n: 1, title: "注册账号", desc: "点击右上角「注册」，填邮箱、密码（≥ 8 位）、昵称，14 天全功能试用立刻开通，无需信用卡。" },
        { n: 2, title: "登录进入大屏", desc: "登录后默认进入统计大屏，第一眼看到自己的时间线分布、最近事件、关系密度。" },
        { n: 3, title: "添加第一个事件", desc: "点击右下角浮动「＋」按钮，选「新建事件」。写标题、选日期、关联地点和人物，几秒钟搞定。" },
        { n: 4, title: "切换维度看看", desc: "去「空间」看地图上多了一个点，去「人物」看到新加的人物卡片，去「时间线」看到事件出现在对应年份。" },
        { n: 5, title: "试着写一章回忆录", desc: "去「回忆录」创建一个新书，添加章节《我的 2026 上半年》，把刚加的事件拖进去——你已经会用了。" },
      ]},
      { type: "h3", text: "不想从头开始？用体验账号" },
      { type: "p", text: "登录页下拉框直接选：「demo@timex.com（我的 2024 创业者）」「maker@timex.test（周屿的三城记）」「family@timex.test（沈棠的小满成长记）」，密码自动填充，立刻看到完整样例。" },
    ],
  },

  dashboard: {
    title: "统计大屏——你的时间之眼",
    body: [
      { type: "p", text: "大屏是登录后的默认页面，也是整套工具的「指挥部」。它把所有数据浓缩在一屏，让你一眼看清自己的人生结构。" },
      { type: "h3", text: "大屏上能看到什么" },
      { type: "ul", items: [
        "顶部 5 个数字：事件总数、人物数、地点数、瞬间数、回忆录数",
        "时间线分布：按年份的事件数量条形图，空白年份和密集年份一眼可见",
        "阶段分布：按「学生 / 初入职场 / 创业 / 家庭」等人生阶段看事件分布",
        "最近 6 条事件：最新添加的内容快速回顾",
        "地点分布 / 核心人物 / 素材构成：构成全景图",
        "回忆录列表：所有书和章节的入口",
      ]},
      { type: "h3", text: "为什么要从大屏开始" },
      { type: "p", text: "记录工具最大的问题是「进了页面就不知道干啥」。大屏的存在让你每次登录都有事可做——看一眼，发现空白年份，于是补一条事件；发现某个人物很久没出现，于是发个微信问好。这就是时间之眼的作用。" },
    ],
  },

  timeline: {
    title: "时间线 · 事件——所有内容的基本单位",
    body: [
      { type: "p", text: "在时光机器里，事件是比日记、相册更基础的内容单位。一个事件 = 一个真实发生过的故事片段：入职、毕业、旅行、孩子的第一次、生日、搬家……它可能持续一小时，也可能持续一年。" },
      { type: "h3", text: "事件包含什么" },
      { type: "ul", items: [
        "标题（必填）：写「女儿第一次叫妈妈」而不是「家庭生活」",
        "日期 + 起止时间：可以是某一天，也可以是一段时间",
        "地点：关联已有的地点，或直接写文字",
        "阶段：学生 / 初入职场 / 创业 / 家庭 / 旅行 / 其他",
        "人物：可以多选，事件归到每个人物的时间线里",
        "瞬间：照片、视频、音频、文字，可以同时挂多个",
        "摘要 + 长文：短描述 + 详细叙述",
        "权重：影响在大屏和年度回顾中的突出程度",
      ]},
      { type: "h3", text: "记录原则" },
      { type: "ul", items: [
        "以「发生了什么」为单元，别按天拆——一周的西藏自驾是一个事件，不是 7 篇日记",
        "标题要具体，「女儿第一次叫妈妈」远比「家庭生活」好",
        "关联人物和地点，让记忆可以从多维度找到",
        "权重用于「年度 Top 事件」，给重要事件打 50-100，分散的日常 1-3",
      ]},
    ],
  },

  space: {
    title: "空间地图——把人生轨迹画出来",
    body: [
      { type: "p", text: "空间页把所有地点标在地图上，每个点显示关联事件数量。点开一个城市，能看到在那里发生的所有故事。" },
      { type: "h3", text: "地点类型" },
      { type: "ul", items: [
        "城市：长期生活或工作的城市",
        "旅行：短途或长途旅行的地点",
        "家庭：家、父母家、孩子的学校等",
        "日常：常去的咖啡馆、公园、办公室等",
      ]},
      { type: "h3", text: "使用场景" },
      { type: "p", text: "在「我的三城记」体验账号里看效果——北京、杭州、深圳三个城市在地图上清晰排列，鼠标移到任一城市就弹出那段时间的关键事件。这就是「看自己的人生轨迹」最直观的方式。" },
    ],
  },

  people: {
    title: "人物关系——看见谁是你生命中最重要的人",
    body: [
      { type: "p", text: "人物页把所有出现过的人汇成卡片墙和关系图谱。每个人显示关联事件数量、首次/最近出现时间、与你的关系（家人/朋友/同事/其他）。" },
      { type: "h3", text: "关系图谱" },
      { type: "p", text: "点开单个人物，会看到以 TA 为中心的关系网：和谁一起出现过、出现的频率。十年后再回看，这份图谱就是你的「人际史记」。" },
      { type: "h3", text: "使用建议" },
      { type: "ul", items: [
        "建档：把家人、好友、同事都建档，不需要详细，名字 + 关系即可",
        "回顾：每年年底看一次关系图，给重要的人发条问候",
        "发现：哪个朋友三年没出现了？不是疏远，是忘了",
      ]},
    ],
  },

  memoir: {
    title: "回忆录写作——从素材到故事书",
    body: [
      { type: "p", text: "回忆录编辑器是时光机器的杀手锏。它采用三栏布局：左侧章节树、中间正文区、右侧来源库（你的事件、人物、地点）。" },
      { type: "h3", text: "为什么这样设计" },
      { type: "p", text: "传统写作最大的痛苦是「写不出来」，根本原因是「想写的和手边的素材分离」。回忆录编辑器把素材直接放在右侧，写作时随手就能引用，再也不用来回翻相册或笔记。" },
      { type: "h3", text: "写作方法" },
      { type: "ul", items: [
        "以主题分章：如「北漂三年」「西藏之旅」「小雨的诞生」",
        "先列大纲：把章节标题列出来，再逐章填充",
        "引用事件：把相关事件直接拖入章节正文，故事有据可查",
        "定期回顾：回忆录是活文档，可以不断修订",
        "设个目标：每年年底写一章《我的 2026》，三年后你有一本自传",
      ]},
      { type: "h3", text: "支持的状态" },
      { type: "ul", items: [
        "草稿（draft）：自己看",
        "已发布（published）：可以导出",
        "公开（is_public）：可以分享链接",
      ]},
    ],
  },

  export: {
    title: "导出与打印——让数字记忆变成实体珍藏",
    body: [
      { type: "p", text: "从统计大屏底部「导出」区域进入，支持三种格式，每种都设计为可打印的版式：" },
      { type: "h3", text: "三种导出格式" },
      { type: "ul", items: [
        "📸 相册：按事件展示，含瞬间、人物、地点，可按年筛选",
        "📅 时间线：按年份分组展示全部事件，像一本年鉴",
        "📖 故事书：以回忆录章节为结构，展示完整故事",
      ]},
      { type: "h3", text: "如何打印 / 保存 PDF" },
      { type: "ol", items: [
        "在导出页点击「打印 / 保存PDF」按钮",
        "在打印对话框中选择「保存为 PDF」",
        "推荐设置：A4 纵向、关闭页眉页脚、勾选「背景图形」",
        "保存后可以用 PDF 编辑器排版，或直接送打印店装订",
      ]},
      { type: "h3", text: "实体化的意义" },
      { type: "p", text: "云端数据最大的问题是「它不在身边」。把年度相册或回忆录打印成册，放在书架上，每年拿出来翻一次——这才叫「沉淀」。送父母一本、给孩子留一本，比任何数字产品都更长久。" },
    ],
  },

  craft: {
    title: "如何做出美好回忆——给认真记录的人",
    body: [
      { type: "h3", text: "素材管理：每个瞬间都是完整的" },
      { type: "ul", items: [
        "照片配文字：上传照片时写一两句当时的情况和感受（一年后文字比照片更珍贵）",
        "视频抓重点：标注关键时间点或内容摘要，3 个月后你会感谢当时的自己",
        "录音当日记：通勤路上录 30 秒心情，比写 500 字更真实",
        "混合记录：一个事件同时有照片、视频、文字——多维度更立体",
      ]},
      { type: "h3", text: "六条线维度回顾：每月一次" },
      { type: "ul", items: [
        "⏱ 时间：按年回顾，看哪些年份密集、哪些空白——空白往往是要补的",
        "🗺 空间：打开地图，看你去过哪里——还有哪里说要去但没去",
        "❤ 感情：从人物角度，看谁出场最多——最该感谢的往往被忽略",
        "💼 事业：按阶段筛选，看职业转折点——你的关键决策都在这里",
        "🏡 亲情：筛选家庭时刻——父母的晚年、孩子的成长，时间都不等人",
        "👥 朋友：查看朋友相关事件——维系友谊，先从记起他们开始",
      ]},
      { type: "h3", text: "导出成册：让数字成为礼物" },
      { type: "ul", items: [
        "年度相册：每年年底导出该年度相册，打印成实体册，第二年元旦送给自己",
        "人生故事书：把回忆录导出为故事书，打印装订——这是写给自己的自传",
        "送礼：把父母那年的家庭相册打印出来，父亲节 / 母亲节 / 春节送——比买什么礼物都用心",
        "留给未来：每 5 年打印一次回忆录，10 年后翻出来——那是给中年最好的礼物",
      ]},
      { type: "h3", text: "坚持的秘诀" },
      { type: "ul", items: [
        "别追求完美：今天的随手一记，比明天的精雕细琢更真实",
        "设个低门槛：一周 1 个事件比一天 1 个更可持续",
        "奖励自己：每写满一章回忆录，给自己买个小礼物",
        "找个伙伴：和家人 / 朋友一起用，互相看对方的故事",
      ]},
    ],
  },

  faq: {
    title: "常见问题",
    body: [
      { type: "qa", items: [
        { q: "我的数据安全吗？", a: "时光机器支持自部署，数据存储在你自己的 PostgreSQL + MinIO 服务器上，你完全拥有数据主权。SaaS 版数据隔离，租户之间互不可见。" },
        { q: "试用到期后数据会丢失吗？", a: "不会。试用到期后账号功能受限，但数据完整保留。购买 License 后即可恢复全部功能。" },
        { q: "AI 功能需要什么配置？", a: "支持 OpenAI 兼容接口（含 DeepSeek、Azure OpenAI、Gemini）和本地 Ollama。未配置时降级为 Mock 模式，核心功能不受影响。" },
        { q: "可以导入已有数据吗？", a: "支持批量导入照片、视频。文字素材（如微信导出、印象笔记）可以一次性粘贴到事件里。未来会支持更多格式。" },
        { q: "可以多人协作吗？", a: "当前每个用户有独立的数据空间。家庭场景推荐给每位成员一个账号，重要事件互相 @ 关联。" },
        { q: "有移动端 App 吗？", a: "Web 端完全响应式，手机浏览器访问体验良好。原生 App 在路线图上。" },
        { q: "可以导出数据吗？", a: "可以。支持三种导出格式（相册/时间线/故事书）打印为 PDF。所有数据可以 JSON 导出做备份。" },
        { q: "如何购买 License？", a: "联系邮箱 growdu@gmail.com，提供自部署技术支持。" },
      ]},
    ],
  },
};

// ====== 渲染器 ======
function Block({ b, i }) {
  if (b.type === "h3") return <h3 key={i}>{b.text}</h3>;
  if (b.type === "p") return <p key={i}>{b.text}</p>;
  if (b.type === "lede") return <p key={i} className="docs-lede">{b.text}</p>;
  if (b.type === "ul") return <ul key={i}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
  if (b.type === "ol") return <ol key={i}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</ol>;
  if (b.type === "compare") {
    return (
      <div key={i} className="docs-compare">
        <table>
          <tbody>
            {b.rows.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? "docs-compare-head" : ""}>
                {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (b.type === "persona") {
    return (
      <div key={i} className="docs-persona-grid">
        {b.items.map((it, j) => (
          <div key={j} className="docs-persona-card">
            <span className="docs-persona-icon">{it.icon}</span>
            <strong>{it.title}</strong>
            <p>{it.desc}</p>
          </div>
        ))}
      </div>
    );
  }
  if (b.type === "highlight") {
    return (
      <div key={i} className="docs-highlight-grid">
        {b.items.map((it, j) => (
          <div key={j} className="docs-highlight-card">
            <span className="docs-highlight-icon">{it.icon}</span>
            <strong>{it.title}</strong>
            <p>{it.desc}</p>
          </div>
        ))}
      </div>
    );
  }
  if (b.type === "story") {
    return (
      <div key={i} className="docs-story">
        {b.items.map((it, j) => (
          <div key={j} className="docs-story-row">
            <span className="docs-story-tag">{it.tag}</span>
            <span className="docs-story-text">{it.text}</span>
          </div>
        ))}
      </div>
    );
  }
  if (b.type === "step") {
    return (
      <ol key={i} className="docs-steps">
        {b.items.map((it) => (
          <li key={it.n}>
            <span className="docs-step-n">{it.n}</span>
            <div>
              <strong>{it.title}</strong>
              <p>{it.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }
  if (b.type === "qa") {
    return (
      <div key={i} className="docs-qa">
        {b.items.map((it, j) => (
          <details key={j}>
            <summary>{it.q}</summary>
            <p>{it.a}</p>
          </details>
        ))}
      </div>
    );
  }
  return null;
}

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
                {c.body.map((b, i) => <Block key={i} b={b} i={i} />)}
              </section>
            );
          })}

          <div className="docs-cta">
            <h2>准备好了吗？</h2>
            <p>注册即获 14 天全功能试用，无需信用卡。</p>
            <div className="docs-cta-actions">
              <Link to="/register" className="primary-button">免费注册 →</Link>
              <Link to="/login" className="ghost-button">已有账号 · 登录</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
