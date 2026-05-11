export const SESSION_KEY = "timexPrototypeSession";
export const UI_STATE_KEY = "timexPrototypeUiState";

export const prototypeData = {
  navViews: [
    { id: "timeline", label: "时间线", note: "按事件回看人生轨迹", href: "./timeline.html" },
    { id: "space", label: "空间", note: "按地点重走记忆路线", href: "./space.html" },
    { id: "people", label: "人物", note: "按关系检索共同经历", href: "./people.html" },
    { id: "memoir", label: "回忆录", note: "把事件编排成章节", href: "./memoir.html" },
  ],
  stages: [
    { id: "all", label: "全部阶段" },
    { id: "student", label: "学生时代" },
    { id: "first-job", label: "初入职场" },
    { id: "maker", label: "创作试验" },
    { id: "family", label: "家庭时刻" },
  ],
  years: [2025, 2024, 2023, 2021, 2019, 2018],
  accounts: [
    {
      id: "acct-maker",
      name: "周屿",
      role: "成长记录者",
      email: "maker@timex.test",
      password: "timex2026",
      tone: "navy",
      summary: "偏重时间线、城市迁移和长期创作轨迹。",
    },
    {
      id: "acct-family",
      name: "沈棠",
      role: "家庭档案整理者",
      email: "family@timex.test",
      password: "timex2026",
      tone: "rust",
      summary: "偏重家庭相册、孩子成长和场所记忆整理。",
    },
  ],
  people: [
    {
      id: "linxi",
      name: "林溪",
      role: "朋友 / 共同创作者",
      tone: "teal",
      intro: "最懂你想做什么的人。很多关于创造、出走和重新开始的记忆都和她有关。",
      firstSeen: "2018.06",
      latestSeen: "2025.01",
      sharedPlaces: ["hangzhou", "tokyo", "shanghai"],
      density: "高频共现",
    },
    {
      id: "guyuan",
      name: "顾远",
      role: "同学 / 旧旅伴",
      tone: "navy",
      intro: "学生时代最常一起移动的人，从毕业前夜到第一次远行，留下很多轻盈的影像。",
      firstSeen: "2018.06",
      latestSeen: "2023.11",
      sharedPlaces: ["hangzhou", "guilin"],
      density: "中频共现",
    },
    {
      id: "xiaoman",
      name: "小满",
      role: "家人 / 新的时间刻度",
      tone: "amber",
      intro: "让记忆从自我记录变成代际档案的人物，很多声音和细节都因此有了不同重量。",
      firstSeen: "2024.09",
      latestSeen: "2025.03",
      sharedPlaces: ["shanghai", "home"],
      density: "快速升温",
    },
    {
      id: "mama",
      name: "妈妈",
      role: "家人 / 生命叙事来源",
      tone: "rust",
      intro: "很多旧照片、旧录音和家庭话语都围绕她展开，是回忆录里最稳定的线索。",
      firstSeen: "2019.02",
      latestSeen: "2025.02",
      sharedPlaces: ["chengdu", "home"],
      density: "长期稳定",
    },
  ],
  places: [
    {
      id: "hangzhou",
      name: "杭州",
      type: "城市",
      x: 34,
      y: 38,
      summary: "学生时代与第一次想认真做产品的地方，记忆中带着潮湿的风和很长的夜路。",
      firstSeen: "2018.06",
      latestSeen: "2024.05",
      stages: ["student", "maker"],
    },
    {
      id: "shanghai",
      name: "上海",
      type: "城市",
      x: 54,
      y: 32,
      summary: "密度很高的生活区，很多工作、家人和日常成长都在这里发生。",
      firstSeen: "2021.03",
      latestSeen: "2025.03",
      stages: ["first-job", "family"],
    },
    {
      id: "tokyo",
      name: "东京",
      type: "旅行",
      x: 76,
      y: 28,
      summary: "第一次真正把旅行做成完整事件流的地方，照片、视频和语音都很密集。",
      firstSeen: "2024.10",
      latestSeen: "2024.10",
      stages: ["maker"],
    },
    {
      id: "guilin",
      name: "桂林",
      type: "旅行",
      x: 18,
      y: 62,
      summary: "和旧朋友的一段慢节奏旅程，更适合声音与远景，而不是快节奏打卡。",
      firstSeen: "2023.11",
      latestSeen: "2023.11",
      stages: ["maker"],
    },
    {
      id: "chengdu",
      name: "成都",
      type: "家庭",
      x: 12,
      y: 44,
      summary: "家庭相册和旧录音最集中的来源地，很多更早的记忆会从这里被重新唤醒。",
      firstSeen: "2019.02",
      latestSeen: "2025.02",
      stages: ["family"],
    },
    {
      id: "home",
      name: "家",
      type: "日常",
      x: 49,
      y: 58,
      summary: "最容易被忽略但最值得沉淀的地方。很多成长并不发生在远方，而是在重复的日常里。",
      firstSeen: "2024.09",
      latestSeen: "2025.03",
      stages: ["family"],
    },
  ],
  events: [
    {
      id: "e1",
      year: 2018,
      date: "2018.06.10",
      stage: "student",
      title: "毕业前夜在西湖边录下第一段独白",
      location: "杭州 · 西湖",
      placeId: "hangzhou",
      people: ["linxi", "guyuan"],
      summary: "拍了 12 张照片，录下 2 分 14 秒语音。那晚第一次认真说出，想做一件很多年后还愿意回看的东西。",
      longText:
        "那时还不知道未来会在哪里，但我们已经开始用照片、语音和很碎的文字去给人生做留档。西湖边的风很大，声音里全是笑和停顿，可也正因为不完整，才像真正的当时。",
      media: { photos: 12, videos: 2, audios: 1, texts: 1 },
      cover: "palette-lagoon",
      gallery: ["湖边长椅", "语音波形", "夜色倒影"],
    },
    {
      id: "e2",
      year: 2019,
      date: "2019.02.06",
      stage: "family",
      title: "翻出旧相册，第一次给妈妈补写年轻时的注释",
      location: "成都 · 老家",
      placeId: "chengdu",
      people: ["mama"],
      summary: "把 90 年代的旧照片重新扫描，补记人物、地点和那时候没人写下来的背景。",
      longText:
        "很多照片当年只留下了笑，没有留下原因。重新整理时才意识到，回忆录不是为了美化过去，而是为了把那些本来会失真的细节再扶正一次。",
      media: { photos: 18, videos: 0, audios: 2, texts: 3 },
      cover: "palette-rust",
      gallery: ["旧相册扫描", "手写背注", "厨房对话"],
    },
    {
      id: "e3",
      year: 2021,
      date: "2021.03.14",
      stage: "first-job",
      title: "搬到上海后的第一个凌晨，把新房间拍成了起点",
      location: "上海 · 徐汇",
      placeId: "shanghai",
      people: ["linxi"],
      summary: "空房间、纸箱、窗边夜灯和一段很短的文字，后来都成为这一阶段的入口画面。",
      longText:
        "那一晚留下的素材不多，但密度很高。每件物品都还没有被摆到习惯的位置，所以它们比后来更能说明一个人刚刚开始的时候是什么样子。",
      media: { photos: 9, videos: 1, audios: 1, texts: 2 },
      cover: "palette-studio",
      gallery: ["窗边灯影", "纸箱标签", "第一晚清单"],
    },
    {
      id: "e4",
      year: 2023,
      date: "2023.11.18",
      stage: "maker",
      title: "在桂林慢下来，第一次把旅程做成完整事件流",
      location: "桂林 · 漓江沿线",
      placeId: "guilin",
      people: ["guyuan"],
      summary: "连续记录 11 小时，素材自动聚成 1 条路线和 4 个子事件，是实时采集价值最明显的一次。",
      longText:
        "从早上起雾到夜里回房间，整个过程几乎没有刻意停下来整理。真正回看时，时间、地点和人物被系统重新串起来，那种连续感远比单张照片更强。",
      media: { photos: 26, videos: 7, audios: 3, texts: 4 },
      cover: "palette-moss",
      gallery: ["江面清晨", "船头录像", "晚间语音"],
    },
    {
      id: "e5",
      year: 2024,
      date: "2024.10.03",
      stage: "maker",
      title: "东京四天，把城市切成声音、路口和橱窗",
      location: "东京 · 台东到涩谷",
      placeId: "tokyo",
      people: ["linxi"],
      summary: "这次旅行第一次同时留下照片、短视频、环境音和旁白文字，最终被整理成 5 个连续章节。",
      longText:
        "最有趣的不是素材多，而是它们之间开始出现互相解释的关系。白天拍下的橱窗，晚上有语音解释当时为什么停下；一个路口的噪音，后来又成为某段文字的背景。",
      media: { photos: 34, videos: 12, audios: 5, texts: 6 },
      cover: "palette-orbit",
      gallery: ["路口霓虹", "地铁站口", "夜里旁白"],
    },
    {
      id: "e6",
      year: 2024,
      date: "2024.12.21",
      stage: "family",
      title: "小满第一次叫出完整的爸爸，整晚都在重复回听",
      location: "家 · 客厅",
      placeId: "home",
      people: ["xiaoman", "mama"],
      summary: "只有一段 18 秒语音和两张很普通的照片，但它们比大多数旅行素材都更重要。",
      longText:
        "很多真正重要的记忆并不壮观。它们甚至没有好的构图，没有特别的光线，只是恰好被留了下来。时间一久，这类素材会成为整本回忆录里最强的章节支点。",
      media: { photos: 2, videos: 0, audios: 1, texts: 1 },
      cover: "palette-lagoon",
      gallery: ["客厅暮色", "18 秒语音", "重复回听"],
    },
    {
      id: "e7",
      year: 2025,
      date: "2025.01.09",
      stage: "maker",
      title: "把这几年零散素材摊开，第一次看到完整成长轨迹",
      location: "上海 · 工作台",
      placeId: "shanghai",
      people: ["linxi"],
      summary: "从事件回到阶段，再从阶段写回回忆录，开始意识到“整理”本身也是一段值得记录的经历。",
      longText:
        "当碎片被摆在一起的时候，变化比记忆本身更清楚。哪些地方反复出现，哪些人一直在，哪些声音总是在关键节点留下来，都会构成一个人真实的成长纹理。",
      media: { photos: 8, videos: 2, audios: 4, texts: 8 },
      cover: "palette-studio",
      gallery: ["工作台全景", "章节大纲", "语音摘录"],
    },
    {
      id: "e8",
      year: 2025,
      date: "2025.03.02",
      stage: "family",
      title: "周日午后给家做了一次“场所记忆”整理",
      location: "家 · 书房与厨房",
      placeId: "home",
      people: ["xiaoman", "mama"],
      summary: "第一次按空间来回看过去半年，把厨房、书房、客厅分别整理成可回看的生活切片。",
      longText:
        "空间并不是背景。很多关于成长的细节，其实是被一个地方反复承载出来的。厨房里说过的话，书房里录下的声音，后来会比日期更容易把人带回当时。",
      media: { photos: 15, videos: 3, audios: 2, texts: 3 },
      cover: "palette-rust",
      gallery: ["厨房桌面", "书房光线", "午后声音"],
    },
  ],
  memoirChapters: [
    {
      id: "m1",
      title: "城市把我雕成了现在的样子",
      blurb: "从杭州到上海，再到东京，每个城市都留下了一种不同的自我版本。",
      cover: "palette-studio",
      items: ["毕业前夜的独白", "上海的第一个凌晨", "东京的四段旁白"],
      status: "进行中",
    },
    {
      id: "m2",
      title: "那些原本会被错过的家庭时刻",
      blurb: "从旧相册到孩子的第一句话，声音和日常让家庭记忆终于有了连续性。",
      cover: "palette-rust",
      items: ["给妈妈的注释", "小满的 18 秒语音", "家的场所记忆"],
      status: "草稿",
    },
    {
      id: "m3",
      title: "把旅行从打卡变成可回看的关系网",
      blurb: "地点不再只是地图上的标记，而是人物与阶段共同交织出来的轨迹。",
      cover: "palette-moss",
      items: ["桂林事件流", "东京路线", "共享地点图谱"],
      status: "待补充",
    },
    {
      id: "m4",
      title: "整理本身也是一段成长",
      blurb: "当开始编排回忆录，才真正看到这几年自己的变化速度和方向。",
      cover: "palette-lagoon",
      items: ["工作台整理日", "阶段归档", "下一版回忆录线索"],
      status: "待发布",
    },
  ],
};

