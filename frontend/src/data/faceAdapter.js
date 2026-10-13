/**
 * faceAdapter — 人脸检索结果的三视图派生。
 *
 * 输入：`hits` 是后端 /faces/search 返回的命中数组。
 *   [
 *     { moment: { id, takenAt?, createdAt, personIds?, placeId?, mediaUrl?, title? }, distance: number },
 *     ...
 *   ]
 *
 * 三个 groupBy 都返回 `{ key, items }[]`，前端组件直接 map 渲染即可。
 */

/**
 * 按年份聚合，时间倒序，年内重复时间倒序。
 */
export function groupByTimeline(hits) {
  const groups = new Map();
  for (const h of hits) {
    const dt = h.moment.takenAt ? new Date(h.moment.takenAt) : new Date(h.moment.createdAt);
    const y = dt.getFullYear();
    const k = String(y);
    if (!groups.has(k)) groups.set(k, { year: y, items: [] });
    groups.get(k).items.push({ ...h, takenAt: dt });
  }
  for (const g of groups.values()) {
    g.items.sort((a, b) => b.takenAt - a.takenAt);
  }
  return [...groups.values()].sort((a, b) => b.year - a.year);
}

/**
 * 按人物聚合（一个人可能出现在多个 moment 中，所以是 fan-out）。
 * 没有 personIds 的 moment 直接跳过。
 */
export function groupByPerson(hits, allPeople) {
  const byId = new Map((allPeople || []).map((p) => [p.id, p]));
  const buckets = new Map();
  for (const h of hits) {
    const ids = h.moment.personIds || [];
    if (ids.length === 0) continue;
    for (const pid of ids) {
      if (!buckets.has(pid)) {
        buckets.set(pid, { person: byId.get(pid), items: [] });
      }
      buckets.get(pid).items.push(h);
    }
  }
  return [...buckets.values()];
}

/**
 * 按地点聚合；moment 没有 placeId 的直接丢弃。
 * 返回时过滤掉 place 缺失的桶（避免渲染时报错）。
 */
export function groupByPlace(hits, places) {
  const byId = new Map((places || []).map((p) => [p.id, p]));
  const buckets = new Map();
  for (const h of hits) {
    const pid = h.moment.placeId;
    if (!pid) continue;
    if (!buckets.has(pid)) {
      buckets.set(pid, { place: byId.get(pid), items: [] });
    }
    buckets.get(pid).items.push(h);
  }
  return [...buckets.values()].filter((b) => b.place);
}