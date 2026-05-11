import { Link } from "react-router-dom";

export default function PeoplePage({
  Layout,
  session,
  uiState,
  filteredEvents,
  setUiState,
  logout,
  api,
  selectedPerson,
}) {
  const relatedEvents = filteredEvents.filter((item) => item.people.includes(selectedPerson.id));
  const leadEvent = relatedEvents[0] || filteredEvents[0];
  const detailLinks = {
    event: `/events/${leadEvent.id}`,
    place: `/places/${leadEvent.placeId}`,
    person: `/people/${selectedPerson.id}/detail`,
  };

  return (
    <Layout
      activeNav="people"
      session={session}
      uiState={uiState}
      filteredEvents={filteredEvents}
      onUiStateChange={setUiState}
      onLogout={logout}
      detailLinks={detailLinks}
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
              {selectedPerson.sharedPlaces.map((placeId) => {
                const place = api.getPlace(placeId);
                return (
                  <Link key={place.id} className="place-list-item" to={`/places/${place.id}`}>
                    <strong>{place.name}</strong>
                    <span>{place.type} · {place.firstSeen} 起</span>
                  </Link>
                );
              })}
            </div>
          </section>
          <section className="panel-card">
            <div className="panel-title">
              <div>
                <span className="section-eyebrow">Memoir Angle</span>
                <h2>适合写成一章的片段</h2>
              </div>
            </div>
            <div className="cluster-card">
              <strong>{leadEvent.title}</strong>
              <p>{leadEvent.summary}</p>
            </div>
          </section>
        </>
      }
    >
      <section className="hero-card">
        <div className="hero-copy">
          <span className="section-eyebrow">People Overview</span>
          <h2>{selectedPerson.name} 与你的共同记忆</h2>
          <p>{selectedPerson.intro}</p>
          <div className="detail-grid">
            <div className="detail-box"><span>首次出现</span><strong>{selectedPerson.firstSeen}</strong></div>
            <div className="detail-box"><span>最近一次</span><strong>{selectedPerson.latestSeen}</strong></div>
            <div className="detail-box"><span>共现事件</span><strong>{relatedEvents.length}</strong></div>
            <div className="detail-box"><span>关系密度</span><strong>{selectedPerson.density}</strong></div>
          </div>
          <div className="action-row">
            <Link className="primary-button" to={detailLinks.person}>进入人物详情页</Link>
            <Link className="secondary-button" to="/memoir">写成一章</Link>
          </div>
        </div>
        <div className="hero-side">
          <span className="section-eyebrow">People Nodes</span>
          <div className="chip-grid">
            {api.sortEvents(filteredEvents)
              .flatMap((event) => event.people)
              .filter((id, index, list) => list.indexOf(id) === index)
              .map((personId) => {
                const person = api.getPerson(personId);
                return (
                  <button
                    key={person.id}
                    className={`tag-button ${person.id === selectedPerson.id ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setUiState({ selectedPersonId: person.id })}
                  >
                    {person.name}
                  </button>
                );
              })}
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
