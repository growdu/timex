import { Link, useParams } from "react-router-dom";
import RelationshipGraph from "../components/RelationshipGraph.jsx";

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
  const person = api.getPerson(personId) || (data?.people && data.people[0]);

  if (!person) {
    return (
      <Layout
        activeNav="people"
        session={session}
        uiState={uiState}
        filteredEvents={filteredEvents || []}
        onUiStateChange={setUiState}
        data={data}
        onLogout={logout}
        detailLinks={{ event: '/timeline', place: '/space', person: '/people' }}
        pageNotice="人物未找到"
      >
        <section className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Person</span>
              <h2>人物未找到</h2>
            </div>
          </div>
          <p>请返回 <Link to="/people">人物总览</Link> 选择一个人物。</p>
        </section>
      </Layout>
    );
  }

  const personEvents = (filteredEvents || []).filter((item) =>
    api.getEventPeopleIds(item).includes(person.id)
  );
  const leadEvent = personEvents[0] || (data?.events || []).find((item) => api.getEventPeopleIds(item).includes(person.id)) || (data?.events || [])[0];
  const leadPlace = leadEvent ? api.getPlace(leadEvent.placeId) : null;
  const sharedPlaces = api.getSharedPlaces(person.id, filteredEvents || []);

  const detailLinks = {
    event: leadEvent ? `/events/${leadEvent.id}` : '/timeline',
    place: leadPlace ? `/places/${leadPlace.id}` : '/space',
    person: `/people/${person.id}/detail`,
  };

  return (
    <Layout
      activeNav="people"
      session={session}
      uiState={uiState}
      filteredEvents={filteredEvents || []}
      onUiStateChange={setUiState}
        data={data}
      onLogout={logout}
      detailLinks={detailLinks}
      pageNotice="人物详情"
      rightRail={
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
      }
    >
      <section className="hero-card">
        <div className="hero-copy">
          <span className="section-eyebrow">Person Detail Page</span>
          <h2>{person.name} 的共同记忆档案</h2>
          <p>{person.intro || '暂无简介'}</p>
          <div className="detail-grid">
            <div className="detail-box"><span>首次出现</span><strong>{person.firstSeenAt || '—'}</strong></div>
            <div className="detail-box"><span>最近一次</span><strong>{person.latestSeenAt || '—'}</strong></div>
            <div className="detail-box"><span>关系角色</span><strong>{api.getRoleLabel(person.role)}</strong></div>
            <div className="detail-box"><span>共同事件</span><strong>{personEvents.length}</strong></div>
          </div>
        </div>
      </section>

      {/* mini 关系图 */}
      <div className="mini-vis">
        <div className="mini-vis-header">
          <strong>🕸 关系网络</strong>
          <span>点击其他人物切换</span>
        </div>
        <RelationshipGraph
          people={data?.people || []}
          events={personEvents}
          selectedPersonId={person.id}
          onSelectPerson={(pid) => { window.location.href = `/people/${pid}/detail`; }}
          height={300}
        />
      </div>

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
            {personEvents.length === 0 ? (
              <p>暂无共同事件</p>
            ) : (
              personEvents.map((event) => (
                <article key={event.id} className="event-card">
                  <div className="event-card-main">
                    <span className="event-location">{event.location || ''}</span>
                    <h3>{event.title}</h3>
                    <p className="event-meta">{event.date}</p>
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
        </div>

        <div className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Shared Places</span>
              <h2>{person.name} 的共同地点</h2>
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
        </div>
      </section>
    </Layout>
  );
}