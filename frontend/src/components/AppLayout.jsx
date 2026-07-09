import CleanHeader from "./CleanHeader.jsx";
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
  const safeEvents = filteredEvents || [];

  const availableYears = years && years.length > 0
    ? years
    : Array.from(new Set(safeEvents.map((e) => {
        const match = String(e.date || '').match(/^(\d{4})/);
        return match ? parseInt(match[1], 10) : null;
      }).filter(Boolean))).sort((a, b) => b - a);

  const yearCounts = availableYears.map((year) => ({
    year,
    count: safeEvents.filter((e) => String(e.date || '').startsWith(String(year)).length > 0).length,
  }));

  const stageCounts = (timexData?.stages || []).map((stage) => ({
    ...stage,
    count: stage.id === "all" ? safeEvents.length : safeEvents.filter((e) => e.stage === stage.id).length,
  }));

  return (
    <div className="app-shell-clean">
      <CleanHeader activeNav={activeNav} session={session} onLogout={onLogout} pageNotice={pageNotice} />

      {/* Inline filter bar */}
      {(availableYears.length > 0 || stageCounts.length > 0) && (
        <div className="filter-bar">
          {availableYears.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">年份</span>
              <button
                className={`filter-pill ${!uiState?.year || uiState?.year === "all" ? "is-active" : ""}`}
                type="button"
                onClick={() => onUiStateChange?.({ year: "all" })}
              >全部</button>
              {yearCounts.map((item) => (
                <button
                  key={item.year}
                  className={`filter-pill ${uiState?.year === item.year ? "is-active" : ""}`}
                  type="button"
                  onClick={() => onUiStateChange?.({ year: item.year })}
                >
                  {item.year}
                  {item.count > 0 && <small>{item.count}</small>}
                </button>
              ))}
            </div>
          )}
          {stageCounts.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">阶段</span>
              <button
                className={`filter-pill ${!uiState?.stage || uiState?.stage === "all" ? "is-active" : ""}`}
                type="button"
                onClick={() => onUiStateChange?.({ stage: "all" })}
              >全部</button>
              {stageCounts.filter((s) => s.id !== "all").map((item) => (
                <button
                  key={item.id}
                  className={`filter-pill ${uiState?.stage === item.id ? "is-active" : ""}`}
                  type="button"
                  onClick={() => onUiStateChange?.({ stage: item.id })}
                >
                  {item.label}
                  {item.count > 0 && <small>{item.count}</small>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full-width content */}
      <main className="clean-main">
        {children}
        {rightRail}
      </main>
    </div>
  );
}
