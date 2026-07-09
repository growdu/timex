import { useState } from "react";
import { Link } from "react-router-dom";
import { useDashboardStats } from "../App.jsx";
import CleanHeader from "../components/CleanHeader.jsx";

const STAGE_LABELS = { student: "学生时代", "first-job": "初入职场", maker: "创作试验", family: "家庭时刻", custom: "自定义" };
const MOMENT_LABELS = { photo: "📷 照片", video: "🎬 视频", audio: "🎵 音频", text: "📝 文字" };
const C = ['#3b5bdb', '#0c8599', '#e64980', '#7048e8', '#2f9e44', '#f08c00'];

function StatCard({ icon, label, value, color }) {
  return (
    <div className="dash-stat-card" style={{ borderTopColor: color }}>
      <span className="dash-stat-icon" style={{ color }}>{icon}</span>
      <div><strong>{value}</strong><small>{label}</small></div>
    </div>
  );
}

function BarRow({ label, count, max, color }) {
  return (
    <div className="dash-bar-row">
      <span className="dash-bar-label">{label}</span>
      <div className="dash-bar-track"><div className="dash-bar-fill" style={{ width: `${max > 0 ? (count / max) * 100 : 0}%`, background: color }} /></div>
      <span className="dash-bar-count">{count}</span>
    </div>
  );
}

function DashCard({ title, more, children }) {
  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <h3 className="dash-card-title">{title}</h3>
        {more}
      </div>
      {children}
    </section>
  );
}

