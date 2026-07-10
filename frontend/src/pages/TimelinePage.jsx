import { Link } from "react-router-dom";
import { useMemo } from "react";
import RichTimeline from "../components/RichTimeline.jsx";
import LineCard from "../components/LineCard.jsx";


const stageToneMap = {
  student: "navy",
  "first-job": "teal",
  maker: "amber",
  family: "rust",
  custom: "ink",
};

const stageColor = {
  student: "#2c486b",
  "first-job": "#3aa39a",
  maker: "#d6a757",
  family: "#b46a4c",
  custom: "#16263b",
};

function greetingFor(date) {
  const hour = date.getHours();
  if (hour < 5) return "夜深了";
  if (hour < 11) return "早安";
  if (hour < 13) return "中午好";
  if (hour < 18) return "下午好";
  if (hour < 22) return "晚上好";
  return "夜深了";
}

function formatDateZh(date) {
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${weekdays[date.getDay()]}`;
}

function VisualTimeline({ events, api, onSelect }) {
  if (!events || events.length === 0) {
    return (
      <div className="visual-timeline">
        <div className="panel-title">
          <div>
            <span className="section-eyebrow">Chronological Atlas</span>
            <h2>时间线总览</h2>
          </div>
        </div>
        <p>暂无事件可绘制时间线</p>
      </div>
    );
  }

  const sorted = api.sortEvents(events);
  const yearCounts = api.getYears(events);
  const minYear = Math.min(...yearCounts);
  const maxYear = Math.max(...yearCounts);
  const span = Math.max(1, maxYear - minYear);
  const W = 1000;
  const H = 130;
  const padX = 40;
  const _padY = 30;
  const usableW = W - padX * 2;
  const baseY = H / 2 + 6;

  // Build year ticks (every 1 year if span <= 8, else every 2 years)
  const yearStep = span <= 8 ? 1 : 2;
  const yearTicks = [];
  for (let y = minYear; y <= maxYear; y += yearStep) {
    yearTicks.push(y);
  }

  const xFor = (event) => {
    const y = api.getEventYear(event);
    if (!y) return null;
    return padX + ((y - minYear) / span) * usableW;
  };

  // Deduplicate events at exact same x (offset slightly)
  const seen = {};
  const points = sorted
    .map((e) => {
      const x = xFor(e);
      if (x == null) return null;
      seen[x] = (seen[x] || 0) + 1;
      return { event: e, x, idx: seen[x] };
    })
    .filter(Boolean);

  return (
    <div className="visual-timeline">
      <div className="panel-title">
        <div>
          <span className="section-eyebrow">Chronological Atlas</span>
          <h2>横向时间线 · {minYear} — {maxYear}</h2>
        </div>
        <p>共 {events.length} 段记忆，点大小代表权重</p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="时间线">
        <line className="vt-axis-line" x1={padX} y1={baseY} x2={W - padX} y2={baseY} />
        {yearTicks.map((year) => {
          const x = padX + ((year - minYear) / span) * usableW;
          return (
            <g key={year}>
              <line x1={x} y1={baseY - 4} x2={x} y2={baseY + 4} stroke="rgba(32,40,51,0.4)" strokeWidth="1" />
              <text className="vt-tick" x={x} y={baseY + 22}>{year}</text>
            </g>
          );
        })}
        {points.map(({ event, x, idx }) => {
          const r = 4 + Math.min(14, (event.weight || 1) * 0.7);
          const yOff = (idx - 1) * 14;
          const color = stageColor[event.stage] || "#16263b";
          return (
            <g
              key={event.id}
              className="vt-dot"
              onClick={() => onSelect && onSelect(event)}
            >
              <title>{`${event.title} · ${event.date} · 权重 ${event.weight || 0}`}</title>
              <circle cx={x} cy={baseY - 18 - yOff} r={r} fill={color} opacity={0.85} />
              <circle cx={x} cy={baseY - 18 - yOff} r={r + 3} fill="none" stroke={color} strokeWidth="1" opacity={0.3} />
            </g>
          );
        })}
      </svg>

      <div className="vt-legend">
        {Object.entries(stageColor).map(([id, color]) => (
          <span className="vt-legend-item" key={id}>
            <span className="vt-legend-swatch" style={{ background: color }} />
            {api.getStageLabel(id)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function TimelinePage({
  Layout,
  session,
  uiState,
  filteredEvents,
  setUiState,
  onLogout,
  api,
  data,
  selectedEvent,
  selectedPlace,
  selectedPerson,
}) {
  const now = useMemo(() => new Date(), []);
  const allEvents = (data && data.events) || [];
  const allPeople = (data && data.people) || [];
  const allPlaces = (data && data.places) || [];
  const allMemoirs = (data && data.memoirs) || [];

  // Derived stats
  const totalEvents = allEvents.length;
  const totalPlaces = allPlaces.length;
  const totalPeople = allPeople.length;
  const totalMedia = api.getTotalMedia(allEvents);
  const totalMemoirs = allMemoirs.length;
  const daysActive = api.getDaysActive(allEvents);
  const memorySpan = api.getMemorySpan(allEvents);
  const stageDistribution = api.getStageDistribution(allEvents);
  const anniversaries = api.getAnniversaries(allEvents, now);
  // Fallback to "this month in past years" if no exact-day anniversaries
  const anniversaryFallback = anniversaries.length === 0
    ? api.getThisMonthMemories(allEvents, now)
    : [];
  const hasAnniversaries = anniversaries.length > 0;
  const hasMonthMemories = anniversaryFallback.length > 0;

  // Active memoir (first one with chapters)
  const activeMemoir = allMemoirs[0] || null;
  const firstChapter = activeMemoir?.chapters?.[0] || null;
  const chapterCount = activeMemoir?.chapters?.length || 0;

  // Recent memories (top 6 by date)
  const recentMemories = api.sortEvents(allEvents).slice(0, 6);

  // Featured event for right rail
  const featuredEvent = selectedEvent || allEvents[0] || null;
  const featuredPlace = featuredEvent
    ? (selectedPlace && selectedPlace.id === featuredEvent.placeId
        ? selectedPlace
        : api.getPlace(featuredEvent.placeId))
    : null;

  const handleSelect = (event) => {
    if (!event) return;
    const personIds = api.getEventPeopleIds(event);
    setUiState({
      selectedEventId: event.id,
      selectedPlaceId: event.placeId,
      selectedPersonId: personIds[0],
    });
  };

  const handleStageClick = (stageId) => {
    setUiState({ stage: uiState?.stage === stageId ? "all" : stageId });
  };

  // Empty state
  if (totalEvents === 0) {
    return (
      <Layout
        activeNav="timeline"
        session={session}
        uiState={uiState}
        filteredEvents={filteredEvents || []}
        onUiStateChange={setUiState}
        onLogout={onLogout}
        detailLinks={{ event: '/events', place: '/space', person: '/people' }}
        data={data}
        pageNotice="时间线"
      >
        <section className="greeting-banner">
          <div>
            <span className="greeting-eyebrow">Welcome</span>
            <h1 className="greeting-title">
              {greetingFor(now)}，<em>{session?.name || '时光记录者'}</em>
            </h1>
            <p className="greeting-sub">{formatDateZh(now)}</p>
            <p className="greeting-sub">还没有任何事件记录，开始创建你的第一段记忆吧。</p>
          </div>
        </section>
      </Layout>
    );
  }

  const detailLinks = {
    event: featuredEvent ? `/events/${featuredEvent.id}` : '/timeline',
    place: featuredPlace ? `/places/${featuredPlace.id}` : '/space',
    person: selectedPerson ? `/people/${selectedPerson.id}/detail` : '/people',
  };

  return (
    <Layout
        activeNav="timeline"
      session={session}
      uiState={uiState}
      filteredEvents={filteredEvents || []}
      onUiStateChange={setUiState}
      onLogout={onLogout}
      detailLinks={detailLinks}
      data={data}
      pageNotice="时间线"
      rightRail={
        <>
          {featuredEvent && (
            <section className="panel-card">
              <div className="panel-title">
                <div>
                  <span className="section-eyebrow">Detail Layer</span>
                  <h2>当前记忆摘要</h2>
                </div>
                <Link className="mini-link" to={`/events/${featuredEvent.id}`}>详情</Link>
              </div>
              <div className="cluster-card">
                <strong>{featuredEvent.title}</strong>
                <p>{featuredEvent.summary}</p>
                <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                  {featuredEvent.date} · {featuredPlace?.name || featuredEvent.location || '未知地点'} · {api.getStageLabel(featuredEvent.stage)}
                </p>
              </div>
            </section>
          )}

          <section className="panel-card">
            <div className="panel-title">
              <div>
                <span className="section-eyebrow">Map Snapshot</span>
                <h2>地点密度</h2>
              </div>
              <Link className="mini-link" to="/space">展开</Link>
            </div>
            <div className="chip-grid">
              {Array.from(new Map(
                allPlaces.map((p) => [p.id, p])
              ).values()).slice(0, 12).map((place) => (
                <span key={place.id} className="chip">{place.name}</span>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-title">
              <div>
                <span className="section-eyebrow">People Snapshot</span>
                <h2>关系网络</h2>
              </div>
              <Link className="mini-link" to="/people">展开</Link>
            </div>
            <div className="chip-grid">
              {allPeople.slice(0, 14).map((p) => (
                <span key={p.id} className="tag">{p.name}</span>
              ))}
            </div>
          </section>
        </>
      }
    >
      <div className="home-stack">
        {/* === 1. 问候横幅 === */}
        <section className="greeting-banner">
          <div>
            <span className="greeting-eyebrow">
              {greetingFor(now)} · {formatDateZh(now)}
            </span>
            <h1 className="greeting-title">
              {greetingFor(now)}，<em>{session?.name || '时光记录者'}</em>
            </h1>
            <p className="greeting-sub">
              你的时光机器里保存着 <strong>{totalEvents}</strong> 段重要记忆，分布在 <strong>{totalPlaces}</strong> 个地点、与 <strong>{totalPeople}</strong> 位重要的人交织而成。
            </p>
            <div className="greeting-meta">
              <div>
                <strong>{memorySpan}</strong>
                <span>记录跨度（天）</span>
              </div>
              <div>
                <strong>{daysActive}</strong>
                <span>有记忆的天数</span>
              </div>
              <div>
                <strong>{chapterCount}</strong>
                <span>正在编排的章节</span>
              </div>
              <div>
                <strong>{totalMedia}</strong>
                <span>素材总量</span>
              </div>
            </div>
          </div>
          <div className="greeting-quote">
            <span className="section-eyebrow">Today's Note</span>
            <blockquote>
              时间不会重复它自己，但你可以一遍一遍地回到那几天。
            </blockquote>
            <cite>— 周屿 · 《城市之间》</cite>
          </div>
        </section>

        {/* === 2. 统计仪表盘 === */}
        <section className="stat-dashboard">
          <div className="stat-card tone-navy">
            <div className="stat-card-icon">◐</div>
            <div className="stat-card-value">
              {totalEvents}
              <small>段</small>
            </div>
            <div className="stat-card-label">Events</div>
            <div className="stat-card-foot">事件总数 · 横跨 {api.getYears(allEvents).length} 年</div>
          </div>
          <div className="stat-card tone-teal">
            <div className="stat-card-icon">◎</div>
            <div className="stat-card-value">
              {totalPlaces}
              <small>处</small>
            </div>
            <div className="stat-card-label">Places</div>
            <div className="stat-card-foot">地点密度 · 城市/旅行/家庭/日常</div>
          </div>
          <div className="stat-card tone-rust">
            <div className="stat-card-icon">♡</div>
            <div className="stat-card-value">
              {totalPeople}
              <small>位</small>
            </div>
            <div className="stat-card-label">People</div>
            <div className="stat-card-foot">人物索引 · 共同经历线索</div>
          </div>
          <div className="stat-card tone-amber">
            <div className="stat-card-icon">▣</div>
            <div className="stat-card-value">
              {totalMedia}
              <small>份</small>
            </div>
            <div className="stat-card-label">Media</div>
            <div className="stat-card-foot">素材总量 · 照片/视频/音频</div>
          </div>
          <div className="stat-card tone-ink">
            <div className="stat-card-icon">✎</div>
            <div className="stat-card-value">
              {totalMemoirs}
              <small>本</small>
            </div>
            <div className="stat-card-label">Memoirs</div>
            <div className="stat-card-foot">回忆录 · 草稿 / 已发布</div>
          </div>
          <div className="stat-card tone-paper">
            <div className="stat-card-icon">◇</div>
            <div className="stat-card-value">
              {daysActive}
              <small>天</small>
            </div>
            <div className="stat-card-label">Days Active</div>
            <div className="stat-card-foot">有记忆的天数</div>
          </div>
        </section>

        {/* === 3. 今日记忆 / 周年纪念 === */}
        {(hasAnniversaries || hasMonthMemories) && (
          <section className="panel-card anniversary">
            <div className="anniversary-head">
              <div>
                <span className="section-eyebrow">
                  {hasAnniversaries
                    ? `Memory of Today · ${formatDateZh(now)}`
                    : `This Month in Past Years · ${now.getMonth() + 1} 月`}
                </span>
                <h2>{hasAnniversaries ? '今日纪念' : '本月往昔'}</h2>
              </div>
              <span className="section-eyebrow">
                {(hasAnniversaries ? anniversaries : anniversaryFallback).length} 段往昔
              </span>
            </div>
            <div className="anniversary-grid">
              {(hasAnniversaries ? anniversaries : anniversaryFallback).slice(0, 3).map((event) => {
                const place = api.getPlace(event.placeId);
                const people = api.formatPeople(api.getEventPeopleIds(event));
                return (
                  <article
                    key={event.id}
                    className="anniversary-card"
                    onClick={() => handleSelect(event)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="anniversary-badge">
                      {hasAnniversaries
                        ? `${event.yearsAgo} 年前的今天`
                        : `${event.yearsAgo} 年前的 ${now.getMonth() + 1} 月`}
                    </span>
                    <h3 className="anniversary-title">{event.title}</h3>
                    <div className="anniversary-meta">
                      <span>{event.date}</span>
                      <span>{place?.name || event.location || '未知地点'}</span>
                      {people.length > 0 && <span>与 {people.join("、")}</span>}
                    </div>
                    <p className="anniversary-summary">{event.summary}</p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* === 4. 视觉时间线 === */}
        <VisualTimeline events={allEvents} api={api} onSelect={handleSelect} />

        {/* === 5. 阶段分布 === */}
        <section className="panel-card stage-distribution">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Life Stage Distribution</span>
              <h2>人生阶段分布</h2>
            </div>
            <p>点击切换筛选</p>
          </div>
          <div className="stage-bars">
            {stageDistribution.map((stage) => {
              const tone = stageToneMap[stage.id] || "ink";
              const isActive = uiState?.stage === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  className={`stage-bar ${isActive ? "is-active" : ""}`}
                  onClick={() => handleStageClick(stage.id)}
                >
                  <span className="stage-bar-label">{stage.label}</span>
                  <span className="stage-bar-track">
                    <span
                      className="stage-bar-fill"
                      style={{
                        width: `${stage.percent}%`,
                        background: `var(--${tone === "navy" ? "navy" : tone === "teal" ? "teal" : tone === "rust" ? "rust" : tone === "amber" ? "amber" : "ink"})`,
                      }}
                    />
                  </span>
                  <span className="stage-bar-stat">
                    {stage.count}
                    <small>段 · {stage.percent}%</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* === 6. 活跃回忆录 === */}
        {activeMemoir && (
          <section className="active-memoir">
            <div className="active-memoir-text">
              <span className="section-eyebrow">Currently Writing</span>
              <h3>《{activeMemoir.title}》</h3>
              <p>{activeMemoir.blurb || '把零散的事件编排成完整的章节。'}</p>
              <div className="meta">
                <span>{chapterCount} 个章节</span>
                <span>·</span>
                <span>{firstChapter ? `当前编辑：${firstChapter.title}` : '尚未开始'}</span>
                <span>·</span>
                <span>状态：{activeMemoir.status || 'draft'}</span>
              </div>
            </div>
            <Link className="primary-button" to="/memoir">继续编辑</Link>
          </section>
        )}

        {/* === 7. 近期记忆图廊 === */}
        <section className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Recent Memories</span>
              <h2>近期记忆</h2>
            </div>
            <Link className="mini-link" to="/timeline">全部</Link>
          </div>
          <div className="memory-gallery">
            {recentMemories.map((event) => {
              const place = api.getPlace(event.placeId);
              const people = api.formatPeople(api.getEventPeopleIds(event));
              const tone = stageToneMap[event.stage] || "ink";
              const initial = (event.title || "?")[0];
              return (
                <article
                  key={event.id}
                  className="memory-card-large"
                  onClick={() => handleSelect(event)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`mc-cover tone-${tone}`}>{initial}</div>
                  <h3>{event.title}</h3>
                  <div className="mc-meta">
                    <span>{event.date}</span>
                    <span>·</span>
                    <span>{place?.name || event.location || '未知地点'}</span>
                    <span>·</span>
                    <span>{api.getStageLabel(event.stage)}</span>
                  </div>
                  <p className="mc-summary">{event.summary}</p>
                  {people.length > 0 && (
                    <div className="mc-people">
                      {people.map((name, idx) => (
                        <span key={`${name}-${idx}`} className="tag">{name}</span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* === 8. Rich Timeline (竖向时间线) === */}
        {recentMemories.length > 0 && (
          <section className="panel-card">
            <div className="panel-title">
              <div>
                <span className="section-eyebrow">Rich Timeline</span>
                <h2>近期记忆（卡片视图）</h2>
              </div>
              <p>按时间倒序 · 共 {allEvents.length} 段</p>
            </div>
            <RichTimeline events={recentMemories} api={api} />
          </section>
        )}

        {/* === 9. 6 Lines Hub (六条线维度导航) === */}
        <section className="panel-card lines-hub-section">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">6 Lines Hub</span>
              <h2>六条线 · 维度导航</h2>
            </div>
            <Link className="mini-link" to="/lines">展开 hub →</Link>
          </div>
          <p className="lines-hub-intro">
            把记忆从「什么时候 / 在哪儿 / 和谁」三个角度重新切一遍。
            每条线都能独立打开，看到该维度的事件流与重点人物 / 地点。
          </p>
          <div className="lines-hub">
            {api.getAllLines(allEvents).map((line) => (
              <LineCard key={line.id} line={line} compact />
            ))}
          </div>
        </section>

        {/* === 10. 快速操作 === */}
        <section className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Quick Actions</span>
              <h2>快速操作</h2>
            </div>
            <p>一键进入常用路径</p>
          </div>
          <div className="quick-actions">
            <Link className="quick-action" to="/timeline">
              <span className="quick-action-icon">＋</span>
              <span className="quick-action-text">
                <strong>新建事件</strong>
                <span>在时间线上落下一段新的记忆</span>
              </span>
              <span className="arrow">→</span>
            </Link>
            <Link className="quick-action" to="/space">
              <span className="quick-action-icon">◎</span>
              <span className="quick-action-text">
                <strong>探索空间</strong>
                <span>按地点重走记忆路线</span>
              </span>
              <span className="arrow">→</span>
            </Link>
            <Link className="quick-action" to="/people">
              <span className="quick-action-icon">♡</span>
              <span className="quick-action-text">
                <strong>关系网络</strong>
                <span>查看与某人的共同经历</span>
              </span>
              <span className="arrow">→</span>
            </Link>
            <Link className="quick-action" to="/memoir">
              <span className="quick-action-icon">✎</span>
              <span className="quick-action-text">
                <strong>编辑回忆录</strong>
                <span>把事件编排成章节</span>
              </span>
              <span className="arrow">→</span>
            </Link>
            <Link className="quick-action" to="/license">
              <span className="quick-action-icon">✦</span>
              <span className="quick-action-text">
                <strong>授权管理</strong>
                <span>查看 License / 设备</span>
              </span>
              <span className="arrow">→</span>
            </Link>
          </div>
        </section>
      </div>

      {/* 浮动操作按钮 + 今日心情 */}
      </Layout>
  );
}
