import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AiActionButton } from "../components/AiActionButton";

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
  const memoirs = (data && data.memoirs) || [];
  const queryClient = useQueryClient();

  const allChapters = useMemo(() => {
    return memoirs.flatMap((m) =>
      (m.chapters || []).map((c) => ({ ...c, memoirTitle: m.title, memoirId: m.id }))
    );
  }, [memoirs]);

  if (memoirs.length === 0) {
    return (
      <Layout
        activeNav="memoir"
        session={session}
        uiState={uiState}
        filteredEvents={filteredEvents || []}
        onUiStateChange={setUiState}
        data={data}
        onLogout={logout}
        detailLinks={{ event: '/timeline', place: '/space', person: '/people' }}
        pageNotice="当前停留在回忆录编排路径。这里是 React 版编辑器工作台起点，后续可接入真实草稿保存。"
      >
        <section className="panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Memoir</span>
              <h2>暂无回忆录</h2>
            </div>
          </div>
          <p>您还没有创建任何回忆录。开始创建第一本回忆录吧。</p>
        </section>
      </Layout>
    );
  }

  const selectedChapter = uiState.selectedChapterId
    ? memoirs.flatMap((m) => m.chapters || []).find((c) => c.id === uiState.selectedChapterId)
    : null;

  const currentChapter = selectedChapter || allChapters[0] || { id: null, title: '默认章节', items: [], blurb: '', status: 'draft' };

  const sourceEvents = (filteredEvents || []).slice(0, 4);

  const detailLinks = {
    event: selectedEvent ? `/events/${selectedEvent.id}` : '/timeline',
    place: selectedPlace ? `/places/${selectedPlace.id}` : '/space',
    person: selectedPerson ? `/people/${selectedPerson.id}/detail` : '/people',
  };

  return (
    <Layout
      activeNav="memoir"
      session={session}
      uiState={uiState}
      filteredEvents={filteredEvents || []}
      onUiStateChange={setUiState}
        data={data}
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
              {sourceEvents.length === 0 ? (
                <p>暂无事件</p>
              ) : (
                sourceEvents.map((event) => (
                  <article key={event.id} className="event-card compact-card">
                    <div className="event-card-main">
                      <span className="event-location">{event.location || ''}</span>
                      <h3>{event.title}</h3>
                      <p className="event-meta">{event.date}</p>
                    </div>
                  </article>
                ))
              )}
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
              <strong>{currentChapter.title}</strong>
              <p>{currentChapter.status || 'draft'} · 已挂载 {(currentChapter.items || []).length} 个章节线索</p>
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
            {allChapters.length === 0 ? (
              <p>暂无章节</p>
            ) : (
              allChapters.map((chapter, index) => (
                <button
                  key={chapter.id || `chapter-${index}`}
                  className={`chapter-list-item ${chapter.id === currentChapter.id ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setUiState({ selectedChapterId: chapter.id })}
                >
                  <div>
                    <strong>{index + 1}. {chapter.title}</strong>
                    <span>{chapter.status || 'draft'}</span>
                  </div>
                  <span className="pill-count">{(chapter.items || []).length}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="editor-canvas panel-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Memoir Editor</span>
              <h2>{currentChapter.title}</h2>
            </div>
            <div className="toolbar-row">
              <AiActionButton
                kind="chapter-summary"
                args={{
                  chapterId: currentChapter.id,
                  text: (currentChapter.items || []).map(i => i.content || i.summary || '').join('\n'),
                }}
                label="AI 生成摘要"
                disabled={!currentChapter.id}
                onSettled={() => queryClient.invalidateQueries({ queryKey: ['memoirs'] })}
              />
              <button className="mini-button" type="button">插入事件</button>
              <button className="mini-button" type="button">预览章节</button>
            </div>
          </div>

          <div className="editor-document">
            <section className="editor-section">
              <span className="section-eyebrow">Chapter Intro</span>
              <p>{currentChapter.blurb || currentChapter.summary || currentChapter.content || '暂无章节简介'}</p>
            </section>
            <section className="editor-section">
              <span className="section-eyebrow">Narrative Blocks</span>
              <div className="card-list compact">
                {sourceEvents.length === 0 ? (
                  <p>暂无事件可供编辑</p>
                ) : (
                  sourceEvents.map((event) => (
                    <article key={event.id} className="event-card compact-card">
                      <div className="event-card-main">
                        <span className="event-location">{event.location || ''}</span>
                        <h3>{event.title}</h3>
                        <p>{event.longText || event.summary}</p>
                        <Link className="mini-link" to={`/events/${event.id}`}>查看事件详情</Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </Layout>
  );
}