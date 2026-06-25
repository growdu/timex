// API data adapter that wraps real API responses
// with helper functions similar to the mock createApi()

const stages = [
  { id: "all", label: "全部阶段" },
  { id: "student", label: "学生时代" },
  { id: "first-job", label: "初入职场" },
  { id: "maker", label: "创作试验" },
  { id: "family", label: "家庭时刻" },
  { id: "custom", label: "自定义" },
];

export function createApiAdapter({ events = [], people = [], places = [], memoirs = [] }) {
  const personMap = new Map(people.map((p) => [p.id, p]));
  const placeMap = new Map(places.map((p) => [p.id, p]));
  const eventMap = new Map(events.map((e) => [e.id, e]));
  const memoirMap = new Map(memoirs.map((m) => [m.id, m]));

  return {
    stages,

    getPerson(id) {
      return personMap.get(id);
    },

    getPlace(id) {
      return placeMap.get(id);
    },

    getEvent(id) {
      return eventMap.get(id);
    },

    getChapter(id) {
      return memoirMap.get(id);
    },

    getStageLabel(id) {
      if (!id) return "";
      return stages.find((stage) => stage.id === id)?.label || id;
    },

    getMediaTotal(event) {
      if (!event.moments || event.moments.length === 0) return 0;
      return event.moments.length;
    },

    formatPeople(personIds) {
      if (!personIds) return [];
      return personIds.map((id) => personMap.get(id)?.name).filter(Boolean);
    },

    formatPeopleFull(personIds) {
      if (!personIds) return [];
      return personIds.map((id) => personMap.get(id)).filter(Boolean);
    },

    sortEvents(eventsToSort) {
      return [...eventsToSort].sort((a, b) => {
        const dateA = new Date(a.date.replace(/\./g, "-"));
        const dateB = new Date(b.date.replace(/\./g, "-"));
        return dateB - dateA;
      });
    },

    filterEvents(eventsToFilter, state) {
      const keyword = state.search?.trim().toLowerCase() || "";
      return this.sortEvents(eventsToFilter)
        .filter((event) => state.year === "all" || state.year === undefined || String(event.date).startsWith(String(state.year)))
        .filter((event) => state.stage === "all" || state.stage === undefined || event.stage === state.stage)
        .filter((event) => {
          if (!keyword) return true;
          const target = [
            event.title,
            event.location,
            event.summary,
            ...this.formatPeople(event.people?.map((p) => p.id || p)),
            this.getPlace(event.placeId)?.name || "",
          ]
            .join(" ")
            .toLowerCase();
          return target.includes(keyword);
        });
    },

    getYears(eventsToProcess) {
      const years = [...new Set(eventsToProcess.map((e) => new Date(e.date).getFullYear()))];
      return years.sort((a, b) => b - a);
    },

    getSelectedEvent(selectedEventId, eventsList) {
      if (selectedEventId) {
        return eventsList.find((e) => e.id === selectedEventId) || eventsList[0];
      }
      return eventsList[0];
    },
  };
}

export { stages };
