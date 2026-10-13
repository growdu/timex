import { useQuery } from "@tanstack/react-query";
import { momentsApi } from "../api/moments";
import { ExtractFaceButton } from "./ExtractFaceButton";

/**
 * EventMomentsSection — 展示某个事件下的图片素材（photo moments），
 * 每个 moment 挂一个 ExtractFaceButton。
 *
 * 关键：button 必须拿到 moment.id，不能拿 event.id — 后端按 moment.id 查表，
 * 传 event.id 在生产环境必返回 404 "moment not found"（Plan Step 10.3 / 修复 round 1）。
 *
 * 数据来源：GET /api/moments?eventId=<eventId>&type=photo
 */
export function EventMomentsSection({ eventId }) {
  const photoMomentsQuery = useQuery({
    queryKey: ["moments", { eventId, type: "photo" }],
    queryFn: () => momentsApi.getByEvent(eventId, { type: "photo" }),
    enabled: Boolean(eventId),
  });
  const photoMoments = photoMomentsQuery.data?.moments || [];

  return (
    <section className="panel-card" data-testid="event-photo-moments">
      <div className="panel-title">
        <div>
          <span className="section-eyebrow">Photo Moments</span>
          <h2>📷 本事件照片 · 一键提取人脸</h2>
        </div>
      </div>
      {photoMomentsQuery.isLoading ? (
        <p>加载中…</p>
      ) : photoMoments.length === 0 ? (
        <p data-testid="event-photo-moments-empty">本事件暂无图片素材</p>
      ) : (
        <ul
          className="card-list compact"
          data-testid="photo-moment-list"
        >
          {photoMoments.map((m) => (
            <li
              key={m.id}
              className="event-card compact-card"
              data-testid="photo-moment-item"
              data-moment-id={m.id}
            >
              <div className="event-card-main">
                <span className="event-location">{m.mediaUrl || "photo"}</span>
                <h3>{m.title || m.id}</h3>
                <ExtractFaceButton momentId={m.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default EventMomentsSection;
