/**
 * faceSelectors — 命中排序 / 过滤工具。
 *
 * 与 faceAdapter 同模式（参考 lines.js / lineMatchers.js）：纯函数，便于单测。
 */

export const sortByDistance = (a, b) => a.distance - b.distance;

/** 余弦距离阈值（越小越像）。 */
export const withThreshold = (hits, t) => hits.filter((h) => h.distance <= t);

/** 取相似度前 k 条。 */
export const topK = (hits, k) => hits.slice(0, k);