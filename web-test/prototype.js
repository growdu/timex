import { SESSION_KEY, UI_STATE_KEY, createApi, defaultUiState, prototypeData } from "./data.js";

const api = createApi(prototypeData);

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getSession() {
  return readStorage(SESSION_KEY, null);
}

function setSession(account) {
  writeStorage(SESSION_KEY, {
    id: account.id,
    name: account.name,
    role: account.role,
    tone: account.tone,
    email: account.email,
    loginAt: new Date().toISOString(),
  });
}

function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

function getUiState() {
  return { ...defaultUiState, ...readStorage(UI_STATE_KEY, {}) };
}

function setUiState(nextState) {
  writeStorage(UI_STATE_KEY, nextState);
}

function redirect(path) {
  window.location.href = path;
}

function filterEvents(state) {
  return api
    .sortEvents(prototypeData.events)
    .filter((event) => state.year === "all" || event.year === state.year)
    .filter((event) => state.stage === "all" || event.stage === state.stage)
    .filter((event) => {
      if (!state.search.trim()) return true;
      const target = [
        event.title,
        event.location,
        event.summary,
        ...event.people.map((id) => api.getPerson(id)?.name || ""),
      ]
        .join(" ")
        .toLowerCase();
      return target.includes(state.search.trim().toLowerCase());
    });
}

