import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDumpStatus } from './useDumpStatus';
import { scratchDumpsApi } from '../api/faces';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useDumpStatus', () => {
  it('does not fetch when dumpId missing', async () => {
    const spy = vi.spyOn(scratchDumpsApi, 'status');
    const { result } = renderHook(() => useDumpStatus(null), { wrapper: makeWrapper() });
    await new Promise((r) => setTimeout(r, 50));
    expect(spy).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
  });

  it('fetches when dumpId is provided', async () => {
    vi.spyOn(scratchDumpsApi, 'status').mockResolvedValue({
      total: 5, done: 2, failed: 0, status: 'processing',
    });
    const { result } = renderHook(() => useDumpStatus('dump-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ total: 5, done: 2, failed: 0, status: 'processing' });
  });
});
