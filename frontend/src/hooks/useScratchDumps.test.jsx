import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useScratchDumps, useCreateDump, useRemoveDump, dumpKeys } from './useScratchDumps';
import { scratchDumpsApi } from '../api/faces';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useScratchDumps / dumpKeys', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dumpKeys.all 平行于 faceKeys.all', () => {
    expect(dumpKeys.all).toEqual(['scratch-dumps']);
    expect(dumpKeys.list()).toEqual(['scratch-dumps', 'list']);
    expect(dumpKeys.status('x')).toEqual(['scratch-dumps', 'status', 'x']);
  });

  it('useScratchDumps calls list()', async () => {
    const spy = vi.spyOn(scratchDumpsApi, 'list').mockResolvedValue([{ id: 'd1' }]);
    const { result } = renderHook(() => useScratchDumps(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalled();
    expect(result.current.data).toEqual([{ id: 'd1' }]);
  });

  it('useCreateDump invalidates list on success', async () => {
    vi.spyOn(scratchDumpsApi, 'create').mockResolvedValue({ id: 'd-new' });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useCreateDump(), { wrapper });
    await result.current.mutateAsync({ name: 'n' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dumpKeys.list() });
  });

  it('useRemoveDump invalidates list on success', async () => {
    vi.spyOn(scratchDumpsApi, 'remove').mockResolvedValue();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useRemoveDump(), { wrapper });
    await result.current.mutateAsync('dump-id');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dumpKeys.list() });
  });
});