export default function DashboardPage({ user, logout }) {
  const { data: stats, isLoading, error, refetch } = useDashboardStats();
  const [showStorybook, setShowStorybook] = useState(false);
  const nickname = user?.nickname || user?.email?.split('@')[0] || '用户';

  // Loading state
  if (isLoading) {
    return (
      <div className="dash-standalone">
        <div className="dash-loading">
          <div className="dash-loading-spinner" />
          <p>正在加载统计数据...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !stats) {
    return (
      <div className="dash-standalone">
        <div className="dash-error">
          <p>⚠️ 统计数据加载失败</p>
          <button className="primary-button" onClick={() => refetch()}>重新加载</button>
        </div>
      </div>
    );
  }

  // Defensive: ensure all arrays exist
  const timeline = stats.timelineDistribution || [];
  const stages = stats.stageDistribution || [];
  const places = stats.placeDistribution || [];
  const moments = stats.momentTypeDistribution || [];
  const recentEvents = stats.recentEvents || [];
  const topPeople = stats.topPeople || [];
  const memoirs = stats.memoirs || [];
  const totals = stats.totals || { events: 0, people: 0, places: 0, moments: 0, memoirs: 0 };
  const yearRange = stats.yearRange || {};

  const maxVal = (arr, key) => arr.length > 0 ? Math.max(...arr.map((d) => d[key]), 1) : 1;

  return (
    <div className="dash-standalone">
      <CleanHeader activeNav="dashboard" session={{ name: nickname }} onLogout={logout} pageNotice="统计大屏" />

      <main className="dash-content">
        {/* Greeting */}
        <section className="dash-greeting">
          <h1>{nickname}的时光档案</h1>
          <p>你已记录 <strong>{totals.events}</strong> 个事件 · <strong>{totals.people}</strong> 位人物 · <strong>{totals.places}</strong> 个地点 · <strong>{totals.moments}</strong> 份素材{yearRange.earliest ? ` · 跨越 ${yearRange.earliest}–${yearRange.latest} 年` : ''}</p>
        </section>

        {/* Stat cards */}
        <section className="dash-stats-row">
          <StatCard icon="📅" label="事件" value={totals.events} color={C[0]} />
          <StatCard icon="👥" label="人物" value={totals.people} color={C[2]} />
          <StatCard icon="📍" label="地点" value={totals.places} color={C[1]} />
          <StatCard icon="📸" label="瞬间" value={totals.moments} color={C[3]} />
          <StatCard icon="📖" label="回忆录" value={totals.memoirs} color={C[4]} />
        </section>

        {/* Charts row 1 */}
        <div className="dash-grid">
          <DashCard title="📊 时间线分布">
            <div className="dash-bar-list">
              {timeline.length > 0 ? timeline.map((d, i) => (
                <BarRow key={d.year} label={`${d.year}年`} count={d.count} max={maxVal(timeline, 'count')} color={C[i % C.length]} />
              )) : <p className="dash-empty">暂无数据</p>}
            </div>
          </DashCard>

          <DashCard title="🎯 阶段分布">
            <div className="dash-bar-list">
              {stages.length > 0 ? stages.map((d, i) => (
                <BarRow key={d.stage} label={STAGE_LABELS[d.stage] || d.stage} count={d.count} max={maxVal(stages, 'count')} color={C[i % C.length]} />
              )) : <p className="dash-empty">暂无数据</p>}
            </div>
          </DashCard>
        </div>

        {/* Recent events */}
        <DashCard title="🕐 最近事件" more={<Link to="/timeline" className="dash-more">查看全部 →</Link>}>
          <div className="dash-event-list">
            {recentEvents.length > 0 ? recentEvents.map((e) => (
              <Link to={`/events/${e.id}`} key={e.id} className="dash-event-item">
                <span className="dash-event-date">{e.date}</span>
                <div className="dash-event-info">
                  <strong>{e.title}</strong>
                  <small>{e.location || ''}{e.place?.name ? ` · ${e.place.name}` : ''}</small>
                </div>
                <span className="dash-event-badge">{e.moments?.length || 0} 份素材</span>
              </Link>
            )) : <p className="dash-empty">暂无事件，去时间线添加吧</p>}
          </div>
        </DashCard>

        {/* Charts row 2 - 4 columns */}
        <div className="dash-grid-4">
          <DashCard title="📍 地点分布">
            <div className="dash-bar-list">
              {places.length > 0 ? places.map((d, i) => (
                <BarRow key={d.placeId} label={d.name} count={d.count} max={maxVal(places, 'count')} color={C[i % C.length]} />
              )) : <p className="dash-empty">暂无数据</p>}
            </div>
          </DashCard>

          <DashCard title="⭐ 核心人物">
            <div className="dash-people-grid">
              {topPeople.length > 0 ? topPeople.map((p, i) => (
                <div className="dash-person-chip" key={p.personId} style={{ borderLeftColor: C[i % C.length] }}>
                  <strong>{p.name}</strong>
                  <small>{p.role || ''}</small>
                  <span className="dash-person-count" style={{ color: C[i % C.length] }}>{p.eventCount} 次</span>
                </div>
              )) : <p className="dash-empty">暂无数据</p>}
            </div>
          </DashCard>

          <DashCard title="🎞 素材构成">
            <div className="dash-bar-list">
              {moments.length > 0 ? moments.map((d, i) => (
                <BarRow key={d.type} label={MOMENT_LABELS[d.type] || d.type} count={d.count} max={maxVal(moments, 'count')} color={C[i % C.length]} />
              )) : <p className="dash-empty">暂无数据</p>}
            </div>
          </DashCard>

          <DashCard title="📖 回忆录">
            <div className="dash-memoir-list">
              {memoirs.length > 0 ? memoirs.map((m) => (
                <Link to="/memoir" key={m.id} className="dash-memoir-item">
                  <strong>{m.title}</strong>
                  <small>{m.chapterCount} 章</small>
                </Link>
              )) : <p className="dash-empty">还没有回忆录</p>}
            </div>
          </DashCard>
        </div>

        {/* Export bar */}
        <section className="dash-export-bar">
          <h3>📤 导出与打印</h3>
          <p className="dash-export-desc">将你的时光数据导出为相册、时间线或故事书，可打印或保存为 PDF。</p>
          <div className="dash-export-actions">
            <Link to="/export/album" className="primary-button">📸 导出相册</Link>
            <Link to="/export/timeline" className="ghost-button">📅 导出时间线</Link>
            <button className="ghost-button" onClick={() => setShowStorybook(!showStorybook)}>📖 导出故事书</button>
          </div>
          {showStorybook && memoirs.length > 0 && (
            <div className="dash-storybook-picker">
              {memoirs.map((m) => (
                <Link key={m.id} to={`/export/storybook/${m.id}`} className="dash-storybook-link">
                  {m.title}（{m.chapterCount} 章）→
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
