import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import SpaceMap from "../components/SpaceMap.jsx";
import { AiActionButton } from "../components/AiActionButton";

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
  const event = api.getEvent(eventId) || (data?.events && data.events[0]);
  const queryClient = useQueryClient();

  if (!event) {
    return (
      <Layout
        activeNav="timeline"
        session={session}
        uiState={uiState}
        filteredEvents={filteredEvents || []}
        onUiStateChange={setUiState}
        data={data}
        onLogout={logout}
        detailLinks={{ event: '/timeline', place: '/space', person: '/people' }}
        pageNotice="事件未找到"
      >
        <section className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Event</span>
              <h2>事件未找到</h2>
            </div>
          </div>
          <p>请返回 <Link to="/timeline">时间线</Link> 选择一个事件。</p>
        </section>
      </Layout>
    );
  }

  const place = api.getPlace(event.placeId);
  const personIds = api.getEventPeopleIds(event);
  const leadPersonId = personIds[0];
  const leadPerson = leadPersonId ? api.getPerson(leadPersonId) : null;
  const peopleNames = api.formatPeople(personIds);
  const relatedEvents = (filteredEvents || []).filter(
    (item) => item.id !== event.id && (
      item.placeId === event.placeId ||
      api.getEventPeopleIds(item).some((id) => personIds.includes(id))
    ),
  );

  const detailLinks = {
    event: `/events/${event.id}`,
    place: place ? `/places/${place.id}` : '/space',
    person: leadPerson ? `/people/${leadPerson.id}/detail` : '/people',
  };

  return (
    <Layout
      activeNav="timeline"
      session={session}
      uiState={uiState}
      filteredEvents={filteredEvents || []}
      onUiStateChange={setUiState}
        data={data}
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
                  <span className="event-location">{item.location || ''}</span>
                  <h3>{item.title}</h3>
                </div>
              </article>
            ))}
            {relatedEvents.length === 0 && <p>暂无相关事件</p>}
          </div>
        </section>
      }
    >
      <section className="hero-card">
        <div className="hero-copy">
          <span className="section-eyebrow">Event Detail</span>
          <h2>{event.title}</h2>
          <p>{event.longText || event.summary}</p>
          <div className="detail-grid">
            <div className="detail-box"><span>日期</span><strong>{event.date}</strong></div>
            <div className="detail-box"><span>地点</span><strong>{place?.name || event.location || '未知'}</strong></div>
            <div className="detail-box"><span>人物</span><strong>{peopleNames.join("、") || '无'}</strong></div>
            <div className="detail-box"><span>素材总数</span><strong>{api.getMediaTotal(event)} 份</strong></div>
          </div>
          <div className="action-row">
            {place && <Link className="primary-button" to={detailLinks.place}>查看地点详情</Link>}
            {leadPerson && <Link className="secondary-button" to={detailLinks.person}>查看人物详情</Link>}
            <Link className="secondary-button" to="/memoir">加入回忆录编辑器</Link>
            <AiActionButton
              kind="event-summary"
              args={{
                eventId: event.id,
                text: [event.title, event.longText, event.summary].filter(Boolean).join('\n'),
              }}
              label="AI 一句话摘要"
              onSettled={() => queryClient.invalidateQueries({ queryKey: ['events'] })}
            />
          </div>
        </div>
      </section>

      {/* mini 地图：如果有地点坐标就显示位置 */}
      {place && (
        <div className="mini-vis">
          <div className="mini-vis-header">
            <strong>📍 {place.name} 在地图上</strong>
            <span>查看该地点的其他事件</span>
          </div>
          <SpaceMap
            places={data?.places || []}
            events={data?.events || []}
            selectedPlaceId={place.id}
            height={240}
          />
        </div>
      )}

      <section className="stage-grid">
        <div className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Place & People</span>
              <h2>事件关联索引</h2>
            </div>
          </div>
          {place ? (
            <div className="cluster-card">
              <strong>地点索引</strong>
              <p>{place.summary || '暂无简介'}</p>
              <Link className="mini-link" to={detailLinks.place}>{place.name}</Link>
            </div>
          ) : (
            <p>暂无关联地点</p>
          )}
          <div className="cluster-card">
            <strong>人物索引</strong>
            <div className="chip-grid">
              {personIds.length === 0 ? (
                <span>暂无关联人物</span>
              ) : (
                personIds.map((personId) => {
                  const person = api.getPerson(personId);
                  if (!person) return null;
                  return (
                    <Link key={person.id} className="tag" to={`/people/${person.id}/detail`}>
                      {person.name}
                    </Link>
                  );
                })
              )}
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