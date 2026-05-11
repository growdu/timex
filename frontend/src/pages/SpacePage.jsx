import { Link } from "react-router-dom";

export default function SpacePage({
  Layout,
  session,
  uiState,
  filteredEvents,
  setUiState,
  logout,
  api,
  selectedPlace,
}) {
  const relatedEvents = filteredEvents.filter((item) => item.placeId === selectedPlace.id);
  const leadEvent = relatedEvents[0] || filteredEvents[0];
  const leadPerson = api.getPerson(leadEvent.people[0]);
  const detailLinks = {
    event: `/events/${leadEvent.id}`,
    place: `/places/${selectedPlace.id}`,
    person: `/people/${leadPerson.id}/detail`,
  };

  return (
    <Layout
      activeNav="space"
      session={session}
      uiState={uiState}
      filteredEvents={filteredEvents}
      onUiStateChange={setUiState}
      onLogout={logout}
      detailLinks={detailLinks}
      pageNotice="当前停留在空间入口。地点被建模为独立入口，而不是事件上的附属标签。"
      rightRail={
        <section className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Place Snapshot</span>
              <h2>{selectedPlace.name} 速览</h2>
            </div>
          </div>
          <div className="cluster-card">
            <strong>{selectedPlace.summary}</strong>
            <p>当前地点下共有 {relatedEvents.length} 条事件，适合按年份回看空间变化。</p>
          </div>
        </section>
      }
    >
      <section className="hero-card">
        <div className="hero-copy">
          <span className="section-eyebrow">Space Overview</span>
          <h2>{selectedPlace.name} 的场所记忆</h2>
          <p>{selectedPlace.summary}</p>
          <div className="detail-grid">
            <div className="detail-box"><span>地点类型</span><strong>{selectedPlace.type}</strong></div>
            <div className="detail-box"><span>关联事件</span><strong>{relatedEvents.length} 条</strong></div>
            <div className="detail-box"><span>首次出现</span><strong>{selectedPlace.firstSeen}</strong></div>
            <div className="detail-box"><span>最近出现</span><strong>{selectedPlace.latestSeen}</strong></div>
          </div>
          <div className="action-row">
            <Link className="primary-button" to={detailLinks.place}>进入地点详情页</Link>
            <Link className="secondary-button" to={detailLinks.event}>打开代表事件</Link>
          </div>
        </div>
        <div className="hero-side">
          <span className="section-eyebrow">Place Nodes</span>
          <div className="chip-grid">
            {filteredEvents
              .map((item) => api.getPlace(item.placeId))
              .filter(Boolean)
              .filter((item, index, list) => list.findIndex((entry) => entry.id === item.id) === index)
              .map((place) => (
                <button
                  key={place.id}
                  className={`tag-button ${place.id === selectedPlace.id ? "is-active" : ""}`}
                  type="button"
                  onClick={() =>
                    setUiState({
                      selectedPlaceId: place.id,
                      selectedEventId: filteredEvents.find((item) => item.placeId === place.id)?.id || uiState.selectedEventId,
                    })
                  }
                >
                  {place.name}
                </button>
              ))}
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-title">
          <div>
            <span className="section-eyebrow">Related Events</span>
            <h2>{selectedPlace.name} 的事件流</h2>
          </div>
          <p>{relatedEvents.length} 条</p>
        </div>

        <div className="card-list">
          {relatedEvents.map((event) => (
            <article key={event.id} className="event-card">
              <div className="event-card-main">
                <span className="event-location">{event.location}</span>
                <h3>{event.title}</h3>
                <p className="event-meta">{event.date} · {api.getStageLabel(event.stage)}</p>
                <p>{event.summary}</p>
              </div>
              <div className="event-card-side">
                <span className="pill-count">{api.getMediaTotal(event)} 份</span>
                <Link className="mini-link" to={`/events/${event.id}`}>查看详情</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </Layout>
  );
}
