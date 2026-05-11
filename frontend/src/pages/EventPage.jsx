import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

export default function EventPage({
  Layout,
  session,
  uiState,
  filteredEvents,
  setUiState,
  logout,
  api,
  data,
}) {
  const { eventId } = useParams();
  const event = api.getEvent(eventId) || data.events[0];
  const place = api.getPlace(event.placeId);
  const leadPerson = api.getPerson(event.people[0]);
  const relatedEvents = filteredEvents.filter(
    (item) => item.id !== event.id && (item.placeId === event.placeId || item.people.some((id) => event.people.includes(id))),
  );

  useEffect(() => {
    setUiState({
      selectedEventId: event.id,
      selectedPlaceId: event.placeId,
      selectedPersonId: event.people[0],
    });
  }, [event.id, event.people, event.placeId, setUiState]);

  const detailLinks = {
    event: `/events/${event.id}`,
    place: `/places/${place.id}`,
    person: `/people/${leadPerson.id}/detail`,
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
      pageNotice="当前停留在事件详情页。事件是时间、空间、人物三条主轴的汇合点。"
      rightRail={
        <section className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Related Events</span>
              <h2>相关事件</h2>
            </div>
          </div>
          <div className="card-list compact">
            {relatedEvents.slice(0, 3).map((item) => (
              <article key={item.id} className="event-card compact-card">
                <div className="event-card-main">
                  <span className="event-location">{item.location}</span>
                  <h3>{item.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </section>
      }
    >
      <section className="hero-card">
        <div className="hero-copy">
          <span className="section-eyebrow">Event Detail</span>
          <h2>{event.title}</h2>
          <p>{event.longText}</p>
          <div className="detail-grid">
            <div className="detail-box"><span>日期</span><strong>{event.date}</strong></div>
            <div className="detail-box"><span>地点</span><strong>{place.name}</strong></div>
            <div className="detail-box"><span>人物</span><strong>{api.formatPeople(event.people).join("、")}</strong></div>
            <div className="detail-box"><span>素材总数</span><strong>{api.getMediaTotal(event)} 份</strong></div>
          </div>
          <div className="action-row">
            <Link className="primary-button" to={detailLinks.place}>查看地点详情</Link>
            <Link className="secondary-button" to={detailLinks.person}>查看人物详情</Link>
            <Link className="secondary-button" to="/memoir">加入回忆录编辑器</Link>
          </div>
        </div>
      </section>

      <section className="stage-grid">
        <div className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Place & People</span>
              <h2>事件关联索引</h2>
            </div>
          </div>
          <div className="cluster-card">
            <strong>地点索引</strong>
            <p>{place.summary}</p>
            <Link className="mini-link" to={detailLinks.place}>{place.name}</Link>
          </div>
          <div className="cluster-card">
            <strong>人物索引</strong>
            <div className="chip-grid">
              {event.people.map((personId) => {
                const person = api.getPerson(personId);
                return (
                  <Link key={person.id} className="tag" to={`/people/${person.id}/detail`}>
                    {person.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Narrative Note</span>
              <h2>页面职责</h2>
            </div>
          </div>
          <div className="cluster-card">
            <strong>事件是最小叙事单元</strong>
            <p>这页负责把时间、地点、人物和素材密度汇总为可继续进入地点页、人物页和回忆录页的中枢页面。</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
