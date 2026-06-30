import { Link } from "react-router-dom";
import RelationshipGraph from "../components/RelationshipGraph.jsx";

export default function PeoplePage({
  Layout,
  session,
  uiState,
  filteredEvents,
  setUiState,
  logout,
  api,
  selectedPerson,
  data,
}) {
  const allPeople = (data && data.people) || [];

  if (!selectedPerson) {
    return (
      <Layout
        activeNav="people"
        session={session}
        uiState={uiState}
        filteredEvents={filteredEvents || []}
        onUiStateChange={setUiState}
        onLogout={logout}
        detailLinks={{ event: '/timeline', place: '/space', person: '/people' }}
        data={data}
        pageNotice="当前停留在人物入口。关系不是联系人列表，而是共同经历和叙事线索的索引。"
      >
        <section className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">People</span>
              <h2>暂无人物</h2>
            </div>
          </div>
          <p>您还没有任何人物记录。</p>
        </section>
      </Layout>
    );
  }

  const relatedEvents = (filteredEvents || []).filter((item) =>
    api.getEventPeopleIds(item).includes(selectedPerson.id)
  );
  const leadEvent = relatedEvents[0] || filteredEvents[0] || (data && data.events && data.events[0]);
  const sharedPlaces = api.getSharedPlaces(selectedPerson.id, filteredEvents || []);

  const detailLinks = {
    event: leadEvent ? `/events/${leadEvent.id}` : '/timeline',
    place: leadEvent ? `/places/${leadEvent.placeId || ''}` : '/space',
    person: `/people/${selectedPerson.id}/detail`,
  };

  return (
    <Layout
      activeNav="people"
      session={session}
      uiState={uiState}
      filteredEvents={filteredEvents || []}
      onUiStateChange={setUiState}
      onLogout={logout}
      detailLinks={detailLinks}
      data={data}
      pageNotice="当前停留在人物入口。关系不是联系人列表，而是共同经历和叙事线索的索引。"
      rightRail={
        <>
          <section className="panel-card">
            <div className="panel-title">
              <div>
                <span className="section-eyebrow">Shared Places</span>
                <h2>{selectedPerson.name} 的共同地点</h2>
              </div>
            </div>
            <div className="place-list">
              {sharedPlaces.length === 0 ? (
                <p>暂无共同地点</p>
              ) : (
                sharedPlaces.map((place) => (
                  <Link key={place.id} className="place-list-item" to={`/places/${place.id}`}>
                    <strong>{place.name}</strong>
                    <span>{api.getPlaceTypeLabel(place.type)} · {place.firstSeenAt || '—'} 起</span>
                  </Link>
                ))
              )}
            </div>
          </section>
          <section className="panel-card">
            <div className="panel-title">
              <div>
                <span className="section-eyebrow">Memoir Angle</span>
                <h2>适合写成一章的片段</h2>
              </div>
            </div>
            {leadEvent ? (
              <div className="cluster-card">
                <strong>{leadEvent.title}</strong>
                <p>{leadEvent.summary}</p>
              </div>
            ) : (
              <p>暂无关联事件</p>
            )}
          </section>
        </>
      }
    >
      {/* 关系图 */}
      <section className="panel-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 0" }}>
          <span className="section-eyebrow">Relationship Atlas</span>
          <h2 style={{ margin: "4px 0 6px", fontFamily: "var(--font-serif)", fontSize: 22 }}>
            人物 × 事件 关系网络
          </h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
            圆点大小 = 该人物参与的事件数；方块 = 事件（颜色对应阶段）。可拖拽节点。
          </p>
        </div>
        <div style={{ padding: 16 }}>
          <RelationshipGraph
            people={allPeople}
            events={filteredEvents || []}
            selectedPersonId={selectedPerson.id}
            onSelectPerson={(pid) => setUiState({ selectedPersonId: pid })}
            height={420}
          />
        </div>
      </section>

      <section className="hero-card">
        <div className="hero-copy">
          <span className="section-eyebrow">People Overview</span>
          <h2>{selectedPerson.name} 与你的共同记忆</h2>
          <p>{selectedPerson.intro || '暂无简介'}</p>
          <div className="detail-grid">
            <div className="detail-box"><span>首次出现</span><strong>{selectedPerson.firstSeenAt || '—'}</strong></div>
            <div className="detail-box"><span>最近一次</span><strong>{selectedPerson.latestSeenAt || '—'}</strong></div>
            <div className="detail-box"><span>共现事件</span><strong>{relatedEvents.length}</strong></div>
            <div className="detail-box"><span>关系角色</span><strong>{api.getRoleLabel(selectedPerson.role)}</strong></div>
          </div>
          <div className="action-row">
            <Link className="primary-button" to={detailLinks.person}>进入人物详情页</Link>
            <Link className="secondary-button" to="/memoir">写成一章</Link>
          </div>
        </div>
        <div className="hero-side">
          <span className="section-eyebrow">People Nodes</span>
          <div className="chip-grid">
            {allPeople.length === 0 ? (
              <span className="chip">暂无人物</span>
            ) : (
              allPeople.map((person) => (
                <button
                  key={person.id}
                  className={`tag-button ${person.id === selectedPerson.id ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setUiState({ selectedPersonId: person.id })}
                >
                  {person.name}
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-title">
          <div>
            <span className="section-eyebrow">Shared Event Flow</span>
            <h2>与 {selectedPerson.name} 相关的时间线</h2>
          </div>
          <p>{relatedEvents.length} 条</p>
        </div>
        <div className="card-list">
          {relatedEvents.length === 0 ? (
            <p>暂无共同事件</p>
          ) : (
            relatedEvents.map((event) => (
              <article key={event.id} className="event-card">
                <div className="event-card-main">
                  <span className="event-location">{event.location || ''}</span>
                  <h3>{event.title}</h3>
                  <p className="event-meta">{event.date} · {api.getStageLabel(event.stage)}</p>
                  <p>{event.summary}</p>
                </div>
                <div className="event-card-side">
                  <span className="pill-count">{api.getMediaTotal(event)} 份</span>
                  <Link className="mini-link" to={`/events/${event.id}`}>查看详情</Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </Layout>
  );
}