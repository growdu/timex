import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

export default function PersonPage({
  Layout,
  session,
  uiState,
  filteredEvents,
  setUiState,
  logout,
  api,
  data,
}) {
  const { personId } = useParams();
  const person = api.getPerson(personId) || data.people[0];
  const personEvents = filteredEvents.filter((item) => item.people.includes(person.id));
  const leadEvent = personEvents[0] || data.events.find((item) => item.people.includes(person.id)) || data.events[0];
  const leadPlace = api.getPlace(leadEvent.placeId);

  useEffect(() => {
    setUiState({
      selectedPersonId: person.id,
      selectedEventId: leadEvent.id,
      selectedPlaceId: leadPlace.id,
    });
  }, [leadEvent.id, leadPlace.id, person.id, setUiState]);

  const detailLinks = {
    event: `/events/${leadEvent.id}`,
    place: `/places/${leadPlace.id}`,
    person: `/people/${person.id}/detail`,
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
      pageNotice="当前停留在人物详情页。人物页会把共同地点、关键事件和可写成章节的片段收拢在一起。"
      rightRail={
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
      }
    >
      <section className="hero-card">
        <div className="hero-copy">
          <span className="section-eyebrow">Person Detail Page</span>
          <h2>{person.name} 的共同记忆档案</h2>
          <p>{person.intro}</p>
          <div className="detail-grid">
            <div className="detail-box"><span>首次出现</span><strong>{person.firstSeen}</strong></div>
            <div className="detail-box"><span>最近一次</span><strong>{person.latestSeen}</strong></div>
            <div className="detail-box"><span>关系角色</span><strong>{person.role}</strong></div>
            <div className="detail-box"><span>关系密度</span><strong>{person.density}</strong></div>
          </div>
        </div>
      </section>

      <section className="stage-grid">
        <div className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Shared Memory Timeline</span>
              <h2>{person.name} 的关键事件</h2>
            </div>
            <Link className="mini-link" to="/people">返回人物总览</Link>
          </div>
          <div className="card-list">
            {personEvents.map((event) => (
              <article key={event.id} className="event-card">
                <div className="event-card-main">
                  <span className="event-location">{event.location}</span>
                  <h3>{event.title}</h3>
                  <p className="event-meta">{event.date}</p>
                  <p>{event.summary}</p>
                </div>
                <div className="event-card-side">
                  <span className="pill-count">{api.getMediaTotal(event)} 份</span>
                  <Link className="mini-link" to={`/events/${event.id}`}>查看详情</Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Shared Places</span>
              <h2>{person.name} 的共同地点</h2>
            </div>
          </div>
          <div className="place-list">
            {person.sharedPlaces.map((placeId) => {
              const place = api.getPlace(placeId);
              return (
                <Link key={place.id} className="place-list-item" to={`/places/${place.id}`}>
                  <strong>{place.name}</strong>
                  <span>{place.type} · {place.firstSeen} 起</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </Layout>
  );
}
