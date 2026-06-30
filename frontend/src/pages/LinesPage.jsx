// 6 条线 hub 页：/lines 网格入口；/lines/:lineId 自动选中一条并展开该线下的事件
import { useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useUIStore } from "../store";
import { lines as linesMeta, getLineMeta } from "../data/lines.js";
import LineCard from "../components/LineCard.jsx";
import RichTimeline from "../components/RichTimeline.jsx";

export default function LinesPage({
  Layout,
  uiState,
  api,
  data,
}) {
  const { lineId } = useParams();
  const navigate = useNavigate();
  const setLine = useUIStore((s) => s.setUiState);

  const allEvents = data?.events || [];
  const allPeople = data?.people || [];
  const allPlaces = data?.places || [];

  const allLines = useMemo(() => {
    if (!api) {
      return linesMeta.map((l) => ({
        ...l,
        count: 0,
        topPeople: [],
        topPlace: null,
        latestEvent: null,
        earliestEvent: null,
      }));
    }
    return api.getAllLines(allEvents);
  }, [api, allEvents]);

  // 选中状态：URL 优先，回退到 uiState.line
  const activeLineId = lineId || uiState?.line || "all";
  const activeLine = useMemo(() => {
    if (activeLineId === "all" || !activeLineId) return null;
    return allLines.find((l) => l.id === activeLineId) || getLineMeta(activeLineId);
  }, [activeLineId, allLines]);

  const lineEvents = useMemo(() => {
    if (!api || !activeLine) return [];
    return api.getEventsByLine(activeLine.id, allEvents);
  }, [api, activeLine, allEvents]);

  const lineStats = useMemo(() => {
    if (!api || !activeLine) return null;
    return api.getLineStats(activeLine.id, allEvents);
  }, [api, activeLine, allEvents]);

  const handleClearLine = () => {
    setLine({ line: "all" });
    navigate("/lines");
  };

  const body = (
    <div className="lines-page">
      <header className="lines-page-header">
        <div>
          <span className="section-eyebrow">6 Lines Hub</span>
          <h1>六条线 · 维度导航</h1>
          <p className="lines-page-sub">
            把所有记忆从「什么时候 / 在哪儿 / 和谁」三个角度重新组织起来。点开任意一条线，看该维度下的事件流、相关人物与重点地点。
          </p>
        </div>
        <Link className="ghost-button" to="/timeline">← 回到时间线</Link>
      </header>

      <section className="lines-hub" aria-label="6 条线">
        {allLines.map((line) => (
          <LineCard key={line.id} line={line} compact />
        ))}
      </section>

      {activeLine && (
        <section className="lines-detail" aria-label={`${activeLine.label} 详情`}>
          <div className="lines-detail-header" style={{ background: activeLine.gradient }}>
            <div className="lines-detail-title">
              <span className="line-card-icon" aria-hidden="true">{activeLine.icon}</span>
              <div>
                <h2>{activeLine.label}</h2>
                <p>{activeLine.blurb}</p>
              </div>
            </div>
            <div className="lines-detail-stats">
              <div className="lines-detail-stat">
                <strong>{lineStats?.count || 0}</strong>
                <span>事件</span>
              </div>
              <div className="lines-detail-stat">
                <strong>{lineStats?.topPeople?.length || 0}</strong>
                <span>关联人物</span>
              </div>
              <div className="lines-detail-stat">
                <strong>{lineStats?.topPlace ? 1 : 0}</strong>
                <span>重点地点</span>
              </div>
            </div>
            <button className="lines-detail-clear" type="button" onClick={handleClearLine}>
              清除筛选
            </button>
          </div>

          {(lineStats?.topPeople?.length > 0 || lineStats?.topPlace) && (
            <div className="lines-detail-context">
              {lineStats?.topPlace && (
                <div className="lines-detail-chip">
                  <span className="chip-label">重点地点</span>
                  <Link to={`/places/${lineStats.topPlace.id}`} className="chip-value">
                    {lineStats.topPlace.name}
                  </Link>
                </div>
              )}
              {lineStats?.topPeople?.length > 0 && (
                <div className="lines-detail-chip">
                  <span className="chip-label">常出现</span>
                  {lineStats.topPeople.map((p) => (
                    <Link key={p.id} to={`/people/${p.id}/detail`} className="chip-value is-person">
                      {p.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="lines-detail-list">
            <div className="lines-detail-list-head">
              <h3>该线下的事件流</h3>
              <span>{lineEvents.length} 条记忆</span>
            </div>
            {lineEvents.length === 0 ? (
              <p className="lines-detail-empty">这条线目前没有匹配的事件。</p>
            ) : (
              <RichTimeline
                events={lineEvents}
                people={allPeople}
                places={allPlaces}
                api={api}
                selectedEventId={lineEvents[0]?.id}
                onSelectEvent={() => {}}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );

  if (Layout) {
    return <Layout>{body}</Layout>;
  }
  return body;
}
