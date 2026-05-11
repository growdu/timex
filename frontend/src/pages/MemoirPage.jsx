import { useMemo } from "react";

export default function MemoirPage({
  Layout,
  session,
  uiState,
  filteredEvents,
  setUiState,
  logout,
  api,
  data,
  selectedEvent,
  selectedPlace,
  selectedPerson,
}) {
  const selectedChapter =
    data.memoirChapters.find((item) => item.id === uiState.selectedChapterId) || data.memoirChapters[0];

  const chapterEvents = useMemo(
    () =>
      filteredEvents.filter((event) =>
        selectedChapter.items.some((item) => event.title.includes(item.slice(0, 4))),
      ),
    [filteredEvents, selectedChapter],
  );

  const sourceEvents = chapterEvents.length ? chapterEvents : filteredEvents.slice(0, 4);
  const detailLinks = {
    event: `/events/${selectedEvent.id}`,
    place: `/places/${selectedPlace.id}`,
    person: `/people/${selectedPerson.id}/detail`,
  };

  return (
    <Layout
      activeNav="memoir"
      session={session}
      uiState={uiState}
      filteredEvents={filteredEvents}
      onUiStateChange={setUiState}
      onLogout={logout}
      detailLinks={detailLinks}
      pageNotice="当前停留在回忆录编排路径。这里是 React 版编辑器工作台起点，后续可接入真实草稿保存。"
      rightRail={
        <>
          <section className="panel-card">
            <div className="panel-title">
              <div>
                <span className="section-eyebrow">Source Library</span>
                <h2>候选事件库</h2>
              </div>
            </div>
            <div className="card-list compact">
              {filteredEvents.slice(0, 4).map((event) => (
                <article key={event.id} className="event-card compact-card">
                  <div className="event-card-main">
                    <span className="event-location">{event.location}</span>
                    <h3>{event.title}</h3>
                    <p className="event-meta">{event.date}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-title">
              <div>
                <span className="section-eyebrow">Editing State</span>
                <h2>当前章节状态</h2>
              </div>
            </div>
            <div className="cluster-card">
              <strong>{selectedChapter.title}</strong>
              <p>{selectedChapter.status} · 已挂载 {selectedChapter.items.length} 个章节线索</p>
            </div>
          </section>
        </>
      }
    >
      <section className="editor-shell">
        <div className="editor-sidebar panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Chapter Tree</span>
              <h2>章节树</h2>
            </div>
            <button className="mini-button" type="button">新增章节</button>
          </div>

          <div className="chapter-list">
            {data.memoirChapters.map((chapter, index) => (
              <button
                key={chapter.id}
                className={`chapter-list-item ${chapter.id === selectedChapter.id ? "is-active" : ""}`}
                type="button"
                onClick={() => setUiState({ selectedChapterId: chapter.id })}
              >
                <div>
                  <strong>{index + 1}. {chapter.title}</strong>
                  <span>{chapter.status}</span>
                </div>
                <span className="pill-count">{chapter.items.length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="editor-canvas panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Memoir Editor</span>
              <h2>{selectedChapter.title}</h2>
            </div>
            <div className="toolbar-row">
              <button className="mini-button" type="button">自动生成摘要</button>
              <button className="mini-button" type="button">插入事件</button>
              <button className="mini-button" type="button">预览章节</button>
            </div>
          </div>

          <div className="editor-document">
            <section className="editor-section">
              <span className="section-eyebrow">Chapter Intro</span>
              <p>{selectedChapter.blurb}</p>
            </section>
            <section className="editor-section">
              <span className="section-eyebrow">Narrative Blocks</span>
              <div className="card-list compact">
                {sourceEvents.map((event) => (
                  <article key={event.id} className="event-card compact-card">
                    <div className="event-card-main">
                      <span className="event-location">{event.location}</span>
                      <h3>{event.title}</h3>
                      <p>{event.longText}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </Layout>
  );
}
