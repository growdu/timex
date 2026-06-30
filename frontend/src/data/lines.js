// 6 条「线」的元数据。每条线是组织记忆的一个维度。
// 顺序：先结构维度（时间 / 空间），后关系维度（感情 / 事业 / 亲情 / 朋友）。

export const lines = [
  {
    id: "time",
    label: "时间线",
    icon: "⌛",
    gradient: "linear-gradient(135deg, #5d4cff 0%, #8a7dff 100%)",
    blurb: "按日期回看人生轨迹",
  },
  {
    id: "space",
    label: "空间线",
    icon: "◎",
    gradient: "linear-gradient(135deg, #2ec4b6 0%, #6cd6cc 100%)",
    blurb: "按地点重走记忆路线",
  },
  {
    id: "emotion",
    label: "感情线",
    icon: "♡",
    gradient: "linear-gradient(135deg, #ff5470 0%, #ff8a9e 100%)",
    blurb: "记录最亲密的两个人",
  },
  {
    id: "career",
    label: "事业线",
    icon: "▣",
    gradient: "linear-gradient(135deg, #ff7a59 0%, #ffac8a 100%)",
    blurb: "工作 / 创业 / 学习的章节",
  },
  {
    id: "family",
    label: "亲情线",
    icon: "⌂",
    gradient: "linear-gradient(135deg, #d6a757 0%, #f0d28b 100%)",
    blurb: "家人在身边的每一天",
  },
  {
    id: "friends",
    label: "朋友线",
    icon: "☆",
    gradient: "linear-gradient(135deg, #7c8aa6 0%, #a0aec8 100%)",
    blurb: "一起笑过的人",
  },
];

export function getLineMeta(lineId) {
  return lines.find((l) => l.id === lineId) || null;
}
