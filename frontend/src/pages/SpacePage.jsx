import { Link } from "react-router-dom";
import SpaceMap from "../components/SpaceMap.jsx";

export default function SpacePage({
  Layout,
  session,
  uiState,
  filteredEvents,
  setUiState,
  logout,
  api,
  selectedPlace,
  data,
}) {
  const allPlaces = (data && data.places) || [];
  const allEvents = (data && data.events) || [];

  if (!selectedPlace) {
    return (
      <Layout
        activeNav="space"
        session={session}
        uiState={uiState}
        filteredEvents={filteredEvents || []}
        onUiStateChange={setUiState}
        onLogout={logout}
        detailLinks={{ event: '/timeline', place: '/space', person: '/people' }}
        data={data}
        pageNotice="空间地图"
      >
        <section className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Space</span>
              <h2>暂无地点</h2>
            </div>
          </div>
          <p>您还没有任何地点记录。</p>
        </section>
      </Layout>
    );
  }

  const relatedEvents = (filteredEvents || []).filter((item) => item.placeId === selectedPlace.id);
  const leadEvent = relatedEvents[0] || filteredEvents[0] || (data && data.events && data.events[0]);
  const leadPersonIds = leadEvent ? api.getEventPeopleIds(leadEvent) : [];
  const leadPerson = leadPersonIds[0] ? api.getPerson(leadPersonIds[0]) : null;

  // Place ranking by event count
  const placeRanking = allPlaces
    .map((p) => ({
      ...p,
      count: allEvents.filter((e) => e.placeId === p.id).length,
    }))
    .sort((a, b) => b.count - a.count);

  const detailLinks = {
    event: leadEvent ? `/events/${leadEvent.id}` : '/timeline',
    place: `/places/${selectedPlace.id}`,
    person: leadPerson ? `/people/${leadPerson.id}/detail` : '/people',
  };

  return (
    <Layout
        activeNav="space"
      session={session}
      uiState={uiState}
      filteredEvents={filteredEvents || []}
      onUiStateChange={setUiState}
      onLogout={logout}
      detailLinks={detailLinks}
      data={data}
      pageNotice="空间地图"
      rightRail={
        <>
          <section className="panel-card">
            <div className="panel-title">
              <div>
                <span className="section-eyebrow">Place Snapshot</span>
                <h2>{selectedPlace.name} 速览</h2>
              </div>
            </div>
            <div className="cluster-card">
              <strong>{selectedPlace.summary || '暂无简介'}</strong>
              <p>当前地点下共有 {relatedEvents.length} 条事件，适合按年份回看空间变化。</p>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-title">
              <div>
                <span className="section-eyebrow">Place Ranking</span>
                <h2>地点排行</h2>
              </div>
            </div>
            <ul className="place-ranking">
              {placeRanking.slice(0, 6).map((p, idx) => (
                <li
                  key={p.id}
                  className={`place-ranking-item ${p.id === selectedPlace.id ? "is-active" : ""}`}
                >
                  <span className="place-ranking-rank">{idx + 1}</span>
                  <button
                    type="button"
                    className="place-ranking-name"
                    onClick={() =>
                      setUiState({
                        selectedPlaceId: p.id,
                        selectedEventId: allEvents.find((e) => e.placeId === p.id)?.id || uiState.selectedEventId,
                      })
                    }
                  >
                    {p.name}
                  </button>
                  <span className="place-ranking-count">{p.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      }
    >
      {/* 地图轨迹 */}
      <section className="panel-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 0" }}>
          <span className="section-eyebrow">Atlas Map</span>
          <h2 style={{ margin: "4px 0 6px", fontFamily: "var(--font-serif)", fontSize: 22 }}>
            {selectedPlace.name} 的地理记忆
          </h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
            虚线是按时间顺序连接各地点的轨迹；marker 颜色对应该地点类型。
          </p>
        </div>
        <div style={{ padding: 16 }}>
          <SpaceMap
            places={allPlaces}
            events={allEvents}
            selectedPlaceId={selectedPlace.id}
            onSelectPlace={(p) =>
              setUiState({
                selectedPlaceId: p.id,
                selectedEventId: allEvents.find((e) => e.placeId === p.id)?.id || uiState.selectedEventId,
              })
            }
            height={420}
          />
        </div>
      </section>

      <section className="hero-card">
        <div className="hero-copy">
          <span className="section-eyebrow">Space Overview</span>
          <h2>{selectedPlace.name} 的场所记忆</h2>
          <p>{selectedPlace.summary || '暂无简介'}</p>
          <div className="detail-grid">
            <div className="detail-box"><span>地点类型</span><strong>{api.getPlaceTypeLabel(selectedPlace.type)}</strong></div>
            <div className="detail-box"><span>关联事件</span><strong>{relatedEvents.length} 条</strong></div>
            <div className="detail-box"><span>首次出现</span><strong>{selectedPlace.firstSeenAt || '—'}</strong></div>
            <div className="detail-box"><span>最近出现</span><strong>{selectedPlace.latestSeenAt || '—'}</strong></div>
          </div>
          <div className="action-row">
            <Link className="primary-button" to={detailLinks.place}>进入地点详情页</Link>
            {leadEvent && <Link className="secondary-button" to={detailLinks.event}>打开代表事件</Link>}
          </div>
        </div>
        <div className="hero-side">
          <span className="section-eyebrow">Place Nodes</span>
          <div className="chip-grid">
            {allPlaces.length === 0 ? (
              <span className="chip">暂无地点</span>
            ) : (
              allPlaces.map((place) => (
                <button
                  key={place.id}
                  className={`tag-button ${place.id === selectedPlace.id ? "is-active" : ""}`}
                  type="button"
                  onClick={() =>
                    setUiState({
                      selectedPlaceId: place.id,
                      selectedEventId: (filteredEvents || []).find((item) => item.placeId === place.id)?.id || uiState.selectedEventId,
                    })
                  }
                >
                  {place.name}
                </button>
              ))
            )}
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
          {relatedEvents.length === 0 ? (
            <p>该地点暂无相关事件</p>
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