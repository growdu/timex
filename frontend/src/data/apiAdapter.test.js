import { describe, it, expect } from 'vitest';
import { createApiAdapter } from './apiAdapter';

// Fixture: 3 events, 2 people, 2 places
const personAlice = { id: 'p-alice', name: 'Alice', role: 'friend' };
const personBob = { id: 'p-bob', name: 'Bob', role: 'colleague' };
const placeHome = { id: 'pl-home', name: 'Home', type: 'family' };
const placeOffice = { id: 'pl-office', name: 'Office', type: 'daily' };

const eventA = {
  id: 'e-2023-01-15',
  date: '2023-01-15',
  title: 'Lunch with Alice',
  location: 'Home',
  summary: 'Long chat',
  stage: 'first-job',
  placeId: 'pl-home',
  people: [personAlice], // object form
  moments: [{ id: 'm1' }, { id: 'm2' }],
  weight: 10,
};

const eventB = {
  id: 'e-2024-03-20',
  date: '2024-03-20',
  title: 'Office party',
  stage: 'first-job',
  placeId: 'pl-office',
  people: ['p-bob'], // id form
  weight: 20,
};

const eventC = {
  id: 'e-2024-06-10',
  date: '2024-06-10',
  title: 'Travel',
  stage: 'custom',
  placeId: 'pl-office',
  people: [personAlice, 'p-bob'],
};

const fixtures = {
  events: [eventA, eventB, eventC],
  people: [personAlice, personBob],
  places: [placeHome, placeOffice],
  memoirs: [],
};

const build = (overrides = {}) => createApiAdapter({ ...fixtures, ...overrides });

describe('createApiAdapter — construction', () => {
  it('returns an object with expected top-level methods', () => {
    const api = build();
    expect(typeof api.getPerson).toBe('function');
    expect(typeof api.getPlace).toBe('function');
    expect(typeof api.getEvent).toBe('function');
    expect(typeof api.getChapter).toBe('function');
    expect(Array.isArray(api.stages)).toBe(true);
  });

  it('handles empty / missing input arrays', () => {
    const api = createApiAdapter();
    expect(api.getPerson('any')).toBeUndefined();
    expect(api.getPlace('any')).toBeUndefined();
    expect(api.getEvent('any')).toBeUndefined();
  });

  it('exposes exported stages/lines via re-export', async () => {
    const mod = await import('./apiAdapter');
    expect(Array.isArray(mod.stages)).toBe(true);
    expect(Array.isArray(mod.lines)).toBe(true);
    expect(mod.lines).toHaveLength(6);
  });
});

describe('label helpers', () => {
  const api = build();

  it('getStageLabel returns Chinese label for known stage', () => {
    expect(api.getStageLabel('student')).toBe('学生时代');
    expect(api.getStageLabel('custom')).toBe('自定义');
  });

  it('getStageLabel falls back to raw value when not mapped', () => {
    expect(api.getStageLabel('work')).toBe('工作');
    expect(api.getStageLabel('unknown')).toBe('unknown');
  });

  it('getStageLabel returns empty string for falsy input', () => {
    expect(api.getStageLabel('')).toBe('');
    expect(api.getStageLabel(null)).toBe('');
    expect(api.getStageLabel(undefined)).toBe('');
  });

  it('getPlaceTypeLabel maps known types and falls back', () => {
    expect(api.getPlaceTypeLabel('city')).toBe('城市');
    expect(api.getPlaceTypeLabel('mystery')).toBe('mystery');
    expect(api.getPlaceTypeLabel('')).toBe('');
  });

  it('getRoleLabel maps known roles and falls back', () => {
    expect(api.getRoleLabel('family')).toBe('家人');
    expect(api.getRoleLabel('stranger')).toBe('stranger');
    expect(api.getRoleLabel('')).toBe('');
  });
});