function syncState(state, filteredEvents) {
  const next = { ...state };
  const visibleIds = new Set(filteredEvents.map((event) => event.id));
  if (!visibleIds.has(next.selectedEventId) && filteredEvents[0]) {
    next.selectedEventId = filteredEvents[0].id;
  }

  const selectedEvent =
    filteredEvents.find((event) => event.id === next.selectedEventId) ||
    api.getEvent(next.selectedEventId) ||
    filteredEvents[0] ||
    prototypeData.events[0];

  if (selectedEvent) {
    next.selectedPlaceId = next.selectedPlaceId || selectedEvent.placeId;
    next.selectedPersonId = next.selectedPersonId || selectedEvent.people[0];
  }

  if (!api.getPlace(next.selectedPlaceId)) {
    next.selectedPlaceId = selectedEvent?.placeId || prototypeData.places[0].id;
  }

  if (!api.getPerson(next.selectedPersonId)) {
    next.selectedPersonId = selectedEvent?.people[0] || prototypeData.people[0].id;
  }

  if (!api.getChapter(next.selectedChapterId)) {
    next.selectedChapterId = prototypeData.memoirChapters[0].id;
  }

  return next;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getSelectedEvent(state, filteredEvents) {
  return (
    filteredEvents.find((event) => event.id === state.selectedEventId) ||
    api.getEvent(state.selectedEventId) ||
    filteredEvents[0] ||
    prototypeData.events[0]
  );
}

function getSelectedPlace(state) {
  return api.getPlace(state.selectedPlaceId) || prototypeData.places[0];
}

function getSelectedPerson(state) {
  return api.getPerson(state.selectedPersonId) || prototypeData.people[0];
}

function getSelectedChapter(state) {
  return api.getChapter(state.selectedChapterId) || prototypeData.memoirChapters[0];
}

function renderNav(pageId) {
  return prototypeData.navViews
    .map(
      (view) => `
        <a class="nav-chip ${pageId === view.id ? "is-active" : ""}" href="${view.href}">
          <strong>${view.label}</strong>
          <span>${view.note}</span>
        </a>
      `,
    )
    .join("");
}

function renderSearchCard(state, filteredEvents) {
  if (!state.search.trim()) return "";
  const results = filteredEvents.slice(0, 5);
  return `
    <section class="search-card">
      <div class="panel-title">
        <div>
          <span class="section-eyebrow">Search Result</span>
          <h2>检索结果</h2>
        </div>
        <p>当前关键字：${escapeHtml(state.search)}</p>
      </div>
      ${
        results.length
          ? `<div class="search-results">
              ${results
                .map(
                  (event) => `
                    <button class="search-result" data-action="open-event" data-event="${event.id}">
                      <div>
                        <strong>${event.title}</strong>
                        <p>${event.date} · ${event.location} · ${api.formatPeople(event.people).join("、")}</p>
                      </div>
                      <span class="pill-count">${api.getMediaTotal(event)} 份</span>
                    </button>
                  `,
                )
                .join("")}
            </div>`
          : '<div class="search-empty">没有匹配结果。试试人物名、地点名或阶段关键词。</div>'
      }
    </section>
  `;
}

function renderLeftRail(session, state, filteredEvents, pageId) {
  const yearlyCounts = prototypeData.years.map((year) => ({
    year,
    count: filteredEvents.filter((event) => event.year === year).length,
  }));
  const stageCounts = prototypeData.stages.map((stage) => ({
    ...stage,
    count:
      stage.id === "all"
        ? filteredEvents.length
        : filteredEvents.filter((event) => event.stage === stage.id).length,
  }));

  return `
    <aside class="left-rail">
      <section class="rail-summary">
        <span class="section-eyebrow">Prototype Session</span>
        <h2>${session.name} 的记忆工作台</h2>
        <p>${pageId === "memoir" ? "当前停留在回忆录编排路径。" : "当前停留在多页面高保真原型路径。"} 所有内容均由静态测试数据驱动。</p>
        <div class="summary-grid">
          <div class="summary-metric">
            <span class="metric-label">登录身份</span>
            <strong>${session.role}</strong>
          </div>
          <div class="summary-metric">
            <span class="metric-label">事件总数</span>
            <strong>${prototypeData.events.length}</strong>
          </div>
          <div class="summary-metric">
            <span class="metric-label">人物索引</span>
            <strong>${prototypeData.people.length}</strong>
          </div>
          <div class="summary-metric">
            <span class="metric-label">章节草稿</span>
            <strong>${prototypeData.memoirChapters.length}</strong>
          </div>
        </div>
      </section>

      <section class="rail-section">
        <div class="rail-title">
          <h3>年份轨迹</h3>
          <span>${state.year === "all" ? "全部年份" : state.year}</span>
        </div>
        <div class="year-list">
          <button class="year-pill ${state.year === "all" ? "is-active" : ""}" data-action="set-year" data-year="all">
            <strong>全部年份</strong>
            <span class="pill-count">${filteredEvents.length}</span>
          </button>
          ${yearlyCounts
            .map(
              ({ year, count }) => `
                <button class="year-pill ${state.year === year ? "is-active" : ""}" data-action="set-year" data-year="${year}">
                  <strong>${year}</strong>
                  <span class="pill-count">${count}</span>
                </button>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="rail-section">
        <div class="rail-title">
          <h3>人生阶段</h3>
          <span>${prototypeData.stages.find((item) => item.id === state.stage)?.label || "全部阶段"}</span>
        </div>
        <div class="stage-list">
          ${stageCounts
            .map(
              (stage) => `
                <button class="stage-pill ${state.stage === stage.id ? "is-active" : ""}" data-action="set-stage" data-stage="${stage.id}">
                  <strong>${stage.label}</strong>
                  <span class="pill-count">${stage.count}</span>
                </button>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="rail-section">
        <div class="rail-title">
          <h3>原型页导航</h3>
          <span>多页面版本</span>
        </div>
        <div class="stage-list">
          <a class="stage-pill ${pageId === "event" ? "is-active" : ""}" href="./event.html">
            <strong>事件详情页</strong>
            <span>事件叙事与关联索引</span>
          </a>
          <a class="stage-pill ${pageId === "place" ? "is-active" : ""}" href="./place.html">
            <strong>地点详情页</strong>
            <span>地点时间切片与空间档案</span>
          </a>
          <a class="stage-pill ${pageId === "person" ? "is-active" : ""}" href="./person.html">
            <strong>人物详情页</strong>
            <span>共同经历与关系档案</span>
          </a>
        </div>
      </section>
    </aside>
  `;
}

function renderTopbar(session, pageId, state) {
  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">时</div>
        <div class="brand-copy">
          <h1>时光机器</h1>
          <p>静态测试数据驱动的多页面 Web 原型</p>
        </div>
      </div>
      <nav class="top-nav" aria-label="主导航">${renderNav(pageId)}</nav>
      <div class="top-actions">
        <label class="search-pill" for="global-search">
          <span>检索记忆</span>
          <input id="global-search" type="search" autocomplete="off" value="${escapeHtml(state.search)}" placeholder="搜事件、地点、人物" />
        </label>
        <div class="session-chip ${session.tone}">
          <strong>${session.name}</strong>
          <span>${session.role}</span>
        </div>
        <button class="ghost-button" data-action="logout" type="button">退出演示</button>
      </div>
    </header>
  `;
}

function renderEventMiniCard(event) {
  return `
    <article class="timeline-card compact-card">
      <div class="event-cover ${event.cover}">
        <span>${event.location}</span>
      </div>
      <div class="event-content">
        <div class="event-head">
          <div>
            <h3 class="event-title">${event.title}</h3>
            <p class="event-meta">${event.date} · ${api.getStageLabel(event.stage)}</p>
          </div>
          <span class="pill-count">${api.getMediaTotal(event)} 份</span>
        </div>
        <p class="event-blurb">${event.summary}</p>
        <div class="tag-row">
          ${api.formatPeople(event.people).map((person) => `<span class="tag is-person">${person}</span>`).join("")}
          <button class="tag-button tag is-place" data-action="open-place" data-place="${event.placeId}">${api.getPlace(event.placeId)?.name || event.location}</button>
          <button class="tag-button tag" data-action="open-event" data-event="${event.id}">查看详情</button>
        </div>
      </div>
    </article>
  `;
}

function renderMapNodes(selectedPlaceId) {
  return prototypeData.places
    .map(
      (place) => `
        <button
          class="map-node ${selectedPlaceId === place.id ? "is-selected" : ""}"
          style="left:${place.x}%; top:${place.y}%"
          data-action="select-place"
          data-place="${place.id}"
        >
          ${place.name}
        </button>
      `,
    )
    .join("");
}

function renderMapSvg(selectedPlaceId) {
  const points = prototypeData.places.map((place) => `${place.x},${place.y}`).join(" ");
  const selected = api.getPlace(selectedPlaceId);
  return `
    <svg class="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points="${points}"
        fill="none"
        stroke="rgba(47, 141, 138, 0.42)"
        stroke-width="0.9"
        stroke-linecap="round"
        stroke-dasharray="2.4 2.4"
      />
      ${
        selected
          ? `<circle cx="${selected.x}" cy="${selected.y}" r="4.5" fill="rgba(187, 104, 70, 0.22)" />
             <circle cx="${selected.x}" cy="${selected.y}" r="2.2" fill="rgba(187, 104, 70, 0.72)" />`
          : ""
      }
    </svg>
  `;
}

function renderPeopleGraph(selectedPersonId) {
  const centerX = 50;
  const centerY = 50;
  const radius = 34;
  const nodes = prototypeData.people.map((person, index) => {
    const angle = (-90 + index * 90) * (Math.PI / 180);
    return { ...person, x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
  });

  return `
    <div class="people-visual">
      <svg class="people-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${nodes
          .map(
            (node) => `
              <line
                x1="${centerX}"
                y1="${centerY}"
                x2="${node.x}"
                y2="${node.y}"
                stroke="${selectedPersonId === node.id ? "rgba(187, 104, 70, 0.7)" : "rgba(47, 141, 138, 0.32)"}"
                stroke-width="${selectedPersonId === node.id ? 1.2 : 0.8}"
                stroke-linecap="round"
              />
            `,
          )
          .join("")}
      </svg>
      <div class="people-center">我</div>
      ${nodes
        .map(
          (node) => `
            <button
              class="graph-node ${selectedPersonId === node.id ? "is-selected" : ""}"
              style="left:${node.x}%; top:${node.y}%"
              data-action="select-person"
              data-person="${node.id}"
            >
              ${node.name}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderTimelinePage(state, filteredEvents) {
  const event = getSelectedEvent(state, filteredEvents);
  return `
    ${renderSearchCard(state, filteredEvents)}
    <section class="memory-hero">
      <div class="hero-grid">
        <div class="hero-copy">
          <div>
            <span class="section-eyebrow">Timeline Overview / ${event.year}</span>
            <h2 class="selected-title">${event.title}</h2>
          </div>
          <p>${event.longText}</p>
          <div class="detail-grid">
            <div class="detail-box"><span>时间</span><strong>${event.date}</strong></div>
            <div class="detail-box"><span>地点</span><strong>${api.getPlace(event.placeId)?.name || event.location}</strong></div>
            <div class="detail-box"><span>人物</span><strong>${api.formatPeople(event.people).join("、")}</strong></div>
            <div class="detail-box"><span>素材密度</span><strong>${api.getMediaTotal(event)} 份</strong></div>
          </div>
          <div class="action-row">
            <a class="primary-button" href="./event.html">进入事件详情页</a>
            <button class="secondary-button" data-action="open-place" data-place="${event.placeId}">转到地点页</button>
            <button class="secondary-button" data-action="open-person" data-person="${event.people[0]}">转到人物页</button>
          </div>
        </div>
        <div class="hero-visual">
          <div class="cover-large ${event.cover}">
            <span class="cover-label">当前选中事件</span>
            <div class="cover-title">${event.location}</div>
          </div>
          <div class="gallery-grid">
            ${event.gallery
              .map((item, index) => `<div class="media-thumb ${event.cover}"><span>${index + 1}. ${item}</span></div>`)
              .join("")}
          </div>
        </div>
      </div>
    </section>
    <section class="panel-card">
      <div class="panel-title">
        <div>
          <span class="section-eyebrow">Chronological Atlas</span>
          <h2>多页面时间线总览</h2>
        </div>
        <p>${filteredEvents.length} 条事件，点击任意卡片进入单独事件页</p>
      </div>
      <div class="timeline-board">
        ${filteredEvents.map((item) => renderEventMiniCard(item)).join("")}
      </div>
    </section>
  `;
}

function renderSpacePage(state, filteredEvents) {
  const place = getSelectedPlace(state);
  const relatedEvents = filteredEvents.filter((event) => event.placeId === place.id);
  return `
    ${renderSearchCard(state, filteredEvents)}
    <section class="place-hero">
      <div class="place-grid">
        <div class="place-copy">
          <div>
            <span class="section-eyebrow">Space Overview</span>
            <h2 class="selected-title">${place.name} 的场所记忆</h2>
          </div>
          <p>${place.summary}</p>
          <div class="place-facts">
            <div class="place-fact"><span class="meta-label">地点类型</span><strong>${place.type}</strong></div>
            <div class="place-fact"><span class="meta-label">关联事件</span><strong>${relatedEvents.length} 条</strong></div>
            <div class="place-fact"><span class="meta-label">首次出现</span><strong>${place.firstSeen}</strong></div>
            <div class="place-fact"><span class="meta-label">最近出现</span><strong>${place.latestSeen}</strong></div>
          </div>
          <div class="action-row">
            <a class="primary-button" href="./place.html">进入地点详情页</a>
            <button class="secondary-button" data-action="open-event" data-event="${relatedEvents[0]?.id || state.selectedEventId}">打开代表事件</button>
          </div>
        </div>
        <div class="place-visual">
          <div class="map-visual large">
            <div class="map-shape"></div>
            ${renderMapSvg(place.id)}
            ${renderMapNodes(place.id)}
          </div>
          <div class="map-legend">
            <span class="legend-chip">点击地图节点切换地点</span>
            <span class="legend-chip">空间是独立入口，不只是标签</span>
          </div>
        </div>
      </div>
    </section>
    <section class="stage-grid">
      <div class="stage-panel stage-overview">
        <div class="stage-head">
          <div>
            <span class="section-eyebrow">Related Events</span>
            <h2>${place.name} 的事件流</h2>
          </div>
          <span class="pill-count">${relatedEvents.length} 条</span>
        </div>
        <div class="related-list">${(relatedEvents.length ? relatedEvents : filteredEvents.slice(0, 2)).map(renderEventMiniCard).join("")}</div>
      </div>
      <div class="stage-panel detail-stream">
        <div class="detail-head">
          <h3>空间视图原型要点</h3>
          <span class="pill-count">Prototype Note</span>
        </div>
        <div class="detail-copy">
          <p>这个页面重点验证“从地点进入，再回到事件和人物”的工作流。当前地点变化会同步更新当前主事件，避免空间页成为孤立地图。</p>
          <div class="cluster-card">
            <strong class="cluster-title">该地点的常见共现人物</strong>
            <div class="chip-row">
              ${[...new Set(relatedEvents.flatMap((event) => event.people))]
                .map((personId) => `<button class="tag-button tag" data-action="open-person" data-person="${personId}">${api.getPerson(personId)?.name || personId}</button>`)
                .join("")}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderPeoplePage(state, filteredEvents) {
  const person = getSelectedPerson(state);
  const relatedEvents = filteredEvents.filter((event) => event.people.includes(person.id));
  const sharedPlaces = person.sharedPlaces.map((id) => api.getPlace(id)).filter(Boolean);
  return `
    ${renderSearchCard(state, filteredEvents)}
    <section class="person-hero">
      <div class="person-grid">
        <div class="person-copy">
          <div>
            <span class="section-eyebrow">People Overview</span>
            <h2 class="selected-title">${person.name} 与你的共同记忆</h2>
          </div>
          <p>${person.intro}</p>
          <div class="metric-grid">
            <div class="metric-card"><span class="metric-label">首次出现</span><div class="metric-value">${person.firstSeen}</div></div>
            <div class="metric-card"><span class="metric-label">最近一次</span><div class="metric-value">${person.latestSeen}</div></div>
            <div class="metric-card"><span class="metric-label">共现事件</span><div class="metric-value">${relatedEvents.length}</div></div>
          </div>
          <div class="chip-row">
            <span class="chip">${person.role}</span>
            <span class="chip">${person.density}</span>
            ${sharedPlaces.map((place) => `<button class="tag-button tag" data-action="open-place" data-place="${place.id}">${place.name}</button>`).join("")}
          </div>
          <div class="action-row">
            <a class="primary-button" href="./person.html">进入人物详情页</a>
            <a class="secondary-button" href="./memoir.html">写成一章</a>
          </div>
        </div>
        <div class="person-visual">${renderPeopleGraph(person.id)}</div>
      </div>
    </section>
    <section class="stage-grid">
      <div class="stage-panel stage-overview">
        <div class="stage-head">
          <div>
            <span class="section-eyebrow">Shared Event Flow</span>
            <h2>与 ${person.name} 相关的时间线</h2>
          </div>
          <span class="pill-count">${relatedEvents.length} 条</span>
        </div>
        <div class="related-list">${(relatedEvents.length ? relatedEvents : filteredEvents.slice(0, 3)).map(renderEventMiniCard).join("")}</div>
      </div>
      <div class="stage-panel detail-stream">
        <div class="detail-head">
          <h3>关系视图原型要点</h3>
          <span class="pill-count">Prototype Insight</span>
        </div>
        <div class="detail-copy">
          <p>人物页验证“关系不是联系人列表，而是共同经历的索引”。除了事件流，页面还明确展示共同地点和可写成章节的叙事切口。</p>
        </div>
      </div>
    </section>
  `;
}

function renderMemoirPage(state, filteredEvents) {
  const chapter = getSelectedChapter(state);
  const chapterEvents = filteredEvents.filter((event) =>
    chapter.items.some((item) => event.title.includes(item.slice(0, 4)) || event.summary.includes(item.slice(0, 4))),
  );

  return `
    ${renderSearchCard(state, filteredEvents)}
    <section class="memoir-board">
      <div class="memoir-grid editor-grid">
        <div class="editor-chapters panel-subsurface">
          <div class="panel-title">
            <div>
              <span class="section-eyebrow">Chapter Tree</span>
              <h2>章节树</h2>
            </div>
            <button class="mini-button">新增章节</button>
          </div>
          <div class="chapter-list">
            ${prototypeData.memoirChapters
              .map(
                (item, index) => `
                  <button class="chapter-list-item ${state.selectedChapterId === item.id ? "is-active" : ""}" data-action="select-chapter" data-chapter="${item.id}">
                    <div>
                      <strong>${index + 1}. ${item.title}</strong>
                      <span>${item.status}</span>
                    </div>
                    <span class="pill-count">${item.items.length}</span>
                  </button>
                `,
              )
              .join("")}
          </div>
          <div class="outline-card">
            <strong>编辑状态</strong>
            <ul class="chapter-outline">
              <li>空章节状态</li>
              <li>拖拽排序状态</li>
              <li>AI 草稿后人工调整状态</li>
            </ul>
          </div>
        </div>

        <div class="editor-canvas panel-subsurface">
          <div class="panel-title">
            <div>
              <span class="section-eyebrow">Memoir Editor</span>
              <h2>${chapter.title}</h2>
            </div>
            <div class="toolbar-row">
              <button class="mini-button">自动生成摘要</button>
              <button class="mini-button">插入事件</button>
              <button class="mini-button">预览章节</button>
            </div>
          </div>
          <div class="editor-document">
            <div class="editor-banner ${chapter.cover}">
              <span class="cover-label">章节封面草稿</span>
              <div class="cover-title">${chapter.title}</div>
            </div>
            <div class="editor-section">
              <span class="section-eyebrow">Chapter Intro</span>
              <p>${chapter.blurb}</p>
            </div>
            <div class="editor-section">
              <span class="section-eyebrow">Narrative Blocks</span>
              <div class="chapter-block-grid">
                ${(chapterEvents.length ? chapterEvents : filteredEvents.slice(0, 3))
                  .map(
                    (event, index) => `
                      <div class="editor-block">
                        <strong>片段 ${index + 1} · ${event.title}</strong>
                        <p>${event.longText}</p>
                        <div class="tag-row">
                          <button class="tag-button tag is-place" data-action="open-place" data-place="${event.placeId}">${api.getPlace(event.placeId)?.name || event.location}</button>
                          ${api.formatPeople(event.people)
                            .map((name) => `<span class="tag is-person">${name}</span>`)
                            .join("")}
                        </div>
                      </div>
                    `,
                  )
                  .join("")}
              </div>
            </div>
            <div class="editor-section">
              <span class="section-eyebrow">Media Layout</span>
              <div class="gallery-grid">
                ${(chapterEvents[0] ? chapterEvents[0].gallery : filteredEvents[0].gallery)
                  .map((item, index) => `<div class="media-thumb ${chapter.cover}"><span>${index + 1}. ${item}</span></div>`)
                  .join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderEventPage(state, filteredEvents) {
  const event = getSelectedEvent(state, filteredEvents);
  const place = api.getPlace(event.placeId);
  const people = event.people.map((id) => api.getPerson(id)).filter(Boolean);
  const relatedEvents = filteredEvents.filter((item) => item.id !== event.id && (item.placeId === event.placeId || item.people.some((id) => event.people.includes(id)))).slice(0, 3);
  return `
    ${renderSearchCard(state, filteredEvents)}
    <section class="memory-hero">
      <div class="hero-grid">
        <div class="hero-copy">
          <div>
            <span class="section-eyebrow">Event Detail</span>
            <h2 class="selected-title">${event.title}</h2>
          </div>
          <p>${event.longText}</p>
          <div class="detail-grid">
            <div class="detail-box"><span>日期</span><strong>${event.date}</strong></div>
            <div class="detail-box"><span>地点</span><strong>${place?.name || event.location}</strong></div>
            <div class="detail-box"><span>人物</span><strong>${api.formatPeople(event.people).join("、")}</strong></div>
            <div class="detail-box"><span>素材总数</span><strong>${api.getMediaTotal(event)} 份</strong></div>
          </div>
          <div class="action-row">
            <button class="primary-button" data-action="open-place" data-place="${event.placeId}">查看地点详情</button>
            <button class="secondary-button" data-action="open-person" data-person="${event.people[0]}">查看人物详情</button>
            <a class="secondary-button" href="./memoir.html">加入回忆录编辑器</a>
          </div>
        </div>
        <div class="hero-visual">
          <div class="cover-large ${event.cover}">
            <span class="cover-label">事件封面</span>
            <div class="cover-title">${event.location}</div>
          </div>
          <div class="gallery-grid">
            ${event.gallery.map((item, index) => `<div class="media-thumb ${event.cover}"><span>${index + 1}. ${item}</span></div>`).join("")}
          </div>
        </div>
      </div>
    </section>
    <section class="stage-grid">
      <div class="stage-panel stage-overview">
        <div class="stage-head">
          <div>
            <span class="section-eyebrow">Place & People</span>
            <h2>事件关联索引</h2>
          </div>
        </div>
        <div class="related-list">
          <div class="cluster-card">
            <strong class="cluster-title">地点索引</strong>
            <p class="cluster-meta">${place?.summary || ""}</p>
            <button class="tag-button tag is-place" data-action="open-place" data-place="${place?.id || ""}">${place?.name || event.location}</button>
          </div>
          <div class="cluster-card">
            <strong class="cluster-title">人物索引</strong>
            <div class="chip-row">
              ${people.map((person) => `<button class="tag-button tag" data-action="open-person" data-person="${person.id}">${person.name}</button>`).join("")}
            </div>
          </div>
        </div>
      </div>
      <div class="stage-panel detail-stream">
        <div class="detail-head">
          <h3>相关事件</h3>
          <span class="pill-count">${relatedEvents.length} 条</span>
        </div>
        <div class="related-list">${relatedEvents.map(renderEventMiniCard).join("")}</div>
      </div>
    </section>
  `;
}

function renderPlacePage(state, filteredEvents) {
  const place = getSelectedPlace(state);
  const placeEvents = filteredEvents.filter((event) => event.placeId === place.id);
  const peopleIds = [...new Set(placeEvents.flatMap((event) => event.people))];
  return `
    ${renderSearchCard(state, filteredEvents)}
    <section class="place-hero">
      <div class="place-grid">
        <div class="place-copy">
          <div>
            <span class="section-eyebrow">Place Detail Page</span>
            <h2 class="selected-title">${place.name} 的完整地点档案</h2>
          </div>
          <p>${place.summary}</p>
          <div class="place-facts">
            <div class="place-fact"><span class="meta-label">地点类型</span><strong>${place.type}</strong></div>
            <div class="place-fact"><span class="meta-label">事件数量</span><strong>${placeEvents.length}</strong></div>
            <div class="place-fact"><span class="meta-label">首次出现</span><strong>${place.firstSeen}</strong></div>
            <div class="place-fact"><span class="meta-label">最近出现</span><strong>${place.latestSeen}</strong></div>
          </div>
          <div class="chip-row">
            ${peopleIds.map((personId) => `<button class="tag-button tag" data-action="open-person" data-person="${personId}">${api.getPerson(personId)?.name || personId}</button>`).join("")}
          </div>
        </div>
        <div class="place-visual">
          <div class="map-visual large">
            <div class="map-shape"></div>
            ${renderMapSvg(place.id)}
            ${renderMapNodes(place.id)}
          </div>
        </div>
      </div>
    </section>
    <section class="panel-card">
      <div class="panel-title">
        <div>
          <span class="section-eyebrow">Place Timeline</span>
          <h2>${place.name} 的时间切片</h2>
        </div>
        <a class="mini-button" href="./space.html">返回空间总览</a>
      </div>
      <div class="timeline-board">${placeEvents.map(renderEventMiniCard).join("")}</div>
    </section>
  `;
}

function renderPersonPage(state, filteredEvents) {
  const person = getSelectedPerson(state);
  const relatedEvents = filteredEvents.filter((event) => event.people.includes(person.id));
  const sharedPlaces = person.sharedPlaces.map((id) => api.getPlace(id)).filter(Boolean);
  return `
    ${renderSearchCard(state, filteredEvents)}
    <section class="person-hero">
      <div class="person-grid">
        <div class="person-copy">
          <div>
            <span class="section-eyebrow">Person Detail Page</span>
            <h2 class="selected-title">${person.name} 的共同记忆档案</h2>
          </div>
          <p>${person.intro}</p>
          <div class="metric-grid">
            <div class="metric-card"><span class="metric-label">首次出现</span><div class="metric-value">${person.firstSeen}</div></div>
            <div class="metric-card"><span class="metric-label">最近一次</span><div class="metric-value">${person.latestSeen}</div></div>
            <div class="metric-card"><span class="metric-label">关系密度</span><div class="metric-value">${person.density}</div></div>
          </div>
          <div class="chip-row">
            ${sharedPlaces.map((place) => `<button class="tag-button tag is-place" data-action="open-place" data-place="${place.id}">${place.name}</button>`).join("")}
          </div>
        </div>
        <div class="person-visual">${renderPeopleGraph(person.id)}</div>
      </div>
    </section>
    <section class="panel-card">
      <div class="panel-title">
        <div>
          <span class="section-eyebrow">Shared Memory Timeline</span>
          <h2>${person.name} 的关键事件</h2>
        </div>
        <a class="mini-button" href="./people.html">返回人物总览</a>
      </div>
      <div class="timeline-board">${relatedEvents.map(renderEventMiniCard).join("")}</div>
    </section>
  `;
}

function renderRightRail(pageId, state, filteredEvents) {
  const event = getSelectedEvent(state, filteredEvents);
  const place = getSelectedPlace(state);
  const person = getSelectedPerson(state);
  const chapter = getSelectedChapter(state);

  if (pageId === "memoir") {
    return `
      <aside class="right-rail">
        <section class="panel-card">
          <div class="panel-title">
            <div>
              <span class="section-eyebrow">Source Library</span>
              <h2>候选事件库</h2>
            </div>
          </div>
          <div class="suggestion-list">
            ${filteredEvents.slice(0, 5).map(renderEventMiniCard).join("")}
          </div>
        </section>
        <section class="panel-card">
          <div class="panel-title">
            <div>
              <span class="section-eyebrow">Editing State</span>
              <h2>当前章节状态</h2>
            </div>
          </div>
          <div class="cluster-card">
            <strong class="cluster-title">${chapter.title}</strong>
            <p class="cluster-meta">${chapter.status} · 已挂载 ${chapter.items.length} 个章节线索</p>
          </div>
          <div class="cluster-card">
            <strong class="cluster-title">推荐插入</strong>
            <div class="chip-row">
              <button class="tag-button tag" data-action="open-person" data-person="${event.people[0]}">${api.getPerson(event.people[0])?.name || ""}</button>
              <button class="tag-button tag is-place" data-action="open-place" data-place="${event.placeId}">${api.getPlace(event.placeId)?.name || ""}</button>
            </div>
          </div>
        </section>
      </aside>
    `;
  }

  if (pageId === "space" || pageId === "place") {
    const placeEvents = filteredEvents.filter((item) => item.placeId === place.id);
    return `
      <aside class="right-rail">
        <section class="panel-card">
          <div class="panel-title">
            <div>
              <span class="section-eyebrow">Place Snapshot</span>
              <h2>${place.name} 速览</h2>
            </div>
          </div>
          <div class="cluster-card">
            <strong class="cluster-title">${place.summary}</strong>
            <p class="cluster-meta">当前地点下共有 ${placeEvents.length} 条事件，适合按年份回看空间变化。</p>
          </div>
          <div class="suggestion-list">
            ${placeEvents.slice(0, 3).map(renderEventMiniCard).join("")}
          </div>
        </section>
      </aside>
    `;
  }

  if (pageId === "people" || pageId === "person") {
    const personEvents = filteredEvents.filter((item) => item.people.includes(person.id));
    return `
      <aside class="right-rail">
        <section class="panel-card">
          <div class="panel-title">
            <div>
              <span class="section-eyebrow">Shared Places</span>
              <h2>${person.name} 的共同地点</h2>
            </div>
          </div>
          <div class="place-list">
            ${person.sharedPlaces
              .map((placeId) => api.getPlace(placeId))
              .filter(Boolean)
              .map(
                (item) => `
                  <button class="place-list-item" data-action="open-place" data-place="${item.id}">
                    <div>
                      <strong>${item.name}</strong>
                      <span>${item.type} · ${item.firstSeen} 起</span>
                    </div>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>
        <section class="panel-card">
          <div class="panel-title">
            <div>
              <span class="section-eyebrow">Memoir Angle</span>
              <h2>适合写成一章的片段</h2>
            </div>
          </div>
          <div class="suggestion-list">
            ${personEvents.slice(0, 3).map(renderEventMiniCard).join("")}
          </div>
        </section>
      </aside>
    `;
  }

  return `
    <aside class="right-rail">
      <section class="panel-card map-card">
        <div class="panel-title">
          <div>
            <span class="section-eyebrow">Map Snapshot</span>
            <h2>地点密度地图</h2>
          </div>
          <a class="mini-button" href="./space.html">展开</a>
        </div>
        <div class="map-visual">
          <div class="map-shape"></div>
          ${renderMapSvg(place.id)}
          ${renderMapNodes(place.id)}
        </div>
      </section>
      <section class="panel-card">
        <div class="panel-title">
          <div>
            <span class="section-eyebrow">People Snapshot</span>
            <h2>关系网络</h2>
          </div>
          <a class="mini-button" href="./people.html">展开</a>
        </div>
        ${renderPeopleGraph(person.id)}
      </section>
      <section class="panel-card">
        <div class="panel-title">
          <div>
            <span class="section-eyebrow">Detail Layer</span>
            <h2>当前记忆摘要</h2>
          </div>
        </div>
        <div class="cluster-card">
          <strong class="cluster-title">${event.title}</strong>
          <p class="cluster-meta">${event.summary}</p>
        </div>
        <div class="tiny-stats">
          <div class="tiny-stat"><span class="metric-label">照片</span><strong>${event.media.photos}</strong></div>
          <div class="tiny-stat"><span class="metric-label">视频</span><strong>${event.media.videos}</strong></div>
          <div class="tiny-stat"><span class="metric-label">语音</span><strong>${event.media.audios}</strong></div>
          <div class="tiny-stat"><span class="metric-label">文字</span><strong>${event.media.texts}</strong></div>
        </div>
      </section>
    </aside>
  `;
}

function renderPage(pageId, session, state) {
  const filteredEvents = filterEvents(state);
  const syncedState = syncState(state, filteredEvents);
  setUiState(syncedState);

  const titleMap = {
    timeline: "时光机器 · 时间线",
    space: "时光机器 · 空间",
    people: "时光机器 · 人物",
    memoir: "时光机器 · 回忆录",
    event: "时光机器 · 事件详情",
    place: "时光机器 · 地点详情",
    person: "时光机器 · 人物详情",
  };
  document.title = titleMap[pageId] || "时光机器 Web 原型";

  const centerMap = {
    timeline: renderTimelinePage,
    space: renderSpacePage,
    people: renderPeoplePage,
    memoir: renderMemoirPage,
    event: renderEventPage,
    place: renderPlacePage,
    person: renderPersonPage,
  };

  document.body.className = "prototype-body";
  document.body.innerHTML = `
    <div class="app-shell">
      ${renderTopbar(session, pageId, syncedState)}
      <div class="workspace">
        ${renderLeftRail(session, syncedState, filteredEvents, pageId)}
        <main class="center-stage">${centerMap[pageId](syncedState, filteredEvents)}</main>
        ${renderRightRail(pageId, syncedState, filteredEvents)}
      </div>
    </div>
  `;

  attachPrototypeHandlers(pageId);
}

function attachPrototypeHandlers(pageId) {
  const searchInput = document.getElementById("global-search");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      const state = getUiState();
      state.search = event.target.value;
      setUiState(state);
      renderPage(pageId, getSession(), state);
    });
  }

  document.body.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const state = getUiState();

    if (action === "logout") {
      clearSession();
      redirect("./login.html");
      return;
    }

    if (action === "set-year") {
      state.year = target.dataset.year === "all" ? "all" : Number(target.dataset.year);
      setUiState(state);
      renderPage(pageId, getSession(), state);
      return;
    }

    if (action === "set-stage") {
      state.stage = target.dataset.stage;
      setUiState(state);
      renderPage(pageId, getSession(), state);
      return;
    }

    if (action === "select-place") {
      state.selectedPlaceId = target.dataset.place;
      const placeEvent = filterEvents(state).find((item) => item.placeId === state.selectedPlaceId);
      if (placeEvent) {
        state.selectedEventId = placeEvent.id;
        state.selectedPersonId = placeEvent.people[0];
      }
      setUiState(state);
      renderPage(pageId, getSession(), state);
      return;
    }

    if (action === "select-person") {
      state.selectedPersonId = target.dataset.person;
      const personEvent = filterEvents(state).find((item) => item.people.includes(state.selectedPersonId));
      if (personEvent) {
        state.selectedEventId = personEvent.id;
        state.selectedPlaceId = personEvent.placeId;
      }
      setUiState(state);
      renderPage(pageId, getSession(), state);
      return;
    }

    if (action === "select-chapter") {
      state.selectedChapterId = target.dataset.chapter;
      setUiState(state);
      renderPage(pageId, getSession(), state);
      return;
    }

    if (action === "open-event") {
      state.selectedEventId = target.dataset.event;
      const eventData = api.getEvent(state.selectedEventId);
      if (eventData) {
        state.selectedPlaceId = eventData.placeId;
        state.selectedPersonId = eventData.people[0];
      }
      setUiState(state);
      redirect("./event.html");
      return;
    }

    if (action === "open-place") {
      state.selectedPlaceId = target.dataset.place;
      const placeEvent = filterEvents(state).find((item) => item.placeId === state.selectedPlaceId);
      if (placeEvent) {
        state.selectedEventId = placeEvent.id;
        state.selectedPersonId = placeEvent.people[0];
      }
      setUiState(state);
      redirect("./place.html");
      return;
    }

    if (action === "open-person") {
      state.selectedPersonId = target.dataset.person;
      const personEvent = filterEvents(state).find((item) => item.people.includes(state.selectedPersonId));
      if (personEvent) {
        state.selectedEventId = personEvent.id;
        state.selectedPlaceId = personEvent.placeId;
      }
      setUiState(state);
      redirect("./person.html");
    }
  });
}

function renderLoginPage(errorMessage = "") {
  document.title = "时光机器 · 登录";
  document.body.className = "auth-body";
  document.body.innerHTML = `
    <div class="auth-shell">
      <section class="auth-story">
        <div class="brand auth-brand">
          <div class="brand-mark">时</div>
          <div class="brand-copy">
            <h1>时光机器</h1>
            <p>多页面 Web 原型 · 静态测试数据演示版</p>
          </div>
        </div>
        <div class="auth-hero">
          <span class="section-eyebrow">Prototype Access</span>
          <h2>先登录，再进入你的时间、空间、人物记忆工作台。</h2>
          <p>这里没有真实后端，登录仅用于模拟产品入口、会话状态和不同类型用户的工作场景。</p>
          <div class="auth-feature-grid">
            <div class="auth-feature">
              <strong>时间线总览</strong>
              <span>事件优先，而不是素材平铺</span>
            </div>
            <div class="auth-feature">
              <strong>地点与人物详情页</strong>
              <span>从单页视图升级为多页面原型</span>
            </div>
            <div class="auth-feature">
              <strong>更细的回忆录编辑器</strong>
              <span>章节树、正文区、来源库同时展开</span>
            </div>
          </div>
        </div>
      </section>

      <section class="auth-panel">
        <div class="auth-card">
          <span class="section-eyebrow">Sign In</span>
          <h2>登录演示账号</h2>
          <p class="auth-note">任意一个测试账号都能进入完整原型。密码统一为 <code>timex2026</code>。</p>
          <form id="login-form" class="auth-form">
            <label class="auth-field">
              <span>邮箱</span>
              <input id="login-email" name="email" type="email" placeholder="maker@timex.test" required />
            </label>
            <label class="auth-field">
              <span>密码</span>
              <input id="login-password" name="password" type="password" placeholder="timex2026" required />
            </label>
            <button class="primary-button auth-submit" type="submit">进入原型</button>
            <p class="auth-error ${errorMessage ? "" : "is-hidden"}" id="auth-error">${errorMessage || ""}</p>
          </form>
        </div>

        <div class="auth-card">
          <div class="panel-title">
            <div>
              <span class="section-eyebrow">Demo Accounts</span>
              <h2>一键登录</h2>
            </div>
          </div>
          <div class="demo-account-list">
            ${prototypeData.accounts
              .map(
                (account) => `
                  <button class="demo-account ${account.tone}" data-action="quick-login" data-account="${account.id}">
                    <div class="demo-account-top">
                      <strong>${account.name}</strong>
                      <span>${account.role}</span>
                    </div>
                    <p>${account.summary}</p>
                    <small>${account.email}</small>
                  </button>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>
    </div>
  `;

  document.getElementById("login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const account = prototypeData.accounts.find((item) => item.email === email && item.password === password);
    if (!account) {
      renderLoginPage("账号或密码不匹配，请使用测试账号。");
      return;
    }
    setSession(account);
    setUiState(defaultUiState);
    redirect("./timeline.html");
  });

  document.body.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action='quick-login']");
    if (!target) return;
    const account = prototypeData.accounts.find((item) => item.id === target.dataset.account);
    if (!account) return;
    setSession(account);
    setUiState(defaultUiState);
    redirect("./timeline.html");
  });
}

export function bootIndexPage() {
  redirect(getSession() ? "./timeline.html" : "./login.html");
}

export function bootLoginPage() {
  if (getSession()) {
    redirect("./timeline.html");
    return;
  }
  renderLoginPage();
}

export function bootPrototypePage(pageId) {
  const session = getSession();
  if (!session) {
    redirect("./login.html");
    return;
  }
  renderPage(pageId, session, getUiState());
}
