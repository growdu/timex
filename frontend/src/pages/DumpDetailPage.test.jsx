import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as facesApiMod from '../api/faces';
import * as useDumpStatusMod from '../hooks/useDumpStatus';
import * as useScratchDumpsMod from '../hooks/useScratchDumps';
import * as useDumpSearchMod from '../hooks/useDumpSearch';
import { DumpDetailPage } from './DumpDetailPage';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/faces/dumps/d-123']}>
        <Routes>
          <Route path="/faces/dumps/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DumpDetailPage', () => {
  let mutateAsyncMock;

  beforeEach(() => {
    vi.spyOn(facesApiMod.scratchDumpsApi, 'get').mockResolvedValue({
      id: 'd-123', name: '出差那天', description: '机场 + 会议室', total: 5, done: 5, failed: 0, status: 'done',
    });
    vi.spyOn(useScratchDumpsMod, 'useScratchDumps').mockReturnValue({ data: [], isLoading: false });
    vi.spyOn(useDumpStatusMod, 'useDumpStatus').mockReturnValue({
      data: { total: 5, done: 5, failed: 0, status: 'done' },
      isLoading: false,
    });
    mutateAsyncMock = vi.fn().mockResolvedValue([
      { item: { id: 'i1', sourceUrl: 'https://x/a.jpg' }, distance: 0.1, sortKey: 'takenAt', sortValue: '2024-06-01T00:00:00Z' },
    ]);
    vi.spyOn(useDumpSearchMod, 'useDumpSearch').mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
      isSuccess: false,
      error: null,
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders dump title from get(id)', async () => {
    render(<DumpDetailPage />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByTestId('dump-detail-title').textContent).toBe('出差那天'));
  });

  it('clicking 「过滤」 fires mutateAsync({ dumpId, opts: { topK: 200 } }) then renders DumpTimelineView', async () => {
    render(<DumpDetailPage />, { wrapper: makeWrapper() });
    const btn = await screen.findByTestId('dump-filter-button');
    fireEvent.click(btn);
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledWith({ dumpId: 'd-123', opts: { topK: 200 } }));
    expect(await screen.findByTestId('dump-timeline')).toBeTruthy();
  });

  it('renders back link → /faces/dumps', async () => {
    render(<DumpDetailPage />, { wrapper: makeWrapper() });
    const link = screen.getByText(/返回/);
    expect(link.getAttribute('href')).toBe('/faces/dumps');
  });
});
