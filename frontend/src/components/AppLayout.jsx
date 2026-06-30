import { NavLink } from "react-router-dom";
import { timexData } from "../mock/timexData";

export default function AppLayout({
  activeNav,
  session,
  uiState,
  filteredEvents,
  years,
  api,
  onUiStateChange,
  onLogout,
  detailLinks,
  pageNotice,
  data,
  children,
  rightRail,
}) {
  const safeDetailLinks = detailLinks || { event: '/events', place: '/space', person: '/people' };
  const safeEvents = filteredEvents || [];
  const allEvents = (data && data.events) || safeEvents || [];
  const allPeople = (data && data.people) || (api && safeEvents.length
    ? Array.from(new Set(safeEvents.flatMap((e) => api.getEventPeopleIds(e))))
        .map((id) => api.getPerson(id))
        .filter(Boolean)
    : []);
  const allMemoirs = (data && data.memoirs) || [];

  // Use passed-in years or derive from events
  const availableYears = years && years.length > 0
    ? years
    : Array.from(new Set(allEvents.map((e) => {
        const match = String(e.date || '').match(/^(\d{4})/);
        return match ? parseInt(match[1], 10) : null;
      }).filter(Boolean))).sort((a, b) => b - a);

  const yearCounts = availableYears.map((year) => ({
    year,
    count: safeEvents.filter((event) => {
      const match = String(event.date || '').match(/^(\d{4})/);
      return match && parseInt(match[1], 10) === year;
    }).length,
  }));

  const stageCounts = (timexData?.stages || []).map((stage) => ({
    ...stage,
    count:
      stage.id === "all"
        ? safeEvents.length
        : safeEvents.filter((event) => event.stage === stage.id).length,
  }));

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">时</div>
          <div>
            <h1>时光机器 Frontend</h1>
            <p>React/Vite 正式前端骨架 · 真实 API 数据演示版</p>
          </div>
        </div>

        <nav className="top-nav" aria-label="主导航">
          {(timexData?.navViews || []).map((item) => (
            <NavLink
              key={item.id}
              className={({ isActive }) =>
                `nav-chip ${isActive || activeNav === item.id ? "is-active" : ""}`
              }
              to={item.to}
            >
              <strong>{item.label}</strong>
              <span>{item.note}</span>
            </NavLink>
          ))}
        </nav>

        <div className="top-actions">
          <label className="search-pill">
            <span>检索记忆</span>
            <input
              type="search"
              value={uiState?.search || ''}
              onChange={(event) => onUiStateChange({ search: event.target.value })}
              placeholder="搜事件、地点、人物"
            />
          </label>
          <div className={`session-chip ${session?.tone || 'navy'}`}>
            <strong>{session?.name || '用户'}</strong>
            <span>{session?.role || ''}</span>
          </div>
          <button className="ghost-button" type="button" onClick={onLogout}>
            退出演示
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="left-rail">
          <section className="rail-summary">
            <span className="section-eyebrow">Prototype Session</span>
            <h2>{session?.name || '用户'} 的记忆工作台</h2>
            <p>{pageNotice}</p>
            <div className="summary-grid">
              <div className="summary-metric">
                <span className="metric-label">登录身份</span>
                <strong>{session?.role || ''}</strong>
              </div>
              <div className="summary-metric">
                <span className="metric-label">事件总数</span>
                <strong>{allEvents.length}</strong>
              </div>
              <div className="summary-metric">
                <span className="metric-label">人物索引</span>
                <strong>{(data?.people || allPeople || []).length}</strong>
              </div>
              <div className="summary-metric">
                <span className="metric-label">章节草稿</span>
                <strong>{(data?.memoirs || allMemoirs || []).reduce((sum, m) => sum + ((m.chapters || []).length), 0)}</strong>
              </div>
            </div>
          </section>

          <section className="rail-section">
            <div className="rail-title">
              <h3>年份轨迹</h3>
              <span>{(uiState?.year === 'all' || !uiState?.year) ? "全部年份" : uiState.year}</span>
            </div>
            <div className="year-list">
              <button
                className={`year-pill ${(!uiState?.year || uiState?.year === "all") ? "is-active" : ""}`}
                type="button"
                onClick={() => onUiStateChange({ year: "all" })}
              >
                <strong>全部年份</strong>
                <span className="pill-count">{safeEvents.length}</span>
              </button>
              {yearCounts.map((item) => (
                <button
                  key={item.year}
                  className={`year-pill ${uiState?.year === item.year ? "is-active" : ""}`}
                  type="button"
                  onClick={() => onUiStateChange({ year: item.year })}
                >
                  <strong>{item.year}</strong>
                  <span className="pill-count">{item.count}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rail-section">
            <div className="rail-title">
              <h3>人生阶段</h3>
              <span>
                {(timexData?.stages || []).find((item) => item.id === uiState?.stage)?.label || "全部阶段"}
              </span>
            </div>
            <div className="stage-list">
              {stageCounts.map((item) => (
                <button
                  key={item.id}
                  className={`stage-pill ${uiState?.stage === item.id ? "is-active" : ""}`}
                  type="button"
                  onClick={() => onUiStateChange({ stage: item.id })}
                >
                  <strong>{item.label}</strong>
                  <span className="pill-count">{item.count}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rail-section">
            <div className="rail-title">
              <h3>六条线</h3>
              <span>维度导航</span>
            </div>
            <NavLink className="stage-pill lines-pill" to="/lines">
              <strong>⌛ 时间线 · ◎ 空间线</strong>
              <span>按日期 / 地点回看</span>
            </NavLink>
            <NavLink className="stage-pill lines-pill" to="/lines/emotion">
              <strong>♡ 感情线</strong>
              <span>最亲密的两个人</span>
            </NavLink>
            <NavLink className="stage-pill lines-pill" to="/lines/career">
              <strong>▣ 事业线</strong>
              <span>工作 / 创业 / 学习</span>
            </NavLink>
            <NavLink className="stage-pill lines-pill" to="/lines/family">
              <strong>⌂ 亲情线</strong>
              <span>家人陪伴的每一天</span>
            </NavLink>
            <NavLink className="stage-pill lines-pill" to="/lines/friends">
              <strong>☆ 朋友线</strong>
              <span>一起笑过的人</span>
            </NavLink>
          </section>

          <section className="rail-section">
            <div className="rail-title">
              <h3>工程骨架页</h3>
              <span>React Router</span>
            </div>
            <div className="stage-list">
              <NavLink className="stage-pill" to={safeDetailLinks.event}>
                <strong>事件详情页</strong>
                <span>事件叙事与关联索引</span>
              </NavLink>
              <NavLink className="stage-pill" to={safeDetailLinks.place}>
                <strong>地点详情页</strong>
                <span>地点时间切片与空间档案</span>
              </NavLink>
              <NavLink className="stage-pill" to={safeDetailLinks.person}>
                <strong>人物详情页</strong>
                <span>共同经历与关系档案</span>
              </NavLink>
            </div>
          </section>
        </aside>

        <main className="center-stage">{children}</main>
        <aside className="right-rail">{rightRail}</aside>
      </div>
    </div>
  );
}