export const defaultUiState = {
  year: "all",
  stage: "all",
  search: "",
  selectedEventId: "e5",
  selectedPlaceId: "tokyo",
  selectedPersonId: "linxi",
  selectedChapterId: "m1",
};

export function createApi(data = prototypeData) {
  const personMap = new Map(data.people.map((item) => [item.id, item]));
  const placeMap = new Map(data.places.map((item) => [item.id, item]));
  const eventMap = new Map(data.events.map((item) => [item.id, item]));
  const chapterMap = new Map(data.memoirChapters.map((item) => [item.id, item]));

  function getPerson(id) {
    return personMap.get(id);
  }

  function getPlace(id) {
    return placeMap.get(id);
  }

  function getEvent(id) {
    return eventMap.get(id);
  }

  function getChapter(id) {
    return chapterMap.get(id);
  }

  function getStageLabel(id) {
    return data.stages.find((stage) => stage.id === id)?.label || id;
  }

  function getMediaTotal(event) {
    return Object.values(event.media).reduce((sum, value) => sum + value, 0);
  }

  function formatPeople(ids) {
    return ids.map((id) => getPerson(id)?.name).filter(Boolean);
  }

  function sortEvents(events) {
    return [...events].sort(
      (a, b) => Number(b.date.replaceAll(".", "")) - Number(a.date.replaceAll(".", "")),
    );
  }

  return {
    getPerson,
    getPlace,
    getEvent,
    getChapter,
    getStageLabel,
    getMediaTotal,
    formatPeople,
    sortEvents,
  };
}
