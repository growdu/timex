/**
 * useAiJob + AiActionButton 单元测试
 * 用 mock aiApi 替换真实 HTTP。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAiJob } from '../hooks/useAiJob';
import { AiActionButton } from '../components/AiActionButton';

// mock aiApi
vi.mock('../api/ai', () => ({
  aiApi: {
    tagImage: vi.fn(),
    summarizeImage: vi.fn(),
    transcribe: vi.fn(),
    summarizeMemoir: vi.fn(),
    summarizeChapter: vi.fn(),
    summarizeEvent: vi.fn(),
    getJob: vi.fn(),
    listJobs: vi.fn(),
  },
}));

import { aiApi } from '../api/ai';

describe('useAiJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits an event-summary job and reaches succeeded state', async () => {
    const onSettled = vi.fn();
    aiApi.summarizeEvent.mockResolvedValueOnce({
      id: 'job-1',
      kind: 'event-summary',
      status: 'running',
    });
    aiApi.getJob.mockResolvedValueOnce({
      id: 'job-1',
      status: 'succeeded',
      output: '那年夏天我们在海边',
      structured: null,
      provider: 'mock',
      model: 'mock-1',
      latencyMs: 120,
    });

    const { result } = renderHook(() => useAiJob({ pollIntervalMs: 10, onSettled }));

    await act(async () => {
      await result.current.submit('event-summary', { eventId: 'ev-1', text: '...' });
    });

    await waitFor(() => {
      expect(result.current.isDone).toBe(true);
    });
    expect(result.current.job.output).toBe('那年夏天我们在海边');
    expect(onSettled).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'succeeded' }),
    );
  });

  it('returns immediately when job is already terminal', async () => {
    aiApi.tagImage.mockResolvedValueOnce({
      id: 'job-2',
      kind: 'image-tag',
      status: 'succeeded',
      output: 'a, b, c',
    });

    const { result } = renderHook(() => useAiJob());

    await act(async () => {
      await result.current.submit('image-tag', { momentId: 'm-1', mediaUrl: 'http://x' });
    });

    expect(result.current.isDone).toBe(true);
    expect(result.current.job.output).toBe('a, b, c');
    // getJob 不应该被调（已终态）
    expect(aiApi.getJob).not.toHaveBeenCalled();
  });

  it('captures error when job fails', async () => {
    aiApi.transcribe.mockResolvedValueOnce({ id: 'job-3', status: 'running' });
    aiApi.getJob.mockResolvedValueOnce({
      id: 'job-3',
      status: 'failed',
      error: 'audio too long',
    });

    const { result } = renderHook(() => useAiJob({ pollIntervalMs: 10 }));

    await act(async () => {
      // swallow the rejection
      try { await result.current.submit('transcribe', { momentId: 'm-2', audioUrl: 'http://x' }); }
      catch { /* swallow expected rejection */ }
    });

    await waitFor(() => {
      expect(result.current.isFailed).toBe(true);
    });
    expect(result.current.error?.message).toBe('audio too long');
  });

  it('reset clears state', async () => {
    aiApi.tagImage.mockResolvedValueOnce({ id: 'j', status: 'succeeded', output: 'x' });

    const { result } = renderHook(() => useAiJob());

    await act(async () => {
      await result.current.submit('image-tag', { momentId: 'm', mediaUrl: 'x' });
    });
    expect(result.current.job).toBeTruthy();

    act(() => result.current.reset());
    expect(result.current.job).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

