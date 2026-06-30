// 6 条线 hub 上单张卡：渐变 header + 图标 + 名称 + 计数 + 重点人物 / 地点 + 最新事件日期
import { Link } from "react-router-dom";

function formatDate(value) {
  if (!value) return "—";
  const s = String(value).slice(0, 10);
  return s;
}

export default function LineCard({ line, compact = false }) {
  const { id, label, icon, gradient, blurb, count = 0, topPeople = [], topPlace, latestEvent } = line;

  return (
    <Link
      to={`/lines/${id}`}
      className={`line-card ${compact ? "is-compact" : ""} ${count === 0 ? "is-empty" : ""}`}
      aria-label={`${label} ${count} 条记忆`}
    >
      <div className="line-card-header" style={{ background: gradient }}>
        <span className="line-card-icon" aria-hidden="true">{icon}</span>
        <div className="line-card-meta">
          <h3 className="line-card-title">{label}</h3>
          <span className="line-card-blurb">{blurb}</span>
        </div>
        <div className="line-card-count">
          <strong>{count}</strong>
          <span>条</span>
        </div>
      </div>

      <div className="line-card-body">
        {count === 0 ? (
          <p className="line-card-empty">这条线还没有记录。试着给人物加个角色关键词，或给事件分个阶段。</p>
        ) : (
          <>
            {topPeople.length > 0 && (
              <div className="line-card-row">
                <span className="line-card-row-label">常出现</span>
                <div className="line-card-chips">
                  {topPeople.map((p) => (
                    <span key={p.id} className="line-card-chip">{p.name}</span>
                  ))}
                </div>
              </div>
            )}
            {topPlace && (
              <div className="line-card-row">
                <span className="line-card-row-label">高频地</span>
                <span className="line-card-place">{topPlace.name}</span>
              </div>
            )}
            {latestEvent && (
              <div className="line-card-row">
                <span className="line-card-row-label">最近</span>
                <span className="line-card-date">{formatDate(latestEvent.date)} · {latestEvent.title}</span>
              </div>
            )}
          </>
        )}
      </div>
    </Link>
  );
}
