import { Link, useParams } from "react-router-dom";
import { exportApi } from "../api/export.js";
import { useQuery } from "@tanstack/react-query";

export default function ExportStorybookPage() {
  const { memoirId } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['export', 'storybook', memoirId],
    queryFn: () => exportApi.storybook(memoirId),
  });

  return (
    <div className="export-page">
      <div className="export-toolbar no-print">
        <Link to="/dashboard" className="ghost-button">← 返回大屏</Link>
        <button className="primary-button" onClick={() => window.print()}>🖨 打印 / 保存PDF</button>
      </div>
      {isLoading ? <div className="loading-screen">生成中...</div> : data && (
        <div className="export-document export-storybook">
          <h1 className="export-title">{data.title}</h1>
          {data.blurb && <p className="export-blurb">{data.blurb}</p>}
          <p className="export-author">作者：{data.author}</p>
          <div className="export-chapters">
            {data.chapters.map((ch, i) => (
              <div className="export-chapter" key={i}>
                <h2 className="export-chapter-title">第 {i + 1} 章 · {ch.title}</h2>
                {ch.content && <div className="export-chapter-content">{ch.content}</div>}
                {ch.events.length > 0 && (
                  <div className="export-chapter-events">
                    {ch.events.map((e, j) => (
                      <div className="export-event" key={j}>
                        <strong>{e.title}</strong>
                        <span className="export-date">{e.date}</span>
                        {e.summary && <p>{e.summary}</p>}
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
