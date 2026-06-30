import { Link, useParams } from "react-router-dom";
import SpaceMap from "../components/SpaceMap.jsx";

export default function PlacePage({
  Layout,
  session,
  uiState,
  filteredEvents,
  setUiState,
  logout,
  api,
  data,
}) {
  const { placeId } = useParams();
  const place = api.getPlace(placeId) || (data?.places && data.places[0]);

  if (!place) {
    return (
      <Layout
        activeNav="space"
        session={session}
        uiState={uiState}
        filteredEvents={filteredEvents || []}
        onUiStateChange={setUiState}
        data={data}
        onLogout={logout}
        detailLinks={{ event: '/timeline', place: '/space', person: '/people' }}
        pageNotice="地点未找到"
      >
        <section className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Place</span>
              <h2>地点未找到</h2>
            </div>
          </div>
          <p>请返回 <Link to="/space">空间总览</Link> 选择一个地点。</p>
        </section>
      </Layout>
    );
  }

  const placeEvents = (filteredEvents || []).filter((item) => item.placeId === place.id);
  const leadEvent = placeEvents[0] || (data?.events || []).find((item) => item.placeId === place.id) || (data?.events || [])[0];
  const leadPersonIds = leadEvent ? api.getEventPeopleIds(leadEvent) : [];
  const leadPerson = leadPersonIds[0] ? api.getPerson(leadPersonIds[0]) : null;

  const detailLinks = {
    event: leadEvent ? `/events/${leadEvent.id}` : '/timeline',
    place: `/places/${place.id}`,
    person: leadPerson ? `/people/${leadPerson.id}/detail` : '/people',
  };

  return (
    <Layout
      activeNav="space"
      session={session}
      uiState={uiState}
      filteredEvents={filteredEvents || []}
      onUiStateChange={setUiState}
        data={data}
      onLogout={logout}
      detailLinks={detailLinks}
      pageNotice="当前停留在地点详情页。地点被提升为可独立承载时间切片和人物关系的档案页面。"
      rightRail={
        <section className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Place Snapshot</span>
              <h2>{place.name} 速览</h2>
            </div>
          </div>
          <div className="cluster-card">
            <strong>{place.summary || '暂无简介'}</strong>
            <p>当前地点下共有 {placeEvents.length} 条事件。</p>
          </div>
        </section>
      }
    >
      <section className="hero-card">
        <div className="hero-copy">
          <span className="section-eyebrow">Place Detail Page</span>
          <h2>{place.name} 的完整地点档案</h2>
          <p>{place.summary || '暂无简介'}</p>
          <div className="detail-grid">
            <div className="detail-box"><span>地点类型</span><strong>{api.getPlaceTypeLabel(place.type)}</strong></div>
            <div className="detail-box"><span>事件数量</span><strong>{placeEvents.length}</strong></div>
            <div className="detail-box"><span>首次出现</span><strong>{place.firstSeenAt || '—'}</strong></div>
            <div className="detail-box"><span>最近出现</span><strong>{place.latestSeenAt || '—'}</strong></div>
          </div>
        </div>
      </section>

      {/* mini 地图 */}
      <div className="mini-vis">
        <div className="mini-vis-header">
          <strong>📍 位置与轨迹</strong>
          <span>高亮当前地点</span>
        </div>
        <SpaceMap
          places={data?.places || []}
          events={data?.events || []}
          selectedPlaceId={place.id}
          height={260}
        />
      </div>

      <section className="panel-card">
        <div className="panel-title">
          <div>
            <span className="section-eyebrow">Place Timeline</span>
            <h2>{place.name} 的时间切片</h2>
          </div>
          <Link className="mini-link" to="/space">返回空间总览</Link>
        </div>
        <div className="card-list">
          {placeEvents.length === 0 ? (
            <p>该地点暂无事件</p>
          ) : (
            placeEvents.map((event) => (
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