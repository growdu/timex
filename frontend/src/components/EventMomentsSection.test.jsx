import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as momentsApiMod from '../api/moments';
import * as useExtractFacesMod from '../hooks/useExtractFaces';
import { EventMomentsSection } from './EventMomentsSection';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('EventMomentsSection', () => {
  let mutateMock;

  beforeEach(() => {
    mutateMock = vi.fn();
    vi.spyOn(useExtractFacesMod, 'useExtractFaces').mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders one ExtractFaceButton per photo moment with moment.id (NOT event.id)', async () => {
    // event.id 是 events 表 PK；moment.id 是 moments 表 PK — 后端按后者查表。
    // 这里故意让两者明显不同：event-uuid-X vs m-photo-1 / m-photo-2。
    const getByEvent = vi
      .spyOn(momentsApiMod.momentsApi, 'getByEvent')
      .mockResolvedValue({
        moments: [
          { id: 'm-photo-1', eventId: 'event-uuid-X', type: 'photo', title: '会议室白板', mediaUrl: null },
          { id: 'm-photo-2', eventId: 'event-uuid-X', type: 'photo', title: '第二张照片', mediaUrl: 'http://x/2.jpg' },
        ],
        total: 2,
      });

    render(<EventMomentsSection eventId="event-uuid-X" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('photo-moment-list')).toBeTruthy();
    });

    const items = screen.getAllByTestId('photo-moment-item');
    expect(items).toHaveLength(2);

    // 每个 li 上都有 data-moment-id 用于断言 moment.id 传递正确
    const ids = items.map((el) => el.getAttribute('data-moment-id'));
    expect(ids).toEqual(['m-photo-1', 'm-photo-2']);

    // 关键断言：每个按钮渲染到位
    const buttons = screen.getAllByRole('button', { name: /extract faces/i });
    expect(buttons).toHaveLength(2);

    // 点击两个按钮，mutate 应该收到的是 moment.id，不是 event.id
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(mutateMock).toHaveBeenNthCalledWith(1, 'm-photo-1');
    expect(mutateMock).toHaveBeenNthCalledWith(2, 'm-photo-2');

    // 绝不能是 event.id（生产环境下会触发 404 "moment not found"）
    expect(mutateMock).not.toHaveBeenCalledWith('event-uuid-X');

    // 端到端：确认 query 实际使用了 eventId 参数
    expect(getByEvent).toHaveBeenCalledWith('event-uuid-X', { type: 'photo' });
  });

  it('shows empty state when the query returns no photo moments', async () => {
    vi.spyOn(momentsApiMod.momentsApi, 'getByEvent').mockResolvedValue({
      moments: [],
      total: 0,
    });

    render(<EventMomentsSection eventId="event-with-no-photos" />, { wrapper: makeWrapper() });

    const empty = await screen.findByTestId('event-photo-moments-empty');
    expect(empty).toBeTruthy();
    expect(empty).toHaveTextContent('本事件暂无图片素材');

    // 空状态下不应渲染任何 ExtractFaceButton
    expect(screen.queryAllByRole('button', { name: /extract faces/i })).toHaveLength(0);
  });
});