describe('entity lookups', () => {
  const api = build();

  it('getPerson finds by id', () => {
    expect(api.getPerson('p-alice')).toEqual(personAlice);
    expect(api.getPerson('nope')).toBeUndefined();
  });

  it('getPlace finds by id', () => {
    expect(api.getPlace('pl-home')).toEqual(placeHome);
  });

  it('getEvent finds by id', () => {
    expect(api.getEvent('e-2023-01-15')).toEqual(eventA);
  });

  it('getChapter finds by id from memoirs', () => {
    const chapter = { id: 'c1', title: 'Chapter 1' };
    const api2 = build({ memoirs: [chapter] });
    expect(api2.getChapter('c1')).toEqual(chapter);
  });
});

describe('getEventPersonIds', () => {
  const api = build();

  it('extracts ids from people objects', () => {
    expect(api.getEventPersonIds(eventA)).toEqual(['p-alice']);
  });

  it('returns id array as-is when people are ids', () => {
    expect(api.getEventPersonIds(eventB)).toEqual(['p-bob']);
  });

  it('returns empty array when people is missing', () => {
    expect(api.getEventPersonIds({})).toEqual([]);
    expect(api.getEventPersonIds(null)).toEqual([]);
  });

  it('returns empty array when people is not an array', () => {
    expect(api.getEventPersonIds({ people: 'nope' })).toEqual([]);
  });
});

describe('getEventYear', () => {
  const api = build();

  it('extracts year from ISO date string', () => {
    expect(api.getEventYear({ date: '2023-01-15' })).toBe(2023);
  });

  it('extracts year from Date object', () => {
    const d = new Date('2024-06-10T00:00:00Z');
    expect(api.getEventYear({ date: d })).toBe(2024);
  });

  it('returns null for missing date', () => {
    expect(api.getEventYear({})).toBeNull();
    expect(api.getEventYear(null)).toBeNull();
  });

  it('returns null for unparseable date', () => {
    expect(api.getEventYear({ date: 'not a date' })).toBeNull();
  });
});

describe('getMediaTotal', () => {
  const api = build();

  it('returns moments length when moments is an array', () => {
    expect(api.getMediaTotal(eventA)).toBe(2);
  });

  it('estimates from weight when no moments', () => {
    // eventB.weight=20 → 20/5=4
    expect(api.getMediaTotal(eventB)).toBe(4);
  });

  it('floors at minimum 1', () => {
    expect(api.getMediaTotal({ weight: 1 })).toBe(1);
  });

  it('returns 0 for missing event', () => {
    expect(api.getMediaTotal(null)).toBe(0);
    expect(api.getMediaTotal(undefined)).toBe(0);
  });
});

describe('formatPeople / formatPeopleFull', () => {
  const api = build();

  it('formatPeople extracts names from id array', () => {
    expect(api.formatPeople(['p-alice'])).toEqual(['Alice']);
  });

  it('formatPeople extracts names from people object array', () => {
    expect(api.formatPeople([personAlice, personBob])).toEqual(['Alice', 'Bob']);
  });

  it('formatPeople skips missing persons', () => {
    expect(api.formatPeople(['p-alice', 'p-missing'])).toEqual(['Alice']);
  });

  it('formatPeople returns [] for falsy', () => {
    expect(api.formatPeople(null)).toEqual([]);
    expect(api.formatPeople(undefined)).toEqual([]);
  });

  it('formatPeopleFull returns person objects', () => {
    expect(api.formatPeopleFull(['p-alice'])).toEqual([personAlice]);
  });
});

describe('sortEvents', () => {
  const api = build();

  it('sorts events by date descending (newest first)', () => {
    const sorted = api.sortEvents([eventA, eventB, eventC]);
    expect(sorted[0].id).toBe('e-2024-06-10');
    expect(sorted[1].id).toBe('e-2024-03-20');
    expect(sorted[2].id).toBe('e-2023-01-15');
  });

  it('does not mutate the input array', () => {
    const input = [eventA, eventB];
    api.sortEvents(input);
    expect(input[0].id).toBe('e-2023-01-15');
  });
});

