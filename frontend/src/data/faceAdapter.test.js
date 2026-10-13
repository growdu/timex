import { describe, it, expect } from 'vitest';
import { groupByTimeline, groupByPerson, groupByPlace } from './faceAdapter';

describe('groupByTimeline', () => {
  it('groups by year and sorts items within a year desc', () => {
    const out = groupByTimeline([
      { moment: { id: 'a', takenAt: '2024-08-12T00:00:00Z' }, distance: 0.1 },
      { moment: { id: 'b', takenAt: '2024-01-15T00:00:00Z' }, distance: 0.2 },
      { moment: { id: 'c', takenAt: '2023-12-01T00:00:00Z' }, distance: 0.3 },
    ]);
    expect(out.map((g) => g.year)).toEqual([2024, 2023]);
    expect(out[0].items.map((i) => i.moment.id)).toEqual(['a', 'b']);
  });

  it('sorts year buckets desc (most recent first)', () => {
    const out = groupByTimeline([
      { moment: { id: 'x', takenAt: '2020-01-01T00:00:00Z' }, distance: 0.1 },
      { moment: { id: 'y', takenAt: '2025-06-01T00:00:00Z' }, distance: 0.2 },
      { moment: { id: 'z', takenAt: '2022-01-01T00:00:00Z' }, distance: 0.3 },
    ]);
    expect(out.map((g) => g.year)).toEqual([2025, 2022, 2020]);
  });

  it('falls back to createdAt when takenAt missing', () => {
    const out = groupByTimeline([
      { moment: { id: 'a', createdAt: '2024-04-01T00:00:00Z' }, distance: 0.1 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].year).toBe(2024);
  });
});

describe('groupByPerson', () => {
  it('groups by personIds and resolves person meta', () => {
    const out = groupByPerson(
      [
        { moment: { id: 'a', personIds: ['p1'] }, distance: 0.1 },
        { moment: { id: 'b', personIds: ['p1', 'p2'] }, distance: 0.2 },
      ],
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ]
    );
    expect(out).toHaveLength(2);
    const alice = out.find((b) => b.person?.id === 'p1');
    const bob = out.find((b) => b.person?.id === 'p2');
    expect(alice.person.name).toBe('Alice');
    expect(alice.items).toHaveLength(2); // fan-out
    expect(bob.items).toHaveLength(1);
  });

  it('skips hits without personIds', () => {
    const out = groupByPerson(
      [{ moment: { id: 'a', personIds: [] }, distance: 0.1 }],
      [{ id: 'p1', name: 'Alice' }]
    );
    expect(out).toHaveLength(0);
  });
});

describe('groupByPlace', () => {
  it('drops moments without placeId', () => {
    const out = groupByPlace(
      [{ moment: { id: 'a', placeId: null }, distance: 0.1 }],
      []
    );
    expect(out).toHaveLength(0);
  });

  it('groups and filters unknown places', () => {
    const out = groupByPlace(
      [
        { moment: { id: 'a', placeId: 'pl1' }, distance: 0.1 },
        { moment: { id: 'b', placeId: 'pl_ghost' }, distance: 0.2 },
        { moment: { id: 'c', placeId: 'pl1' }, distance: 0.3 },
      ],
      [{ id: 'pl1', name: '杭州' }]
    );
    expect(out).toHaveLength(1);
    expect(out[0].place.name).toBe('杭州');
    expect(out[0].items).toHaveLength(2);
  });
});