// API data adapter that wraps real API responses
// with helper functions similar to the mock createApi()

import { isInLine } from "./lineMatchers.js";
import { lines, getLineMeta } from "./lines.js";

const stages = [
  { id: "all", label: "全部阶段" },
  { id: "student", label: "学生时代" },
  { id: "first-job", label: "初入职场" },
  { id: "maker", label: "创作试验" },
  { id: "family", label: "家庭时刻" },
  { id: "custom", label: "自定义" },
];

// Map backend stage values to display labels
const stageLabels = {
  student: "学生时代",
  "first-job": "初入职场",
  maker: "创作试验",
  family: "家庭时刻",
  custom: "自定义",
  travel: "旅行",
  work: "工作",
  life: "生活",
};

const placeTypeLabels = {
  city: "城市",
  travel: "旅行地",
  family: "家庭",
  daily: "日常",
};

const personRoleLabels = {
  family: "家人",
  friend: "朋友",
  colleague: "同事",
  classmate: "同学",
  other: "其他",
};

export function createApiAdapter({ events = [], people = [], places = [], memoirs = [] } = {}) {
  const personMap = new Map(people.map((p) => [p.id, p]));
  const placeMap = new Map(places.map((p) => [p.id, p]));
  const eventMap = new Map(events.map((e) => [e.id, e]));
  const memoirMap = new Map(memoirs.map((m) => [m.id, m]));

  // Helper: extract person IDs from event.people (which may be array of objects or IDs)
  const getEventPersonIds = (event) => {
    if (!event || !event.people) return [];
    if (Array.isArray(event.people)) {
      // If people contains objects with id, extract IDs
      if (event.people.length > 0 && typeof event.people[0] === "object") {
        return event.people.map((p) => p.id).filter(Boolean);
      }
      return event.people;
    }
    return [];
  };

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

    getStageLabel(stage) {
      if (!stage) return "";
      return stageLabels[stage] || stage;
    },

    getPlaceTypeLabel(type) {
      if (!type) return "";
      return placeTypeLabels[type] || type;
    },

    getRoleLabel(role) {
      if (!role) return "";
      return personRoleLabels[role] || role;
    },

    getMediaTotal(event) {
      if (!event) return 0;
      if (event.moments && Array.isArray(event.moments)) {
        return event.moments.length;
      }
      // Estimate media count based on weight
      return Math.max(1, Math.floor((event.weight || 1) / 5));
    },

    getEventYear(event) {
      if (!event || !event.date) return null;
      const parts = this._parseDateParts(event.date);
      return parts ? parts.year : null;
    },

    formatPeople(peopleData) {
      if (!peopleData) return [];
      const ids = Array.isArray(peopleData) && peopleData.length > 0 && typeof peopleData[0] === "object"
        ? peopleData.map((p) => p.id)
        : peopleData;
      return ids.map((id) => personMap.get(id)?.name).filter(Boolean);
    },

    formatPeopleFull(peopleData) {
      if (!peopleData) return [];
      const ids = Array.isArray(peopleData) && peopleData.length > 0 && typeof peopleData[0] === "object"
        ? peopleData.map((p) => p.id)
        : peopleData;
      return ids.map((id) => personMap.get(id)).filter(Boolean);
    },

    sortEvents(eventsToSort) {
      return [...eventsToSort].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });
    },

    filterEvents(eventsToFilter, state = {}) {
      const keyword = (state.search || "").trim().toLowerCase();
      const yearFilter = state.year;
      const stageFilter = state.stage;

      return this.sortEvents(eventsToFilter || []).filter((event) => {
        // Year filter
        if (yearFilter && yearFilter !== "all") {
          const eventYear = this.getEventYear(event);
          if (eventYear !== parseInt(yearFilter, 10)) {
            return false;
          }
        }

        // Stage filter
        if (stageFilter && stageFilter !== "all") {
          if (event.stage !== stageFilter) {
            return false;
          }
        }

        // Keyword filter
        if (keyword) {
          const personIds = getEventPersonIds(event);
          const target = [
            event.title || "",
            event.location || "",
            event.summary || "",
            ...this.formatPeople(personIds),
            placeMap.get(event.placeId)?.name || "",
          ]
            .join(" ")
            .toLowerCase();
          if (!target.includes(keyword)) {
            return false;
          }
        }

        return true;
      });
    },

    getYears(eventsToProcess) {
      const years = new Set();
      (eventsToProcess || []).forEach((e) => {
        const y = this.getEventYear(e);
        if (y) years.add(y);
      });
      return Array.from(years).sort((a, b) => b - a);
    },

    getSelectedEvent(selectedEventId, eventsList) {
      if (selectedEventId) {
        const found = eventsList.find((e) => e.id === selectedEventId);
        if (found) return found;
      }
      return eventsList[0];
    },

    // Get events that involve a specific person
    getEventsByPerson(personId, eventsList) {
      return (eventsList || []).filter((event) =>
        getEventPersonIds(event).includes(personId)
      );
    },

    // Get events at a specific place
    getEventsByPlace(placeId, eventsList) {
      return (eventsList || []).filter((event) => event.placeId === placeId);
    },

    // Get shared places between user and a person
    getSharedPlaces(personId, eventsList) {
      const placeIds = new Set();
      (eventsList || []).forEach((event) => {
        if (getEventPersonIds(event).includes(personId) && event.placeId) {
          placeIds.add(event.placeId);
        }
      });
      return Array.from(placeIds).map((id) => placeMap.get(id)).filter(Boolean);
    },

    // Get person object from event.people (which is array of objects)
    getEventPeople(event) {
      if (!event || !event.people) return [];
      if (event.people.length > 0 && typeof event.people[0] === "object") {
        return event.people;
      }
      return event.people.map((id) => personMap.get(id)).filter(Boolean);
    },

    getEventPeopleIds(event) {
      return getEventPersonIds(event);
    },

    // Expose internal helper as public method
    getEventPersonIds(event) {
      return getEventPersonIds(event);
    },

    // Total media moments across events
    getTotalMedia(eventsList) {
      return (eventsList || []).reduce((sum, e) => sum + this.getMediaTotal(e), 0);
    },

    // Number of distinct days that have at least one event
    getDaysActive(eventsList) {
      const days = new Set();
      (eventsList || []).forEach((e) => {
        if (e.date) days.add(String(e.date).slice(0, 10));
      });
      return days.size;
    },

    // Number of days between the earliest and latest event (inclusive)
    getMemorySpan(eventsList) {
      if (!eventsList || eventsList.length === 0) return 0;
      const times = eventsList
        .map((e) => (e.date ? new Date(e.date).getTime() : null))
        .filter(Boolean);
      if (times.length === 0) return 0;
      const min = Math.min(...times);
      const max = Math.max(...times);
      return Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1);
    },

    // Distribution of events by life stage
    getStageDistribution(eventsList) {
      const counts = {};
      (eventsList || []).forEach((e) => {
        const stage = e.stage || "custom";
        counts[stage] = (counts[stage] || 0) + 1;
      });
      const total = (eventsList || []).length || 1;
      return stages
        .filter((s) => s.id !== "all")
        .map((s) => ({
          id: s.id,
          label: s.label,
          count: counts[s.id] || 0,
          percent: Math.round(((counts[s.id] || 0) / total) * 100),
        }));
    },

    // Events whose month-day matches today (anniversaries)
    getAnniversaries(eventsList, referenceDate = new Date()) {
      const ref = this._parseDateParts(referenceDate);
      if (!ref) return [];
      return (eventsList || [])
        .filter((e) => {
          const parts = this._parseDateParts(e.date);
          if (!parts) return false;
          return parts.month === ref.month && parts.day === ref.day && parts.year < ref.year;
        })
        .map((e) => {
          const parts = this._parseDateParts(e.date);
          return { ...e, yearsAgo: ref.year - parts.year };
        })
        .sort((a, b) => b.yearsAgo - a.yearsAgo);
    },

    // Events from this same month in past years
    getThisMonthMemories(eventsList, referenceDate = new Date()) {
      const ref = this._parseDateParts(referenceDate);
      if (!ref) return [];
      return (eventsList || [])
        .filter((e) => {
          const parts = this._parseDateParts(e.date);
          if (!parts) return false;
          return parts.month === ref.month && parts.year < ref.year;
        })
        .map((e) => {
          const parts = this._parseDateParts(e.date);
          return { ...e, yearsAgo: ref.year - parts.year };
        })
        .sort((a, b) => b.yearsAgo - a.yearsAgo);
    },

    // Parse a date value (string or Date) to {year, month, day}.
    // For ISO YYYY-MM-DD strings, parse the literal parts to avoid timezone drift.
    // For Date objects, use UTC accessors so a UTC-midnight Date stays on its date.
    _parseDateParts(value) {
      if (!value) return null;
      if (value instanceof Date) {
        return {
          year: value.getUTCFullYear(),
          month: value.getUTCMonth(),
          day: value.getUTCDate(),
        };
      }
      const s = String(value);
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) - 1, day: parseInt(m[3], 10) };
      }
      const d = new Date(s);
      if (isNaN(d.getTime())) return null;
      return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
    },

    // ============ 6 Lines (派生层) ============

    // 返回属于某条线的事件子集
    getEventsByLine(lineId, eventsList) {
      return (eventsList || []).filter((e) => isInLine(lineId, e, personMap));
    },

    // 统计某条线的画像：事件数 / 重点人物 / 重点地点 / 最早 / 最新
    getLineStats(lineId, eventsList) {
      const matched = this.getEventsByLine(lineId, eventsList);
      if (matched.length === 0) {
        return {
          count: 0,
          topPeople: [],
          topPlace: null,
          latestEvent: null,
          earliestEvent: null,
        };
      }

      // 人物出现次数统计
      const personCount = new Map();
      const placeCount = new Map();
      matched.forEach((e) => {
        getEventPersonIds(e).forEach((pid) => {
          if (!personMap.has(pid)) return;
          personCount.set(pid, (personCount.get(pid) || 0) + 1);
        });
        if (e.placeId && placeMap.has(e.placeId)) {
          placeCount.set(e.placeId, (placeCount.get(e.placeId) || 0) + 1);
        }
      });

      const topPeople = Array.from(personCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => personMap.get(id))
        .filter(Boolean);

      const topPlaceId = Array.from(placeCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topPlace = topPlaceId ? placeMap.get(topPlaceId) : null;

      const sortedByDate = this.sortEvents(matched);
      return {
        count: matched.length,
        topPeople,
        topPlace,
        latestEvent: sortedByDate[0] || null,
        earliestEvent: sortedByDate[sortedByDate.length - 1] || null,
      };
    },

    // 一次性返回 6 条线的画像（供 hub / 卡片网格用）
    getAllLines(eventsList) {
      return lines.map((l) => ({ ...l, ...this.getLineStats(l.id, eventsList) }));
    },
  };
}

export { stages, stageLabels, placeTypeLabels, personRoleLabels, lines, getLineMeta };