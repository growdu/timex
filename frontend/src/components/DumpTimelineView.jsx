import { groupDumpHitsByTimeline } from '../data/dumpAdapter';

/**
 * DumpTimelineView — dump 检索命中按年份分组渲染。
 *
 * props:
 *   - hits : DumpHit[]  来自 useDumpSearch mutateAsync 的结果（已被 DumpDetailPage 标准化为数组）
 *
 * 渲染：
 *   - 每个年份一个 <section>（heading + 计数 + item 列表）
 *   - 每个 item：缩略图（可选）+ 文件名（缺则取 sourceUrl 最后一段）+ 日期 + sortKey chip + distance
 *   - hits 为空 → "暂无命中 — 你需要先「过滤」拿到 hits。"
 */
export function DumpTimelineView({ hits }) {
  const groups = groupDumpHitsByTimeline(hits);
  if (groups.length === 0) {
    return <p className="dump-timeline-empty">暂无命中 — 你需要先「过滤」拿到 hits。</p>;
  }
  return (
    <div className="dump-timeline" data-testid="dump-timeline">
      {groups.map((g) => (
        <section key={g.year} className="dump-timeline-year">
          <h3>
            {g.year} <span className="count">{g.items.length}</span>
          </h3>
          <ul className="dump-timeline-list">
            {g.items.map((h, i) => (
              <li key={h.item?.id ?? `i${i}`} className="dump-timeline-item" data-testid="dump-timeline-item">
                {h.item?.thumbnailUrl && (
                  <img src={h.item.thumbnailUrl} alt="" loading="lazy" />
                )}
                <a
                  href={h.item?.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="dump-timeline-link"
                >
                  <span className="filename">{h.item?.filename || (h.item?.sourceUrl || '').split('/').pop()}</span>
                </a>
                <span className="ts">{new Date(h.sortValue).toLocaleDateString()}</span>
                <span className={`chip sortkey-${h.sortKey}`}>{h.sortKey}</span>
                <span className="dist">{typeof h.distance === 'number' ? h.distance.toFixed(2) : '—'}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default DumpTimelineView;
