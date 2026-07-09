import { useState } from "react";
import { Link } from "react-router-dom";
import { exportApi } from "../api/export.js";
import { useQuery } from "@tanstack/react-query";

export default function ExportAlbumPage() {
  const [year, setYear] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ['export', 'album', year],
    queryFn: () => exportApi.album(year || undefined),
  });

  return (
    <div className="export-page">
      <div className="export-toolbar no-print">
        <Link to="/dashboard" className="ghost-button">← 返回大屏</Link>
        <select className="export-year-select" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">全部年份</option>
          {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((y) => <option key={y} value={y}>{y}年</option>)}
        </select>
        <button className="primary-button" onClick={() => window.print()}>🖨 打印 / 保存PDF</button>
      </div>
      {isLoading ? <div className="loading-screen">生成中...</div> : data && (
        <div className="export-document">
          <h1 className="export-title">{data.title}</h1>
          <p className="export-author">作者：{data.author}</p>
          <p className="export-meta">{data.period.start} ~ {data.period.end} | {data.stats.totalEvents} 个事件 · {data.stats.totalMoments} 份素材</p>
          <div className="export-sections">
            {data.sections.map((s, i) => (
              <div className="export-section" key={i}>
                <div className="export-section-header">
                  <span className="export-date">{s.event.date}</span>
                  <h2>{s.event.title}</h2>
                  {s.place && <span className="export-place">📍 {s.place.name}</span>}
                </div>
                {s.event.summary && <p className="export-summary">{s.event.summary}</p>}
                {s.people.length > 0 && <p className="export-people">人物：{s.people.map((p) => p.name).join("、")}</p>}
                {s.moments.length > 0 && (
                  <div className="export-moments">
                    {s.moments.map((m, j) => (
                      <div className="export-moment" key={j}>
                        <span className="export-moment-type">{m.type === 'photo' ? '📷' : m.type === 'video' ? '🎬' : m.type === 'audio' ? '🎵' : '📝'}</span>
                        {m.title && <strong>{m.title}</strong>}
                        {m.content && <p>{m.content}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
