import { NavLink } from "react-router-dom";
import { timexData } from "../mock/timexData";

export default function AppLayout({
  activeNav,
  session,
  uiState,
  filteredEvents,
  onUiStateChange,
  onLogout,
  detailLinks,
  pageNotice,
  children,
  rightRail,
}) {
  const yearCounts = timexData.years.map((year) => ({
    year,
    count: filteredEvents.filter((event) => event.year === year).length,
  }));

  const stageCounts = timexData.stages.map((stage) => ({
    ...stage,
    count:
      stage.id === "all"
        ? filteredEvents.length
        : filteredEvents.filter((event) => event.stage === stage.id).length,
  }));

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">时</div>
          <div>
            <h1>时光机器 Frontend</h1>
            <p>React/Vite 正式前端骨架 · 静态测试数据演示版</p>
          </div>
        </div>

        <nav className="top-nav" aria-label="主导航">
          {timexData.navViews.map((item) => (
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
              value={uiState.search}
              onChange={(event) => onUiStateChange({ search: event.target.value })}
              placeholder="搜事件、地点、人物"
            />
          </label>
          <div className={`session-chip ${session.tone}`}>
            <strong>{session.name}</strong>
            <span>{session.role}</span>
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
            <h2>{session.name} 的记忆工作台</h2>
            <p>{pageNotice}</p>
            <div className="summary-grid">
              <div className="summary-metric">
                <span className="metric-label">登录身份</span>
                <strong>{session.role}</strong>
              </div>
              <div className="summary-metric">
                <span className="metric-label">事件总数</span>
                <strong>{timexData.events.length}</strong>
              </div>
              <div className="summary-metric">
                <span className="metric-label">人物索引</span>
                <strong>{timexData.people.length}</strong>
              </div>
              <div className="summary-metric">
                <span className="metric-label">章节草稿</span>
                <strong>{timexData.memoirChapters.length}</strong>
              </div>
            </div>
          </section>

          <section className="rail-section">
            <div className="rail-title">
              <h3>年份轨迹</h3>
              <span>{uiState.year === "all" ? "全部年份" : uiState.year}</span>
            </div>
            <div className="year-list">
              <button
                className={`year-pill ${uiState.year === "all" ? "is-active" : ""}`}
                type="button"
                onClick={() => onUiStateChange({ year: "all" })}
              >
                <strong>全部年份</strong>
                <span className="pill-count">{filteredEvents.length}</span>
              </button>
              {yearCounts.map((item) => (
                <button
                  key={item.year}
                  className={`year-pill ${uiState.year === item.year ? "is-active" : ""}`}
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
                {timexData.stages.find((item) => item.id === uiState.stage)?.label || "全部阶段"}
              </span>
            </div>
            <div className="stage-list">
              {stageCounts.map((item) => (
                <button
                  key={item.id}
                  className={`stage-pill ${uiState.stage === item.id ? "is-active" : ""}`}
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
              <h3>工程骨架页</h3>
              <span>React Router</span>
            </div>
            <div className="stage-list">
              <NavLink className="stage-pill" to={detailLinks.event}>
                <strong>事件详情页</strong>
                <span>事件叙事与关联索引</span>
              </NavLink>
              <NavLink className="stage-pill" to={detailLinks.place}>
                <strong>地点详情页</strong>
                <span>地点时间切片与空间档案</span>
              </NavLink>
              <NavLink className="stage-pill" to={detailLinks.person}>
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
