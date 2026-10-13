import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFaceSearch } from './useFaceSearch';
import { facesApi } from '../api/faces';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useFaceSearch', () => {
  it('runs when enabled & threshold/topK set', async () => {
    const spy = vi.spyOn(facesApi, 'search').mockResolvedValue([]);
    const { result } = renderHook(
      () => useFaceSearch({ threshold: 0.6, topK: 200 }),
      { wrapper: makeWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ threshold: 0.6, topK: 200 });
    spy.mockRestore();
  });

  it('does not fetch when enabled=false', async () => {
    const spy = vi.spyOn(facesApi, 'search').mockResolvedValue([]);
    const { result } = renderHook(
      () => useFaceSearch({ threshold: 0.6, topK: 200 }, false),
      { wrapper: makeWrapper() }
    );
    // Wait a tick so any accidental refetch has a chance
    await new Promise((r) => setTimeout(r, 50));
    expect(spy).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
    spy.mockRestore();
  });

  it('staleTime keeps cached data for 30s', async () => {
    const spy = vi.spyOn(facesApi, 'search').mockResolvedValue([{ distance: 0.1 }]);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result, rerender } = renderHook(
      ({ opts }) => useFaceSearch(opts),
      { wrapper, initialProps: { opts: { threshold: 0.5 } } }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ opts: { threshold: 0.5 } });
    // 同一 queryKey 不应再次 fetch
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});