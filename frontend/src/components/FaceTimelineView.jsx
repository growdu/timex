import { groupByTimeline } from '../data/faceAdapter';

/**
 * 时间线视图：按年份分组，年内按日期降序。
 * 每条 hit 是一个 button，onSelect(hit) 由调用方实现（默认 console.log 留口）。
 */
export function FaceTimelineView({ hits, onSelect }) {
  const groups = groupByTimeline(hits || []);
  if (groups.length === 0) {
    return <div className="face-empty">暂无命中</div>;
  }
  return (
    <div className="timeline">
      {groups.map((g) => (
        <section key={g.year} className="timeline-year">
          <h3>{g.year}</h3>
          <ul>
            {g.items.map((h, idx) => (
              <li key={`${h.moment.id}-${idx}`}>
                <button
                  type="button"
                  className="hit-row"
                  onClick={() => onSelect && onSelect(h)}
                >
                  {h.moment.mediaUrl && (
                    <img src={h.moment.mediaUrl} alt="" />
                  )}
                  <span>{h.moment.title || h.moment.takenAt?.toISOString?.() || h.moment.takenAt || ''}</span>
                  <span className="dist">{h.distance.toFixed(2)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default FaceTimelineView;