describe('filterEvents', () => {
  const api = build();

  it('filters by year', () => {
    const result = api.filterEvents([eventA, eventB, eventC], { year: '2024' });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(['e-2024-06-10', 'e-2024-03-20']);
  });

  it('filters by stage', () => {
    const result = api.filterEvents([eventA, eventB, eventC], { stage: 'custom' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e-2024-06-10');
  });

  it('filters by keyword (title)', () => {
    const result = api.filterEvents([eventA, eventB, eventC], { search: 'lunch' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e-2023-01-15');
  });

  it('keyword matches people names', () => {
    const result = api.filterEvents([eventA, eventB, eventC], { search: 'Alice' });
    expect(result).toHaveLength(2);
  });

  it('keyword is case-insensitive', () => {
    const result = api.filterEvents([eventA, eventB, eventC], { search: 'OFFICE' });
    expect(result.map((e) => e.id)).toContain('e-2024-03-20');
  });

  it('treats "all" as no filter for year/stage', () => {
    const result = api.filterEvents([eventA, eventB], { year: 'all', stage: 'all' });
    expect(result).toHaveLength(2);
  });

  it('returns sorted result', () => {
    const result = api.filterEvents([eventA, eventB, eventC], {});
    expect(result[0].id).toBe('e-2024-06-10');
  });

  it('handles missing events list', () => {
    expect(api.filterEvents(null, {})).toEqual([]);
  });
});

describe('getYears', () => {
  const api = build();

  it('returns distinct years sorted descending', () => {
    expect(api.getYears([eventA, eventB, eventC])).toEqual([2024, 2023]);
  });

  it('returns empty for null', () => {
    expect(api.getYears(null)).toEqual([]);
  });

  it('skips events with no date', () => {
    expect(api.getYears([{ id: 'x' }])).toEqual([]);
  });
});

describe('getSelectedEvent', () => {
  const api = build();
  const list = [eventA, eventB];

  it('returns the selected event when found', () => {
    expect(api.getSelectedEvent('e-2024-03-20', list).id).toBe('e-2024-03-20');
  });

  it('falls back to the first event when id is not found', () => {
    expect(api.getSelectedEvent('nope', list).id).toBe('e-2023-01-15');
  });

  it('falls back to first when id is null', () => {
    expect(api.getSelectedEvent(null, list).id).toBe('e-2023-01-15');
  });
});

describe('getEventsByPerson / getEventsByPlace', () => {
  const api = build();

  it('getEventsByPerson filters by person id (handles object form)', () => {
    const result = api.getEventsByPerson('p-alice', [eventA, eventB, eventC]);
    // not sorted — only filtered
    expect(result.map((e) => e.id).sort()).toEqual(['e-2023-01-15', 'e-2024-06-10']);
  });

  it('getEventsByPlace filters by placeId', () => {
    const result = api.getEventsByPlace('pl-office', [eventA, eventB, eventC]);
    expect(result.map((e) => e.id).sort()).toEqual(['e-2024-03-20', 'e-2024-06-10']);
  });

  it('handles null eventsList', () => {
    expect(api.getEventsByPerson('p-alice', null)).toEqual([]);
    expect(api.getEventsByPlace('pl-home', null)).toEqual([]);
  });
});

describe('getSharedPlaces', () => {
  const api = build();

  it('returns places shared with a person', () => {
    const result = api.getSharedPlaces('p-alice', [eventA, eventB, eventC]);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id).sort()).toEqual(['pl-home', 'pl-office']);
  });

  it('excludes events with no placeId', () => {
    const result = api.getSharedPlaces('p-alice', [
      { id: 'e-x', people: ['p-alice'], placeId: null },
    ]);
    expect(result).toEqual([]);
  });

  it('returns empty for person with no shared events', () => {
    const result = api.getSharedPlaces('p-ghost', [eventA, eventB, eventC]);
    expect(result).toEqual([]);
  });
});

describe('getEventPeople / getEventPeopleIds', () => {
  const api = build();

  it('getEventPeople returns object array as-is', () => {
    expect(api.getEventPeople(eventA)).toEqual([personAlice]);
  });

  it('getEventPeople resolves id array via personMap', () => {
    expect(api.getEventPeople(eventB)).toEqual([personBob]);
  });

  it('getEventPeople returns [] for missing event', () => {
    expect(api.getEventPeople(null)).toEqual([]);
    expect(api.getEventPeople({})).toEqual([]);
  });

  it('getEventPeopleIds delegates to getEventPersonIds', () => {
    expect(api.getEventPeopleIds(eventA)).toEqual(['p-alice']);
    expect(api.getEventPeopleIds(eventB)).toEqual(['p-bob']);
  });
});

describe('aggregate stats', () => {
  const api = build();

  it('getTotalMedia sums all media', () => {
    // eventA=2, eventB=4 (weight/5), eventC=0 (weight=1 → 1)
    // eventC has weight=1 (default) → 1
    // total = 2 + 4 + 1 = 7
    expect(api.getTotalMedia([eventA, eventB, eventC])).toBe(7);
  });

  it('getTotalMedia handles null', () => {
    expect(api.getTotalMedia(null)).toBe(0);
  });

  it('getDaysActive counts distinct YYYY-MM-DD prefixes', () => {
    const result = api.getDaysActive([eventA, eventB, eventC]);
    expect(result).toBe(3);
  });

  it('getDaysActive returns 0 for null', () => {
    expect(api.getDaysActive(null)).toBe(0);
  });

  it('getMemorySpan returns day count between first and last event', () => {
    const span = api.getMemorySpan([eventA, eventB, eventC]);
    // 2023-01-15 → 2024-06-10
    // ~1.5 years ≈ 512 days
    expect(span).toBeGreaterThan(400);
    expect(span).toBeLessThan(600);
  });

  it('getMemorySpan returns 0 for empty list', () => {
    expect(api.getMemorySpan([])).toBe(0);
    expect(api.getMemorySpan(null)).toBe(0);
  });
});

describe('getStageDistribution', () => {
  const api = build();

  it('returns counts and percent for each stage', () => {
    const dist = api.getStageDistribution([eventA, eventB, eventC]);
    const firstJob = dist.find((s) => s.id === 'first-job');
    expect(firstJob.count).toBe(2);
    expect(firstJob.percent).toBe(67);
  });

  it('includes stages with 0 count', () => {
    const dist = api.getStageDistribution([eventA]);
    const student = dist.find((s) => s.id === 'student');
    expect(student.count).toBe(0);
    expect(student.percent).toBe(0);
  });

  it('excludes "all" stage', () => {
    const dist = api.getStageDistribution([eventA]);
    expect(dist.find((s) => s.id === 'all')).toBeUndefined();
  });
});

describe('getAnniversaries / getThisMonthMemories', () => {
  const api = build();
  const today = new Date('2025-01-15');

  it('getAnniversaries matches month-day in past years', () => {
    const result = api.getAnniversaries([eventA], today);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e-2023-01-15');
    expect(result[0].yearsAgo).toBe(2);
  });

  it('getAnniversaries excludes current year', () => {
    const eventThisYear = { id: 'e-2025-01-15', date: '2025-01-15' };
    const result = api.getAnniversaries([eventThisYear], today);
    expect(result).toEqual([]);
  });

  it('getAnniversaries sorts by yearsAgo descending', () => {
    const old = { id: 'e-old', date: '2020-01-15' };
    const recent = { id: 'e-recent', date: '2023-01-15' };
    const result = api.getAnniversaries([recent, old], today);
    expect(result[0].id).toBe('e-old');
    expect(result[1].id).toBe('e-recent');
  });

  it('getThisMonthMemories returns all in-month past events', () => {
    const inMonth = { id: 'e1', date: '2023-01-05' };
    const outOfMonth = { id: 'e2', date: '2023-02-01' };
    const result = api.getThisMonthMemories([inMonth, outOfMonth], today);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
  });

  it('getThisMonthMemories excludes current year', () => {
    const current = { id: 'e1', date: '2025-01-05' };
    const result = api.getThisMonthMemories([current], today);
    expect(result).toEqual([]);
  });
});

describe('_parseDateParts', () => {
  const api = build();

  it('parses ISO YYYY-MM-DD string', () => {
    expect(api._parseDateParts('2023-06-15')).toEqual({ year: 2023, month: 5, day: 15 });
  });

  it('parses Date object', () => {
    const d = new Date(Date.UTC(2023, 5, 15));
    expect(api._parseDateParts(d)).toEqual({ year: 2023, month: 5, day: 15 });
  });

  it('parses ISO with time', () => {
    expect(api._parseDateParts('2023-06-15T12:00:00Z').year).toBe(2023);
  });

  it('returns null for empty / null', () => {
    expect(api._parseDateParts(null)).toBeNull();
    expect(api._parseDateParts('')).toBeNull();
  });

  it('returns null for unparseable string', () => {
    expect(api._parseDateParts('not a date')).toBeNull();
  });
});

describe('6 Lines — getEventsByLine / getLineStats / getAllLines', () => {
  const api = build();

  it('getEventsByLine(time) returns all events', () => {
    const result = api.getEventsByLine('time', [eventA, eventB, eventC]);
    expect(result).toHaveLength(3);
  });

  it('getEventsByLine(space) returns events with placeId', () => {
    const result = api.getEventsByLine('space', [eventA, eventB, eventC]);
    expect(result).toHaveLength(3);
  });

  it('getEventsByLine(family) returns 0 (no family role)', () => {
    const result = api.getEventsByLine('family', [eventA, eventB, eventC]);
    expect(result).toEqual([]);
  });

  it('getEventsByLine(friends) matches Alice (role=friend)', () => {
    const result = api.getEventsByLine('friends', [eventA, eventB, eventC]);
    expect(result).toHaveLength(2);
  });

  it('getLineStats returns 0-count shape when no matches', () => {
    const stats = api.getLineStats('family', [eventA, eventB, eventC]);
    expect(stats).toEqual({
      count: 0,
      topPeople: [],
      topPlace: null,
      latestEvent: null,
      earliestEvent: null,
    });
  });

  it('getLineStats returns count, topPeople, topPlace, latest/earliest', () => {
    const stats = api.getLineStats('time', [eventA, eventB, eventC]);
    expect(stats.count).toBe(3);
    expect(stats.topPeople).toHaveLength(2); // alice + bob
    expect(stats.topPlace).not.toBeNull();
    expect(stats.latestEvent).not.toBeNull();
    expect(stats.earliestEvent).not.toBeNull();
  });

  it('getLineStats topPeople limited to 3 and sorted by count desc', () => {
    const events = [
      { ...eventA, people: ['p-alice'] },
      { ...eventA, id: 'e2', people: ['p-alice'] },
      { ...eventA, id: 'e3', people: ['p-alice'] },
      { ...eventA, id: 'e4', people: ['p-bob'] },
    ];
    const stats = api.getLineStats('time', events);
    expect(stats.topPeople[0].id).toBe('p-alice');
    expect(stats.topPeople.length).toBe(2); // only 2 unique people
  });

  it('getAllLines returns 6 line objects with stats merged', () => {
    const all = api.getAllLines([eventA, eventB, eventC]);
    expect(all).toHaveLength(6);
    for (const line of all) {
      expect(line).toHaveProperty('id');
      expect(line).toHaveProperty('label');
      expect(line).toHaveProperty('count');
      expect(line).toHaveProperty('topPeople');
    }
  });

  it('handles null events list in line methods', () => {
    expect(api.getEventsByLine('time', null)).toEqual([]);
    const stats = api.getLineStats('time', null);
    expect(stats.count).toBe(0);
  });
});
