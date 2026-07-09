import { Link } from "react-router-dom";
import { exportApi } from "../api/export.js";
import { useQuery } from "@tanstack/react-query";

export default function ExportTimelinePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['export', 'timeline'],
    queryFn: () => exportApi.timeline(),
  });

  return (
    <div className="export-page">
      <div className="export-toolbar no-print">
        <Link to="/dashboard" className="ghost-button">← 返回大屏</Link>
        <button className="primary-button" onClick={() => window.print()}>🖨 打印 / 保存PDF</button>
      </div>
      {isLoading ? <div className="loading-screen">生成中...</div> : data && (
        <div className="export-document">
          <h1 className="export-title">{data.title}</h1>
          <p className="export-author">作者：{data.author}</p>
          <p className="export-meta">{data.stats.totalEvents} 个事件 · 跨越 {data.stats.yearCount} 年 · {data.stats.totalMoments} 份素材</p>
          <div className="export-timeline">
            {data.timeline.map((grp) => (
              <div className="export-year-group" key={grp.year}>
                <h2 className="export-year-header">{grp.year}年 ({grp.events.length} 件)</h2>
                <div className="export-year-events">
                  {grp.events.map((e, j) => (
                    <div className="export-tl-item" key={j}>
                      <span className="export-date">{e.date}</span>
                      <div>
                        <strong>{e.title}</strong>
                        {e.location && <small> · {e.location}</small>}
                        {e.summary && <p>{e.summary}</p>}
                        {e.people.length > 0 && <small>👤 {e.people.join("、")}</small>}
                      </div>
                      {e.momentCount > 0 && <span className="export-badge">{e.momentCount} 份</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
