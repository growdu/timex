/**
 * dumpAdapter — scratch dump 检索结果的时间线派生。
 *
 * 输入：`hits` 是后端 `/faces/dumps/:id/search` 返回的命中数组。
 *   [
 *     { item: { id, sourceUrl, thumbnailUrl?, filename?, ... },
 *       distance: number,
 *       sortKey: 'takenAt' | 'fileMtime' | 'uploadedAt',
 *       sortValue: string (ISO date) },
 *     ...
 *   ]
 *
 * 返回：`{ year: number, items: Hit[] }[]`
 *   - 年间降序（按 year 数值）
 *   - 年内降序（按 sortValue 字典序，ISO 8601 兼容）
 *   - 容错：缺 sortValue 或 sortValue 非法的 hit 直接跳过，避免 NaN-year 让整页崩
 */

/**
 * 把 hit 数组按 sortValue → 年度分组。
 * - 年内降序（按 sortValue.localeCompare）
 * - 年间降序（按 year 数值）
 * 输入每条 hit 至少含 { item, sortKey, sortValue }
 * 容错：sortValue 缺失/无效时跳过该 hit（项目要求"可回溯、简单"）
 */
export function groupDumpHitsByTimeline(hits) {
  const groups = new Map();
  for (const h of hits || []) {
    if (!h || !h.sortValue) continue;
    const y = new Date(h.sortValue).getFullYear();
    if (!Number.isFinite(y)) continue;
    const k = String(y);
    if (!groups.has(k)) groups.set(k, { year: y, items: [] });
    groups.get(k).items.push(h);
  }
  for (const g of groups.values()) {
    g.items.sort((a, b) => (b.sortValue || '').localeCompare(a.sortValue || ''));
  }
  return [...groups.values()].sort((a, b) => b.year - a.year);
}
