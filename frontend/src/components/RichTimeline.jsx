import { Link } from "react-router-dom";

const STAGE_GRADIENTS = {
  student: "linear-gradient(135deg, #5d4cff 0%, #8a7dff 100%)",
  "first-job": "linear-gradient(135deg, #7c8aa6 0%, #a0aec8 100%)",
  maker: "linear-gradient(135deg, #ff7a59 0%, #ffac8a 100%)",
  family: "linear-gradient(135deg, #2ec4b6 0%, #6cd6cc 100%)",
  custom: "linear-gradient(135deg, #ffb84d 0%, #ffd28a 100%)",
  travel: "linear-gradient(135deg, #ff7a59 0%, #ffac8a 100%)",
  work: "linear-gradient(135deg, #5d4cff 0%, #8a7dff 100%)",
  life: "linear-gradient(135deg, #2ec4b6 0%, #6cd6cc 100%)",
};

function formatYear(date) {
  if (!date) return "";
  const s = String(date);
  const m = s.match(/^(\d{4})/);
  return m ? m[1] : s;
}

function formatMonthDay(date) {
  if (!date) return "";
  const s = String(date);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}-${m[3]}`;
  return s;
}

export default function RichTimeline({ events = [], api }) {
  const sorted = [...events].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sorted.length === 0) {
    return (
      <div className="rich-timeline-empty">
        <strong>暂无事件</strong>
        <p>开始记录你生命中的第一段故事。</p>
      </div>
    );
  }

  return (
    <div className="rich-timeline">
      {sorted.map((event, index) => {
        const gradient = STAGE_GRADIENTS[event.stage] || STAGE_GRADIENTS.custom;
        const year = formatYear(event.date);
        const monthDay = formatMonthDay(event.date);
        const showYearMarker = index === 0 || formatYear(sorted[index - 1].date) !== year;
        const personNames = api ? api.formatPeople(event.people).slice(0, 3) : [];
        const placeName = event.location || (event.place && event.place.name) || "";

        return (
          <div key={event.id} className="rich-timeline-item">
            {showYearMarker && <div className="rich-timeline-year">{year}</div>}

            <div className="rich-timeline-rail">
              <span className="rich-timeline-dot" style={{ background: gradient }} />
              {index !== sorted.length - 1 && <span className="rich-timeline-line" />}
            </div>

            <Link to={`/events/${event.id}`} className="rich-timeline-card">
              <div className="rich-timeline-cover" style={{ background: gradient }}>
                <span className="rich-timeline-date">{monthDay}</span>
                <span className="rich-timeline-stage">
                  {api ? api.getStageLabel(event.stage) : event.stage}
                </span>
              </div>
              <div className="rich-timeline-body">
                <h3>{event.title}</h3>
                {event.summary && <p>{event.summary}</p>}
                <div className="rich-timeline-meta">
                  {placeName && <span className="chip">📍 {placeName}</span>}
                  {personNames.length > 0 && (
                    <span className="chip">👥 {personNames.join("、")}</span>
                  )}
                  {api && (
                    <span className="chip">{api.getMediaTotal(event)} 份素材</span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
