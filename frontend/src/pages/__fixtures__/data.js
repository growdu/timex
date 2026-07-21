// Pages 测试共享 fixtures：最小但真实的 event / people / place / memoir 数据集
// 覆盖：6 条线中的「亲情 + 朋友 + 事业」+ 多年份跨度 + 多地点 + 多人物

export const sampleEvents = [
  {
    id: 'e1',
    title: '小雨出生',
    summary: '凌晨三点，小雨出生，6 斤 8 两。',
    longText: '凌晨三点一刻，小雨出生，护士把她抱到我怀里。',
    date: '2023-04-12',
    stage: 'family',
    weight: 8,
    placeId: 'p1',
    peopleIds: ['u1', 'u2'],
    people: [{ id: 'u1', name: '我', role: 'self' }, { id: 'u2', name: '小雨', role: 'family' }],
    location: '北京',
    moments: [{ id: "m1" }, { id: "m2" }],
  },
  {
    id: 'e2',
    title: '与老同学相聚',
    summary: '毕业后第一次和大学室友重聚。',
    date: '2022-09-15',
    stage: 'first-job',
    weight: 5,
    placeId: 'p2',
    peopleIds: ['p3'],
    people: [{ id: 'p3', name: '小李', role: 'friend' }],
    location: '杭州',
    moments: [{ id: "m3" }],
  },
  {
    id: 'e3',
    title: '第一次创业路演',
    summary: '在车库咖啡给 5 个投资人讲完 MVP。',
    date: '2024-06-20',
    stage: 'maker',
    weight: 7,
    placeId: 'p3',
    peopleIds: ['u1', 'p4'],
    people: [{ id: 'u1', name: '我', role: 'self' }, { id: 'p4', name: '合伙人 A', role: 'colleague' }],
    location: '深圳',
    moments: [],
  },
];

export const samplePeople = [
  { id: "u1", name: "我", role: "self", firstSeenAt: "2022-01-01", latestSeenAt: "2024-06-20", intro: "时光记录者" },
  { id: "u2", name: "小雨", role: "child", firstSeenAt: "2023-04-12", latestSeenAt: "2023-04-12", intro: "我的女儿" },
  { id: "p3", name: "小李", role: "friend", firstSeenAt: "2022-09-15", latestSeenAt: "2022-09-15", intro: "大学室友" },
  { id: "p4", name: "合伙人 A", role: "colleague", firstSeenAt: "2024-06-20", latestSeenAt: "2024-06-20" },
];

export const samplePlaces = [
  { id: "p1", name: "北京", type: "city", summary: "家所在的城市", firstSeenAt: "2023-04-12", latestSeenAt: "2023-04-12", latitude: 39.9, longitude: 116.4 },
  { id: "p2", name: "杭州", type: "travel", summary: "西湖边的城市", firstSeenAt: "2022-09-15", latestSeenAt: "2022-09-15", latitude: 30.3, longitude: 120.2 },
  { id: "p3", name: "深圳", type: "city", summary: "创业之都", firstSeenAt: "2024-06-20", latestSeenAt: "2024-06-20", latitude: 22.5, longitude: 114.1 },
];

export const sampleMemoirs = [
  {
    id: "m1", title: "小满成长记", chapterCount: 2,
    chapters: [
      { id: "c1", title: "出生", blurb: "凌晨三点一刻。", status: "published", items: [{ content: "出生记录" }] },
      { id: "c2", title: "第一次走路", blurb: "9 个月大时扶着茶几站起来了。", status: "draft", items: [] },
    ],
  },
  {
    id: "m2", title: "三城记", chapterCount: 1,
    chapters: [
      { id: "c3", title: "北漂篇", blurb: "2018 年到北京，第一次租房。", status: "published", items: [] },
    ],
  },
];

// Pages 组件通过 props 拿到 api，调用 .getEvent / .getPlace / .getPerson 等
// 这里直接代理到 src/data/apiAdapter.js 的真实函数
import { createApiAdapter } from '../../data/apiAdapter.js';

export function makeApi() {
  return createApiAdapter({
    events: sampleEvents,
    people: samplePeople,
    places: samplePlaces,
    memoirs: sampleMemoirs,
  });
}

// DashboardPage 用的统计快照
export const sampleDashboardStats = {
  totals: { events: 3, people: 4, places: 3, moments: 3, memoirs: 2 },
  yearRange: { earliest: 2022, latest: 2024 },
  timelineDistribution: [
    { year: 2022, count: 1 },
    { year: 2023, count: 1 },
    { year: 2024, count: 1 },
  ],
  stageDistribution: [
    { stage: "student", count: 0 },
    { stage: "first-job", count: 1 },
    { stage: "maker", count: 1 },
    { stage: "family", count: 1 },
  ],
  placeDistribution: [
    { placeId: "p1", name: "北京", count: 1 },
    { placeId: "p2", name: "杭州", count: 1 },
    { placeId: "p3", name: "深圳", count: 1 },
  ],
  momentTypeDistribution: [
    { type: "photo", count: 2 },
    { type: "text", count: 1 },
  ],
  recentEvents: [
    { id: "e3", title: "第一次创业路演", date: "2024-06-20", location: "深圳", moments: [] },
    { id: "e1", title: "小雨出生", date: "2023-04-12", location: "北京", place: { name: "北京" }, moments: [{}, {}] },
  ],
  topPeople: [
    { personId: "u1", name: "我", role: "self", eventCount: 2 },
    { personId: "p3", name: "小李", role: "friend", eventCount: 1 },
  ],
  memoirs: [
    { id: "m1", title: "小满成长记", chapterCount: 2 },
    { id: "m2", title: "三城记", chapterCount: 1 },
  ],
};
