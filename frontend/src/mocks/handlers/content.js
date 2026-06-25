import { http, HttpResponse } from 'msw';

const mockEvents = [
  {
    id: 'event-1',
    title: '第一次创业会议',
    date: '2024-01-15',
    location: '北京中关村',
    placeId: 'place-1',
    stage: 'maker',
    summary: '和团队讨论了产品方向和商业模式',
    longText: '今天和几位联合创始人进行了第一次正式的产品讨论...',
    coverUrl: null,
    weight: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    place: { id: 'place-1', name: '北京中关村', latitude: 39.98, longitude: 116.31 },
    people: [
      { id: 'person-1', name: '张三', role: '联合创始人', avatarUrl: null },
    ],
    moments: [],
  },
  {
    id: 'event-2',
    title: '西藏自驾之旅',
    date: '2024-03-20',
    location: '西藏拉萨',
    placeId: 'place-2',
    stage: 'maker',
    summary: '从成都出发，一路向西，直达拉萨',
    coverUrl: null,
    weight: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    place: { id: 'place-2', name: '拉萨布达拉宫', latitude: 29.65, longitude: 91.12 },
    people: [],
    moments: [],
  },
  {
    id: 'event-3',
    title: '女儿出生',
    date: '2024-06-01',
    location: '北京协和医院',
    stage: 'family',
    summary: '小公主来到这个世界，7斤2两，母女平安',
    coverUrl: null,
    weight: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    place: { id: 'place-3', name: '北京协和医院', latitude: 39.91, longitude: 116.42 },
    people: [
      { id: 'person-2', name: '女儿小雨', role: '家人', avatarUrl: null },
    ],
    moments: [],
  },
];

const mockPeople = [
  { id: 'person-1', name: '张三', role: '联合创始人', intro: '技术大牛，负责产品研发', avatarUrl: null },
  { id: 'person-2', name: '女儿小雨', role: '家人', intro: '2024年6月出生', avatarUrl: null },
  { id: 'person-3', name: '李四', role: '大学同学', intro: '10年好友', avatarUrl: null },
];

const mockPlaces = [
  { id: 'place-1', name: '北京中关村', type: 'city', latitude: 39.98, longitude: 116.31, summary: '中国硅谷' },
  { id: 'place-2', name: '拉萨布达拉宫', type: 'travel', latitude: 29.65, longitude: 91.12, summary: '世界屋脊的明珠' },
  { id: 'place-3', name: '北京协和医院', type: 'daily', latitude: 39.91, longitude: 116.42, summary: '著名三甲医院' },
];

const mockMoments = [
  { id: 'moment-1', eventId: 'event-1', type: 'photo', title: '会议室白板', mediaUrl: null, takenAt: new Date().toISOString() },
  { id: 'moment-2', eventId: 'event-2', type: 'video', title: '青藏高原风景', mediaUrl: null, duration: 120, takenAt: new Date().toISOString() },
  { id: 'moment-3', eventId: 'event-3', type: 'photo', title: '小雨出生的第一张照片', mediaUrl: null, takenAt: new Date().toISOString() },
];

const mockMemoirs = [
  {
    id: 'memoir-1',
    title: '我的2024',
    blurb: '2024年是一个特殊的年份，创业启动、小雨出生...',
    status: 'draft',
    isPublic: false,
    shareToken: null,
    chapters: [
      { id: 'chapter-1', memoirId: 'memoir-1', title: '创业的起点', content: '2024年1月，我们决定...', sortOrder: 0 },
      { id: 'chapter-2', memoirId: 'memoir-1', title: '西藏之旅', content: '3月份的自驾游...', sortOrder: 1 },
    ],
  },
];

export const eventsHandlers = [
  http.get('/api/events', () => {
    return HttpResponse.json({ events: mockEvents, total: mockEvents.length });
  }),

  http.get('/api/events/timeline', () => {
    const timeline = mockEvents.reduce((acc, event) => {
      const year = new Date(event.date).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(event);
      return acc;
    }, {});
    return HttpResponse.json({ timeline: Object.entries(timeline).map(([year, events]) => ({ year: parseInt(year), events })), total: mockEvents.length });
  }),

  http.get('/api/events/:id', ({ params }) => {
    const event = mockEvents.find(e => e.id === params.id);
    if (event) return HttpResponse.json(event);
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.post('/api/events', async ({ request }) => {
    const body = await request.json();
    const newEvent = { ...body, id: 'event-' + Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return HttpResponse.json(newEvent);
  }),

  http.put('/api/events/:id', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: params.id, updatedAt: new Date().toISOString() });
  }),

  http.delete('/api/events/:id', () => {
    return HttpResponse.json({ success: true });
  }),
];

export const peopleHandlers = [
  http.get('/api/people', () => {
    return HttpResponse.json({ people: mockPeople, total: mockPeople.length });
  }),

  http.get('/api/people/:id', ({ params }) => {
    const person = mockPeople.find(p => p.id === params.id);
    if (person) return HttpResponse.json(person);
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.post('/api/people', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: 'person-' + Date.now(), createdAt: new Date().toISOString() });
  }),

  http.put('/api/people/:id', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: params.id });
  }),

  http.delete('/api/people/:id', () => {
    return HttpResponse.json({ success: true });
  }),
];

export const placesHandlers = [
  http.get('/api/places', () => {
    return HttpResponse.json({ places: mockPlaces, total: mockPlaces.length });
  }),

  http.get('/api/places/:id', ({ params }) => {
    const place = mockPlaces.find(p => p.id === params.id);
    if (place) return HttpResponse.json(place);
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.post('/api/places', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: 'place-' + Date.now(), createdAt: new Date().toISOString() });
  }),

  http.put('/api/places/:id', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: params.id });
  }),

  http.delete('/api/places/:id', () => {
    return HttpResponse.json({ success: true });
  }),
];

export const momentsHandlers = [
  http.get('/api/moments', ({ request }) => {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    let moments = mockMoments;
    if (eventId) {
      moments = moments.filter(m => m.eventId === eventId);
    }
    return HttpResponse.json({ moments, total: moments.length });
  }),

  http.get('/api/moments/:id', ({ params }) => {
    const moment = mockMoments.find(m => m.id === params.id);
    if (moment) return HttpResponse.json(moment);
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.post('/api/moments', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: 'moment-' + Date.now(), createdAt: new Date().toISOString() });
  }),

  http.put('/api/moments/:id', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: params.id });
  }),

  http.delete('/api/moments/:id', () => {
    return HttpResponse.json({ success: true });
  }),
];

export const memoirsHandlers = [
  http.get('/api/memoirs', () => {
    return HttpResponse.json({ memoirs: mockMemoirs, total: mockMemoirs.length });
  }),

  http.get('/api/memoirs/:id', ({ params }) => {
    const memoir = mockMemoirs.find(m => m.id === params.id);
    if (memoir) return HttpResponse.json(memoir);
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.post('/api/memoirs', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: 'memoir-' + Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }),

  http.put('/api/memoirs/:id', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: params.id, updatedAt: new Date().toISOString() });
  }),

  http.delete('/api/memoirs/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/memoirs/:id/share', ({ params }) => {
    return HttpResponse.json({ shareToken: 'share-' + params.id + '-' + Date.now() });
  }),

  http.post('/api/memoirs/:id/chapters', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: 'chapter-' + Date.now(), memoirId: params.id });
  }),

  http.put('/api/memoirs/:id/chapters/:chapterId', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...body, id: params.chapterId, memoirId: params.id });
  }),

  http.delete('/api/memoirs/:id/chapters/:chapterId', () => {
    return HttpResponse.json({ success: true });
  }),
];
