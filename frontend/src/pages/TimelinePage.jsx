import { Link } from "react-router-dom";

function renderPeople(people) {
  return people.map((name) => <span key={name} className="tag">{name}</span>);
}

export default function TimelinePage({
  Layout,
  session,
  uiState,
  filteredEvents,
  setUiState,
  logout,
  api,
  selectedEvent,
  selectedPlace,
  selectedPerson,
}) {
  const detailLinks = {
    event: `/events/${selectedEvent.id}`,
    place: `/places/${selectedPlace.id}`,
    person: `/people/${selectedPerson.id}/detail`,
  };

  return (
    <Layout
      activeNav="timeline"
      session={session}
      uiState={uiState}
      filteredEvents={filteredEvents}
      onUiStateChange={setUiState}
      onLogout={logout}
      detailLinks={detailLinks}
      pageNotice="当前停留在时间线主入口。工程骨架复用了静态测试数据和筛选状态。"
      rightRail={
        <>
          <section className="panel-card">
            <div className="panel-title">
              <div>
                <span className="section-eyebrow">Map Snapshot</span>
                <h2>地点密度地图</h2>
              </div>
              <Link className="mini-link" to="/space">展开</Link>
            </div>
            <div className="chip-grid">
              {[...new Set(filteredEvents.map((item) => api.getPlace(item.placeId)?.name || item.location))].map((name) => (
                <span key={name} className="chip">{name}</span>
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
              {renderPeople(api.formatPeople(selectedEvent.people))}
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-title">
              <div>
                <span className="section-eyebrow">Detail Layer</span>
                <h2>当前记忆摘要</h2>
              </div>
            </div>
            <div className="cluster-card">
              <strong>{selectedEvent.title}</strong>
              <p>{selectedEvent.summary}</p>
            </div>
          </section>
        </>
      }
    >
      <section className="hero-card">
        <div className="hero-copy">
          <span className="section-eyebrow">Timeline Overview / {selectedEvent.year}</span>
          <h2>{selectedEvent.title}</h2>
          <p>{selectedEvent.longText}</p>
          <div className="detail-grid">
            <div className="detail-box"><span>时间</span><strong>{selectedEvent.date}</strong></div>
            <div className="detail-box"><span>地点</span><strong>{api.getPlace(selectedEvent.placeId)?.name}</strong></div>
            <div className="detail-box"><span>人物</span><strong>{api.formatPeople(selectedEvent.people).join("、")}</strong></div>
            <div className="detail-box"><span>素材密度</span><strong>{api.getMediaTotal(selectedEvent)} 份</strong></div>
          </div>
          <div className="action-row">
            <Link className="primary-button" to={detailLinks.event}>进入事件详情页</Link>
            <Link className="secondary-button" to={detailLinks.place}>转到地点页</Link>
            <Link className="secondary-button" to={detailLinks.person}>转到人物页</Link>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-title">
          <div>
            <span className="section-eyebrow">Chronological Atlas</span>
            <h2>多页面时间线总览</h2>
          </div>
          <p>{filteredEvents.length} 条事件</p>
        </div>

        <div className="card-list">
          {filteredEvents.map((event) => (
            <article key={event.id} className="event-card">
              <div className="event-card-main">
                <span className="event-location">{event.location}</span>
                <h3>{event.title}</h3>
                <p className="event-meta">{event.date} · {api.getStageLabel(event.stage)}</p>
                <p>{event.summary}</p>
                <div className="tag-row">{renderPeople(api.formatPeople(event.people))}</div>
              </div>
              <div className="event-card-side">
                <span className="pill-count">{api.getMediaTotal(event)} 份</span>
                <div className="action-stack">
                  <button className="mini-button" type="button" onClick={() => setUiState({
                    selectedEventId: event.id,
                    selectedPlaceId: event.placeId,
                    selectedPersonId: event.people[0],
                  })}>
                    设为当前
                  </button>
                  <Link className="mini-link" to={`/events/${event.id}`}>查看详情</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </Layout>
  );
}
