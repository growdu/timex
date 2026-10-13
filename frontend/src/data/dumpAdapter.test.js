import { describe, it, expect } from 'vitest';
import { groupDumpHitsByTimeline } from './dumpAdapter';

describe('groupDumpHitsByTimeline', () => {
  it('groups hits by year from sortValue', () => {
    const hits = [
      { item: { id: 'a' }, sortValue: '2024-06-01T00:00:00Z', sortKey: 'takenAt', distance: 0.1 },
      { item: { id: 'b' }, sortValue: '2024-01-01T00:00:00Z', sortKey: 'takenAt', distance: 0.2 },
      { item: { id: 'c' }, sortValue: '2023-12-01T00:00:00Z', sortKey: 'takenAt', distance: 0.3 },
    ];
    const groups = groupDumpHitsByTimeline(hits);
    expect(groups.map((g) => g.year)).toEqual([2024, 2023]);
    expect(groups[0].items.map((h) => h.item.id)).toEqual(['a', 'b']); // year 内降序
  });

  it('returns [] for empty / null / invalid input', () => {
    expect(groupDumpHitsByTimeline([])).toEqual([]);
    expect(groupDumpHitsByTimeline(null)).toEqual([]);
    expect(groupDumpHitsByTimeline([{ sortValue: 'not-a-date' }])).toEqual([]); // NaN year 跳过
  });

  it('skips hits missing sortValue', () => {
    const hits = [
      { item: { id: 'a' }, sortValue: '2024-06-01T00:00:00Z' },
      { item: { id: 'b' } /* missing sortValue */ },
    ];
    const groups = groupDumpHitsByTimeline(hits);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[0].items[0].item.id).toBe('a');
  });
});
