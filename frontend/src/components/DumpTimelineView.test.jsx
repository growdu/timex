import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DumpTimelineView } from './DumpTimelineView';

describe('DumpTimelineView', () => {
  const hits = [
    { item: { id: 'a', sourceUrl: 'https://x/a.jpg', filename: 'a.jpg', thumbnailUrl: 'https://t/a.jpg' }, sortValue: '2024-06-01T10:00:00Z', sortKey: 'takenAt', distance: 0.12 },
    { item: { id: 'b', sourceUrl: 'https://x/b.jpg', thumbnailUrl: null }, sortValue: '2024-01-15T10:00:00Z', sortKey: 'fileMtime', distance: 0.34 },
    { item: { id: 'c', sourceUrl: 'https://x/c.jpg' }, sortValue: '2023-12-01T10:00:00Z', sortKey: 'uploadedAt', distance: 0.5 },
  ];

  it('renders year headings and per-hit items', () => {
    render(<DumpTimelineView hits={hits} />);
    expect(screen.getByTestId('dump-timeline')).toBeTruthy();
    expect(screen.getAllByTestId('dump-timeline-item')).toHaveLength(3);
    expect(screen.getByText(/^2024/)).toBeTruthy();
    expect(screen.getByText(/^2023/)).toBeTruthy();
  });

  it('shows empty-state copy when hits is []', () => {
    render(<DumpTimelineView hits={[]} />);
    expect(screen.getByText(/暂无命中/)).toBeTruthy();
  });

  it('falls back to last path segment when filename is missing', () => {
    const noName = [{ item: { id: 'x', sourceUrl: 'https://cdn.example/folder/cool.jpg' }, sortValue: '2024-01-01T00:00:00Z', sortKey: 'takenAt', distance: 0.1 }];
    render(<DumpTimelineView hits={noName} />);
    expect(screen.getByText('cool.jpg')).toBeTruthy();
  });
});
